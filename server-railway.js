const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// CORS Configuration - FIXED for Railway
app.use(cors({
  origin: [
    'https://tabib-iq.com',
    'https://www.tabib-iq.com',
    'https://api.tabib-iq.com',
    'http://localhost:3000',
    'https://tabib-iq-frontend.vercel.app',
    'https://tabib-iq-frontend-git-main.vercel.app'
  ],
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

// Additional CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://tabib-iq.com',
    'https://www.tabib-iq.com',
    'http://localhost:3000',
    'https://tabib-iq-frontend.vercel.app',
    'https://tabib-iq-frontend-git-main.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq?retryWrites=true&w=majority&appName=Cluster0';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  user_type: { type: String, enum: ['user', 'doctor', 'admin'], required: true },
  specialty: { type: String },
  address: { type: String },
  experience: { type: String },
  education: { type: String },
  isActive: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

const User = mongoose.model('User', userSchema);

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    cors: 'enabled'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tabib IQ API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    health: '/api/health'
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, loginType } = req.body;
    
    console.log('🔍 Login attempt:', { email, loginType });
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
        phone: user.phone
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, user_type } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      user_type: user_type || 'user'
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
        phone: user.phone
      }
    });
    
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Doctors endpoint
app.get('/api/doctors', async (req, res) => {
  try {
    console.log('🔍 جلب الأطباء...');
    
    // جلب جميع الأطباء (بدون فلترة إضافية)
    const allDoctors = await User.find({ 
      user_type: 'doctor'
    }).select('-password'); // استبعاد كلمة المرور
    
    console.log(`📊 إجمالي الأطباء: ${allDoctors.length}`);
    
    // فلترة الأطباء النشطين (مع مرونة في الحقول)
    const activeDoctors = allDoctors.filter(doctor => {
      // إذا كان الطبيب معطل صراحةً
      if (doctor.disabled === true) return false;
      
      // إذا كان الطبيب غير نشط صراحةً
      if (doctor.active === false) return false;
      if (doctor.isActive === false) return false;
      
      // إذا كان الطبيب محذوف
      if (doctor.deleted === true) return false;
      
      // في جميع الحالات الأخرى، اعتباره نشط
      return true;
    });
    
    console.log(`✅ الأطباء النشطين: ${activeDoctors.length}`);
    console.log('🔍 الأطباء:', activeDoctors.map(d => ({ 
      name: d.name, 
      email: d.email, 
      specialty: d.specialty,
      active: d.active,
      isActive: d.isActive,
      disabled: d.disabled
    })));
    
    res.json(activeDoctors);
  } catch (error) {
    console.error('❌ Get doctors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check registered doctors endpoint
app.get('/api/check-doctors', async (req, res) => {
  try {
    console.log('🔍 فحص الأطباء المسجلين...');
    
    const allUsers = await User.find({}).select('name email user_type active isActive specialty');
    const doctors = allUsers.filter(u => u.user_type === 'doctor');
    const activeDoctors = doctors.filter(d => d.active && d.isActive);
    
    console.log(`📊 إجمالي المستخدمين: ${allUsers.length}`);
    console.log(`👨‍⚕️ إجمالي الأطباء: ${doctors.length}`);
    console.log(`✅ الأطباء النشطين: ${activeDoctors.length}`);
    
    res.json({
      totalUsers: allUsers.length,
      totalDoctors: doctors.length,
      activeDoctors: activeDoctors.length,
      doctors: activeDoctors
    });
  } catch (error) {
    console.error('❌ Check doctors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check all users endpoint - فحص جميع المستخدمين
app.get('/api/check-users', async (req, res) => {
  try {
    console.log('🔍 فحص جميع المستخدمين...');
    
    const allUsers = await User.find({}).select('name email user_type active isActive specialty phone createdAt');
    
    // تجميع المستخدمين حسب النوع
    const regularUsers = allUsers.filter(u => u.user_type === 'user');
    const doctors = allUsers.filter(u => u.user_type === 'doctor');
    const admins = allUsers.filter(u => u.user_type === 'admin');
    
    // تجميع الأطباء حسب الحالة
    const activeDoctors = doctors.filter(d => d.active && d.isActive);
    const inactiveDoctors = doctors.filter(d => !d.active || !d.isActive);
    
    console.log(`📊 إجمالي المستخدمين: ${allUsers.length}`);
    console.log(`👤 المستخدمين العاديين: ${regularUsers.length}`);
    console.log(`👨‍⚕️ إجمالي الأطباء: ${doctors.length}`);
    console.log(`✅ الأطباء النشطين: ${activeDoctors.length}`);
    console.log(`❌ الأطباء غير النشطين: ${inactiveDoctors.length}`);
    console.log(`👑 الأدمن: ${admins.length}`);
    
    res.json({
      totalUsers: allUsers.length,
      regularUsers: regularUsers.length,
      totalDoctors: doctors.length,
      activeDoctors: activeDoctors.length,
      inactiveDoctors: inactiveDoctors.length,
      admins: admins.length,
      allUsers: allUsers,
      doctors: doctors,
      activeDoctors: activeDoctors
    });
  } catch (error) {
    console.error('❌ Check users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Notifications endpoint
app.get('/api/notifications', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    // Return empty notifications for now
    res.json([]);
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Appointments endpoint - جلب المواعيد
app.get('/api/appointments', async (req, res) => {
  try {
    const { userId, doctorId } = req.query;
    console.log('🔍 جلب المواعيد:', { userId, doctorId });
    
    let query = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (doctorId) {
      query.doctorId = doctorId;
    }
    
    const appointments = await Appointment.find(query)
      .populate('userId', 'name email phone')
      .populate('doctorId', 'name email specialty')
      .sort({ date: 1, time: 1 });
    
    console.log(`✅ تم جلب ${appointments.length} موعد`);
    
    res.json(appointments);
  } catch (error) {
    console.error('❌ Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create appointment endpoint - إنشاء موعد
app.post('/api/appointments', async (req, res) => {
  try {
    const { userId, doctorId, date, time, notes } = req.body;
    console.log('🔍 إنشاء موعد:', { userId, doctorId, date, time });
    
    if (!userId || !doctorId || !date || !time) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    
    // التحقق من وجود المستخدم والطبيب
    const user = await User.findById(userId);
    const doctor = await User.findById(doctorId);
    
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    if (!doctor || doctor.user_type !== 'doctor') {
      return res.status(404).json({ message: 'الطبيب غير موجود' });
    }
    
    // إنشاء الموعد
    const appointment = new Appointment({
      userId,
      doctorId,
      date: new Date(date),
      time,
      notes
    });
    
    await appointment.save();
    
    // جلب الموعد مع بيانات المستخدم والطبيب
    const savedAppointment = await Appointment.findById(appointment._id)
      .populate('userId', 'name email phone')
      .populate('doctorId', 'name email specialty');
    
    console.log('✅ تم إنشاء الموعد بنجاح:', savedAppointment._id);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الموعد بنجاح',
      appointment: savedAppointment
    });
  } catch (error) {
    console.error('❌ Create appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment status - تحديث حالة الموعد
app.put('/api/appointments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('🔍 تحديث حالة الموعد:', { id, status });
    
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'حالة غير صحيحة' });
    }
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('userId', 'name email phone')
     .populate('doctorId', 'name email specialty');
    
    if (!appointment) {
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }
    
    console.log('✅ تم تحديث حالة الموعد:', appointment._id);
    
    res.json({
      success: true,
      message: 'تم تحديث حالة الموعد بنجاح',
      appointment
    });
  } catch (error) {
    console.error('❌ Update appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete appointment - حذف موعد
app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 حذف موعد:', id);
    
    const appointment = await Appointment.findByIdAndDelete(id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }
    
    console.log('✅ تم حذف الموعد:', id);
    
    res.json({
      success: true,
      message: 'تم حذف الموعد بنجاح'
    });
  } catch (error) {
    console.error('❌ Delete appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check all appointments endpoint - فحص جميع المواعيد
app.get('/api/check-appointments', async (req, res) => {
  try {
    console.log('🔍 فحص جميع المواعيد في قاعدة البيانات...');
    
    const allAppointments = await Appointment.find({})
      .populate('userId', 'name email phone')
      .populate('doctorId', 'name email specialty')
      .sort({ createdAt: -1 });
    
    console.log(`📊 إجمالي المواعيد: ${allAppointments.length}`);
    
    // تجميع المواعيد حسب الحالة
    const pendingAppointments = allAppointments.filter(a => a.status === 'pending');
    const confirmedAppointments = allAppointments.filter(a => a.status === 'confirmed');
    const completedAppointments = allAppointments.filter(a => a.status === 'completed');
    const cancelledAppointments = allAppointments.filter(a => a.status === 'cancelled');
    
    console.log(`⏳ المواعيد المعلقة: ${pendingAppointments.length}`);
    console.log(`✅ المواعيد المؤكدة: ${confirmedAppointments.length}`);
    console.log(`✅ المواعيد المكتملة: ${completedAppointments.length}`);
    console.log(`❌ المواعيد الملغية: ${cancelledAppointments.length}`);
    
    res.json({
      totalAppointments: allAppointments.length,
      pendingAppointments: pendingAppointments.length,
      confirmedAppointments: confirmedAppointments.length,
      completedAppointments: completedAppointments.length,
      cancelledAppointments: cancelledAppointments.length,
      appointments: allAppointments
    });
  } catch (error) {
    console.error('❌ Check appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user appointments - جلب مواعيد المستخدم
app.get('/api/user-appointments/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 جلب مواعيد المستخدم:', userId);
    
    const userAppointments = await Appointment.find({ userId })
      .populate('userId', 'name email phone')
      .populate('doctorId', 'name email specialty')
      .sort({ date: 1, time: 1 });
    
    console.log(`✅ تم جلب ${userAppointments.length} موعد للمستخدم ${userId}`);
    
    res.json({
      success: true,
      count: userAppointments.length,
      appointments: userAppointments
    });
  } catch (error) {
    console.error('❌ Get user appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get doctor appointments - جلب مواعيد الطبيب
app.get('/api/doctor-appointments/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    console.log('🔍 جلب مواعيد الطبيب:', doctorId);
    
    const doctorAppointments = await Appointment.find({ doctorId })
      .populate('userId', 'name email phone')
      .populate('doctorId', 'name email specialty')
      .sort({ date: 1, time: 1 });
    
    console.log(`✅ تم جلب ${doctorAppointments.length} موعد للطبيب ${doctorId}`);
    
    res.json({
      success: true,
      count: doctorAppointments.length,
      appointments: doctorAppointments
    });
  } catch (error) {
    console.error('❌ Get doctor appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  console.log('🚀 Starting Tabib IQ Backend...');
  console.log('📁 Current directory:', process.cwd());
  console.log('🔧 Node version:', process.version);
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  
  const dbConnected = await connectDB();
  
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
  });
};

startServer().catch(console.error); 
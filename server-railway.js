const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

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

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
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
  city: { type: String },
  profileImage: { type: String },
  workTimes: [{
    day: String,
    from: String,
    to: String
  }],
  isActive: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  status: { type: String, default: 'approved' },
  isVerified: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
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
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['appointment', 'system', 'reminder'], default: 'system' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

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
    
    // Check user type if specified
    if (loginType && user.user_type !== loginType) {
      return res.status(401).json({ message: 'Invalid user type' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        user_type: user.user_type 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token: token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
        phone: user.phone,
        specialty: user.specialty,
        profileImage: user.profileImage
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
    console.log('📤 تسجيل مستخدم جديد...');
    console.log('📋 البيانات المستلمة:', req.body);
    console.log('📋 Content-Type:', req.headers['content-type']);
    
    const { name, email, password, phone, user_type } = req.body;
    
    console.log('🔍 البيانات المستخرجة:', { name, email, password: !!password, phone, user_type });
    
    if (!name || !email || !password) {
      console.log('❌ بيانات ناقصة:', { name: !!name, email: !!email, password: !!password });
      return res.status(400).json({ 
        message: 'Name, email and password are required',
        received: { name: !!name, email: !!email, password: !!password, phone: !!phone, user_type }
      });
    }
    
    // التحقق من اتصال قاعدة البيانات
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ قاعدة البيانات غير متصلة');
      return res.status(500).json({ message: 'Database connection error' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ المستخدم موجود مسبقاً:', email);
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
    
    console.log('💾 حفظ المستخدم في قاعدة البيانات...');
    await user.save();
    console.log('✅ تم حفظ المستخدم بنجاح:', user._id);
    
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
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Doctors endpoint
app.get('/api/doctors', async (req, res) => {
  try {
    console.log('🔍 جلب الأطباء...');
    
    // جلب جميع الأطباء مع جميع المعلومات
    const allDoctors = await User.find({ 
      user_type: 'doctor'
    }).select('name email phone user_type specialty address experience education city workTimes availableDays active isActive disabled createdAt status isVerified isAvailable'); // تحديد الحقول المطلوبة
    
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
      
      // للأطباء الحقيقيين، تحقق من الحالة
      if (doctor.status && doctor.status !== 'approved') return false;
      
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

// Check all users endpoint - فحص جميع المستخدمين
app.get('/api/check-users', async (req, res) => {
  try {
    console.log('🔍 فحص جميع المستخدمين...');
    
    const allUsers = await User.find({}).select('name email phone user_type createdAt status');
    const users = allUsers.filter(user => user.user_type === 'user');
    const doctors = allUsers.filter(user => user.user_type === 'doctor');
    const admins = allUsers.filter(user => user.user_type === 'admin');
    
    console.log(`📊 إجمالي المستخدمين: ${allUsers.length}`);
    console.log(`👥 المستخدمين العاديين: ${users.length}`);
    console.log(`👨‍⚕️ الأطباء: ${doctors.length}`);
    console.log(`👨‍💼 المديرين: ${admins.length}`);
    
    res.json({
      total: allUsers.length,
      users: users.length,
      doctors: doctors.length,
      admins: admins.length,
      allUsers: allUsers,
      users: users,
      doctors: doctors,
      admins: admins
    });
  } catch (error) {
    console.error('❌ Check users error:', error);
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

// Doctor registration endpoint - تسجيل الأطباء
app.post('/api/doctors', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'idFront', maxCount: 1 },
  { name: 'idBack', maxCount: 1 },
  { name: 'syndicateFront', maxCount: 1 },
  { name: 'syndicateBack', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📤 تسجيل طبيب جديد...');
    console.log('📋 البيانات المستلمة:', req.body);
    console.log('📁 الملفات المرفوعة:', req.files);
    
    const {
      name, email, phone, password, specialty, province, area, 
      clinicLocation, about, experienceYears, workTimes
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !email || !password) {
      console.log('❌ بيانات ناقصة:', { name: !!name, email: !!email, password: !!password });
      return res.status(400).json({ 
        error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' 
      });
    }

    // التحقق من اتصال قاعدة البيانات
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ قاعدة البيانات غير متصلة');
      return res.status(500).json({ error: 'خطأ في اتصال قاعدة البيانات' });
    }

    // التحقق من وجود المستخدم
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });
    
    if (existingUser) {
      console.log('❌ المستخدم موجود مسبقاً:', { email, phone });
      return res.status(400).json({ 
        error: 'البريد الإلكتروني أو رقم الهاتف مسجل مسبقاً' 
      });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // معالجة الصور المرفوعة
    const imagePath = req.files?.image ? `/uploads/${req.files.image[0].filename}` : null;
    const idFrontPath = req.files?.idFront ? `/uploads/${req.files.idFront[0].filename}` : null;
    const idBackPath = req.files?.idBack ? `/uploads/${req.files.idBack[0].filename}` : null;
    const syndicateFrontPath = req.files?.syndicateFront ? `/uploads/${req.files.syndicateFront[0].filename}` : null;
    const syndicateBackPath = req.files?.syndicateBack ? `/uploads/${req.files.syndicateBack[0].filename}` : null;

    console.log('📁 مسارات الملفات:', {
      imagePath, idFrontPath, idBackPath, syndicateFrontPath, syndicateBackPath
    });

    // إنشاء الطبيب الجديد
    const newDoctor = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      user_type: 'doctor',
      specialty,
      province,
      area,
      clinicLocation,
      about,
      experienceYears,
      workTimes: workTimes ? JSON.parse(workTimes) : [],
      profileImage: imagePath,
      idFront: idFrontPath,
      idBack: idBackPath,
      syndicateFront: syndicateFrontPath,
      syndicateBack: syndicateBackPath,
      status: 'pending', // في انتظار الموافقة
      isVerified: false,
      isAvailable: false
    });

    console.log('💾 حفظ الطبيب في قاعدة البيانات...');
    await newDoctor.save();
    
    console.log('✅ تم تسجيل الطبيب بنجاح:', newDoctor._id);
    res.status(201).json({ 
      message: 'تم تسجيل الطبيب بنجاح، في انتظار الموافقة',
      doctorId: newDoctor._id 
    });
    
  } catch (error) {
    console.error('❌ خطأ في تسجيل الطبيب:', error);
    res.status(500).json({ error: 'خطأ في الخادم: ' + error.message });
  }
});

// Create sample doctors endpoint - إنشاء أطباء تجريبيين
app.post('/api/create-sample-doctors', async (req, res) => {
  try {
    console.log('🔍 إنشاء أطباء تجريبيين...');
    
    const sampleDoctors = [
      {
        name: 'د. أحمد محمد',
        email: 'ahmed@tabib-iq.com',
        phone: '07801234567',
        password: await bcrypt.hash('123456', 10),
        user_type: 'doctor',
        specialty: 'طب عام',
        address: 'شارع الرشيد، بغداد',
        city: 'بغداد',
        experience: '15 سنة خبرة في الطب العام',
        education: 'دكتوراه في الطب - جامعة بغداد',
        workTimes: [
          { day: 'الأحد', from: '10:00', to: '15:00' },
          { day: 'الاثنين', from: '10:00', to: '15:00' },
          { day: 'الثلاثاء', from: '10:00', to: '15:00' },
          { day: 'الأربعاء', from: '10:00', to: '15:00' },
          { day: 'الخميس', from: '10:00', to: '15:00' },
          { day: 'السبت', from: '10:00', to: '12:00' }
        ],
        active: true,
        isActive: true
      },
      {
        name: 'د. فاطمة علي',
        email: 'fatima@tabib-iq.com',
        phone: '07801234568',
        password: await bcrypt.hash('123456', 10),
        user_type: 'doctor',
        specialty: 'طب الأطفال',
        address: 'شارع فلسطين، بغداد',
        city: 'بغداد',
        experience: '12 سنة خبرة في طب الأطفال',
        education: 'دكتوراه في طب الأطفال - جامعة المستنصرية',
        workTimes: [
          { day: 'الأحد', from: '09:00', to: '14:00' },
          { day: 'الاثنين', from: '09:00', to: '14:00' },
          { day: 'الثلاثاء', from: '09:00', to: '14:00' },
          { day: 'الأربعاء', from: '09:00', to: '14:00' },
          { day: 'الخميس', from: '09:00', to: '14:00' },
          { day: 'السبت', from: '09:00', to: '12:00' }
        ],
        active: true,
        isActive: true
      },
      {
        name: 'د. محمد حسن',
        email: 'mohammed@tabib-iq.com',
        phone: '07801234569',
        password: await bcrypt.hash('123456', 10),
        user_type: 'doctor',
        specialty: 'طب القلب',
        address: 'شارع الكفاح، بغداد',
        city: 'بغداد',
        experience: '20 سنة خبرة في طب القلب',
        education: 'دكتوراه في طب القلب - جامعة بغداد',
        workTimes: [
          { day: 'الأحد', from: '08:00', to: '16:00' },
          { day: 'الاثنين', from: '08:00', to: '16:00' },
          { day: 'الثلاثاء', from: '08:00', to: '16:00' },
          { day: 'الأربعاء', from: '08:00', to: '16:00' },
          { day: 'الخميس', from: '08:00', to: '16:00' },
          { day: 'السبت', from: '08:00', to: '12:00' }
        ],
        active: true,
        isActive: true
      },
      {
        name: 'د. نور الهدى',
        email: 'noor@tabib-iq.com',
        phone: '07801234570',
        password: await bcrypt.hash('123456', 10),
        user_type: 'doctor',
        specialty: 'طب النساء والولادة',
        address: 'شارع الرشيد، بغداد',
        city: 'بغداد',
        experience: '18 سنة خبرة في طب النساء',
        education: 'دكتوراه في طب النساء - جامعة بغداد',
        workTimes: [
          { day: 'الأحد', from: '10:00', to: '17:00' },
          { day: 'الاثنين', from: '10:00', to: '17:00' },
          { day: 'الثلاثاء', from: '10:00', to: '17:00' },
          { day: 'الأربعاء', from: '10:00', to: '17:00' },
          { day: 'الخميس', from: '10:00', to: '17:00' },
          { day: 'السبت', from: '10:00', to: '14:00' }
        ],
        active: true,
        isActive: true
      },
      {
        name: 'د. علي كريم',
        email: 'ali@tabib-iq.com',
        phone: '07801234571',
        password: await bcrypt.hash('123456', 10),
        user_type: 'doctor',
        specialty: 'طب العظام',
        address: 'شارع فلسطين، بغداد',
        city: 'بغداد',
        experience: '14 سنة خبرة في طب العظام',
        education: 'دكتوراه في طب العظام - جامعة المستنصرية',
        workTimes: [
          { day: 'الأحد', from: '11:00', to: '18:00' },
          { day: 'الاثنين', from: '11:00', to: '18:00' },
          { day: 'الثلاثاء', from: '11:00', to: '18:00' },
          { day: 'الأربعاء', from: '11:00', to: '18:00' },
          { day: 'الخميس', from: '11:00', to: '18:00' },
          { day: 'السبت', from: '11:00', to: '15:00' }
        ],
        active: true,
        isActive: true
      }
    ];
    
    const createdDoctors = [];
    
    for (const doctorData of sampleDoctors) {
      // التحقق من عدم وجود الطبيب مسبقاً
      const existingDoctor = await User.findOne({ email: doctorData.email });
      if (!existingDoctor) {
        const doctor = new User(doctorData);
        await doctor.save();
        createdDoctors.push(doctor);
        console.log(`✅ تم إنشاء الطبيب: ${doctor.name}`);
      } else {
        console.log(`⚠️ الطبيب موجود مسبقاً: ${doctorData.name}`);
      }
    }
    
    console.log(`✅ تم إنشاء ${createdDoctors.length} طبيب جديد`);
    
    res.json({
      success: true,
      message: `تم إنشاء ${createdDoctors.length} طبيب جديد`,
      createdDoctors: createdDoctors.length,
      doctors: createdDoctors
    });
  } catch (error) {
    console.error('❌ Create sample doctors error:', error);
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
    
    // إنشاء إشعار للطبيب
    const doctorNotification = new Notification({
      userId: doctorId,
      doctorId: doctorId,
      title: 'موعد جديد',
      message: `لديك موعد جديد مع ${user.name} في ${new Date(date).toLocaleDateString('ar-EG')} الساعة ${time}`,
      type: 'appointment'
    });
    await doctorNotification.save();
    
    // إنشاء إشعار للمريض
    const userNotification = new Notification({
      userId: userId,
      doctorId: doctorId,
      title: 'تم حجز الموعد',
      message: `تم حجز موعدك مع ${doctor.name} في ${new Date(date).toLocaleDateString('ar-EG')} الساعة ${time}`,
      type: 'appointment'
    });
    await userNotification.save();
    
    // جلب الموعد مع بيانات المستخدم والطبيب
    const savedAppointment = await Appointment.findById(appointment._id)
      .populate('userId', 'name email phone')
      .populate('doctorId', 'name email specialty');
    
    console.log('✅ تم إنشاء الموعد بنجاح:', savedAppointment._id);
    console.log('📧 تم إرسال الإشعارات للطبيب والمريض');
    
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

// Get doctor details - جلب تفاصيل الطبيب
app.get('/api/doctors/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    console.log('🔍 جلب تفاصيل الطبيب:', doctorId);
    
    const doctor = await User.findById(doctorId).select('-password');
    
    if (!doctor || doctor.user_type !== 'doctor') {
      return res.status(404).json({ message: 'الطبيب غير موجود' });
    }
    
    // تحويل workTimes إلى availableDays مع الأوقات المتاحة
    const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const availableDays = weekDays.map(day => {
      const workTime = doctor.workTimes?.find(wt => wt.day === day);
      if (workTime) {
        // توليد الأوقات المتاحة كل 30 دقيقة
        const times = [];
        const start = new Date(`2000-01-01 ${workTime.from}`);
        const end = new Date(`2000-01-01 ${workTime.to}`);
        
        while (start < end) {
          times.push(start.toTimeString().slice(0, 5));
          start.setMinutes(start.getMinutes() + 30);
        }
        
        return {
          day: day,
          available: true,
          times: times
        };
      } else {
        return {
          day: day,
          available: false,
          times: []
        };
      }
    });
    
    const doctorWithDetails = {
      ...doctor.toObject(),
      availableDays
    };
    
    console.log('✅ تم جلب تفاصيل الطبيب:', doctor.name);
    console.log('📅 الأيام المتاحة:', availableDays.filter(d => d.available).map(d => d.day));
    
    res.json({
      success: true,
      doctor: doctorWithDetails
    });
  } catch (error) {
    console.error('❌ Get doctor details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile image endpoint
app.post('/api/upload-profile-image', upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const imagePath = `/uploads/${req.file.filename}`;
    
    // Update user profile with image path
    await User.findByIdAndUpdate(userId, { profileImage: imagePath });
    
    res.json({
      success: true,
      imagePath: imagePath,
      message: 'Profile image uploaded successfully'
    });
    
  } catch (error) {
    console.error('❌ Upload profile image error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update doctor work times endpoint
app.put('/api/doctors/:doctorId/work-times', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { workTimes } = req.body;
    
    console.log('🔍 تحديث أوقات عمل الطبيب:', doctorId);
    console.log('📅 أوقات العمل الجديدة:', workTimes);
    
    const doctor = await User.findByIdAndUpdate(
      doctorId,
      { workTimes: workTimes },
      { new: true }
    ).select('-password');
    
    if (!doctor) {
      return res.status(404).json({ message: 'الطبيب غير موجود' });
    }
    
    res.json({
      success: true,
      doctor: doctor,
      message: 'تم تحديث أوقات العمل بنجاح'
    });
    
  } catch (error) {
    console.error('❌ Update work times error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create notification endpoint
app.post('/api/notifications', async (req, res) => {
  try {
    const { userId, doctorId, title, message, type } = req.body;
    
    const notification = new Notification({
      userId,
      doctorId,
      title,
      message,
      type: type || 'system'
    });
    
    await notification.save();
    
    res.json({
      success: true,
      notification: notification,
      message: 'تم إنشاء الإشعار بنجاح'
    });
    
  } catch (error) {
    console.error('❌ Create notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notifications endpoint
app.get('/api/notifications', async (req, res) => {
  try {
    const { userId, doctorId } = req.query;
    
    let query = {};
    if (userId) query.userId = userId;
    if (doctorId) query.doctorId = doctorId;
    
    const notifications = await Notification.find(query)
      .populate('userId', 'name email')
      .populate('doctorId', 'name specialty')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      notifications: notifications
    });
    
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read endpoint
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    
    res.json({
      success: true,
      message: 'تم تحديث حالة الإشعار'
    });
    
  } catch (error) {
    console.error('❌ Mark notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile endpoint - تحديث بيانات المستخدم
app.put('/api/user/:userId', async (req, res) => {
  try {
    console.log('📤 تحديث بيانات المستخدم...');
    console.log('📋 البيانات المستلمة:', req.body);
    
    const { userId } = req.params;
    const updates = req.body;
    
    // التحقق من وجود المستخدم
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    // التحقق من نوع المستخدم
    if (user.user_type !== 'user') {
      return res.status(403).json({ error: 'غير مصرح بتحديث هذا النوع من المستخدمين' });
    }
    
    // تحديث البيانات المسموح بها فقط
    const allowedUpdates = ['name', 'email', 'phone', 'profileImage'];
    const filteredUpdates = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });
    
    console.log('🔍 البيانات المحدثة:', filteredUpdates);
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      filteredUpdates,
      { new: true, runValidators: true }
    );
    
    console.log('✅ تم تحديث المستخدم بنجاح:', updatedUser._id);
    
    res.json({
      success: true,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        user_type: updatedUser.user_type,
        profileImage: updatedUser.profileImage
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في تحديث المستخدم:', error);
    res.status(500).json({ error: 'خطأ في الخادم: ' + error.message });
  }
});

// Change password endpoint - تغيير كلمة المرور
app.put('/api/change-password/:userId', async (req, res) => {
  try {
    console.log('📤 تغيير كلمة المرور...');
    
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبة' });
    }
    
    // التحقق من وجود المستخدم
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    // التحقق من كلمة المرور الحالية
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }
    
    // تشفير كلمة المرور الجديدة
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // تحديث كلمة المرور
    await User.findByIdAndUpdate(userId, { password: hashedNewPassword });
    
    console.log('✅ تم تغيير كلمة المرور بنجاح');
    
    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في تغيير كلمة المرور:', error);
    res.status(500).json({ error: 'خطأ في الخادم: ' + error.message });
  }
});

// Get user profile endpoint - جلب بيانات المستخدم
app.get('/api/user/:userId', async (req, res) => {
  try {
    console.log('📤 جلب بيانات المستخدم...');
    
    const { userId } = req.params;
    
    // التحقق من وجود المستخدم
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    console.log('✅ تم جلب بيانات المستخدم بنجاح:', user._id);
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        user_type: user.user_type,
        profileImage: user.profileImage,
        specialty: user.specialty,
        address: user.address,
        experience: user.experience,
        education: user.education,
        city: user.city,
        workTimes: user.workTimes,
        status: user.status,
        isVerified: user.isVerified,
        isAvailable: user.isAvailable,
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب بيانات المستخدم:', error);
    res.status(500).json({ error: 'خطأ في الخادم: ' + error.message });
  }
});

// Update doctor profile endpoint - تحديث بيانات الطبيب
app.put('/api/doctor/:doctorId', async (req, res) => {
  try {
    console.log('📤 تحديث بيانات الطبيب...');
    console.log('📋 البيانات المستلمة:', req.body);
    
    const { doctorId } = req.params;
    const updates = req.body;
    
    // التحقق من وجود الطبيب
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'الطبيب غير موجود' });
    }
    
    // التحقق من نوع المستخدم
    if (doctor.user_type !== 'doctor') {
      return res.status(403).json({ error: 'غير مصرح بتحديث هذا النوع من المستخدمين' });
    }
    
    // تحديث البيانات المسموح بها فقط
    const allowedUpdates = ['name', 'email', 'phone', 'profileImage', 'specialty', 'address', 'experience', 'education', 'city', 'workTimes'];
    const filteredUpdates = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });
    
    console.log('🔍 البيانات المحدثة:', filteredUpdates);
    
    const updatedDoctor = await User.findByIdAndUpdate(
      doctorId,
      filteredUpdates,
      { new: true, runValidators: true }
    );
    
    console.log('✅ تم تحديث الطبيب بنجاح:', updatedDoctor._id);
    
    res.json({
      success: true,
      doctor: {
        _id: updatedDoctor._id,
        name: updatedDoctor.name,
        email: updatedDoctor.email,
        phone: updatedDoctor.phone,
        user_type: updatedDoctor.user_type,
        specialty: updatedDoctor.specialty,
        address: updatedDoctor.address,
        experience: updatedDoctor.experience,
        education: updatedDoctor.education,
        city: updatedDoctor.city,
        workTimes: updatedDoctor.workTimes,
        profileImage: updatedDoctor.profileImage
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في تحديث الطبيب:', error);
    res.status(500).json({ error: 'خطأ في الخادم: ' + error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Tabib IQ Backend is running',
    timestamp: new Date().toISOString()
  });
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
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Override with railway env if exists
try {
  const fs = require('fs');
  const railwayEnvPath = path.join(__dirname, 'env.railway');
  console.log('🔍 فحص ملف env.railway:', railwayEnvPath);
  console.log('🔧 ملف env.railway موجود:', fs.existsSync(railwayEnvPath));
  
  if (fs.existsSync(railwayEnvPath)) {
    const envContent = fs.readFileSync(railwayEnvPath, 'utf8');
    console.log('📄 محتوى ملف env.railway:', envContent);
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
        console.log(`🔧 تم تعيين ${key.trim()}: ${value.trim()}`);
      }
    });
    console.log('✅ تم تحميل ملف env.railway بنجاح');
  } else {
    console.log('⚠️ ملف env.railway غير موجود');
  }
} catch (error) {
  console.log('⚠️ Could not load railway env file:', error.message);
}

const app = express();

// SIMPLE CORS CONFIGURATION - WORKING VERSION
app.use((req, res, next) => {
  // Allow all origins for now
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'false');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔍 Preflight request received for:', req.url);
    res.status(200).end();
    return;
  }
  
  next();
});

// Also use cors middleware as backup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  credentials: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/tabib-iq';
    console.log('🔗 محاولة الاتصال بقاعدة البيانات...');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    return true;
  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
    return false;
  }
};

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  user_type: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  active: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  specialty: { type: String, required: true },
  province: { type: String, required: true },
  area: { type: String, default: '' },
  clinicLocation: { type: String, default: '' },
  about: { type: String, default: '' },
  experienceYears: { type: String, default: '' },
  workTimes: [{ 
    day: String, 
    from: String, 
    to: String 
  }],
  image: { type: String, default: '' },
  idFront: { type: String, default: '' },
  idBack: { type: String, default: '' },
  syndicateFront: { type: String, default: '' },
  syndicateBack: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  isVerified: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  is_featured: { type: Boolean, default: false },
  user_type: { type: String, default: 'doctor' },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);

// Health Center Schema
const healthCenterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  province: { type: String, required: true },
  area: { type: String, default: '' },
  description: { type: String, default: '' },
  services: [String],
  image: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  isVerified: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  is_featured: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const HealthCenter = mongoose.model('HealthCenter', healthCenterSchema);

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🔍 Health check request received from:', req.headers.origin);
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      readyState: mongoose.connection.readyState
    },
    cors: 'enabled',
    requestOrigin: req.headers.origin
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  console.log('🔍 CORS test request received from:', req.headers.origin);
  res.json({
    success: true,
    message: 'CORS is working correctly',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Admin login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, loginType } = req.body;
    console.log('🔍 محاولة تسجيل دخول:', { email, loginType });

    if (loginType === 'admin') {
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(401).json({ success: false, message: 'بيانات غير صحيحة' });
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'بيانات غير صحيحة' });
      }

      const token = jwt.sign(
        { userId: admin._id, email: admin.email, user_type: 'admin' },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        token,
        user: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          user_type: 'admin'
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'نوع تسجيل دخول غير صحيح' });
    }
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Get admin dashboard data
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    console.log('📊 جلب بيانات لوحة التحكم...');
    
    // Get counts
    const [users, doctors, appointments] = await Promise.all([
      User.find({ user_type: 'patient' }).countDocuments(),
      Doctor.find({}).countDocuments(),
      Appointment.find({}).countDocuments()
    ]);

    const pendingDoctors = await Doctor.find({ status: 'pending' }).countDocuments();
    const approvedDoctors = await Doctor.find({ status: 'approved' }).countDocuments();
    const featuredDoctors = await Doctor.find({ is_featured: true }).countDocuments();
    const healthCenters = await HealthCenter.find({}).countDocuments();
    const pendingHealthCenters = await HealthCenter.find({ status: 'pending' }).countDocuments();
    const approvedHealthCenters = await HealthCenter.find({ status: 'approved' }).countDocuments();

    console.log('📊 البيانات المجمعة:', { 
      users, doctors, appointments, pendingDoctors, approvedDoctors, featuredDoctors,
      healthCenters, pendingHealthCenters, approvedHealthCenters
    });

    res.json({
      success: true,
      data: {
        users,
        doctors,
        appointments,
        pendingDoctors,
        approvedDoctors,
        featuredDoctors,
        healthCenters,
        pendingHealthCenters,
        approvedHealthCenters
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب بيانات لوحة التحكم:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Debug endpoint to check database data
app.get('/api/debug/data', async (req, res) => {
  try {
    console.log('🔍 فحص البيانات في قاعدة البيانات...');
    
    const allUsers = await User.find({});
    const allDoctors = await Doctor.find({});
    const allAdmins = await Admin.find({});
    const allAppointments = await Appointment.find({});
    
    console.log('📊 إجمالي البيانات:');
    console.log('- المستخدمين:', allUsers.length);
    console.log('- الأطباء:', allDoctors.length);
    console.log('- الأدمن:', allAdmins.length);
    console.log('- المواعيد:', allAppointments.length);
    
    res.json({
      success: true,
      data: {
        users: allUsers.length,
        doctors: allDoctors.length,
        admins: allAdmins.length,
        appointments: allAppointments.length,
        userDetails: allUsers.map(u => ({ id: u._id, name: u.name, email: u.email, user_type: u.user_type })),
        doctorDetails: allDoctors.map(d => ({ id: d._id, name: d.name, email: d.email, status: d.status })),
        adminDetails: allAdmins.map(a => ({ id: a._id, name: a.name, email: a.email }))
      }
    });
  } catch (error) {
    console.error('❌ خطأ في فحص البيانات:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Create test data endpoint
app.post('/api/create-test-data', async (req, res) => {
  try {
    console.log('📝 إنشاء بيانات تجريبية...');
    
    // Create test users
    const testUsers = [
      { name: 'أحمد محمد', email: 'ahmed@test.com', phone: '07801234567', password: '123456', user_type: 'patient' },
      { name: 'فاطمة علي', email: 'fatima@test.com', phone: '07801234568', password: '123456', user_type: 'patient' },
      { name: 'محمد حسن', email: 'mohammed@test.com', phone: '07801234569', password: '123456', user_type: 'patient' }
    ];
    
    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        const user = new User({ ...userData, password: hashedPassword });
        await user.save();
        console.log('✅ تم إنشاء مستخدم:', userData.name);
      }
    }
    
    // Create test doctors
    const testDoctors = [
      {
        name: 'د. سارة أحمد',
        email: 'sara@doctor.com',
        phone: '07801234570',
        specialty: 'طب عام',
        province: 'بغداد',
        area: 'الكرادة',
        status: 'pending',
        isVerified: false,
        active: true,
        disabled: false,
        is_featured: false,
        user_type: 'doctor',
        rating: 0,
        totalRatings: 0
      },
      {
        name: 'د. علي محمد',
        email: 'ali@doctor.com',
        phone: '07801234571',
        specialty: 'طب أسنان',
        province: 'البصرة',
        area: 'المركز',
        status: 'approved',
        isVerified: true,
        active: true,
        disabled: false,
        is_featured: true,
        user_type: 'doctor',
        rating: 4.5,
        totalRatings: 10
      },
      {
        name: 'د. نورا كريم',
        email: 'nora@doctor.com',
        phone: '07801234572',
        specialty: 'طب الأطفال',
        province: 'أربيل',
        area: 'المركز',
        status: 'approved',
        isVerified: true,
        active: true,
        disabled: false,
        is_featured: false,
        user_type: 'doctor',
        rating: 4.8,
        totalRatings: 15
      }
    ];
    
    for (const doctorData of testDoctors) {
      const existingDoctor = await Doctor.findOne({ email: doctorData.email });
      if (!existingDoctor) {
        const doctor = new Doctor(doctorData);
        await doctor.save();
        console.log('✅ تم إنشاء طبيب:', doctorData.name);
      }
    }
    
    // Create test appointments
    const testAppointments = [
      {
        userId: (await User.findOne({ email: 'ahmed@test.com' }))._id,
        doctorId: (await Doctor.findOne({ email: 'ali@doctor.com' }))._id,
        date: new Date(Date.now() + 86400000), // Tomorrow
        time: '10:00',
        status: 'confirmed',
        notes: 'موعد تجريبي'
      },
      {
        userId: (await User.findOne({ email: 'fatima@test.com' }))._id,
        doctorId: (await Doctor.findOne({ email: 'nora@doctor.com' }))._id,
        date: new Date(Date.now() + 172800000), // Day after tomorrow
        time: '14:00',
        status: 'pending',
        notes: 'موعد تجريبي آخر'
      }
    ];
    
    for (const appointmentData of testAppointments) {
      const appointment = new Appointment(appointmentData);
      await appointment.save();
      console.log('✅ تم إنشاء موعد تجريبي');
    }
    
    // Create test health centers
    const testHealthCenters = [
      {
        name: 'مركز الصحة الأول',
        email: 'center1@health.com',
        phone: '07801234580',
        password: '123456',
        address: 'شارع الرشيد، بغداد',
        province: 'بغداد',
        area: 'الكرادة',
        description: 'مركز صحي متكامل يقدم خدمات طبية شاملة',
        services: ['طب عام', 'طب أسنان', 'مختبر تحاليل'],
        status: 'approved',
        isVerified: true,
        active: true,
        disabled: false,
        is_featured: true,
        rating: 4.7,
        totalRatings: 25
      },
      {
        name: 'مركز الصحة الثاني',
        email: 'center2@health.com',
        phone: '07801234581',
        password: '123456',
        address: 'شارع فلسطين، البصرة',
        province: 'البصرة',
        area: 'المركز',
        description: 'مركز صحي حديث يقدم خدمات متطورة',
        services: ['طب عام', 'أشعة', 'صيدلية'],
        status: 'pending',
        isVerified: false,
        active: true,
        disabled: false,
        is_featured: false,
        rating: 0,
        totalRatings: 0
      }
    ];
    
    for (const centerData of testHealthCenters) {
      const existingCenter = await HealthCenter.findOne({ email: centerData.email });
      if (!existingCenter) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(centerData.password, salt);
        const center = new HealthCenter({ ...centerData, password: hashedPassword });
        await center.save();
        console.log('✅ تم إنشاء مركز صحي:', centerData.name);
      }
    }
    
    res.json({
      success: true,
      message: 'تم إنشاء البيانات التجريبية بنجاح',
      data: {
        usersCreated: testUsers.length,
        doctorsCreated: testDoctors.length,
        appointmentsCreated: testAppointments.length
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء البيانات التجريبية:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Get all doctors
app.get('/api/doctors', async (req, res) => {
  try {
    console.log('👨‍⚕️ جلب جميع الأطباء...');
    const allDoctors = await Doctor.find({}).select('name email phone user_type specialty province area clinicLocation about experienceYears workTimes image idFront idBack syndicateFront syndicateBack status isVerified isAvailable active disabled is_featured rating totalRatings createdAt');
    
    res.json({
      success: true,
      data: allDoctors
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الأطباء:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Approve doctor
app.put('/api/doctors/:doctorId/approve', async (req, res) => {
  try {
    const { doctorId } = req.params;
    console.log('✅ الموافقة على الطبيب:', doctorId);

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }

    doctor.status = 'approved';
    doctor.isVerified = true;
    doctor.disabled = false;
    doctor.active = true;
    await doctor.save();

    res.json({
      success: true,
      message: 'تم الموافقة على الطبيب بنجاح',
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        status: doctor.status
      }
    });
  } catch (error) {
    console.error('❌ خطأ في الموافقة على الطبيب:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Reject doctor
app.put('/api/doctors/:doctorId/reject', async (req, res) => {
  try {
    const { doctorId } = req.params;
    console.log('❌ رفض الطبيب:', doctorId);

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }

    doctor.status = 'rejected';
    doctor.isVerified = false;
    doctor.disabled = true;
    doctor.active = false;
    await doctor.save();

    res.json({
      success: true,
      message: 'تم رفض الطبيب بنجاح',
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        status: doctor.status
      }
    });
  } catch (error) {
    console.error('❌ خطأ في رفض الطبيب:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Delete doctor
app.delete('/api/doctors/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    console.log('🗑️ حذف الطبيب:', doctorId);

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }

    // Delete appointments
    await Appointment.deleteMany({ doctorId: doctorId });
    
    // Delete user if exists
    if (doctor.userId) {
      await User.findByIdAndDelete(doctor.userId);
    }
    
    // Delete doctor
    await Doctor.findByIdAndDelete(doctorId);

    res.json({
      success: true,
      message: 'تم حذف الطبيب بنجاح'
    });
  } catch (error) {
    console.error('❌ خطأ في حذف الطبيب:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Doctor registration
app.post('/api/doctors', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'idFront', maxCount: 1 },
  { name: 'idBack', maxCount: 1 },
  { name: 'syndicateFront', maxCount: 1 },
  { name: 'syndicateBack', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📤 تسجيل طبيب جديد...');
    
    const { name, email, phone, password, specialty, province, area, clinicLocation, about, experienceYears, workTimes } = req.body;

    // Check if doctor already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'الطبيب مسجل بالفعل بهذا البريد الإلكتروني'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({ 
      name, 
      email, 
      phone, 
      password: hashedPassword, 
      user_type: 'doctor', 
      active: true, 
      isActive: true 
    });
    await user.save();

    // Prepare doctor data
    const doctorData = {
      userId: user._id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      specialty,
      province,
      area: area || '',
      clinicLocation: clinicLocation || '',
      about: about || '',
      experienceYears: experienceYears || '',
      workTimes: workTimes ? JSON.parse(workTimes) : [],
      status: 'pending',
      isVerified: false,
      isAvailable: true,
      active: true,
      disabled: false,
      is_featured: false,
      user_type: 'doctor',
      rating: 0,
      totalRatings: 0
    };

    // Add file paths if uploaded
    if (req.files) {
      if (req.files.image) doctorData.image = `/uploads/${req.files.image[0].filename}`;
      if (req.files.idFront) doctorData.idFront = `/uploads/${req.files.idFront[0].filename}`;
      if (req.files.idBack) doctorData.idBack = `/uploads/${req.files.idBack[0].filename}`;
      if (req.files.syndicateFront) doctorData.syndicateFront = `/uploads/${req.files.syndicateFront[0].filename}`;
      if (req.files.syndicateBack) doctorData.syndicateBack = `/uploads/${req.files.syndicateBack[0].filename}`;
    }

    // Create doctor
    const doctor = new Doctor(doctorData);
    await doctor.save();

    console.log('✅ تم إنشاء ملف الطبيب بنجاح:', doctor._id);
    
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الطبيب بنجاح. سيتم مراجعة طلبك من قبل الإدارة.',
      doctor: {
        id: doctor._id,
        userId: user._id,
        name: doctor.name,
        email: doctor.email,
        specialty,
        status: 'pending'
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في تسجيل الطبيب:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تسجيل الطبيب. حاول مرة أخرى.'
    });
  }
});

// Get all health centers
app.get('/api/health-centers', async (req, res) => {
  try {
    console.log('🏥 جلب جميع المراكز الصحية...');
    const allHealthCenters = await HealthCenter.find({}).select('name email phone address province area description services image status isVerified active disabled is_featured rating totalRatings createdAt');
    
    res.json({
      success: true,
      data: allHealthCenters
    });
  } catch (error) {
    console.error('❌ خطأ في جلب المراكز الصحية:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Approve health center
app.put('/api/health-centers/:centerId/approve', async (req, res) => {
  try {
    const { centerId } = req.params;
    console.log('✅ الموافقة على المركز الصحي:', centerId);

    const center = await HealthCenter.findById(centerId);
    if (!center) {
      return res.status(404).json({ success: false, message: 'المركز الصحي غير موجود' });
    }

    center.status = 'approved';
    center.isVerified = true;
    center.disabled = false;
    center.active = true;
    await center.save();

    res.json({
      success: true,
      message: 'تم الموافقة على المركز الصحي بنجاح',
      center: {
        _id: center._id,
        name: center.name,
        status: center.status
      }
    });
  } catch (error) {
    console.error('❌ خطأ في الموافقة على المركز الصحي:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Reject health center
app.put('/api/health-centers/:centerId/reject', async (req, res) => {
  try {
    const { centerId } = req.params;
    console.log('❌ رفض المركز الصحي:', centerId);

    const center = await HealthCenter.findById(centerId);
    if (!center) {
      return res.status(404).json({ success: false, message: 'المركز الصحي غير موجود' });
    }

    center.status = 'rejected';
    center.isVerified = false;
    center.disabled = true;
    center.active = false;
    await center.save();

    res.json({
      success: true,
      message: 'تم رفض المركز الصحي بنجاح',
      center: {
        _id: center._id,
        name: center.name,
        status: center.status
      }
    });
  } catch (error) {
    console.error('❌ خطأ في رفض المركز الصحي:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Delete health center
app.delete('/api/health-centers/:centerId', async (req, res) => {
  try {
    const { centerId } = req.params;
    console.log('🗑️ حذف المركز الصحي:', centerId);

    const center = await HealthCenter.findById(centerId);
    if (!center) {
      return res.status(404).json({ success: false, message: 'المركز الصحي غير موجود' });
    }

    await HealthCenter.findByIdAndDelete(centerId);

    res.json({
      success: true,
      message: 'تم حذف المركز الصحي بنجاح'
    });
  } catch (error) {
    console.error('❌ خطأ في حذف المركز الصحي:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  console.log('🚀 Starting Tabib IQ Backend (CORS Fixed)...');
  console.log('📁 Current directory:', process.cwd());
  console.log('🔧 Node version:', process.version);
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  
  const dbConnected = await connectDB();
  
  if (dbConnected) {
    // Check for default admin
    try {
      const defaultAdminEmail = 'admin@tabib-iq.com';
      const adminExists = await Admin.findOne({ email: defaultAdminEmail });
      
      if (!adminExists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin123!@#', salt);
        
        const defaultAdmin = new Admin({
          name: 'مدير النظام',
          email: defaultAdminEmail,
          password: hashedPassword,
          role: 'admin',
          active: true
        });
        
        await defaultAdmin.save();
        console.log('✅ تم إنشاء الأدمن الافتراضي تلقائياً:', defaultAdminEmail);
        console.log('🔑 بيانات الدخول: admin@tabib-iq.com / Admin123!@#');
      }
      
      const oldAdminExists = await Admin.findOne({ email: 'adMinaBuBaKeRAK@tabibIQ.trIQ' });
      if (oldAdminExists) {
        console.log('✅ الأدمن القديم موجود أيضاً في قاعدة البيانات');
      }
      
    } catch (error) {
      console.log('⚠️ خطأ في التحقق من الأدمن:', error.message);
    }
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 CORS test: http://localhost:${PORT}/api/cors-test`);
    console.log(`🌐 Admin login: http://localhost:${PORT}/api/auth/login`);
    console.log(`🌐 Admin dashboard: http://localhost:${PORT}/api/admin/dashboard`);
    console.log(`🌐 Doctors: http://localhost:${PORT}/api/doctors`);
    console.log('🔧 CORS is configured to allow all origins');
  });
};

startServer(); 
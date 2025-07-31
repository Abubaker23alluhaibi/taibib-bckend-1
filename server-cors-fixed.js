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
    
    const [users, doctors, appointments] = await Promise.all([
      User.find({ user_type: 'patient' }).countDocuments(),
      Doctor.find({}).countDocuments(),
      Appointment.find({}).countDocuments()
    ]);

    const pendingDoctors = await Doctor.find({ status: 'pending' }).countDocuments();
    const approvedDoctors = await Doctor.find({ status: 'approved' }).countDocuments();

    res.json({
      success: true,
      data: {
        users,
        doctors,
        appointments,
        pendingDoctors,
        approvedDoctors
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب بيانات لوحة التحكم:', error);
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
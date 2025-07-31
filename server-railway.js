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

// CORS Configuration - FIXED for Railway
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://tabib-iq.com',
      'https://www.tabib-iq.com',
      'https://api.tabib-iq.com',
      'http://localhost:3000',
      'https://tabib-iq-frontend.vercel.app',
      'https://tabib-iq-frontend-git-main.vercel.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With', 'Cache-Control'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept, X-Requested-With, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'false');
  res.status(200).end();
});

// Additional CORS middleware for extra safety
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://tabib-iq.com',
    'https://www.tabib-iq.com',
    'http://localhost:3000',
    'https://tabib-iq-frontend.vercel.app',
    'https://tabib-iq-frontend-git-main.vercel.app'
  ];
  
  const origin = req.headers.origin;
  
  // Set CORS headers for all responses
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept, X-Requested-With, Cache-Control');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔍 Preflight request received for:', req.url);
    res.status(200).end();
    return;
  }
  
  next();
});

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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tabib IQ Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      admin: '/api/admin/init',
      test: '/api/test-login',
      doctors: '/api/doctors',
      convertDoctor: '/api/convert-doctor/:userId',
      convertAllDoctors: '/api/convert-all-doctors',
      checkDoctorsStatus: '/api/check-doctors-status'
    }
  });
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq';

const connectDB = async () => {
  try {
    console.log('🔍 محاولة الاتصال بقاعدة البيانات...');
    console.log('🔧 MONGO_URI exists:', !!process.env.MONGO_URI);
    console.log('🔧 MONGO_URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 0);
    console.log('🔧 MONGO_URI preview:', process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 50) + '...' : 'Not defined');
    
    // إضافة خيارات اتصال محسنة
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 ثواني
      socketTimeoutMS: 45000, // 45 ثانية
      connectTimeoutMS: 15000, // 15 ثانية
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority',
      family: 4 // استخدام IPv4 فقط
    };
    
    console.log('🔧 Using connection options:', options);
    
    await mongoose.connect(MONGO_URI, options);
    console.log('✅ MongoDB connected successfully');
    
    // اختبار الاتصال
    const adminCount = await Admin.countDocuments();
    const userCount = await User.countDocuments();
    console.log(`📊 قاعدة البيانات تحتوي على ${adminCount} أدمن و ${userCount} مستخدم`);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('❌ Error details:', error);
    
    // معالجة خاصة لخطأ DNS
    if (error.code === 'ETIMEOUT' || error.message.includes('queryTxt') || error.message.includes('ENOTFOUND')) {
      console.log('⚠️ خطأ DNS timeout - قد يكون بسبب الشبكة المحلية');
      console.log('⚠️ في Railway سيعمل بشكل صحيح');
      
      // محاولة الاتصال برابط بديل مع خيارات مختلفة
      const fallbackOptions = [
        {
          uri: 'mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq?retryWrites=true&w=majority',
          options: {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000,
            connectTimeoutMS: 10000,
            family: 4
          }
        },
        {
          uri: 'mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq?retryWrites=true&w=majority',
          options: {
            serverSelectionTimeoutMS: 3000,
            socketTimeoutMS: 20000,
            connectTimeoutMS: 8000,
            family: 4
          }
        }
      ];
      
      for (let i = 0; i < fallbackOptions.length; i++) {
        try {
          console.log(`🔄 محاولة الاتصال برابط بديل ${i + 1}/${fallbackOptions.length}...`);
          await mongoose.connect(fallbackOptions[i].uri, fallbackOptions[i].options);
          console.log(`✅ MongoDB connected with fallback URI ${i + 1}`);
          return true;
        } catch (fallbackError) {
          console.error(`❌ Fallback connection ${i + 1} failed:`, fallbackError.message);
          if (i === fallbackOptions.length - 1) {
            console.error('❌ All fallback connections failed');
          }
        }
      }
    }
    
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
  province: { type: String },
  area: { type: String },
  clinicLocation: { type: String },
  address: { type: String },
  experience: { type: String },
  experienceYears: { type: Number },
  education: { type: String },
  city: { type: String },
  about: { type: String },
  image: { type: String },
  idFront: { type: String },
  idBack: { type: String },
  syndicateFront: { type: String },
  syndicateBack: { type: String },
  workTimes: [{
    day: String,
    from: String,
    to: String
  }],
  availableDays: [String],
  status: { type: String, default: 'pending' },
  isVerified: { type: Boolean, default: false },
  approved: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

const User = mongoose.model('User', userSchema);

// Admin Schema - منفصل للأدمن
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

const Admin = mongoose.model('Admin', adminSchema);

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

// Doctor Schema
const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  password: { type: String },
  name: { type: String },
  phone: { type: String },
  specialty: { type: String },
  specialization: { type: String },
  province: { type: String },
  area: { type: String },
  clinicLocation: { type: String },
  image: { type: String },
  profileImage: { type: String },
  idFront: { type: String },
  idBack: { type: String },
  syndicateFront: { type: String },
  syndicateBack: { type: String },
  about: { type: String },
  bio: { type: String },
  workTimes: [{
    day: String,
    from: String,
    to: String
  }],
  availableDays: [String],
  availableHours: {
    start: String,
    end: String
  },
  experienceYears: { type: Number },
  experience: { type: Number },
  consultationFee: { type: Number },
  isIndependent: { type: Boolean },
  status: { type: String, default: 'pending' },
  isVerified: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  is_featured: { type: Boolean, default: false },
  user_type: { type: String, default: 'doctor' },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

const Doctor = mongoose.model('Doctor', doctorSchema);

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🔍 Health check request received from:', req.headers.origin);
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const dbState = mongoose.connection.readyState;
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      state: dbState,
      readyState: mongoose.connection.readyState
    },
    environment_variables: {
      JWT_SECRET: process.env.JWT_SECRET ? 'defined' : 'not defined',
      MONGO_URI: process.env.MONGO_URI ? 'defined' : 'not defined',
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || 5000
    },
    cors: 'enabled',
    requestOrigin: req.headers.origin,
    models: {
      user: User ? 'initialized' : 'not initialized',
      admin: Admin ? 'initialized' : 'not initialized',
      appointment: Appointment ? 'initialized' : 'not initialized'
    }
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

// Test admin endpoint
app.get('/api/test-admin', async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: 'adMinaBuBaKeRAK@tabibIQ.trIQ' });
    if (admin) {
      res.json({
        success: true,
        message: 'الأدمن موجود في قاعدة البيانات',
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          active: admin.active
        }
      });
    } else {
      res.json({
        success: false,
        message: 'الأدمن غير موجود في قاعدة البيانات'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// Create admin endpoint - إنشاء حساب أدمن جديد
app.post('/api/admin/create', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' 
      });
    }
    
    // التحقق من عدم وجود أدمن بنفس البريد الإلكتروني
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false,
        message: 'الأدمن موجود بالفعل بهذا البريد الإلكتروني' 
      });
    }
    
    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // إنشاء الأدمن الجديد
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      active: true
    });
    
    await newAdmin.save();
    
    console.log('✅ تم إنشاء أدمن جديد:', email);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء حساب الأدمن بنجاح',
      admin: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        active: newAdmin.active
      }
    });
    
  } catch (error) {
    console.error('❌ Create admin error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في الخادم',
      error: error.message 
    });
  }
});

// Initialize default admin - إنشاء أدمن افتراضي
app.post('/api/admin/init', async (req, res) => {
  try {
    const defaultAdminEmail = 'newadmin@tabib-iq.com';
    const defaultAdminPassword = 'NewAdmin123!';
    
    // التحقق من وجود الأدمن الافتراضي
    const existingAdmin = await Admin.findOne({ email: defaultAdminEmail });
    if (existingAdmin) {
      return res.json({
        success: true,
        message: 'الأدمن الافتراضي موجود بالفعل',
        admin: {
          _id: existingAdmin._id,
          name: existingAdmin.name,
          email: existingAdmin.email,
          role: existingAdmin.role
        }
      });
    }
    
    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultAdminPassword, salt);
    
    // إنشاء الأدمن الافتراضي
    const defaultAdmin = new Admin({
      name: 'مدير النظام',
      email: defaultAdminEmail,
      password: hashedPassword,
      role: 'admin',
      active: true
    });
    
    await defaultAdmin.save();
    
    console.log('✅ تم إنشاء الأدمن الافتراضي:', defaultAdminEmail);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الأدمن الافتراضي بنجاح',
      admin: {
        _id: defaultAdmin._id,
        name: defaultAdmin.name,
        email: defaultAdmin.email,
        role: defaultAdmin.role
      },
      credentials: {
        email: defaultAdminEmail,
        password: defaultAdminPassword
      }
    });
    
  } catch (error) {
    console.error('❌ Init admin error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في الخادم',
      error: error.message 
    });
  }
});

// List all admins - قائمة جميع الأدمن
app.get('/api/admin/list', async (req, res) => {
  try {
    const admins = await Admin.find({}).select('-password');
    
    res.json({
      success: true,
      count: admins.length,
      admins: admins
    });
    
  } catch (error) {
    console.error('❌ List admins error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في الخادم',
      error: error.message 
    });
  }
});

// Admin dashboard data - بيانات لوحة تحكم الأدمن
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    console.log('🔍 جلب بيانات لوحة تحكم الأدمن...');
    
    // جلب جميع المستخدمين
    const users = await User.find({ user_type: 'patient' }).select('-password');
    console.log('✅ تم جلب المستخدمين:', users.length);
    
    // جلب جميع الأطباء
    const doctors = await User.find({ user_type: 'doctor' }).select('-password');
    console.log('✅ تم جلب الأطباء:', doctors.length);
    
    // جلب جميع المواعيد
    const appointments = await Appointment.find({}).populate('userId', 'name email').populate('doctorId', 'name specialty');
    console.log('✅ تم جلب المواعيد:', appointments.length);
    
    // حساب الإحصائيات
    const stats = {
      totalUsers: users.length,
      totalDoctors: doctors.length,
      totalAppointments: appointments.length,
      pendingAppointments: appointments.filter(a => a.status === 'pending').length,
      confirmedAppointments: appointments.filter(a => a.status === 'confirmed').length,
      cancelledAppointments: appointments.filter(a => a.status === 'cancelled').length,
      topSpecialties: [],
      monthlyStats: []
    };
    
    // حساب التخصصات الأكثر طلباً
    const specialtyCounts = {};
    doctors.forEach(doctor => {
      if (doctor.specialty) {
        specialtyCounts[doctor.specialty] = (specialtyCounts[doctor.specialty] || 0) + 1;
      }
    });
    
    stats.topSpecialties = Object.entries(specialtyCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([specialty, count]) => ({ specialty, count }));
    
    console.log('✅ تم حساب الإحصائيات بنجاح');
    
    res.json({
      success: true,
      users: users,
      doctors: doctors,
      appointments: appointments,
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Admin dashboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في جلب بيانات لوحة التحكم',
      error: error.message 
    });
  }
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
    console.log('🔧 JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('🔧 MONGO_URI exists:', !!process.env.MONGO_URI);
    
    // التحقق من اتصال قاعدة البيانات
    if (mongoose.connection.readyState !== 1) {
      console.log('❌ قاعدة البيانات غير متصلة');
      return res.status(503).json({ 
        message: 'Database connection error. Please try again later.',
        error: 'Database disconnected'
      });
    }
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    let user = null;
    let userType = '';
    
    // البحث في الأدمن أولاً إذا كان loginType = admin
    if (loginType === 'admin') {
      try {
        user = await Admin.findOne({ email });
        if (user) {
          userType = 'admin';
          console.log('✅ تم العثور على الأدمن:', user.email);
        }
      } catch (adminError) {
        console.error('❌ خطأ في البحث عن الأدمن:', adminError);
      }
    }
    
    // إذا لم يتم العثور على الأدمن، ابحث في المستخدمين العاديين
    if (!user) {
      try {
        user = await User.findOne({ email });
        if (user) {
          userType = user.user_type || user.role;
          console.log('✅ تم العثور على المستخدم:', user.email, 'نوع:', userType);
        }
      } catch (userError) {
        console.error('❌ خطأ في البحث عن المستخدم:', userError);
      }
    }
    
    if (!user) {
      console.log('❌ المستخدم غير موجود:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // التحقق من نوع المستخدم إذا تم تحديده
    if (loginType && userType !== loginType) {
      console.log('❌ نوع المستخدم غير صحيح:', { expected: loginType, actual: userType });
      return res.status(401).json({ message: 'Invalid user type' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ كلمة المرور غير صحيحة للمستخدم:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('✅ كلمة المرور صحيحة للمستخدم:', email);
    
    // Generate JWT token with fallback secret
    const jwtSecret = process.env.JWT_SECRET || 'tabib_iq_fallback_secret_key_2024';
    console.log('🔑 Using JWT secret:', jwtSecret ? 'defined' : 'fallback');
    
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        user_type: userType 
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
    
    console.log('✅ تم إنشاء التوكن بنجاح');
    
    res.json({
      success: true,
      token: token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        user_type: userType,
        phone: user.phone,
        specialty: user.specialty,
        profileImage: user.profileImage
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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

// Create test user endpoint - إنشاء مستخدم تجريبي
app.post('/api/create-test-user', async (req, res) => {
  try {
    console.log('🔍 إنشاء مستخدم تجريبي...');
    
    const testUserData = {
      name: 'مستخدم تجريبي',
      email: 'test@tabib-iq.com',
      phone: '07801234567',
      password: await bcrypt.hash('123456', 10),
      user_type: 'user',
      active: true,
      isActive: true
    };
    
    // التحقق من عدم وجود المستخدم مسبقاً
    const existingUser = await User.findOne({ email: testUserData.email });
    if (existingUser) {
      return res.json({
        success: true,
        message: 'المستخدم التجريبي موجود بالفعل',
        user: {
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          user_type: existingUser.user_type
        },
        credentials: {
          email: 'test@tabib-iq.com',
          password: '123456'
        }
      });
    }
    
    const testUser = new User(testUserData);
    await testUser.save();
    
    console.log('✅ تم إنشاء المستخدم التجريبي:', testUser.email);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم التجريبي بنجاح',
      user: {
        _id: testUser._id,
        name: testUser.name,
        email: testUser.email,
        user_type: testUser.user_type
      },
      credentials: {
        email: 'test@tabib-iq.com',
        password: '123456'
      }
    });
    
  } catch (error) {
    console.error('❌ Create test user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في الخادم',
      error: error.message 
    });
  }
});

// Doctors endpoint
app.get('/api/doctors', async (req, res) => {
  try {
    console.log('🔍 جلب الأطباء...');
    
    // جلب جميع الأطباء من جدول User
    const allDoctors = await User.find({ 
      user_type: 'doctor'
    }).select('name email phone user_type specialty province area clinicLocation about experienceYears workTimes image idFront idBack syndicateFront syndicateBack status isVerified isAvailable active disabled approved createdAt');
    
    console.log(`📊 إجمالي الأطباء: ${allDoctors.length}`);
    
    // فلترة الأطباء النشطين
    const activeDoctors = allDoctors.filter(doctor => {
      // إذا كان الطبيب معطل صراحةً
      if (doctor.disabled === true) return false;
      
      // إذا كان الطبيب غير نشط صراحةً
      if (doctor.active === false) return false;
      
      // إذا كان الطبيب محذوف
      if (doctor.deleted === true) return false;
      
      // للأطباء الحقيقيين، تحقق من الحالة
      if (doctor.status && doctor.status !== 'approved' && doctor.approved !== true) return false;
      
      // في جميع الحالات الأخرى، اعتباره نشط
      return true;
    });
    
    console.log(`✅ الأطباء النشطين: ${activeDoctors.length}`);
    console.log('🔍 الأطباء:', activeDoctors.map(d => ({ 
      name: d.name, 
      email: d.email, 
      specialty: d.specialty,
      active: d.active,
      disabled: d.disabled,
      status: d.status,
      approved: d.approved,
      workTimes: d.workTimes
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
    
    const allUsers = await User.find({}).select('name email user_type active isActive specialty status approved');
    const doctors = allUsers.filter(u => u.user_type === 'doctor');
    const activeDoctors = doctors.filter(d => d.active && d.isActive && (d.status === 'approved' || d.approved === true));
    
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
    
    const allUsers = await User.find({}).select('name email user_type active isActive specialty phone status approved createdAt');
    
    // تجميع المستخدمين حسب النوع
    const regularUsers = allUsers.filter(u => u.user_type === 'user');
    const doctors = allUsers.filter(u => u.user_type === 'doctor');
    const admins = allUsers.filter(u => u.user_type === 'admin');
    
    // تجميع الأطباء حسب الحالة
    const activeDoctors = doctors.filter(d => d.active && d.isActive && (d.status === 'approved' || d.approved === true));
    const inactiveDoctors = doctors.filter(d => !d.active || !d.isActive || (d.status !== 'approved' && d.approved !== true));
    
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

// Convert old doctor to new system - تحويل الطبيب القديم للنظام الجديد
app.post('/api/convert-doctor/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 تحويل الطبيب للنظام الجديد:', userId);
    
    // البحث عن الطبيب في جدول User
    const oldDoctor = await User.findById(userId);
    if (!oldDoctor || oldDoctor.user_type !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود في النظام القديم'
      });
    }
    
    // التحقق من عدم وجود الطبيب في جدول Doctor
    const existingDoctor = await Doctor.findOne({ userId: userId });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'الطبيب محول مسبقاً للنظام الجديد'
      });
    }
    
    // إنشاء ملف الطبيب الجديد
    const newDoctorData = {
      userId: oldDoctor._id,
      email: oldDoctor.email,
      name: oldDoctor.name,
      phone: oldDoctor.phone,
      specialty: oldDoctor.specialty || 'غير محدد',
      province: oldDoctor.province || 'غير محدد',
      area: oldDoctor.area || '',
      clinicLocation: oldDoctor.clinicLocation || '',
      about: oldDoctor.about || '',
      experienceYears: oldDoctor.experienceYears || '',
      workTimes: oldDoctor.workTimes || [],
      status: oldDoctor.status || 'pending',
      isVerified: oldDoctor.isVerified || false,
      isAvailable: oldDoctor.isAvailable !== false,
      active: oldDoctor.active !== false,
      disabled: oldDoctor.disabled || false,
      is_featured: oldDoctor.is_featured || false,
      user_type: 'doctor',
      rating: oldDoctor.rating || 0,
      totalRatings: oldDoctor.totalRatings || 0,
      image: oldDoctor.image || '',
      idFront: oldDoctor.idFront || '',
      idBack: oldDoctor.idBack || '',
      syndicateFront: oldDoctor.syndicateFront || '',
      syndicateBack: oldDoctor.syndicateBack || ''
    };
    
    const newDoctor = new Doctor(newDoctorData);
    await newDoctor.save();
    
    console.log('✅ تم تحويل الطبيب بنجاح:', oldDoctor.name);
    
    res.json({
      success: true,
      message: 'تم تحويل الطبيب للنظام الجديد بنجاح',
      oldDoctor: {
        _id: oldDoctor._id,
        name: oldDoctor.name,
        email: oldDoctor.email
      },
      newDoctor: {
        _id: newDoctor._id,
        name: newDoctor.name,
        email: newDoctor.email,
        specialty: newDoctor.specialty
      }
    });
    
  } catch (error) {
    console.error('❌ Convert doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحويل الطبيب',
      error: error.message
    });
  }
});

// Convert all old doctors to new system - تحويل جميع الأطباء القدامى للنظام الجديد
app.post('/api/convert-all-doctors', async (req, res) => {
  try {
    console.log('🔍 تحويل جميع الأطباء القدامى للنظام الجديد...');
    
    // جلب جميع الأطباء من جدول User
    const oldDoctors = await User.find({ user_type: 'doctor' });
    console.log(`📊 إجمالي الأطباء القدامى: ${oldDoctors.length}`);
    
    const convertedDoctors = [];
    const skippedDoctors = [];
    
    for (const oldDoctor of oldDoctors) {
      try {
        // التحقق من عدم وجود الطبيب في جدول Doctor
        const existingDoctor = await Doctor.findOne({ userId: oldDoctor._id });
        if (existingDoctor) {
          skippedDoctors.push({
            _id: oldDoctor._id,
            name: oldDoctor.name,
            email: oldDoctor.email,
            reason: 'محول مسبقاً'
          });
          continue;
        }
        
        // إنشاء ملف الطبيب الجديد
        const newDoctorData = {
          userId: oldDoctor._id,
          email: oldDoctor.email,
          name: oldDoctor.name,
          phone: oldDoctor.phone,
          specialty: oldDoctor.specialty || 'غير محدد',
          province: oldDoctor.province || 'غير محدد',
          area: oldDoctor.area || '',
          clinicLocation: oldDoctor.clinicLocation || '',
          about: oldDoctor.about || '',
          experienceYears: oldDoctor.experienceYears || '',
          workTimes: oldDoctor.workTimes || [],
          status: oldDoctor.status || 'pending',
          isVerified: oldDoctor.isVerified || false,
          isAvailable: oldDoctor.isAvailable !== false,
          active: oldDoctor.active !== false,
          disabled: oldDoctor.disabled || false,
          is_featured: oldDoctor.is_featured || false,
          user_type: 'doctor',
          rating: oldDoctor.rating || 0,
          totalRatings: oldDoctor.totalRatings || 0,
          image: oldDoctor.image || '',
          idFront: oldDoctor.idFront || '',
          idBack: oldDoctor.idBack || '',
          syndicateFront: oldDoctor.syndicateFront || '',
          syndicateBack: oldDoctor.syndicateBack || ''
        };
        
        const newDoctor = new Doctor(newDoctorData);
        await newDoctor.save();
        
        convertedDoctors.push({
          oldId: oldDoctor._id,
          newId: newDoctor._id,
          name: oldDoctor.name,
          email: oldDoctor.email
        });
        
        console.log(`✅ تم تحويل الطبيب: ${oldDoctor.name}`);
        
      } catch (error) {
        console.error(`❌ خطأ في تحويل الطبيب ${oldDoctor.name}:`, error.message);
        skippedDoctors.push({
          _id: oldDoctor._id,
          name: oldDoctor.name,
          email: oldDoctor.email,
          reason: error.message
        });
      }
    }
    
    console.log(`✅ تم تحويل ${convertedDoctors.length} طبيب بنجاح`);
    console.log(`⚠️ تم تخطي ${skippedDoctors.length} طبيب`);
    
    res.json({
      success: true,
      message: `تم تحويل ${convertedDoctors.length} طبيب بنجاح`,
      convertedCount: convertedDoctors.length,
      skippedCount: skippedDoctors.length,
      convertedDoctors: convertedDoctors,
      skippedDoctors: skippedDoctors
    });
    
  } catch (error) {
    console.error('❌ Convert all doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحويل الأطباء',
      error: error.message
    });
  }
});

// Check doctors status - فحص حالة الأطباء في كلا الجدولين
app.get('/api/check-doctors-status', async (req, res) => {
  try {
    console.log('🔍 فحص حالة الأطباء في كلا الجدولين...');
    
    // جلب الأطباء من جدول User
    const userDoctors = await User.find({ user_type: 'doctor' }).select('_id name email specialty active isActive');
    console.log(`📊 الأطباء في جدول User: ${userDoctors.length}`);
    
    // جلب الأطباء من جدول Doctor
    const doctorDoctors = await Doctor.find({}).select('_id userId name email specialty status active disabled');
    console.log(`📊 الأطباء في جدول Doctor: ${doctorDoctors.length}`);
    
    // تحليل الأطباء
    const analysis = {
      userTable: {
        total: userDoctors.length,
        active: userDoctors.filter(d => d.active && d.isActive).length,
        inactive: userDoctors.filter(d => !d.active || !d.isActive).length,
        doctors: userDoctors
      },
      doctorTable: {
        total: doctorDoctors.length,
        approved: doctorDoctors.filter(d => d.status === 'approved').length,
        pending: doctorDoctors.filter(d => d.status === 'pending').length,
        active: doctorDoctors.filter(d => d.active && !d.disabled).length,
        inactive: doctorDoctors.filter(d => !d.active || d.disabled).length,
        doctors: doctorDoctors
      },
      conversionStatus: {
        converted: doctorDoctors.length,
        notConverted: userDoctors.length - doctorDoctors.length,
        orphaned: doctorDoctors.filter(d => !d.userId).length
      }
    };
    
    console.log('📋 تحليل الأطباء:', analysis);
    
    res.json({
      success: true,
      analysis: analysis
    });
    
  } catch (error) {
    console.error('❌ Check doctors status error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في فحص حالة الأطباء',
      error: error.message
    });
  }
});

// Test login endpoint - اختبار تسجيل الدخول
app.post('/api/test-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🧪 اختبار تسجيل الدخول:', { email });
    
    // البحث في المستخدمين
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'المستخدم غير موجود',
        test: true
      });
    }
    
    // اختبار كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'كلمة المرور غير صحيحة',
        test: true
      });
    }
    
    res.json({
      success: true,
      message: 'اختبار تسجيل الدخول نجح',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        user_type: user.user_type
      },
      test: true
    });
    
  } catch (error) {
    console.error('❌ Test login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في الخادم',
      error: error.message,
      test: true
    });
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

// Get doctor details - جلب تفاصيل الطبيب
app.get('/api/doctors/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    console.log('🔍 جلب تفاصيل الطبيب:', doctorId);
    
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
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

// Change password endpoint - تغيير كلمة المرور
app.put('/api/change-password/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    console.log('🔍 تغيير كلمة المرور للمستخدم:', userId);
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'كلمة المرور الحالية والجديدة مطلوبة' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' 
      });
    }
    
    // البحث عن المستخدم
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'المستخدم غير موجود' 
      });
    }
    
    // التحقق من كلمة المرور الحالية
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'كلمة المرور الحالية غير صحيحة' 
      });
    }
    
    // تشفير كلمة المرور الجديدة
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    
    // تحديث كلمة المرور
    user.password = hashedNewPassword;
    await user.save();
    
    console.log('✅ تم تغيير كلمة المرور بنجاح للمستخدم:', user.email);
    
    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في تغيير كلمة المرور:', error);
    res.status(500).json({ 
      success: false, 
      error: 'خطأ في الخادم' 
    });
  }
});

// Approve doctor - الموافقة على الطبيب
app.put('/api/doctors/:doctorId/approve', async (req, res) => {
  try {
    const { doctorId } = req.params;
    console.log('🔍 الموافقة على الطبيب:', doctorId);
    
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ 
        success: false,
        message: 'الطبيب غير موجود' 
      });
    }
    
    doctor.status = 'approved';
    doctor.isVerified = true;
    doctor.disabled = false;
    doctor.active = true;
    await doctor.save();
    
    console.log('✅ تم الموافقة على الطبيب:', doctor.name);
    
    res.json({
      success: true,
      message: 'تم الموافقة على الطبيب بنجاح',
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty,
        status: doctor.status
      }
    });
  } catch (error) {
    console.error('❌ Approve doctor error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في الموافقة على الطبيب',
      error: error.message 
    });
  }
});

// Reject doctor - رفض الطبيب
app.put('/api/doctors/:doctorId/reject', async (req, res) => {
  try {
    const { doctorId } = req.params;
    console.log('🔍 رفض الطبيب:', doctorId);
    
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ 
        success: false,
        message: 'الطبيب غير موجود' 
      });
    }
    
    doctor.status = 'rejected';
    doctor.isVerified = false;
    doctor.disabled = true;
    doctor.active = false;
    await doctor.save();
    
    console.log('❌ تم رفض الطبيب:', doctor.name);
    
    res.json({
      success: true,
      message: 'تم رفض الطبيب بنجاح',
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty,
        status: doctor.status
      }
    });
  } catch (error) {
    console.error('❌ Reject doctor error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في رفض الطبيب',
      error: error.message 
    });
  }
});

// Delete user - حذف المستخدم
app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 حذف المستخدم:', userId);
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'المستخدم غير موجود' 
      });
    }
    
    // حذف جميع مواعيد المستخدم
    await Appointment.deleteMany({ userId: userId });
    
    // حذف المستخدم
    await User.findByIdAndDelete(userId);
    
    console.log('✅ تم حذف المستخدم:', user.name);
    
    res.json({
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في حذف المستخدم',
      error: error.message 
    });
  }
});

// Delete doctor - حذف الطبيب
app.delete('/api/doctors/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    console.log('🔍 حذف الطبيب:', doctorId);
    
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ 
        success: false,
        message: 'الطبيب غير موجود' 
      });
    }
    
    // حذف جميع مواعيد الطبيب
    await Appointment.deleteMany({ doctorId: doctorId });
    
    // حذف المستخدم المرتبط بالطبيب
    if (doctor.userId) {
      await User.findByIdAndDelete(doctor.userId);
    }
    
    // حذف الطبيب
    await Doctor.findByIdAndDelete(doctorId);
    
    console.log('✅ تم حذف الطبيب:', doctor.name);
    
    res.json({
      success: true,
      message: 'تم حذف الطبيب بنجاح'
    });
  } catch (error) {
    console.error('❌ Delete doctor error:', error);
    res.status(500).json({ 
      success: false,
      message: 'خطأ في حذف الطبيب',
      error: error.message 
    });
  }
});

// Upload profile image endpoint - رفع الصورة الشخصية
app.post('/api/upload-profile-image', upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'لم يتم اختيار صورة' 
      });
    }
    
    const { userId } = req.body;
    console.log('🔍 رفع الصورة الشخصية للمستخدم:', userId);
    
    // التحقق من وجود المستخدم
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'المستخدم غير موجود' 
      });
    }
    
    // حفظ مسار الصورة
    const imagePath = `/uploads/${req.file.filename}`;
    user.profileImage = imagePath;
    await user.save();
    
    console.log('✅ تم رفع الصورة الشخصية بنجاح:', imagePath);
    
    res.json({
      success: true,
      imagePath: imagePath,
      message: 'تم رفع الصورة الشخصية بنجاح'
    });
    
  } catch (error) {
    console.error('❌ خطأ في رفع الصورة الشخصية:', error);
    res.status(500).json({ 
      success: false, 
      error: 'خطأ في رفع الصورة' 
    });
  }
});

// Doctor registration endpoint
app.post('/api/doctors', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'idFront', maxCount: 1 },
  { name: 'idBack', maxCount: 1 },
  { name: 'syndicateFront', maxCount: 1 },
  { name: 'syndicateBack', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📤 استلام طلب تسجيل طبيب جديد');
    console.log('📋 البيانات المستلمة:', req.body);
    console.log('📁 الملفات المستلمة:', req.files);
    
    const {
      name,
      email,
      phone,
      password,
      specialty,
      province,
      area,
      clinicLocation,
      about,
      experienceYears,
      workTimes
    } = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!name || !email || !phone || !password || !specialty || !province) {
      return res.status(400).json({
        success: false,
        error: 'جميع الحقول المطلوبة يجب ملؤها'
      });
    }
    
    // التحقق من عدم وجود المستخدم
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }
    
    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // إنشاء المستخدم الأساسي
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
    console.log('✅ تم إنشاء المستخدم للطبيب:', user._id);
    
    // إنشاء ملف الطبيب منفصل (مثل النظام القديم)
    const doctorData = {
      userId: user._id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      specialty: specialty,
      province: province,
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
    
    // إضافة الصور والوثائق إذا كانت موجودة
    if (req.files) {
      if (req.files.image) {
        doctorData.image = `/uploads/${req.files.image[0].filename}`;
        console.log('✅ تم حفظ صورة الملف الشخصي:', doctorData.image);
      }
      if (req.files.idFront) {
        doctorData.idFront = `/uploads/${req.files.idFront[0].filename}`;
        console.log('✅ تم حفظ صورة الهوية الأمامية:', doctorData.idFront);
      }
      if (req.files.idBack) {
        doctorData.idBack = `/uploads/${req.files.idBack[0].filename}`;
        console.log('✅ تم حفظ صورة الهوية الخلفية:', doctorData.idBack);
      }
      if (req.files.syndicateFront) {
        doctorData.syndicateFront = `/uploads/${req.files.syndicateFront[0].filename}`;
        console.log('✅ تم حفظ صورة النقابة الأمامية:', doctorData.syndicateFront);
      }
      if (req.files.syndicateBack) {
        doctorData.syndicateBack = `/uploads/${req.files.syndicateBack[0].filename}`;
        console.log('✅ تم حفظ صورة النقابة الخلفية:', doctorData.syndicateBack);
      }
    }
    
    console.log('📋 مواعيد العمل:', doctorData.workTimes);
    
    // إنشاء ملف الطبيب
    const doctor = new Doctor(doctorData);
    await doctor.save();
    
    console.log('✅ تم إنشاء ملف الطبيب بنجاح:', doctor._id);
    console.log('📋 بيانات الطبيب المحفوظة:', {
      name: doctor.name,
      email: doctor.email,
      specialty: doctor.specialty,
      workTimes: doctor.workTimes,
      image: doctor.image,
      idFront: doctor.idFront,
      idBack: doctor.idBack,
      syndicateFront: doctor.syndicateFront,
      syndicateBack: doctor.syndicateBack
    });
    
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
  console.log('🚀 Starting Tabib IQ Backend...');
  console.log('📁 Current directory:', process.cwd());
  console.log('🔧 Node version:', process.version);
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔧 Environment variables:');
  console.log('  - JWT_SECRET:', process.env.JWT_SECRET ? '✅ Defined' : '❌ Not defined');
  console.log('  - MONGO_URI:', process.env.MONGO_URI ? '✅ Defined' : '❌ Not defined');
  console.log('  - PORT:', process.env.PORT || 5000);
  console.log('  - NODE_ENV:', process.env.NODE_ENV || 'development');
  
  const dbConnected = await connectDB();
  
  if (dbConnected) {
    // التحقق من وجود الأدمن في قاعدة البيانات وإنشاء الأدمن الافتراضي
    try {
      const defaultAdminEmail = 'admin@tabib-iq.com';
      const adminExists = await Admin.findOne({ email: defaultAdminEmail });
      
      if (adminExists) {
        console.log('✅ الأدمن الافتراضي موجود في قاعدة البيانات:', defaultAdminEmail);
      } else {
        // إنشاء الأدمن الافتراضي
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
      
      // التحقق من الأدمن القديم أيضاً
      const oldAdminExists = await Admin.findOne({ email: 'adMinaBuBaKeRAK@tabibIQ.trIQ' });
      if (oldAdminExists) {
        console.log('✅ الأدمن القديم موجود أيضاً في قاعدة البيانات');
      }
      
    } catch (error) {
      console.log('⚠️ خطأ في التحقق من الأدمن:', error.message);
    }
  } else {
    console.log('⚠️ تحذير: الخادم يعمل بدون قاعدة بيانات');
    console.log('⚠️ بعض الميزات قد لا تعمل بشكل صحيح');
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Test admin: http://localhost:${PORT}/api/test-admin`);
    console.log(`🌐 Admin init: http://localhost:${PORT}/api/admin/init`);
    console.log(`🌐 Admin list: http://localhost:${PORT}/api/admin/list`);
    console.log(`🌐 Create test user: http://localhost:${PORT}/api/create-test-user`);
    console.log(`🌐 Test login: http://localhost:${PORT}/api/test-login`);
    console.log(`🌐 Doctors: http://localhost:${PORT}/api/doctors`);
    console.log(`🌐 Convert all doctors: http://localhost:${PORT}/api/convert-all-doctors`);
    console.log(`🌐 Check doctors status: http://localhost:${PORT}/api/check-doctors-status`);
    console.log(`📊 Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`🔑 Default Admin: admin@tabib-iq.com / Admin123!@#`);
    console.log(`🧪 Test User: test@tabib-iq.com / 123456`);
  });
};

startServer().catch(console.error); 
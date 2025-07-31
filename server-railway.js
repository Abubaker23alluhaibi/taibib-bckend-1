const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const jwt = require('jsonwebtoken');

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
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const connectDB = async () => {
  try {
    console.log('🔍 محاولة الاتصال بقاعدة البيانات...');
    console.log('🔧 MONGO_URI exists:', !!process.env.MONGO_URI);
    console.log('🔧 MONGO_URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 0);
    console.log('🔧 MONGO_URI preview:', process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 50) + '...' : 'Not defined');
    
    // إضافة خيارات اتصال أفضل
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 ثواني
      socketTimeoutMS: 45000, // 45 ثانية
      connectTimeoutMS: 10000, // 10 ثواني
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
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
  city: { type: String },
  workTimes: [{
    day: String,
    from: String,
    to: String
  }],
  isActive: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
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

// Health check endpoint
app.get('/api/health', (req, res) => {
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
    models: {
      user: User ? 'initialized' : 'not initialized',
      admin: Admin ? 'initialized' : 'not initialized',
      appointment: Appointment ? 'initialized' : 'not initialized'
    }
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
    const defaultAdminEmail = 'admin@tabib-iq.com';
    const defaultAdminPassword = 'Admin123!@#';
    
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
  
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Test admin: http://localhost:${PORT}/api/test-admin`);
    console.log(`🌐 Admin init: http://localhost:${PORT}/api/admin/init`);
    console.log(`🌐 Admin list: http://localhost:${PORT}/api/admin/list`);
    console.log(`🌐 Create test user: http://localhost:${PORT}/api/create-test-user`);
    console.log(`🌐 Test login: http://localhost:${PORT}/api/test-login`);
    console.log(`📊 Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`🔑 Default Admin: admin@tabib-iq.com / Admin123!@#`);
    console.log(`🧪 Test User: test@tabib-iq.com / 123456`);
  });
};

startServer().catch(console.error); 
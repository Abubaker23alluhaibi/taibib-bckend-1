const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware - FIXED for all origins
app.use((req, res, next) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abubaker:baker123@cluster0.kamrxrt.mongodb.net/tabibiq?retryWrites=true&w=majority&appName=Cluster0';

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

// Schemas for all collections
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

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

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  specialty: { type: String },
  address: { type: String },
  experience: { type: String },
  education: { type: String },
  isActive: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

const centerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  address: { type: String },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

// Initialize models
let Admin = null;
let User = null;
let Doctor = null;
let Center = null;

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Complete Database Server is running',
    database: dbStatus
  });
});

// Root endpoint
app.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    message: 'Tabib IQ API is running! (Complete Database)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'Server is running',
    database: dbStatus,
    endpoints: [
      'GET /', 
      'GET /api/health', 
      'GET /api/all-users',
      'GET /api/admins',
      'GET /api/doctors', 
      'GET /api/users',
      'GET /api/centers',
      'POST /api/auth/login', 
      'POST /api/auth/register'
    ]
  });
});

// Get all users from all collections
app.get('/api/all-users', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'قاعدة البيانات غير متاحة حالياً' });
    }

    // Get users from all collections
    const admins = await Admin.find({}, { password: 0 }).sort({ createdAt: -1 });
    const doctors = await Doctor.find({}, { password: 0 }).sort({ createdAt: -1 });
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    const centers = await Center.find({}, { password: 0 }).sort({ createdAt: -1 });

    res.json({
      message: 'جميع المستخدمين من قاعدة البيانات',
      admins: {
        count: admins.length,
        users: admins
      },
      doctors: {
        count: doctors.length,
        users: doctors
      },
      users: {
        count: users.length,
        users: users
      },
      centers: {
        count: centers.length,
        users: centers
      },
      total: admins.length + doctors.length + users.length + centers.length
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'خطأ في استخراج المستخدمين', error: error.message });
  }
});

// Get admins
app.get('/api/admins', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'قاعدة البيانات غير متاحة حالياً' });
    }

    const admins = await Admin.find({}, { password: 0 }).sort({ createdAt: -1 });
    
    res.json({
      message: 'جميع المدراء',
      count: admins.length,
      admins: admins
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
});

// Get doctors
app.get('/api/doctors', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'قاعدة البيانات غير متاحة حالياً' });
    }

    const doctors = await Doctor.find({}, { password: 0 }).sort({ createdAt: -1 });
    
    res.json({
      message: 'جميع الأطباء',
      count: doctors.length,
      doctors: doctors
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
});

// Get users
app.get('/api/users', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'قاعدة البيانات غير متاحة حالياً' });
    }

    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    
    res.json({
      message: 'جميع المستخدمين',
      count: users.length,
      users: users
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
});

// Get centers
app.get('/api/centers', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'قاعدة البيانات غير متاحة حالياً' });
    }

    const centers = await Center.find({}, { password: 0 }).sort({ createdAt: -1 });
    
    res.json({
      message: 'جميع المراكز الصحية',
      count: centers.length,
      centers: centers
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
});

// Login endpoint - handles all user types
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    
    const { email, password, loginType } = req.body;
    
    if (!email || !password || !loginType) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'قاعدة البيانات غير متاحة حالياً' });
    }
    
    let user = null;
    let userType = '';

    // Find user based on login type
    switch (loginType) {
      case 'admin':
        user = await Admin.findOne({ 
          email: email,
          $or: [
            { active: true },
            { isActive: true }
          ]
        });
        userType = 'admin';
        break;
        
      case 'doctor':
        user = await Doctor.findOne({ 
          email: email,
          $or: [
            { active: true },
            { isActive: true }
          ]
        });
        userType = 'doctor';
        break;
        
      case 'user':
        user = await User.findOne({ 
          email: email,
          user_type: 'user',
          $or: [
            { active: true },
            { isActive: true }
          ]
        });
        userType = 'user';
        break;
        
      case 'center':
        user = await Center.findOne({ 
          email: email,
          $or: [
            { active: true },
            { isActive: true }
          ]
        });
        userType = 'center';
        break;
        
      default:
        return res.status(400).json({ message: 'نوع المستخدم غير صحيح' });
    }
    
    if (!user) {
      return res.status(401).json({ 
        message: 'البريد الإلكتروني غير موجود أو نوع المستخدم غير صحيح' 
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
    }
    
    // Return user data (without password)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      user_type: userType,
      role: user.role || null,
      specialty: user.specialty || null,
      address: user.address || null,
      experience: user.experience || null,
      education: user.education || null,
      description: user.description || null,
      isActive: user.isActive || user.active || true,
      createdAt: user.createdAt
    };
    
    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      user: userResponse,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Register attempt:', req.body);
    
    const { name, email, phone, password, user_type, specialty, address, experience, education, description } = req.body;
    
    if (!name || !email || !password || !user_type) {
      return res.status(400).json({ message: 'جميع الحقول المطلوبة يجب ملؤها' });
    }
    
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'قاعدة البيانات غير متاحة حالياً' });
    }
    
    // Check if email already exists in any collection
    const existingAdmin = await Admin.findOne({ email });
    const existingDoctor = await Doctor.findOne({ email });
    const existingUser = await User.findOne({ email });
    const existingCenter = await Center.findOne({ email });
    
    if (existingAdmin || existingDoctor || existingUser || existingCenter) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let newUser = null;
    
    // Create user based on type
    switch (user_type) {
      case 'admin':
        newUser = new Admin({
          name,
          email,
          password: hashedPassword,
          role: 'admin',
          active: true
        });
        break;
        
      case 'doctor':
        newUser = new Doctor({
          name,
          email,
          phone,
          password: hashedPassword,
          specialty,
          address,
          experience,
          education,
          isActive: true
        });
        break;
        
      case 'user':
        newUser = new User({
          name,
          email,
          phone,
          password: hashedPassword,
          user_type: 'user',
          isActive: true
        });
        break;
        
      case 'center':
        newUser = new Center({
          name,
          email,
          phone,
          password: hashedPassword,
          address,
          description,
          isActive: true
        });
        break;
        
      default:
        return res.status(400).json({ message: 'نوع المستخدم غير صحيح' });
    }
    
    await newUser.save();
    
    // Return user data (without password)
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || null,
      user_type: user_type,
      role: newUser.role || null,
      specialty: newUser.specialty || null,
      address: newUser.address || null,
      experience: newUser.experience || null,
      education: newUser.education || null,
      description: newUser.description || null,
      isActive: newUser.isActive || newUser.active || true,
      createdAt: newUser.createdAt
    };
    
    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح',
      user: userResponse,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    origin: req.headers.origin || 'unknown',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    availableRoutes: [
      'GET /', 
      'GET /api/health', 
      'GET /api/all-users',
      'GET /api/admins',
      'GET /api/doctors', 
      'GET /api/users',
      'GET /api/centers',
      'GET /test', 
      'POST /api/auth/login', 
      'POST /api/auth/register'
    ],
    requestedUrl: req.originalUrl
  });
});

// Start server
const startServer = async () => {
  try {
    const PORT = process.env.PORT || 5000;
    
    // Connect to database
    const dbConnected = await connectDB();
    
    if (dbConnected) {
      // Initialize models after connection
      Admin = mongoose.model('Admin', adminSchema);
      User = mongoose.model('User', userSchema);
      Doctor = mongoose.model('Doctor', doctorSchema);
      Center = mongoose.model('Center', centerSchema);
      console.log('✅ All models initialized successfully');
    } else {
      console.log('⚠️ Server starting without database connection');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Complete Database Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 Root endpoint: http://localhost:${PORT}/`);
      console.log(`🔗 All users: http://localhost:${PORT}/api/all-users`);
      console.log(`✅ Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

startServer(); 
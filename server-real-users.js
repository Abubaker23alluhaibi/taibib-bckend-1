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

// User Schema - matches real database structure
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  user_type: { type: String, enum: ['user', 'doctor', 'admin'], required: true },
  role: { type: String }, // For admin role
  specialty: { type: String },
  address: { type: String },
  experience: { type: String },
  education: { type: String },
  isActive: { type: Boolean, default: true },
  active: { type: Boolean, default: true }, // Alternative field name
  createdAt: { type: Date, default: Date.now }
}, { strict: false }); // Allow additional fields

// Initialize models
let User = null;

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Real Users Server is running',
    database: dbStatus
  });
});

// Root endpoint
app.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    message: 'Tabib IQ API is running! (Real Users Only)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'Server is running',
    database: dbStatus,
    endpoints: ['GET /', 'GET /api/health', 'POST /api/auth/login', 'POST /api/auth/register', 'GET /api/users']
  });
});

// Login endpoint
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
    
    // Find user by email and login type - handle real database structure
    let user;
    
    if (loginType === 'admin') {
      // For admin, check both user_type and role fields
      user = await User.findOne({ 
        email: email, 
        $or: [
          { user_type: 'admin' },
          { role: 'admin' }
        ],
        $or: [
          { isActive: true },
          { active: true }
        ]
      });
    } else {
      // For users and doctors
      user = await User.findOne({ 
        email: email, 
        user_type: loginType,
        $or: [
          { isActive: true },
          { active: true }
        ]
      });
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
      phone: user.phone,
      user_type: user.user_type,
      specialty: user.specialty || null,
      address: user.address || null,
      experience: user.experience || null,
      education: user.education || null,
      isActive: user.isActive,
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
    
    const { name, email, phone, password, user_type, specialty, address, experience, education } = req.body;
    
    if (!name || !email || !password || !user_type) {
      return res.status(400).json({ message: 'جميع الحقول المطلوبة يجب ملؤها' });
    }
    
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'قاعدة البيانات غير متاحة حالياً' });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      user_type,
      specialty: specialty || null,
      address: address || null,
      experience: experience || null,
      education: education || null,
      isActive: true
    });
    
    await newUser.save();
    
    // Return user data (without password)
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      user_type: newUser.user_type,
      specialty: newUser.specialty || null,
      address: newUser.address || null,
      experience: newUser.experience || null,
      education: newUser.education || null,
      isActive: newUser.isActive,
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

// Get all users (for admin)
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

// Get users by type
app.get('/api/users/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'قاعدة البيانات غير متاحة حالياً' });
    }
    
    const users = await User.find({ 
      user_type: type, 
      isActive: true 
    }, { password: 0 }).sort({ createdAt: -1 });
    
    res.json({
      message: `المستخدمين من نوع: ${type}`,
      count: users.length,
      users: users
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
});

// Get real users from database
app.get('/api/real-users', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'قاعدة البيانات غير متاحة حالياً' });
    }

    // Get all users from database
    const allUsers = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    
    // Categorize users
    const admins = allUsers.filter(user => user.role === 'admin' || user.user_type === 'admin');
    const doctors = allUsers.filter(user => user.user_type === 'doctor');
    const users = allUsers.filter(user => user.user_type === 'user');

    res.json({
      message: 'المستخدمين الحقيقيين من قاعدة البيانات',
      total: allUsers.length,
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
      allUsers: allUsers
    });

  } catch (error) {
    console.error('Get real users error:', error);
    res.status(500).json({ message: 'خطأ في استخراج المستخدمين', error: error.message });
  }
});

// Create real users endpoint
app.post('/api/setup-users', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'قاعدة البيانات غير متاحة حالياً' });
    }

    // Real users data
    const realUsers = [
      {
        name: 'أحمد محمد علي',
        email: 'ahmed@tabib-iq.com',
        phone: '07701234567',
        password: '123456',
        user_type: 'user',
        isActive: true
      },
      {
        name: 'د. سارة أحمد حسن',
        email: 'sara@tabib-iq.com',
        phone: '07701234568',
        password: '123456',
        user_type: 'doctor',
        specialty: 'طب عام',
        experience: '5 سنوات',
        education: 'دكتوراه في الطب',
        isActive: true
      },
      {
        name: 'د. محمد علي كريم',
        email: 'mohammed@tabib-iq.com',
        phone: '07701234569',
        password: '123456',
        user_type: 'doctor',
        specialty: 'طب القلب',
        experience: '10 سنوات',
        education: 'دكتوراه في أمراض القلب',
        isActive: true
      },
      {
        name: 'د. فاطمة حسن أحمد',
        email: 'fatima@tabib-iq.com',
        phone: '07701234570',
        password: '123456',
        user_type: 'doctor',
        specialty: 'طب الأطفال',
        experience: '8 سنوات',
        education: 'دكتوراه في طب الأطفال',
        isActive: true
      },
      {
        name: 'مدير النظام',
        email: 'admin@tabib-iq.com',
        phone: '07701234571',
        password: '123456',
        user_type: 'admin',
        isActive: true
      }
    ];

    let createdUsers = [];
    let errors = [];

    for (const userData of realUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          errors.push(`المستخدم ${userData.email} موجود بالفعل`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create new user
        const newUser = new User({
          ...userData,
          password: hashedPassword
        });

        await newUser.save();
        createdUsers.push({
          name: newUser.name,
          email: newUser.email,
          user_type: newUser.user_type,
          specialty: newUser.specialty
        });

        console.log(`✅ تم إنشاء المستخدم: ${newUser.name} (${newUser.email})`);
      } catch (error) {
        errors.push(`خطأ في إنشاء ${userData.email}: ${error.message}`);
      }
    }

    res.json({
      message: 'تم إنشاء المستخدمين الحقيقيين',
      created: createdUsers.length,
      errors: errors.length,
      createdUsers: createdUsers,
      errors: errors
    });

  } catch (error) {
    console.error('Setup users error:', error);
    res.status(500).json({ message: 'خطأ في إنشاء المستخدمين', error: error.message });
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
    availableRoutes: ['GET /', 'GET /api/health', 'GET /test', 'GET /api/users', 'GET /api/users/:type', 'POST /api/auth/login', 'POST /api/auth/register'],
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
      User = mongoose.model('User', userSchema);
      console.log('✅ Models initialized successfully');
    } else {
      console.log('⚠️ Server starting without database connection');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Real Users Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 Root endpoint: http://localhost:${PORT}/`);
      console.log(`🔗 Users: http://localhost:${PORT}/api/users`);
      console.log(`✅ Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

startServer(); 
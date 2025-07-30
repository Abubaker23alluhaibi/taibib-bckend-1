const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware - allow all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Try to connect to database (optional)
let mongoose = null;
let User = null, Doctor = null, Center = null;
let dbConnected = false;

try {
  mongoose = require('mongoose');
  require('dotenv').config();
  
  const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq?retryWrites=true&w=majority&appName=Cluster0';
  
  // Connect to database
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('✅ MongoDB connected successfully');
      dbConnected = true;
      
      // Initialize models
      const userSchema = new mongoose.Schema({
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true },
        password: { type: String, required: true },
        user_type: { type: String, enum: ['user', 'doctor', 'center'], required: true },
        specialty: { type: String },
        address: { type: String },
        createdAt: { type: Date, default: Date.now }
      });

      const doctorSchema = new mongoose.Schema({
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true },
        password: { type: String, required: true },
        specialty: { type: String, required: true },
        experience: { type: String },
        education: { type: String },
        user_type: { type: String, default: 'doctor' },
        createdAt: { type: Date, default: Date.now }
      });

      const centerSchema = new mongoose.Schema({
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true },
        password: { type: String, required: true },
        address: { type: String, required: true },
        description: { type: String },
        user_type: { type: String, default: 'center' },
        createdAt: { type: Date, default: Date.now }
      });

      User = mongoose.model('User', userSchema);
      Doctor = mongoose.model('Doctor', doctorSchema);
      Center = mongoose.model('Center', centerSchema);
    })
    .catch((error) => {
      console.log('⚠️ MongoDB connection failed, using mock data');
      console.log('Error:', error.message);
      dbConnected = false;
    });
} catch (error) {
  console.log('⚠️ MongoDB not available, using mock data');
  dbConnected = false;
}

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = dbConnected ? 'connected' : 'mock-mode';
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Smart Server is running',
    database: dbStatus
  });
});

// Root endpoint
app.get('/', (req, res) => {
  const dbStatus = dbConnected ? 'connected' : 'mock-mode';
  res.json({
    message: 'Tabib IQ API is running! (Smart Server)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'Server is running',
    database: dbStatus,
    endpoints: ['GET /', 'GET /api/health', 'POST /api/auth/login', 'POST /api/auth/register']
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
    
    if (dbConnected && User && Doctor && Center) {
      // Use real database
      let user = null;
      
      switch (loginType) {
        case 'user':
          user = await User.findOne({ email });
          break;
        case 'doctor':
          user = await Doctor.findOne({ email });
          break;
        case 'center':
          user = await Center.findOne({ email });
          break;
        default:
          return res.status(400).json({ message: 'نوع المستخدم غير صحيح' });
      }
      
      if (!user) {
        return res.status(401).json({ message: 'البريد الإلكتروني غير موجود' });
      }
      
      // Check password (assuming it's hashed)
      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
      }
      
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
        description: user.description || null
      };
      
      res.json({
        message: 'تم تسجيل الدخول بنجاح (قاعدة بيانات حقيقية)',
        user: userResponse,
        timestamp: new Date().toISOString()
      });
    } else {
      // Use mock data
      res.json({
        message: 'تم تسجيل الدخول بنجاح (بيانات تجريبية)',
        user: {
          _id: 'mock-user-' + Date.now(),
          name: 'مستخدم تجريبي',
          email: email,
          phone: '07701234567',
          user_type: loginType,
          specialty: loginType === 'doctor' ? 'طب عام' : null,
          address: loginType === 'center' ? 'بغداد، العراق' : null
        },
        timestamp: new Date().toISOString()
      });
    }
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
    
    if (!name || !email || !phone || !password || !user_type) {
      return res.status(400).json({ message: 'جميع الحقول المطلوبة يجب ملؤها' });
    }
    
    if (dbConnected && User && Doctor && Center) {
      // Use real database
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      let newUser = null;
      
      switch (user_type) {
        case 'user':
          newUser = new User({
            name, email, phone, password: hashedPassword, user_type
          });
          break;
        case 'doctor':
          newUser = new Doctor({
            name, email, phone, password: hashedPassword, specialty, experience, education, user_type
          });
          break;
        case 'center':
          newUser = new Center({
            name, email, phone, password: hashedPassword, address, description, user_type
          });
          break;
        default:
          return res.status(400).json({ message: 'نوع المستخدم غير صحيح' });
      }
      
      await newUser.save();
      
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
        description: newUser.description || null
      };
      
      res.status(201).json({
        message: 'تم إنشاء الحساب بنجاح (قاعدة بيانات حقيقية)',
        user: userResponse,
        timestamp: new Date().toISOString()
      });
    } else {
      // Use mock data
      res.status(201).json({
        message: 'تم إنشاء الحساب بنجاح (بيانات تجريبية)',
        user: {
          _id: 'mock-new-user-' + Date.now(),
          name: name,
          email: email,
          phone: phone,
          user_type: user_type,
          specialty: user_type === 'doctor' ? 'طب عام' : null,
          address: user_type === 'center' ? 'بغداد، العراق' : null
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }
    res.status(500).json({ message: 'خطأ في الخادم', error: error.message });
  }
});

// Get all users (for testing)
app.get('/api/users', async (req, res) => {
  try {
    if (dbConnected && User && Doctor && Center) {
      const users = await User.find({}, { password: 0 });
      const doctors = await Doctor.find({}, { password: 0 });
      const centers = await Center.find({}, { password: 0 });
      
      res.json({
        message: 'جميع المستخدمين (قاعدة بيانات حقيقية)',
        users: [...users, ...doctors, ...centers]
      });
    } else {
      res.json({
        message: 'بيانات تجريبية',
        users: [
          { _id: 'mock1', name: 'أحمد محمد', email: 'user1@test.com', user_type: 'user' },
          { _id: 'mock2', name: 'د. سارة أحمد', email: 'doctor1@test.com', user_type: 'doctor' },
          { _id: 'mock3', name: 'مركز الصحة الأول', email: 'center1@test.com', user_type: 'center' }
        ]
      });
    }
  } catch (error) {
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
    database: dbConnected ? 'connected' : 'mock-mode'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    availableRoutes: ['GET /', 'GET /api/health', 'GET /test', 'GET /api/users', 'POST /api/auth/login', 'POST /api/auth/register'],
    requestedUrl: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Smart Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Root endpoint: http://localhost:${PORT}/`);
  console.log(`🔗 Users: http://localhost:${PORT}/api/users`);
  console.log(`✅ Database: ${dbConnected ? 'Connected' : 'Mock Mode'}`);
}); 
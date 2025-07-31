const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

// Override with local env if exists
try {
  const fs = require('fs');
  const localEnvPath = path.join(__dirname, 'env.local');
  console.log('🔍 فحص ملف env.local:', localEnvPath);
  console.log('🔧 ملف env.local موجود:', fs.existsSync(localEnvPath));
  
  if (fs.existsSync(localEnvPath)) {
    const envContent = fs.readFileSync(localEnvPath, 'utf8');
    console.log('📄 محتوى ملف env.local:', envContent);
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
        console.log(`🔧 تم تعيين ${key.trim()}: ${value.trim()}`);
      }
    });
    console.log('✅ تم تحميل ملف env.local بنجاح');
  } else {
    console.log('⚠️ ملف env.local غير موجود - استخدام الإعدادات الافتراضية');
  }
} catch (error) {
  console.log('⚠️ Could not load local env file:', error.message);
}

const app = express();

// CORS Configuration for Local Development
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://tabib-iq.com',
    'https://www.tabib-iq.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection with Local Optimizations
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq';

const connectDB = async () => {
  try {
    console.log('🔍 محاولة الاتصال بقاعدة البيانات (Local Development)...');
    console.log('🔧 MONGO_URI exists:', !!process.env.MONGO_URI);
    console.log('🔧 MONGO_URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 0);
    console.log('🔧 MONGO_URI preview:', process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 50) + '...' : 'Not defined');
    
    // خيارات اتصال محسنة للبيئة المحلية
    const options = {
      serverSelectionTimeoutMS: 15000, // 15 ثانية
      socketTimeoutMS: 60000, // 60 ثانية
      connectTimeoutMS: 20000, // 20 ثانية
      maxPoolSize: 5,
      minPoolSize: 1,
      retryWrites: true,
      w: 'majority',
      family: 4 // استخدام IPv4 فقط
    };
    
    console.log('🔧 Using local connection options:', options);
    
    await mongoose.connect(MONGO_URI, options);
    console.log('✅ MongoDB connected successfully (Local)');
    
    // اختبار الاتصال
    const adminCount = await Admin.countDocuments();
    const userCount = await User.countDocuments();
    console.log(`📊 قاعدة البيانات تحتوي على ${adminCount} أدمن و ${userCount} مستخدم`);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error (Local):', error.message);
    console.error('❌ Error details:', error);
    
    // معالجة خاصة لخطأ DNS في البيئة المحلية
    if (error.code === 'ETIMEOUT' || error.message.includes('queryTxt') || error.message.includes('ENOTFOUND')) {
      console.log('⚠️ خطأ DNS timeout في البيئة المحلية');
      console.log('💡 نصائح لحل المشكلة:');
      console.log('   1. تحقق من اتصال الإنترنت');
      console.log('   2. جرب تغيير DNS إلى 8.8.8.8');
      console.log('   3. تحقق من إعدادات الجدار الناري');
      console.log('   4. جرب استخدام VPN');
      
      // محاولة الاتصال بخيارات مختلفة
      const fallbackOptions = [
        {
          uri: 'mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq?retryWrites=true&w=majority',
          options: {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 15000,
            family: 4
          }
        },
        {
          uri: 'mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq?retryWrites=true&w=majority',
          options: {
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 35000,
            connectTimeoutMS: 12000,
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

// Admin Schema
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Test Admin Endpoint
app.get('/api/test-admin', async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: 'admin@tabib-iq.com' });
    if (admin) {
      res.json({
        message: 'Admin exists',
        email: admin.email,
        name: admin.name
      });
    } else {
      res.json({ message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize Admin
app.post('/api/admin/init', async (req, res) => {
  try {
    const adminExists = await Admin.findOne({ email: 'admin@tabib-iq.com' });
    if (adminExists) {
      return res.json({ message: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
    const admin = new Admin({
      name: 'System Admin',
      email: 'admin@tabib-iq.com',
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    res.json({ message: 'Admin created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List Admins
app.get('/api/admin/list', async (req, res) => {
  try {
    const admins = await Admin.find({}, { password: 0 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Test User
app.post('/api/create-test-user', async (req, res) => {
  try {
    const userExists = await User.findOne({ email: 'test@tabib-iq.com' });
    if (userExists) {
      return res.json({ message: 'Test user already exists' });
    }

    const hashedPassword = await bcrypt.hash('123456', 10);
    const user = new User({
      name: 'Test User',
      email: 'test@tabib-iq.com',
      password: hashedPassword,
      user_type: 'user',
      phone: '123456789'
    });

    await user.save();
    res.json({ message: 'Test user created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test Login
app.post('/api/test-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.user_type },
      process.env.JWT_SECRET || 'tabib_iq_secret_key_2024',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        user_type: user.user_type
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
const startServer = async () => {
  console.log('🚀 Starting Tabib IQ Backend (Local Development)...');
  console.log('📁 Current directory:', __dirname);
  console.log('🔧 Node version:', process.version);
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  
  console.log('🔧 Environment variables:');
  console.log('  - JWT_SECRET:', process.env.JWT_SECRET ? '✅ Defined' : '❌ Not defined');
  console.log('  - MONGO_URI:', process.env.MONGO_URI ? '✅ Defined' : '❌ Not defined');
  console.log('  - PORT:', process.env.PORT || 5000);
  console.log('  - NODE_ENV:', process.env.NODE_ENV || 'development');

  const dbConnected = await connectDB();
  
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log('🌐 Health check: http://localhost:' + PORT + '/api/health');
    console.log('🌐 Test admin: http://localhost:' + PORT + '/api/test-admin');
    console.log('🌐 Admin init: http://localhost:' + PORT + '/api/admin/init');
    console.log('🌐 Admin list: http://localhost:' + PORT + '/api/admin/list');
    console.log('🌐 Create test user: http://localhost:' + PORT + '/api/create-test-user');
    console.log('🌐 Test login: http://localhost:' + PORT + '/api/test-login');
    console.log('📊 Database:', dbConnected ? 'Connected' : 'Disconnected');
    console.log('🔑 Default Admin: admin@tabib-iq.com / Admin123!@#');
    console.log('🧪 Test User: test@tabib-iq.com / 123456');
    
    if (!dbConnected) {
      console.log('⚠️ تحذير: الخادم يعمل بدون قاعدة بيانات');
      console.log('⚠️ بعض الميزات قد لا تعمل بشكل صحيح');
      console.log('💡 للحصول على مساعدة في حل مشاكل الاتصال، راجع:');
      console.log('   - إعدادات DNS في النظام');
      console.log('   - إعدادات الجدار الناري');
      console.log('   - اتصال الإنترنت');
    }
  });
};

startServer().catch(console.error); 
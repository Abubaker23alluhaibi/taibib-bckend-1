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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Ultra Minimal Server is running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tabib IQ API is running! (Ultra Minimal)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'Server is running',
    endpoints: ['GET /', 'GET /api/health', 'POST /api/auth/login', 'POST /api/auth/register']
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  
  const { email, password, loginType } = req.body;
  
  // Simple validation
  if (!email || !password || !loginType) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
  }
  
  // Mock successful login
  res.json({
    message: 'تم تسجيل الدخول بنجاح',
    user: {
      _id: 'test-user-' + Date.now(),
      name: 'مستخدم تجريبي',
      email: email,
      phone: '07701234567',
      user_type: loginType,
      specialty: loginType === 'doctor' ? 'طب عام' : null,
      address: loginType === 'center' ? 'بغداد، العراق' : null
    },
    timestamp: new Date().toISOString()
  });
});

// Register endpoint
app.post('/api/auth/register', (req, res) => {
  console.log('Register attempt:', req.body);
  
  const { name, email, phone, password, user_type } = req.body;
  
  // Simple validation
  if (!name || !email || !phone || !password || !user_type) {
    return res.status(400).json({ message: 'جميع الحقول المطلوبة يجب ملؤها' });
  }
  
  // Mock successful registration
  res.status(201).json({
    message: 'تم إنشاء الحساب بنجاح',
    user: {
      _id: 'new-user-' + Date.now(),
      name: name,
      email: email,
      phone: phone,
      user_type: user_type,
      specialty: user_type === 'doctor' ? 'طب عام' : null,
      address: user_type === 'center' ? 'بغداد، العراق' : null
    },
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    origin: req.headers.origin || 'unknown'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    availableRoutes: ['GET /', 'GET /api/health', 'GET /test', 'POST /api/auth/login', 'POST /api/auth/register'],
    requestedUrl: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Ultra Minimal Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Root endpoint: http://localhost:${PORT}/`);
}); 
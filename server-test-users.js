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

// Mock users data
const mockUsers = [
  {
    _id: 'user1',
    name: 'أحمد محمد',
    email: 'ahmed@test.com',
    phone: '07701234567',
    user_type: 'user',
    isActive: true,
    createdAt: new Date('2024-01-01')
  },
  {
    _id: 'doctor1',
    name: 'د. سارة أحمد',
    email: 'sara@test.com',
    phone: '07701234568',
    user_type: 'doctor',
    specialty: 'طب عام',
    isActive: true,
    createdAt: new Date('2024-01-02')
  },
  {
    _id: 'admin1',
    name: 'مدير النظام',
    email: 'admin@test.com',
    phone: '07701234569',
    user_type: 'admin',
    isActive: true,
    createdAt: new Date('2024-01-03')
  }
];

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Test Users Server is running',
    database: 'mock-data'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tabib IQ API is running! (Test Users)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'Server is running',
    database: 'mock-data',
    endpoints: ['GET /', 'GET /api/health', 'GET /api/users', 'POST /api/auth/login', 'POST /api/auth/register']
  });
});

// Get all users
app.get('/api/users', (req, res) => {
  res.json({
    message: 'جميع المستخدمين (بيانات تجريبية)',
    count: mockUsers.length,
    users: mockUsers
  });
});

// Get users by type
app.get('/api/users/:type', (req, res) => {
  const { type } = req.params;
  const filteredUsers = mockUsers.filter(user => user.user_type === type);
  
  res.json({
    message: `المستخدمين من نوع: ${type}`,
    count: filteredUsers.length,
    users: filteredUsers
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  
  const { email, password, loginType } = req.body;
  
  if (!email || !password || !loginType) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
  }
  
  // Find user in mock data
  const user = mockUsers.find(u => u.email === email && u.user_type === loginType);
  
  if (!user) {
    return res.status(401).json({ 
      message: 'البريد الإلكتروني غير موجود أو نوع المستخدم غير صحيح' 
    });
  }
  
  // Mock password check (accept any password for testing)
  if (password.length < 3) {
    return res.status(401).json({ message: 'كلمة المرور قصيرة جداً' });
  }
  
  res.json({
    message: 'تم تسجيل الدخول بنجاح (بيانات تجريبية)',
    user: user,
    timestamp: new Date().toISOString()
  });
});

// Register endpoint
app.post('/api/auth/register', (req, res) => {
  console.log('Register attempt:', req.body);
  
  const { name, email, phone, password, user_type, specialty } = req.body;
  
  if (!name || !email || !phone || !password || !user_type) {
    return res.status(400).json({ message: 'جميع الحقول المطلوبة يجب ملؤها' });
  }
  
  // Check if email already exists
  const existingUser = mockUsers.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
  }
  
  // Create new user
  const newUser = {
    _id: 'new-user-' + Date.now(),
    name,
    email,
    phone,
    user_type,
    specialty: specialty || null,
    isActive: true,
    createdAt: new Date()
  };
  
  // Add to mock data
  mockUsers.push(newUser);
  
  res.status(201).json({
    message: 'تم إنشاء الحساب بنجاح (بيانات تجريبية)',
    user: newUser,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    origin: req.headers.origin || 'unknown',
    database: 'mock-data',
    availableUsers: mockUsers.map(u => ({ email: u.email, user_type: u.user_type }))
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test Users Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Root endpoint: http://localhost:${PORT}/`);
  console.log(`🔗 Users: http://localhost:${PORT}/api/users`);
  console.log(`✅ Database: Mock Data (${mockUsers.length} users)`);
  console.log(`📋 Available users:`);
  mockUsers.forEach(user => {
    console.log(`   - ${user.email} (${user.user_type})`);
  });
}); 
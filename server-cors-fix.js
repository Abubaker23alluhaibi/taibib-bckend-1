const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware - FIXED
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'CORS Fixed Server is running',
    cors: 'enabled'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tabib IQ API is running! (CORS Fixed)',
    cors: 'enabled'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working!',
    cors: 'enabled',
    origin: req.headers.origin || 'unknown'
  });
});

// Mock login for testing
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  res.json({
    message: 'تم تسجيل الدخول بنجاح (CORS Fixed)',
    user: { name: 'Test User', email: req.body.email },
    timestamp: new Date().toISOString()
  });
});

// Mock register for testing
app.post('/api/auth/register', (req, res) => {
  console.log('Register attempt:', req.body);
  res.status(201).json({
    message: 'تم إنشاء الحساب بنجاح (CORS Fixed)',
    user: { name: req.body.name, email: req.body.email },
    timestamp: new Date().toISOString()
  });
});

// Mock users endpoint
app.get('/api/users', (req, res) => {
  res.json({
    message: 'جميع المستخدمين (CORS Fixed)',
    users: [
      { name: 'أحمد محمد', email: 'ahmed@test.com', user_type: 'user' },
      { name: 'د. سارة أحمد', email: 'sara@test.com', user_type: 'doctor' }
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CORS Fixed Server running on port ${PORT}`);
  console.log(`✅ CORS: Enabled for all origins`);
}); 
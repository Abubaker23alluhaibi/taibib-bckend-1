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

// Static accounts for testing
const staticAccounts = {
  // User accounts
  'user1': { password: '123', name: 'أحمد محمد', email: 'user1@test.com', phone: '07701234567', user_type: 'user' },
  'user2': { password: '123', name: 'فاطمة علي', email: 'user2@test.com', phone: '07701234568', user_type: 'user' },
  'user3': { password: '123', name: 'محمد حسن', email: 'user3@test.com', phone: '07701234569', user_type: 'user' },
  
  // Doctor accounts
  'doctor1': { password: '123', name: 'د. سارة أحمد', email: 'doctor1@test.com', phone: '07701234570', user_type: 'doctor', specialty: 'طب عام' },
  'doctor2': { password: '123', name: 'د. علي محمد', email: 'doctor2@test.com', phone: '07701234571', user_type: 'doctor', specialty: 'طب أسنان' },
  'doctor3': { password: '123', name: 'د. نورا كريم', email: 'doctor3@test.com', phone: '07701234572', user_type: 'doctor', specialty: 'طب قلب' },
  
  // Center accounts
  'center1': { password: '123', name: 'مركز الصحة الأول', email: 'center1@test.com', phone: '07701234573', user_type: 'center', address: 'بغداد، شارع الرشيد' },
  'center2': { password: '123', name: 'مستشفى السلام', email: 'center2@test.com', phone: '07701234574', user_type: 'center', address: 'البصرة، شارع الكورنيش' },
  'center3': { password: '123', name: 'عيادة الأمل', email: 'center3@test.com', phone: '07701234575', user_type: 'center', address: 'الموصل، شارع النجفي' }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Simple Accounts Server is running',
    availableAccounts: Object.keys(staticAccounts)
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tabib IQ API is running! (Simple Accounts)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'Server is running',
    endpoints: ['GET /', 'GET /api/health', 'POST /api/auth/login', 'POST /api/auth/register'],
    testAccounts: Object.keys(staticAccounts)
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  
  const { email, password, loginType } = req.body;
  
  // Find account by email or username
  let account = null;
  let accountKey = null;
  
  for (const [key, acc] of Object.entries(staticAccounts)) {
    if (acc.email === email || key === email) {
      if (acc.password === password && acc.user_type === loginType) {
        account = acc;
        accountKey = key;
        break;
      }
    }
  }
  
  if (account) {
    res.json({
      message: 'Login successful!',
      user: {
        _id: accountKey,
        name: account.name,
        email: account.email,
        phone: account.phone,
        user_type: account.user_type,
        specialty: account.specialty || null,
        address: account.address || null
      },
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(401).json({
      message: 'Invalid credentials or user type',
      availableAccounts: Object.keys(staticAccounts).map(key => ({
        username: key,
        email: staticAccounts[key].email,
        user_type: staticAccounts[key].user_type
      }))
    });
  }
});

// Register endpoint (creates temporary account)
app.post('/api/auth/register', (req, res) => {
  console.log('Register attempt:', req.body);
  
  const { name, email, phone, password, user_type } = req.body;
  
  // Generate temporary account key
  const tempKey = 'temp_' + Date.now();
  
  res.json({
    message: 'Registration successful! (Temporary account)',
    user: {
      _id: tempKey,
      name: name || 'مستخدم جديد',
      email: email || 'new@test.com',
      phone: phone || '07700000000',
      user_type: user_type || 'user'
    },
    timestamp: new Date().toISOString(),
    note: 'This is a temporary account for testing'
  });
});

// Get all accounts (for testing)
app.get('/api/accounts', (req, res) => {
  res.json({
    message: 'Available test accounts',
    accounts: Object.entries(staticAccounts).map(([key, acc]) => ({
      username: key,
      email: acc.email,
      password: acc.password,
      name: acc.name,
      user_type: acc.user_type,
      phone: acc.phone
    }))
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    origin: req.headers.origin || 'unknown',
    accounts: Object.keys(staticAccounts)
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    availableRoutes: ['GET /', 'GET /api/health', 'GET /test', 'GET /api/accounts', 'POST /api/auth/login', 'POST /api/auth/register'],
    requestedUrl: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple Accounts Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Root endpoint: http://localhost:${PORT}/`);
  console.log(`🔗 Accounts: http://localhost:${PORT}/api/accounts`);
  console.log(`📋 Available accounts: ${Object.keys(staticAccounts).join(', ')}`);
}); 
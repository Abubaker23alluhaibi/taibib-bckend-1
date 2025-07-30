const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS headers manually
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tabib IQ API is running! (No CORS)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'Server is running'
  });
});

// Test auth endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  
  // Mock response for testing
  res.json({
    message: 'Login endpoint working!',
    user: {
      _id: 'test-user-id',
      name: 'Test User',
      email: req.body.email,
      user_type: req.body.loginType || 'user'
    },
    timestamp: new Date().toISOString()
  });
});

// Test register endpoint
app.post('/api/auth/register', (req, res) => {
  console.log('Register attempt:', req.body);
  
  res.json({
    message: 'Register endpoint working!',
    user: {
      _id: 'new-user-id',
      name: req.body.name || 'New User',
      email: req.body.email,
      user_type: 'user'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    availableRoutes: ['GET /', 'GET /api/health', 'POST /api/auth/login', 'POST /api/auth/register']
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 No-CORS Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Root endpoint: http://localhost:${PORT}/`);
}); 
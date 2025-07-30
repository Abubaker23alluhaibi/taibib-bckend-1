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
    message: 'Simple test server is running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tabib IQ API is running! (Simple Test)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'Server is running',
    endpoints: ['GET /', 'GET /api/health', 'POST /api/auth/login', 'POST /api/auth/register']
  });
});

// Test auth endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  
  // Mock response for testing
  res.json({
    message: 'Login successful!',
    user: {
      _id: 'test-user-id-' + Date.now(),
      name: 'Test User',
      email: req.body.email || 'test@example.com',
      user_type: req.body.loginType || 'user',
      phone: req.body.phone || '123456789'
    },
    timestamp: new Date().toISOString()
  });
});

// Test register endpoint
app.post('/api/auth/register', (req, res) => {
  console.log('Register attempt:', req.body);
  
  res.json({
    message: 'Registration successful!',
    user: {
      _id: 'new-user-id-' + Date.now(),
      name: req.body.name || 'New User',
      email: req.body.email || 'new@example.com',
      user_type: 'user',
      phone: req.body.phone || '123456789'
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
  console.log(`🚀 Simple Test Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Root endpoint: http://localhost:${PORT}/`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/test`);
}); 
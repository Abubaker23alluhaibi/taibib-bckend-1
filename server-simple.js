const express = require('express');
const cors = require('cors');

const app = express();

// CORS configuration - allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  credentials: false
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    message: 'Tabib IQ API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    health: '/api/health'
  });
});

// Test auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password, loginType } = req.body;
  
  console.log('Login attempt:', { email, loginType });
  
  // Simple test response
  res.json({
    message: 'Login endpoint working!',
    user: {
      _id: 'test-user-id',
      name: 'Test User',
      email: email,
      user_type: loginType || 'user',
      role: loginType || 'user'
    },
    timestamp: new Date().toISOString()
  });
});

// Test register endpoint
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  console.log('Register attempt:', { email, name });
  
  res.json({
    message: 'Register endpoint working!',
    user: {
      _id: 'test-user-id',
      name: name,
      email: email,
      user_type: 'user',
      role: 'user'
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
  console.log(`🚀 Simple Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Root endpoint: http://localhost:${PORT}/`);
}); 
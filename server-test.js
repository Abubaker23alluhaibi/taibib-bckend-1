const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!', time: new Date().toISOString() });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test working!', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Root: http://localhost:${PORT}/`);
}); 
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.url === '/' || req.url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Server is running!',
      time: new Date().toISOString(),
      url: req.url
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({
      error: 'Not found',
      available: ['/', '/api/health']
    }));
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Ultra simple server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Root: http://localhost:${PORT}/`);
}); 
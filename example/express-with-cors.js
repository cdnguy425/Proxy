const express = require('express');
const { createProxyMiddleware } = require('../src/index');
const createCors = require('../src/cors');

const app = express();

console.log('=== Express with CORS ===\n');

// Enable CORS for all routes
app.use(createCors({
  origin: (requestOrigin) => {
    // Dynamic origin validation: allow all localhost subdomains
    const allowedPatterns = [
      /^http:\/\/localhost(:\d+)?$/,
      /^https:\/\/([a-z0-9-]+\.)?example\.com$/
    ];

    if (!requestOrigin) return true; // Allow same-origin requests

    return allowedPatterns.some(pattern => pattern.test(requestOrigin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
}));

// Mock authentication endpoint
app.post('/api/auth/login', express.json(), (req, res) => {
  // Simulate successful login
  res.json({
    success: true,
    token: 'mock-jwt-token-123',
    message: 'Login successful'
  });
});

// Mock protected endpoint
app.get('/api/user/profile', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    });
  }

  res.json({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com'
  });
});

// Proxy middleware for other API requests
app.use('/api/posts', createProxyMiddleware({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true
}));

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Express API with CORS',
    endpoints: {
      '/api/auth/login': 'POST - Login endpoint (returns mock JWT token)',
      '/api/user/profile': 'GET - Protected endpoint (requires Bearer token)',
      '/api/posts': 'Proxied to JSONPlaceholder'
    },
    cors: {
      allowedOrigins: 'localhost:* and *.example.com (dynamic validation)',
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
    }
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Express server with CORS running on port ${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`- Home: http://localhost:${PORT}/`);
  console.log(`- Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`- Profile: GET http://localhost:${PORT}/api/user/profile`);
  console.log(`- Posts: http://localhost:${PORT}/api/posts`);

  console.log(`\nCORS configuration:`);
  console.log(`- Dynamic origin validation enabled`);
  console.log(`- Allowed: localhost, *.example.com`);
  console.log(`- Methods: GET, POST, PUT, DELETE, PATCH`);

  console.log(`\nHow to test CORS:`);
  console.log(`1. Test preflight OPTIONS request:`);
  console.log(`   curl -X OPTIONS -H "Origin: http://localhost:8080" \\`);
  console.log(`        -H "Access-Control-Request-Method: POST" \\`);
  console.log(`        http://localhost:${PORT}/api/auth/login -v`);

  console.log(`\n2. Test login with CORS:`);
  console.log(`   curl -X POST -H "Origin: http://localhost:8080" \\`);
  console.log(`        -H "Content-Type: application/json" \\`);
  console.log(`        -d '{"username":"test","password":"test"}' \\`);
  console.log(`        http://localhost:${PORT}/api/auth/login -v`);

  console.log(`\n3. Test protected endpoint:`);
  console.log(`   curl -H "Origin: http://localhost:8080" \\`);
  console.log(`        -H "Authorization: Bearer mock-jwt-token-123" \\`);
  console.log(`        http://localhost:${PORT}/api/user/profile -v`);

  console.log(`\n4. Test from browser (create HTML file):`);
  console.log(`   <script>`);
  console.log(`     // Login`);
  console.log(`     fetch('http://localhost:${PORT}/api/auth/login', {`);
  console.log(`       method: 'POST',`);
  console.log(`       headers: { 'Content-Type': 'application/json' },`);
  console.log(`       body: JSON.stringify({ username: 'test', password: 'test' })`);
  console.log(`     })`);
  console.log(`     .then(res => res.json())`);
  console.log(`     .then(data => console.log('Login:', data));`);
  console.log(`     `);
  console.log(`     // Get profile`);
  console.log(`     fetch('http://localhost:${PORT}/api/user/profile', {`);
  console.log(`       headers: { 'Authorization': 'Bearer mock-jwt-token-123' }`);
  console.log(`     })`);
  console.log(`     .then(res => res.json())`);
  console.log(`     .then(data => console.log('Profile:', data));`);
  console.log(`   </script>`);

  console.log(`\nPress Ctrl+C to stop the server`);
});

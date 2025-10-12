const express = require('express');
const { createProxyMiddleware } = require('../src/index');

const app = express();
const PORT = 3000;

console.log('=== Express with Path Rewrite Example ===\n');

// Middleware for logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Express with Path Rewrite Example',
    endpoints: {
      '/': 'This page',
      '/backend/*': 'Proxy to JSONPlaceholder (path rewrite: /backend -> /posts)',
      '/api/v1/*': 'Proxy to JSONPlaceholder (path rewrite: /api/v1 -> /users)',
      '/legacy/*': 'Proxy to JSONPlaceholder (custom function rewrite)',
      '/local': 'Local route without proxy'
    }
  });
});

// Local route
app.get('/local', (req, res) => {
  res.json({
    message: 'This is a local route, not proxied',
    timestamp: new Date().toISOString()
  });
});

// Example 1: Strip /backend prefix and replace with /posts
app.use('/backend', createProxyMiddleware({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true,
  pathRewrite: {
    '^/backend': '/posts'
  }
}));

// Example 2: Rewrite /api/v1 to /users
app.use('/api/v1', createProxyMiddleware({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1': '/users'
  }
}));

// Example 3: Using function for custom path transformation
app.use('/legacy', createProxyMiddleware({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true,
  pathRewrite: (path) => {
    // Custom transformation: /legacy/posts -> /posts, /legacy/users -> /users
    return path.replace(/^\/legacy/, '');
  }
}));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Express app with path rewrite running at http://localhost:${PORT}\n`);
  console.log('Usage examples:');
  console.log(`  curl http://localhost:${PORT}/`);
  console.log(`  curl http://localhost:${PORT}/local`);
  console.log('');
  console.log('Path Rewrite Examples:');
  console.log(`  curl http://localhost:${PORT}/backend`);
  console.log('  -> Proxied to: https://jsonplaceholder.typicode.com/posts');
  console.log('');
  console.log(`  curl http://localhost:${PORT}/backend/1`);
  console.log('  -> Proxied to: https://jsonplaceholder.typicode.com/posts/1');
  console.log('');
  console.log(`  curl http://localhost:${PORT}/api/v1`);
  console.log('  -> Proxied to: https://jsonplaceholder.typicode.com/users');
  console.log('');
  console.log(`  curl http://localhost:${PORT}/api/v1/1`);
  console.log('  -> Proxied to: https://jsonplaceholder.typicode.com/users/1');
  console.log('');
  console.log(`  curl http://localhost:${PORT}/legacy/posts`);
  console.log('  -> Proxied to: https://jsonplaceholder.typicode.com/posts');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

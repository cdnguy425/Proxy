const { createProxy } = require('../src/index');

console.log('=== Example: Proxy with Path Rewrite ===\n');

// Example 1: Using object rules (regex patterns)
console.log('Example 1: Path rewrite with object rules');
const server1 = createProxy({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true,
  port: 3000,
  pathRewrite: {
    '^/backend': '',           // Strip /backend prefix
    '^/old-api': '/posts',     // Rewrite /old-api to /posts
    '^/v1/users': '/users'     // Rewrite /v1/users to /users
  }
});

console.log('\nTest with:');
console.log('  curl http://localhost:3000/backend/posts/1');
console.log('  -> Proxied to: https://jsonplaceholder.typicode.com/posts/1');
console.log('');
console.log('  curl http://localhost:3000/old-api');
console.log('  -> Proxied to: https://jsonplaceholder.typicode.com/posts');
console.log('');
console.log('  curl http://localhost:3000/v1/users');
console.log('  -> Proxied to: https://jsonplaceholder.typicode.com/users');

// Example 2: Using function for custom logic
// Uncomment to run
/*
console.log('\n\nExample 2: Path rewrite with function');
const server2 = createProxy({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true,
  port: 3001,
  pathRewrite: (path) => {
    // Custom transformation logic
    if (path.startsWith('/legacy')) {
      return path.replace('/legacy', '/posts');
    }
    if (path.startsWith('/api/v2')) {
      return path.replace('/api/v2', '');
    }
    return path;
  }
});

console.log('\nTest with:');
console.log('  curl http://localhost:3001/legacy/1');
console.log('  -> Proxied to: https://jsonplaceholder.typicode.com/posts/1');
console.log('');
console.log('  curl http://localhost:3001/api/v2/users');
console.log('  -> Proxied to: https://jsonplaceholder.typicode.com/users');
*/

console.log('\n\nPress Ctrl+C to stop the server');

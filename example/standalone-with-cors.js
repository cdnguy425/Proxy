const { createProxy } = require('../src/index');

console.log('=== Standalone Proxy with CORS ===\n');

// Create standalone proxy with CORS enabled
const server = createProxy({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true,
  port: 3000,
  cors: {
    origin: ['http://localhost:8080', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

console.log('\nCORS configuration:');
console.log('- Allowed origins: http://localhost:8080, http://localhost:3001');
console.log('- Allowed methods: GET, POST, PUT, DELETE');
console.log('- Allowed headers: Content-Type, Authorization');

console.log('\nHow to test:');
console.log('1. Create a simple HTML file with fetch:');
console.log('   <script>');
console.log('     fetch("http://localhost:3000/posts")');
console.log('       .then(res => res.json())');
console.log('       .then(data => console.log(data));');
console.log('   </script>');
console.log('2. Serve the HTML from http://localhost:8080');
console.log('3. Check browser console for CORS headers');
console.log('4. Try from disallowed origin to see it blocked');

console.log('\nDirect API test:');
console.log('curl -H "Origin: http://localhost:8080" http://localhost:3000/posts');

console.log('\nPress Ctrl+C to stop the server');

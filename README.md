# simple-proxy-id

[![npm version](https://img.shields.io/npm/v/simple-proxy-id.svg?style=flat-square)](https://www.npmjs.com/package/simple-proxy-id)
[![npm downloads](https://img.shields.io/npm/dm/simple-proxy-id.svg?style=flat-square)](https://www.npmjs.com/package/simple-proxy-id)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![CI](https://github.com/ibnushahraa/simple-proxy-id/actions/workflows/test.yml/badge.svg)](https://github.com/ibnushahraa/simple-proxy-id/actions)

🔒 A **secure HTTP/HTTPS proxy** for Node.js with **zero dependencies** and **fixed target**.
Think of it as a **safe reverse proxy** that prevents open proxy abuse.

⚡ **High Performance**: Optimized with connection pooling and keep-alive, achieving **~1,660 req/s** with **60ms average latency**.

---

## ✨ Features

- Standalone HTTP/HTTPS proxy server
- Express middleware support
- Fixed target (secure by default, cannot be changed from requests)
- **Path rewriting** support (object rules or function)
- Optional `changeOrigin` to set Host header
- Automatic error handling
- **Logger plugin** with daily rotating logs
- **Attack detector plugin** for brute force protection
- IP detection (Cloudflare Tunnel compatible)
- High performance with HTTP Agent connection pooling
- TypeScript definitions included
- Zero dependencies

---

## 📦 Installation

```bash
npm install simple-proxy-id
```

---

## 🚀 Usage

### Basic Usage (Standalone)

```js
const { createProxy } = require('simple-proxy-id');

// Create proxy server
const server = createProxy({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true,
  port: 3000
});

// Access: http://localhost:3000/posts
```

### Express Middleware

```js
const express = require('express');
const { createProxyMiddleware } = require('simple-proxy-id');

const app = express();

// Proxy for path /api/*
app.use('/api', createProxyMiddleware({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true
}));

app.listen(3000);

// Access: http://localhost:3000/api/posts
```

### With Path Rewrite

```js
const { createProxy } = require('simple-proxy-id');

// Using object rules (regex patterns)
const server = createProxy({
  target: 'https://api.example.com',
  changeOrigin: true,
  port: 3000,
  pathRewrite: {
    '^/backend': '/api',        // /backend/users → /api/users
    '^/old-api': '/new-api',    // /old-api/posts → /new-api/posts
    '^/v1': '/api/v1'           // /v1/data → /api/v1/data
  }
});

// Or using a function for custom logic
const server2 = createProxy({
  target: 'https://api.example.com',
  changeOrigin: true,
  port: 3001,
  pathRewrite: (path) => {
    // Custom path transformation logic
    return path.replace(/^\/legacy/, '/modern');
  }
});

// With Express middleware
const express = require('express');
const { createProxyMiddleware } = require('simple-proxy-id');

const app = express();

app.use('/api', createProxyMiddleware({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''  // Strip /api prefix
  }
}));

app.listen(3000);
```

### With Logger Plugin

```js
const { createProxy } = require('simple-proxy-id');

// Enable request logging
const server = createProxy({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true,
  port: 3000,
  logger: {
    logDir: './logs',
    maxDays: 7
  }
});

// Or with Express
const express = require('express');
const { createProxyMiddleware } = require('simple-proxy-id');
const createLogger = require('simple-proxy-id/logger');

const app = express();

app.use(createLogger({
  logDir: './logs',
  maxDays: 7
}));

app.use('/api', createProxyMiddleware({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true
}));

app.listen(3000);
```

### With Attack Detector Plugin

```js
const { createProxy } = require('simple-proxy-id');

// Standalone with attack detector
const server = createProxy({
  target: 'https://jsonplaceholder.typicode.com',
  changeOrigin: true,
  port: 3000,
  attackDetector: {
    path: '/api/login',
    statusCode: 401,
    threshold: 5,
    timeWindow: 1000,
    onTrigger: (data) => {
      console.log('Attack detected from IP:', data.ip);
      // Block IP via your firewall API
    }
  }
});

// Or with Express
const express = require('express');
const { createProxyMiddleware } = require('simple-proxy-id');
const createAttackDetector = require('simple-proxy-id/attack-detector');

const app = express();

app.use(createAttackDetector({
  path: '/api/login',
  statusCode: 401,
  threshold: 5,
  timeWindow: 1000,
  onTrigger: (data) => {
    console.log('Attack detected from IP:', data.ip);
    // Block IP via Cloudflare API, Mikrotik, iptables, etc.
  }
}));

app.use('/api', createProxyMiddleware({
  target: 'https://api.example.com',
  changeOrigin: true
}));

app.listen(3000);
```

---

## 🧪 Testing

```bash
npm test
```

Jest is used for testing. All tests must pass before publishing.

---

## ⚡ Performance

Benchmarked with autocannon on localhost (100 concurrent connections):

```bash
npm run benchmark
```

**Results:**
- **Throughput**: ~1,660 requests/second
- **Latency (avg)**: 60ms
- **Latency (p50)**: 52ms
- **Latency (p99)**: 138ms
- **Errors**: 0

**Optimizations:**
- HTTP Agent with `keepAlive: true` for connection pooling
- Cached target URL parsing (no re-parsing per request)
- Pre-computed error responses
- TCP_NODELAY enabled for lower latency
- Connection reuse across requests

---

## 📂 Project Structure

```
src/       → main source code
  plugins/ → logger and attack-detector plugins
test/      → jest test suite
example/   → usage examples
benchmark/ → performance benchmarks
.github/   → CI workflows
```

---

## 📜 API

### `createProxy(options)`

Create a standalone HTTP/HTTPS proxy server.

**Parameters:**
- `target` (string, required): Target URL to proxy
- `changeOrigin` (boolean, optional): Set Host header to target (default: false)
- `port` (number, optional): Port for proxy server (default: 3000)
- `pathRewrite` (object|function, optional): Path rewrite rules
  - **Object**: Key-value pairs where keys are regex patterns and values are replacements
  - **Function**: Custom function that takes path and returns rewritten path
- `logger` (object, optional): Logger configuration
  - `logDir` (string): Directory to store log files (default: './logs')
  - `maxDays` (number): Maximum days to keep logs (default: 7)
- `attackDetector` (object|array, optional): Attack detector configuration (single or array)
  - `path` (string|RegExp): Path to monitor
  - `statusCode` (number): Status code to monitor
  - `threshold` (number): Max hits before trigger
  - `timeWindow` (number): Time window in ms (default: 1000)
  - `onTrigger` (function): Callback function

**Returns:** `http.Server` instance

**Example:**
```js
const server = createProxy({
  target: 'https://api.example.com',
  changeOrigin: true,
  port: 8080,
  pathRewrite: {
    '^/backend': '/api',
    '^/v1': '/api/v1'
  },
  logger: {
    logDir: './logs',
    maxDays: 14
  },
  attackDetector: [
    {
      path: '/api/login',
      statusCode: 401,
      threshold: 5,
      timeWindow: 1000,
      onTrigger: (data) => console.log('Login attack:', data.ip)
    },
    {
      path: /^\/api\/.*/,
      statusCode: 404,
      threshold: 10,
      timeWindow: 2000,
      onTrigger: (data) => console.log('Scan attack:', data.ip)
    }
  ]
});
```

### `createProxyMiddleware(options)`

Create Express middleware for proxy.

**Parameters:**
- `target` (string, required): Target URL to proxy
- `changeOrigin` (boolean, optional): Set Host header to target (default: false)
- `pathRewrite` (object|function, optional): Path rewrite rules
  - **Object**: Key-value pairs where keys are regex patterns and values are replacements
  - **Function**: Custom function that takes path and returns rewritten path

**Returns:** Express middleware function

**Example:**
```js
// Basic usage
app.use('/api', createProxyMiddleware({
  target: 'https://api.github.com',
  changeOrigin: true
}));

// With path rewrite
app.use('/api', createProxyMiddleware({
  target: 'https://api.example.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/v2/api'  // Rewrite /api/* to /v2/api/*
  }
}));

// With function
app.use('/backend', createProxyMiddleware({
  target: 'https://api.example.com',
  changeOrigin: true,
  pathRewrite: (path) => path.replace(/^\/old/, '/new')
}));
```

### `createLogger(options)`

Create logger middleware for tracking requests.

**Parameters:**
- `logDir` (string, optional): Directory to store log files (default: './logs')
- `maxDays` (number, optional): Days to keep logs before auto-cleanup (default: 7)

**Returns:** Express/Connect middleware function

**Example:**
```js
const createLogger = require('simple-proxy-id/logger');

app.use(createLogger({
  logDir: './logs',
  maxDays: 14
}));
```

**Log Format:**
```
[2025-10-03 14:30:45] 192.168.1.100 GET /api/users 200 125ms
```

**Features:**
- Daily rotating log files (YYYY-MM-DD.log)
- Captures real IP (supports Cloudflare Tunnel)
- Automatic cleanup of old logs
- Zero dependencies

### `createAttackDetector(options)`

Create attack detector middleware for brute force protection.

**Parameters:**
- `path` (string|RegExp, required): Path to monitor (string for exact match, RegExp for pattern)
- `statusCode` (number, required): HTTP status code to monitor (e.g., 401, 403, 404)
- `threshold` (number, required): Maximum allowed hits within time window
- `timeWindow` (number, optional): Time window in milliseconds (default: 1000)
- `onTrigger` (function, required): Callback function triggered when threshold exceeded

**Callback receives:**
```js
{
  ip: '192.168.1.100',
  hits: 5,
  path: '/api/login',
  timestamp: 1696234567890,
  userAgent: 'Mozilla/5.0...'
}
```

**Returns:** Express/Connect middleware function

**Example:**
```js
const createAttackDetector = require('simple-proxy-id/attack-detector');

app.use(createAttackDetector({
  path: /^\/api\/.*/,          // Monitor all API paths with RegExp
  statusCode: 404,              // Monitor not found responses
  threshold: 10,                // Trigger after 10 hits
  timeWindow: 2000,             // Within 2 seconds
  onTrigger: (data) => {
    // Block IP via your firewall API
    console.log(`Blocking IP: ${data.ip}`);
  }
}));
```

**Features:**
- Per-IP tracking and rate limiting
- Support exact path or RegExp pattern matching
- Automatic cleanup of old tracking data
- Custom callback for any blocking mechanism (Cloudflare, Mikrotik, iptables, etc.)
- Zero dependencies

---

## 🔒 Security

This library is designed with **security-first principles**:

**The proxy target is fixed in code and cannot be changed by external requests.**

| Attack Vector | Protected |
|--------------|-----------|
| Request headers manipulation | ✅ |
| Query string injection | ✅ |
| Request body tampering | ✅ |
| Open proxy abuse | ✅ |

**IP Detection Priority:**

When logging requests or detecting attacks, the library detects the real client IP in this order:
1. `CF-Connecting-IP` header (Cloudflare Tunnel)
2. `X-Forwarded-For` header (Proxy/Load Balancer)
3. `X-Real-IP` header (Nginx proxy)
4. `socket.remoteAddress` (Direct connection)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Ways to contribute:**
- Report bugs and suggest features
- Submit pull requests
- Improve documentation
- Develop plugins

---

## 📄 License

[MIT](LICENSE) © 2025

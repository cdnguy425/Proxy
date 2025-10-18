# simple-proxy-id

[![npm version](https://img.shields.io/npm/v/simple-proxy-id.svg?style=flat-square)](https://www.npmjs.com/package/simple-proxy-id)
[![npm downloads](https://img.shields.io/npm/dm/simple-proxy-id.svg?style=flat-square)](https://www.npmjs.com/package/simple-proxy-id)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![CI](https://github.com/ibnushahraa/simple-proxy-id/actions/workflows/test.yml/badge.svg)](https://github.com/ibnushahraa/simple-proxy-id/actions)
[![coverage](https://img.shields.io/badge/coverage-93.5%25-brightgreen.svg?style=flat-square)](https://github.com/ibnushahraa/simple-proxy-id)

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
- **CORS plugin** with flexible origin validation
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

### With CORS Plugin

```js
const { createProxy } = require('simple-proxy-id');

// Standalone with CORS
const server = createProxy({
  target: 'https://api.example.com',
  changeOrigin: true,
  port: 3000,
  cors: {
    origin: ['https://example.com', 'https://app.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Or with Express
const express = require('express');
const { createProxyMiddleware } = require('simple-proxy-id');
const createCors = require('simple-proxy-id/cors');

const app = express();

// Enable CORS for all routes
app.use(createCors({
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/api', createProxyMiddleware({
  target: 'https://api.example.com',
  changeOrigin: true
}));

app.listen(3000);

// Dynamic origin validation
const server2 = createProxy({
  target: 'https://api.example.com',
  port: 3001,
  cors: {
    origin: (requestOrigin) => {
      // Allow all subdomains of example.com
      return /^https:\/\/([a-z0-9-]+\.)?example\.com$/.test(requestOrigin);
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Allow all origins (development only)
const server3 = createProxy({
  target: 'https://api.example.com',
  port: 3002,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
  }
});
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
  plugins/ → cors, logger, and attack-detector plugins
test/      → jest test suite
example/   → usage examples
benchmark/ → performance benchmarks
.github/   → CI workflows
```

---

## 📜 API

> **⚠️ Important**: The `target` parameter only uses **hostname and port**. Any path in the target URL is ignored. Use `pathRewrite` for path transformations. [Read more](#-target-url-behavior-important)

### `createProxy(options)`

Create a standalone HTTP/HTTPS proxy server.

**Parameters:**
- `target` (string, required): Target URL to proxy (hostname and port only, path is ignored)
- `changeOrigin` (boolean, optional): Set Host header to target (default: false)
- `port` (number, optional): Port for proxy server (default: 3000)
- `pathRewrite` (object|function, optional): Path rewrite rules
  - **Object**: Key-value pairs where keys are regex patterns and values are replacements
  - **Function**: Custom function that takes path and returns rewritten path
- `cors` (object, optional): CORS configuration
  - `origin` (string|string[]|function|'*'): Allowed origin(s) (default: '*')
  - `methods` (string[]): Allowed HTTP methods (default: `['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']`)
  - `allowedHeaders` (string[]): Allowed request headers (default: `['Content-Type', 'Authorization']`)
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
  cors: {
    origin: ['https://example.com', 'https://app.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
- `target` (string, required): Target URL to proxy (hostname and port only, path is ignored)
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

### `createCors(options)`

Create CORS middleware for handling cross-origin requests.

**Parameters:**
- `origin` (string|string[]|function|'*', optional): Allowed origin(s) (default: '*')
  - **String**: Single domain `'https://example.com'`
  - **Array**: Multiple domains `['https://example.com', 'https://app.example.com']`
  - **Function**: Dynamic validation `(requestOrigin) => boolean`
  - **Wildcard**: `'*'` for allow all origins
- `methods` (string[], optional): Allowed HTTP methods (default: `['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']`)
- `allowedHeaders` (string[], optional): Allowed request headers (default: `['Content-Type', 'Authorization']`)

**Returns:** Express/Connect middleware function

**Example:**
```js
const createCors = require('simple-proxy-id/cors');

// Single origin
app.use(createCors({
  origin: 'https://example.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Multiple origins
app.use(createCors({
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
}));

// Dynamic origin validation
app.use(createCors({
  origin: (requestOrigin) => {
    // Allow all subdomains of example.com
    return /^https:\/\/([a-z0-9-]+\.)?example\.com$/.test(requestOrigin);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Allow all origins (development only)
app.use(createCors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
```

**Features:**
- Flexible origin validation (string, array, function, wildcard)
- Automatic OPTIONS preflight handling (204 No Content)
- Support for dynamic origin validation with custom logic
- Per-request origin validation for security
- Zero dependencies

**Use Cases:**
- JWT authentication APIs (token in Authorization header)
- Public APIs with domain whitelist
- Microservices with cross-origin communication
- Development environments with wildcard CORS

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

## 🎯 Target URL Behavior (Important!)

### Security-First Design

This library follows a **security-first principle** where the `target` parameter only uses **hostname and port**. Any path in the target URL is **intentionally ignored**.

**Why?**
- ✅ **Explicit Control**: Forces developers to explicitly define all path transformations
- ✅ **Single Source of Truth**: All path logic centralized in `pathRewrite` for easier security audits
- ✅ **Prevents Hidden Behavior**: No automatic path concatenation that could lead to confusion
- ✅ **Reduces Attack Surface**: Clear separation between target destination and path transformation

### Common Mistake

```js
// ❌ WRONG: Path in target will be IGNORED
createProxyMiddleware({
  target: 'https://api.example.com/v2/backend',
  // Path '/v2/backend' is IGNORED!
  // Requests will go to: https://api.example.com/your-path
})

// ✅ CORRECT: Use pathRewrite for path transformations
createProxyMiddleware({
  target: 'https://api.example.com',
  pathRewrite: (path) => '/v2/backend' + path
  // Requests will go to: https://api.example.com/v2/backend/your-path
})
```

### Understanding Express Routing Behavior

Express handles `app.use()` and `router.all()` differently when it comes to URL paths. Understanding this is crucial for proper proxy configuration.

#### 1. `app.use()` - Full URL Forwarding

When using `app.use('/prefix', middleware)`, **Express strips the prefix and passes the FULL remaining URL** to the middleware. This is perfect for simple forwarding scenarios.

```js
app.use('/uwupay', createProxyMiddleware({
  target: 'http://backend:3800'
}));

// Request: GET /uwupay/api/v1/transactions?status=active
// Express strips: /uwupay
// Middleware receives: req.url = '/api/v1/transactions?status=active'
// Proxies to: http://backend:3800/api/v1/transactions?status=active ✅
```

**Key Points:**
- ✅ Middleware gets **full remaining path** after prefix
- ✅ Query string preserved
- ✅ Path structure maintained
- ✅ No `pathRewrite` needed for simple forwarding

#### 2. `router.all('/pattern/:param')` - Full URL Retained

When using router with path parameters, **Express keeps the full URL path** in `req.url` and extracts parameters to `req.params`. You MUST use `pathRewrite` to transform the path.

```js
const router = express.Router();

router.all('/api/v2/:path', createProxyMiddleware({
  target: 'http://backend:7707',
  pathRewrite: (path) => path.replace('/api/v2', '/backend')  // ⚠️ Required!
}));

// Request: GET /api/v2/test-koneksi?foo=bar
// Express matches: /api/v2/:path
// Middleware receives: req.url = '/api/v2/test-koneksi?foo=bar'  (FULL path!)
// req.params = { path: 'test-koneksi' }  (extracted param)
// pathRewrite transforms: '/api/v2/test-koneksi' → '/backend/test-koneksi'
// Proxies to: http://backend:7707/backend/test-koneksi?foo=bar ✅
```

**Key Points:**
- ⚠️ Middleware receives **FULL URL path** (not stripped like app.use)
- ✅ Parameters extracted to `req.params` for handler use
- ✅ Query string preserved
- ⚠️ `pathRewrite` is REQUIRED to transform route pattern to backend path

#### Comparison Table

| Method | Express Behavior | req.url Value | Need pathRewrite? | Use Case |
|--------|------------------|---------------|-------------------|----------|
| `app.use('/prefix')` | Strip prefix, forward remaining URL | Path after prefix (e.g., `/users`) | ❌ Optional | Simple forwarding |
| `router.all('/pattern/:param')` | Keep full path, extract params to req.params | Full path (e.g., `/api/v2/users`) | ✅ Required | Pattern transformation |

#### Why Different Behavior?

These are **two different Express concepts** serving different purposes:

**`app.use()` = Middleware Mounting** 🔌
- **Purpose**: Attach middleware at a specific path (mounting point)
- **Design**: Strip prefix so middleware is portable and reusable
- **Analogy**: Like mounting a USB drive at `/mnt/usb` - files inside don't know they're mounted there
- **Use case**: Forward entire service/path to another backend

**`router.all()` = Route Pattern Matching** 🎯
- **Purpose**: Match URL patterns and extract parameters (data extraction)
- **Design**: Only pass matched parameter values, not routing metadata
- **Analogy**: Like function parameters `getUserById(id)` - only receives the value `123`, not the function signature
- **Use case**: Handle specific API endpoints with parameter extraction

This is **not a bug or inconsistency** - it's Express core design for two different use cases!

#### Why This Matters

**Wrong approach (missing pathRewrite):**
```js
// ❌ This will NOT work as expected
router.all('/api/v2/:path', createProxyMiddleware({
  target: 'http://backend:7707'
  // Missing pathRewrite!
}));

// Request: /api/v2/test-koneksi
// Proxies to: http://backend:7707/test-koneksi
// Backend expects: http://backend:7707/backend/test-koneksi ❌
```

**Correct approach:**
```js
// ✅ Use pathRewrite to prepend required path
router.all('/api/v2/:path', createProxyMiddleware({
  target: 'http://backend:7707',
  pathRewrite: (path) => '/backend' + path
}));

// Request: /api/v2/test-koneksi
// Proxies to: http://backend:7707/backend/test-koneksi ✅
```

#### Preserve Prefix in Target

If you want to preserve the Express route prefix in your target URL:

```js
// Request: GET /api/users → Proxy to: https://backend.com/api/users
app.use('/api', createProxyMiddleware({
  target: 'https://backend.com',
  pathRewrite: (path) => '/api' + path  // Add /api back
}));
// Middleware receives: '/users'
// pathRewrite transforms: '/users' → '/api/users'
// Proxies to: https://backend.com/api/users
```

### Real-World Examples

**Example 1: Simple forwarding (Express strips prefix)**
```js
// Request: /uwupay/transactions → Proxy to: http://backend:3800/transactions
app.use('/uwupay', createProxyMiddleware({
  target: 'http://backend:3800'
  // No pathRewrite needed, Express already stripped /uwupay
}));
```

**Example 2: Add path prefix to target**
```js
// Request: /api/users → Proxy to: https://backend.com/v2/users
app.use('/api', createProxyMiddleware({
  target: 'https://backend.com',
  pathRewrite: (path) => '/v2' + path
  // Express strips /api, we add /v2
}));
```

**Example 3: Multiple path transformations**
```js
// Without app.use (handle routing manually)
createProxyMiddleware({
  target: 'https://api.example.com',
  pathRewrite: (path) => {
    // /old-api/users → /new-api/v2/users
    if (path.startsWith('/old-api')) {
      return path.replace('/old-api', '/new-api/v2');
    }
    // /public/data → /api/public/data
    if (path.startsWith('/public')) {
      return '/api' + path;
    }
    // Default: /something → /api/v1/something
    return '/api/v1' + path;
  }
});
```

**Example 4: Complex routing with backend path**
```js
// Request: /api/v2/users → Proxy to: http://backend:7707/backend/users
app.use('/api/v2', createProxyMiddleware({
  target: 'http://backend:7707',
  pathRewrite: (path) => '/backend' + path
  // Express strips /api/v2
  // Middleware receives: /users
  // pathRewrite adds: /backend/users
}));
```

### Security Benefits

**Scenario: Path Traversal Prevention**

```js
// With path ignored (SECURE ✅)
target: 'https://api.example.com'
pathRewrite: (path) => '/admin/../public' + path
// Result: https://api.example.com/admin/../public/users
// Server will reject invalid path

// If path was auto-appended (VULNERABLE ❌)
target: 'https://api.example.com/public'
pathRewrite: (path) => '/../admin' + path
// Result: https://api.example.com/public/../admin/users
// = https://api.example.com/admin/users (PATH TRAVERSAL!)
```

By ignoring path in target URL, this library forces explicit path control and prevents accidental security vulnerabilities.

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

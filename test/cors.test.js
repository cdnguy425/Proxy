const express = require('express');
const request = require('supertest');
const createCors = require('../src/plugins/cors');

describe('CORS Plugin', () => {
  describe('Configuration Validation', () => {
    test('should use default values when no options provided', () => {
      const middleware = createCors();
      expect(typeof middleware).toBe('function');
    });

    test('should throw error if methods is not an array', () => {
      expect(() => {
        createCors({ methods: 'GET' });
      }).toThrow('methods must be a non-empty array');
    });

    test('should throw error if methods is empty array', () => {
      expect(() => {
        createCors({ methods: [] });
      }).toThrow('methods must be a non-empty array');
    });

    test('should throw error if allowedHeaders is not an array', () => {
      expect(() => {
        createCors({ allowedHeaders: 'Content-Type' });
      }).toThrow('allowedHeaders must be a non-empty array');
    });

    test('should throw error if allowedHeaders is empty array', () => {
      expect(() => {
        createCors({ allowedHeaders: [] });
      }).toThrow('allowedHeaders must be a non-empty array');
    });

    test('should throw error if origin is invalid type', () => {
      expect(() => {
        createCors({ origin: 123 });
      }).toThrow('origin must be a string, array, function, or "*"');
    });
  });

  describe('Single Origin Validation', () => {
    test('should allow request from allowed origin', async () => {
      const app = express();

      app.use(createCors({
        origin: 'https://example.com',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
    });

    test('should not set CORS headers for disallowed origin', async () => {
      const app = express();

      app.use(createCors({
        origin: 'https://example.com',
        methods: ['GET'],
        allowedHeaders: ['Content-Type']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://evil.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('should allow request without origin header', async () => {
      const app = express();

      app.use(createCors({
        origin: 'https://example.com',
        methods: ['GET'],
        allowedHeaders: ['Content-Type']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .expect(200);

      // No origin header means same-origin request
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Multiple Origins Validation', () => {
    test('should allow requests from multiple allowed origins', async () => {
      const app = express();

      app.use(createCors({
        origin: ['https://example.com', 'https://app.example.com'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      // Test first origin
      const response1 = await request(app)
        .get('/test')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response1.headers['access-control-allow-origin']).toBe('https://example.com');

      // Test second origin
      const response2 = await request(app)
        .get('/test')
        .set('Origin', 'https://app.example.com')
        .expect(200);

      expect(response2.headers['access-control-allow-origin']).toBe('https://app.example.com');
    });

    test('should reject origin not in whitelist', async () => {
      const app = express();

      app.use(createCors({
        origin: ['https://example.com', 'https://app.example.com'],
        methods: ['GET'],
        allowedHeaders: ['Content-Type']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://other.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Wildcard Origin (*)', () => {
    test('should allow all origins with wildcard', async () => {
      const app = express();

      app.use(createCors({
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://any-domain.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST');
    });

    test('should work with wildcard as default', async () => {
      const app = express();

      app.use(createCors());

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://random-site.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('Dynamic Origin Validation (Function)', () => {
    test('should allow origin based on custom function', async () => {
      const app = express();

      app.use(createCors({
        origin: (requestOrigin) => {
          const whitelist = ['https://example.com', 'https://app.example.com'];
          return whitelist.includes(requestOrigin);
        },
        methods: ['GET'],
        allowedHeaders: ['Content-Type']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
    });

    test('should reject origin based on custom function', async () => {
      const app = express();

      app.use(createCors({
        origin: (requestOrigin) => {
          return requestOrigin.endsWith('.example.com');
        },
        methods: ['GET'],
        allowedHeaders: ['Content-Type']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://evil.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('should support dynamic validation with pattern matching', async () => {
      const app = express();

      app.use(createCors({
        origin: (requestOrigin) => {
          // Allow subdomains of example.com
          return /^https:\/\/([a-z0-9-]+\.)?example\.com$/.test(requestOrigin);
        },
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      // Test main domain
      const response1 = await request(app)
        .get('/test')
        .set('Origin', 'https://example.com')
        .expect(200);
      expect(response1.headers['access-control-allow-origin']).toBe('https://example.com');

      // Test subdomain
      const response2 = await request(app)
        .get('/test')
        .set('Origin', 'https://app.example.com')
        .expect(200);
      expect(response2.headers['access-control-allow-origin']).toBe('https://app.example.com');

      // Test invalid domain
      const response3 = await request(app)
        .get('/test')
        .set('Origin', 'https://other.com')
        .expect(200);
      expect(response3.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('OPTIONS Preflight Request', () => {
    test('should handle OPTIONS preflight with 204 status', async () => {
      const app = express();

      app.use(createCors({
        origin: 'https://example.com',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://example.com')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type, Authorization');
      expect(response.text).toBe('');
    });

    test('should handle OPTIONS preflight without origin header', async () => {
      const app = express();

      app.use(createCors({
        origin: 'https://example.com',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type']
      }));

      app.options('/test', (req, res) => res.send('Should not reach here'));

      const response = await request(app)
        .options('/test')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBe('GET, POST');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
      expect(response.text).toBe('');
    });

    test('should not set CORS headers on OPTIONS for disallowed origin', async () => {
      const app = express();

      app.use(createCors({
        origin: 'https://example.com',
        methods: ['GET'],
        allowedHeaders: ['Content-Type']
      }));

      app.options('/test', (req, res) => res.send('Should not reach here'));

      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://evil.com');

      // Middleware calls next() for disallowed origin, so route handler runs
      expect(response.status).toBe(200);
      expect(response.text).toBe('Should not reach here');
    });
  });

  describe('HTTP Methods', () => {
    test('should set correct methods header', async () => {
      const app = express();

      app.use(createCors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
        allowedHeaders: ['Content-Type']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE, PATCH, HEAD');
    });

    test('should work with custom methods', async () => {
      const app = express();

      app.use(createCors({
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type']
      }));

      app.post('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .post('/test')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-methods']).toBe('GET, POST');
    });
  });

  describe('Allowed Headers', () => {
    test('should set correct allowed headers', async () => {
      const app = express();

      app.use(createCors({
        origin: '*',
        methods: ['GET'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-headers']).toBe('Content-Type, Authorization, X-Custom-Header');
    });

    test('should use default headers when not specified', async () => {
      const app = express();

      app.use(createCors({
        origin: '*',
        methods: ['GET']
      }));

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-headers']).toBe('Content-Type, Authorization');
    });
  });

  describe('Integration with Express Routes', () => {
    test('should work with multiple routes', async () => {
      const app = express();

      app.use(createCors({
        origin: 'https://example.com',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type']
      }));

      app.get('/users', (req, res) => res.json({ users: [] }));
      app.post('/users', (req, res) => res.status(201).json({ id: 1 }));
      app.get('/posts', (req, res) => res.json({ posts: [] }));

      // Test GET /users
      const response1 = await request(app)
        .get('/users')
        .set('Origin', 'https://example.com')
        .expect(200);
      expect(response1.headers['access-control-allow-origin']).toBe('https://example.com');

      // Test POST /users
      const response2 = await request(app)
        .post('/users')
        .set('Origin', 'https://example.com')
        .expect(201);
      expect(response2.headers['access-control-allow-origin']).toBe('https://example.com');

      // Test GET /posts
      const response3 = await request(app)
        .get('/posts')
        .set('Origin', 'https://example.com')
        .expect(200);
      expect(response3.headers['access-control-allow-origin']).toBe('https://example.com');
    });

    test('should work before other middleware', async () => {
      const app = express();

      // CORS first
      app.use(createCors({
        origin: '*',
        methods: ['GET'],
        allowedHeaders: ['Content-Type']
      }));

      // Then other middleware
      app.use(express.json());

      app.get('/test', (req, res) => res.send('OK'));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('Real-world Use Cases', () => {
    test('should support JWT authentication scenario', async () => {
      const app = express();

      app.use(createCors({
        origin: ['https://example.com', 'https://app.example.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }));

      // Mock login endpoint
      app.post('/api/auth/login', (req, res) => {
        res.json({ token: 'jwt-token-here' });
      });

      // Mock protected endpoint
      app.get('/api/users', (req, res) => {
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
          res.json({ users: [{ id: 1, name: 'John' }] });
        } else {
          res.status(401).json({ error: 'Unauthorized' });
        }
      });

      // Test login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://example.com')
        .expect(200);
      expect(loginResponse.headers['access-control-allow-origin']).toBe('https://example.com');
      expect(loginResponse.body.token).toBe('jwt-token-here');

      // Test protected endpoint with token
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Origin', 'https://example.com')
        .set('Authorization', 'Bearer jwt-token-here')
        .expect(200);
      expect(usersResponse.headers['access-control-allow-origin']).toBe('https://example.com');
      expect(usersResponse.body.users).toHaveLength(1);

      // Test protected endpoint without token
      const unauthorizedResponse = await request(app)
        .get('/api/users')
        .set('Origin', 'https://example.com')
        .expect(401);
      expect(unauthorizedResponse.headers['access-control-allow-origin']).toBe('https://example.com');
    });
  });
});

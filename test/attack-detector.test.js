const express = require('express');
const request = require('supertest');
const createAttackDetector = require('../src/plugins/attack-detector');

describe('Attack Detector Plugin', () => {
  describe('Configuration Validation', () => {
    test('should throw error if path is not provided', () => {
      expect(() => {
        createAttackDetector({ statusCode: 401, threshold: 5, onTrigger: () => {} });
      }).toThrow('path is required');
    });

    test('should throw error if statusCode is not provided', () => {
      expect(() => {
        createAttackDetector({ path: '/login', threshold: 5, onTrigger: () => {} });
      }).toThrow('statusCode is required');
    });

    test('should throw error if threshold is not provided', () => {
      expect(() => {
        createAttackDetector({ path: '/login', statusCode: 401, onTrigger: () => {} });
      }).toThrow('threshold must be a positive number');
    });

    test('should throw error if threshold is zero or negative', () => {
      expect(() => {
        createAttackDetector({ path: '/login', statusCode: 401, threshold: 0, onTrigger: () => {} });
      }).toThrow('threshold must be a positive number');

      expect(() => {
        createAttackDetector({ path: '/login', statusCode: 401, threshold: -5, onTrigger: () => {} });
      }).toThrow('threshold must be a positive number');
    });

    test('should throw error if onTrigger is not a function', () => {
      expect(() => {
        createAttackDetector({ path: '/login', statusCode: 401, threshold: 5 });
      }).toThrow('onTrigger must be a function');

      expect(() => {
        createAttackDetector({ path: '/login', statusCode: 401, threshold: 5, onTrigger: 'not a function' });
      }).toThrow('onTrigger must be a function');
    });

    test('should create middleware with valid configuration', () => {
      const middleware = createAttackDetector({
        path: '/login',
        statusCode: 401,
        threshold: 5,
        onTrigger: () => {}
      });
      expect(typeof middleware).toBe('function');
    });

    test('should accept timeWindow parameter', () => {
      const middleware = createAttackDetector({
        path: '/login',
        statusCode: 401,
        threshold: 5,
        timeWindow: 2000,
        onTrigger: () => {}
      });
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Path Matching', () => {
    test('should match exact path string', async () => {
      const app = express();
      const triggered = { called: false, data: null };

      app.use(createAttackDetector({
        path: '/api/login',
        statusCode: 401,
        threshold: 3,
        timeWindow: 1000,
        onTrigger: (data) => {
          triggered.called = true;
          triggered.data = data;
        }
      }));

      app.get('/api/login', (req, res) => res.status(401).send('Unauthorized'));
      app.get('/api/other', (req, res) => res.status(401).send('Unauthorized'));

      // Hit monitored path 3 times
      await request(app).get('/api/login').expect(401);
      await request(app).get('/api/login').expect(401);
      await request(app).get('/api/login').expect(401);

      expect(triggered.called).toBe(true);

      // Reset
      triggered.called = false;

      // Hit non-monitored path should not trigger
      await request(app).get('/api/other').expect(401);
      await request(app).get('/api/other').expect(401);
      await request(app).get('/api/other').expect(401);

      expect(triggered.called).toBe(false);
    });

    test('should match RegExp pattern', async () => {
      const app = express();
      const triggered = { called: false, data: null };

      app.use(createAttackDetector({
        path: /^\/api\/.*/,
        statusCode: 404,
        threshold: 3,
        timeWindow: 1000,
        onTrigger: (data) => {
          triggered.called = true;
          triggered.data = data;
        }
      }));

      app.get('/api/test1', (req, res) => res.status(404).send('Not Found'));
      app.get('/api/test2', (req, res) => res.status(404).send('Not Found'));
      app.get('/other', (req, res) => res.status(404).send('Not Found'));

      // Hit paths matching pattern
      await request(app).get('/api/test1').expect(404);
      await request(app).get('/api/test2').expect(404);
      await request(app).get('/api/test1').expect(404);

      expect(triggered.called).toBe(true);
    });

    test('should not trigger on non-matching path', async () => {
      const app = express();
      const triggered = { called: false };

      app.use(createAttackDetector({
        path: '/api/login',
        statusCode: 401,
        threshold: 2,
        timeWindow: 1000,
        onTrigger: () => { triggered.called = true; }
      }));

      app.get('/api/other', (req, res) => res.status(401).send('Unauthorized'));

      await request(app).get('/api/other').expect(401);
      await request(app).get('/api/other').expect(401);

      expect(triggered.called).toBe(false);
    });
  });

  describe('Status Code Monitoring', () => {
    test('should only trigger on matching status code', async () => {
      const app = express();
      const triggered = { called: false };

      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 401,
        threshold: 2,
        timeWindow: 1000,
        onTrigger: () => { triggered.called = true; }
      }));

      app.get('/api/test', (req, res) => {
        const code = req.query.code || '200';
        res.status(parseInt(code)).send('Response');
      });

      // Hit with different status codes
      await request(app).get('/api/test?code=200').expect(200);
      await request(app).get('/api/test?code=404').expect(404);
      await request(app).get('/api/test?code=500').expect(500);

      expect(triggered.called).toBe(false);

      // Hit with monitored status code
      await request(app).get('/api/test?code=401').expect(401);
      await request(app).get('/api/test?code=401').expect(401);

      expect(triggered.called).toBe(true);
    });

    test('should capture status code from res.statusCode property', async () => {
      const app = express();
      const triggered = { called: false };

      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 403,
        threshold: 2,
        timeWindow: 1000,
        onTrigger: () => { triggered.called = true; }
      }));

      app.get('/api/test', (req, res) => {
        res.statusCode = 403;
        res.end('Forbidden');
      });

      await request(app).get('/api/test').expect(403);
      await request(app).get('/api/test').expect(403);

      expect(triggered.called).toBe(true);
    });
  });

  describe('Threshold and Time Window', () => {
    test('should trigger when threshold is exceeded', async () => {
      const app = express();
      const triggered = { called: false, data: null };

      app.use(createAttackDetector({
        path: '/api/login',
        statusCode: 401,
        threshold: 5,
        timeWindow: 2000,
        onTrigger: (data) => {
          triggered.called = true;
          triggered.data = data;
        }
      }));

      app.post('/api/login', (req, res) => res.status(401).send('Unauthorized'));

      // Hit 4 times - should not trigger
      for (let i = 0; i < 4; i++) {
        await request(app).post('/api/login').expect(401);
      }
      expect(triggered.called).toBe(false);

      // 5th hit - should trigger
      await request(app).post('/api/login').expect(401);
      expect(triggered.called).toBe(true);
      expect(triggered.data.hits).toBe(5);
    });

    test('should clean old hits outside time window', async () => {
      const app = express();
      const triggered = { count: 0 };

      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 401,
        threshold: 3,
        timeWindow: 500, // 500ms window
        onTrigger: () => { triggered.count++; }
      }));

      app.get('/api/test', (req, res) => res.status(401).send('Unauthorized'));

      // Hit 2 times
      await request(app).get('/api/test').expect(401);
      await request(app).get('/api/test').expect(401);

      // Wait for time window to expire
      await new Promise(resolve => setTimeout(resolve, 600));

      // Hit 2 more times - should not trigger because old hits expired
      await request(app).get('/api/test').expect(401);
      await request(app).get('/api/test').expect(401);

      expect(triggered.count).toBe(0);
    });

    test('should reset hits after trigger', async () => {
      const app = express();
      const triggered = { count: 0 };

      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 401,
        threshold: 3,
        timeWindow: 1000,
        onTrigger: () => { triggered.count++; }
      }));

      app.get('/api/test', (req, res) => res.status(401).send('Unauthorized'));

      // First attack - trigger
      await request(app).get('/api/test').expect(401);
      await request(app).get('/api/test').expect(401);
      await request(app).get('/api/test').expect(401);
      expect(triggered.count).toBe(1);

      // Second attack - should trigger again
      await request(app).get('/api/test').expect(401);
      await request(app).get('/api/test').expect(401);
      await request(app).get('/api/test').expect(401);
      expect(triggered.count).toBe(2);
    });
  });

  describe('IP Tracking', () => {
    test('should track hits per IP address', async () => {
      const app = express();
      const triggered = { count: 0, ips: [] };

      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 401,
        threshold: 2,
        timeWindow: 1000,
        onTrigger: (data) => {
          triggered.count++;
          triggered.ips.push(data.ip);
        }
      }));

      app.get('/api/test', (req, res) => res.status(401).send('Unauthorized'));

      // Hit from first IP
      await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '1.2.3.4')
        .expect(401);
      await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '1.2.3.4')
        .expect(401);

      // Hit from second IP
      await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '5.6.7.8')
        .expect(401);
      await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '5.6.7.8')
        .expect(401);

      // Both IPs should have triggered
      expect(triggered.count).toBe(2);
      expect(triggered.ips).toContain('1.2.3.4');
      expect(triggered.ips).toContain('5.6.7.8');
    });

    test('should extract IP from X-Forwarded-For header', async () => {
      const app = express();
      const triggered = { data: null };

      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 401,
        threshold: 1,
        timeWindow: 1000,
        onTrigger: (data) => { triggered.data = data; }
      }));

      app.get('/api/test', (req, res) => res.status(401).send('Unauthorized'));

      await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '9.10.11.12, 13.14.15.16')
        .expect(401);

      expect(triggered.data.ip).toBe('9.10.11.12');
    });

    test('should extract IP from X-Real-IP header', async () => {
      const app = express();
      const triggered = { data: null };

      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 401,
        threshold: 1,
        timeWindow: 1000,
        onTrigger: (data) => { triggered.data = data; }
      }));

      app.get('/api/test', (req, res) => res.status(401).send('Unauthorized'));

      await request(app)
        .get('/api/test')
        .set('X-Real-IP', '17.18.19.20')
        .expect(401);

      expect(triggered.data.ip).toBe('17.18.19.20');
    });

    test('should fallback to socket.remoteAddress', async () => {
      const app = express();
      const triggered = { data: null };

      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 401,
        threshold: 1,
        timeWindow: 1000,
        onTrigger: (data) => { triggered.data = data; }
      }));

      app.get('/api/test', (req, res) => res.status(401).send('Unauthorized'));

      await request(app).get('/api/test').expect(401);

      expect(triggered.data.ip).toBeTruthy();
    });
  });

  describe('Callback Data', () => {
    test('should provide complete data to onTrigger callback', async () => {
      const app = express();
      const triggered = { data: null };

      app.use(createAttackDetector({
        path: '/api/login',
        statusCode: 401,
        threshold: 3,
        timeWindow: 1000,
        onTrigger: (data) => { triggered.data = data; }
      }));

      app.post('/api/login', (req, res) => res.status(401).send('Unauthorized'));

      // Trigger attack
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/login')
          .set('User-Agent', 'Mozilla/5.0 Test')
          .set('X-Forwarded-For', '192.168.1.100')
          .expect(401);
      }

      expect(triggered.data).toMatchObject({
        ip: '192.168.1.100',
        hits: 3,
        path: '/api/login',
        userAgent: 'Mozilla/5.0 Test'
      });
      expect(triggered.data.timestamp).toBeGreaterThan(0);
      expect(typeof triggered.data.timestamp).toBe('number');
    });

    test('should use "unknown" for missing user agent', async () => {
      const app = express();
      const triggered = { data: null };

      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 401,
        threshold: 1,
        timeWindow: 1000,
        onTrigger: (data) => { triggered.data = data; }
      }));

      app.get('/api/test', (req, res) => {
        delete req.headers['user-agent'];
        res.status(401).send('Unauthorized');
      });

      await request(app).get('/api/test').expect(401);

      expect(triggered.data.userAgent).toBe('unknown');
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in onTrigger callback gracefully', async () => {
      const app = express();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 401,
        threshold: 2,
        timeWindow: 1000,
        onTrigger: () => {
          throw new Error('Callback error');
        }
      }));

      app.get('/api/test', (req, res) => res.status(401).send('Unauthorized'));

      // Should not crash the server
      await request(app).get('/api/test').expect(401);
      await request(app).get('/api/test').expect(401);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Attack Detector: Error in onTrigger callback:',
        'Callback error'
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Integration', () => {
    test('should work alongside other middleware', async () => {
      const app = express();
      const triggered = { called: false };

      // Logger middleware
      const loggerMiddleware = (req, res, next) => {
        req.logged = true;
        next();
      };

      app.use(loggerMiddleware);
      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 401,
        threshold: 2,
        timeWindow: 1000,
        onTrigger: () => { triggered.called = true; }
      }));

      app.get('/api/test', (req, res) => {
        expect(req.logged).toBe(true);
        res.status(401).send('Unauthorized');
      });

      await request(app).get('/api/test').expect(401);
      await request(app).get('/api/test').expect(401);

      expect(triggered.called).toBe(true);
    });

    test('should not interfere with successful requests', async () => {
      const app = express();
      const triggered = { called: false };

      app.use(createAttackDetector({
        path: '/api/test',
        statusCode: 401,
        threshold: 2,
        timeWindow: 1000,
        onTrigger: () => { triggered.called = true; }
      }));

      app.get('/api/test', (req, res) => res.status(200).json({ success: true }));

      const response = await request(app).get('/api/test').expect(200);
      expect(response.body).toEqual({ success: true });
      expect(triggered.called).toBe(false);
    });
  });
});

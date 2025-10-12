const http = require('http');
const path = require('path');
const express = require('express');
const request = require('supertest');
const { createProxy, createProxyMiddleware } = require('../src/index');

describe('simple-proxy-id', () => {
  // Helper to get available port
  let portCounter = 6000;
  const getPort = () => portCounter++;
  const servers = []; // Track all servers for cleanup

  afterAll(async () => {
    // Force close all servers
    await Promise.all(servers.map(s => new Promise((resolve) => {
      if (s && s.listening) {
        s.close(() => resolve());
      } else {
        resolve();
      }
    })));

    // Give time for connections to close
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('createProxy', () => {
    test('should throw error if target is not provided', () => {
      expect(() => {
        createProxy();
      }).toThrow('Target URL is required');
    });

    test('should throw error if target is not a valid URL', () => {
      expect(() => {
        createProxy({ target: 'invalid-url' });
      }).toThrow('Target must be a valid URL');
    });

    test('should create proxy server with valid configuration', (done) => {
      const targetPort = getPort();
      const proxyPort = getPort();

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'success', path: req.url }));
      });
      servers.push(mockServer);

      mockServer.listen(targetPort, () => {
        // Create proxy server
        const proxyServer = createProxy({
          target: `http://localhost:${targetPort}`,
          port: proxyPort,
          changeOrigin: true
        });
        servers.push(proxyServer);

        // Test proxy
        setTimeout(() => {
          http.get(`http://localhost:${proxyPort}/test`, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              const json = JSON.parse(data);
              expect(json.message).toBe('success');
              expect(json.path).toBe('/test');
              done();
            });
          });
        }, 500);
      });
    });

    test('should work with logger enabled in standalone mode', (done) => {
      const targetPort = getPort();
      const proxyPort = getPort();
      const testLogDir = path.join(__dirname, 'test-standalone-logs');

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'logged', path: req.url }));
      });
      servers.push(mockServer);

      mockServer.listen(targetPort, () => {
        // Create proxy server with logger
        const proxyServer = createProxy({
          target: `http://localhost:${targetPort}`,
          port: proxyPort,
          changeOrigin: true,
          logger: {
            logDir: testLogDir,
            maxDays: 7
          }
        });
        servers.push(proxyServer);

        // Test proxy with logger
        setTimeout(() => {
          http.get(`http://localhost:${proxyPort}/test-logger`, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              const json = JSON.parse(data);
              expect(json.message).toBe('logged');

              // Wait for log to be written
              setTimeout(() => {
                // Check if log file was created
                const fs = require('fs');
                expect(fs.existsSync(testLogDir)).toBe(true);

                const files = fs.readdirSync(testLogDir);
                expect(files.length).toBeGreaterThan(0);

                // Read and verify log content
                const logFile = path.join(testLogDir, files[0]);
                const content = fs.readFileSync(logFile, 'utf8');
                expect(content).toContain('GET');
                expect(content).toContain('/test-logger');
                expect(content).toContain('200');

                // Cleanup logs
                files.forEach(file => {
                  fs.unlinkSync(path.join(testLogDir, file));
                });
                fs.rmdirSync(testLogDir);

                done();
              }, 200);
            });
          });
        }, 500);
      });
    });
  });

  describe('createProxyMiddleware', () => {
    test('should throw error if target is not provided', () => {
      expect(() => {
        createProxyMiddleware();
      }).toThrow('Target URL is required');
    });

    test('should throw error if target is not a valid URL', () => {
      expect(() => {
        createProxyMiddleware({ target: 'invalid-url' });
      }).toThrow('Target must be a valid URL');
    });

    test('should work as Express middleware', async () => {
      const targetPort = getPort();

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'from mock server',
          path: req.url
        }));
      });
      servers.push(mockServer);

      await new Promise((resolve) => {
        mockServer.listen(targetPort, resolve);
      });

      // Create Express app with proxy middleware
      const app = express();

      app.use('/api', createProxyMiddleware({
        target: `http://localhost:${targetPort}`,
        changeOrigin: true
      }));

      // Test middleware
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body.message).toBe('from mock server');
      expect(response.body.path).toBe('/users'); // Express strips /api prefix
    });

    test('should handle error with status 500', async () => {
      // Create Express app with proxy middleware to non-existent target
      const app = express();

      app.use('/api', createProxyMiddleware({
        target: 'http://localhost:9999', // Unused port
        changeOrigin: true
      }));

      // Test error handling
      const response = await request(app)
        .get('/api/test')
        .expect(500);

      expect(response.body.error).toBe('Proxy Error');
    });
  });

  describe('Security - Fixed Target', () => {
    test('target cannot be changed from request header', async () => {
      const targetPort = getPort();

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'correct target',
          host: req.headers.host
        }));
      });
      servers.push(mockServer);

      await new Promise((resolve) => {
        mockServer.listen(targetPort, resolve);
      });

      // Create Express app with proxy middleware
      const app = express();

      app.use('/api', createProxyMiddleware({
        target: `http://localhost:${targetPort}`,
        changeOrigin: true
      }));

      // Try to change target via header (should remain on original target)
      const response = await request(app)
        .get('/api/test')
        .set('Host', 'evil.com')
        .set('X-Forwarded-Host', 'evil.com')
        .expect(200);

      expect(response.body.message).toBe('correct target');
    });

    test('target cannot be changed from query string', async () => {
      const targetPort = getPort();

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'correct target',
          url: req.url
        }));
      });
      servers.push(mockServer);

      await new Promise((resolve) => {
        mockServer.listen(targetPort, resolve);
      });

      // Create Express app with proxy middleware
      const app = express();

      app.use('/api', createProxyMiddleware({
        target: `http://localhost:${targetPort}`,
        changeOrigin: true
      }));

      // Try to change target via query (should remain on original target)
      const response = await request(app)
        .get('/api/test?target=http://evil.com')
        .expect(200);

      expect(response.body.message).toBe('correct target');
    });
  });

  describe('Path Rewrite', () => {
    test('should rewrite path with object rules', async () => {
      const targetPort = getPort();

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'success',
          path: req.url
        }));
      });
      servers.push(mockServer);

      await new Promise((resolve) => {
        mockServer.listen(targetPort, resolve);
      });

      // Create Express app with proxy middleware with pathRewrite
      const app = express();

      app.use('/api', createProxyMiddleware({
        target: `http://localhost:${targetPort}`,
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''  // Remove /api prefix
        }
      }));

      // Test path rewrite
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body.message).toBe('success');
      // Express strips /api, then pathRewrite processes it
      expect(response.body.path).toBe('/users');
    });

    test('should rewrite path with function', async () => {
      const targetPort = getPort();

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'success',
          path: req.url
        }));
      });
      servers.push(mockServer);

      await new Promise((resolve) => {
        mockServer.listen(targetPort, resolve);
      });

      // Create Express app with proxy middleware with pathRewrite function
      const app = express();

      app.use('/api', createProxyMiddleware({
        target: `http://localhost:${targetPort}`,
        changeOrigin: true,
        pathRewrite: (path) => path.replace(/^\/old/, '/new')
      }));

      // Test path rewrite with function
      const response = await request(app)
        .get('/api/old/users')
        .expect(200);

      expect(response.body.message).toBe('success');
      expect(response.body.path).toBe('/new/users');
    });

    test('should rewrite multiple path patterns', async () => {
      const targetPort = getPort();

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'success',
          path: req.url
        }));
      });
      servers.push(mockServer);

      await new Promise((resolve) => {
        mockServer.listen(targetPort, resolve);
      });

      // Create Express app with proxy middleware with multiple rewrite rules
      const app = express();

      app.use('/backend', createProxyMiddleware({
        target: `http://localhost:${targetPort}`,
        changeOrigin: true,
        pathRewrite: {
          '^/v1': '/api/v1',
          '^/v2': '/api/v2'
        }
      }));

      // Test first rewrite rule
      const response1 = await request(app)
        .get('/backend/v1/users')
        .expect(200);

      expect(response1.body.path).toBe('/api/v1/users');

      // Test second rewrite rule
      const response2 = await request(app)
        .get('/backend/v2/posts')
        .expect(200);

      expect(response2.body.path).toBe('/api/v2/posts');
    });

    test('should work without pathRewrite (backwards compatibility)', async () => {
      const targetPort = getPort();

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'success',
          path: req.url
        }));
      });
      servers.push(mockServer);

      await new Promise((resolve) => {
        mockServer.listen(targetPort, resolve);
      });

      // Create Express app without pathRewrite
      const app = express();

      app.use('/api', createProxyMiddleware({
        target: `http://localhost:${targetPort}`,
        changeOrigin: true
      }));

      // Test without path rewrite
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body.message).toBe('success');
      expect(response.body.path).toBe('/users');
    });

    test('should use pathRewrite in standalone proxy', (done) => {
      const targetPort = getPort();
      const proxyPort = getPort();

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'success', path: req.url }));
      });
      servers.push(mockServer);

      mockServer.listen(targetPort, () => {
        // Create proxy server with pathRewrite
        const proxyServer = createProxy({
          target: `http://localhost:${targetPort}`,
          port: proxyPort,
          changeOrigin: true,
          pathRewrite: {
            '^/backend': '/api'
          }
        });
        servers.push(proxyServer);

        // Test proxy with pathRewrite
        setTimeout(() => {
          http.get(`http://localhost:${proxyPort}/backend/users`, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              const json = JSON.parse(data);
              expect(json.message).toBe('success');
              expect(json.path).toBe('/api/users');
              done();
            });
          });
        }, 500);
      });
    });
  });
});

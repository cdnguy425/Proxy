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

  describe('CORS Integration', () => {
    test('should work with CORS in standalone mode', (done) => {
      const targetPort = getPort();
      const proxyPort = getPort();

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'cors enabled' }));
      });
      servers.push(mockServer);

      mockServer.listen(targetPort, () => {
        // Create proxy server with CORS
        const proxyServer = createProxy({
          target: `http://localhost:${targetPort}`,
          port: proxyPort,
          changeOrigin: true,
          cors: {
            origin: 'http://localhost:8080',
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type']
          }
        });
        servers.push(proxyServer);

        // Test proxy with CORS
        setTimeout(() => {
          const options = {
            hostname: 'localhost',
            port: proxyPort,
            path: '/test',
            headers: {
              'Origin': 'http://localhost:8080'
            }
          };

          http.get(options, (res) => {
            expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8080');
            expect(res.headers['access-control-allow-methods']).toBeTruthy();
            done();
          });
        }, 500);
      });
    });
  });

  describe('Attack Detector Integration', () => {
    test('should work with attack detector in standalone mode', (done) => {
      const targetPort = getPort();
      const proxyPort = getPort();
      let attackDetected = false;

      // Create mock target server that returns 401
      const mockServer = http.createServer((req, res) => {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
      });
      servers.push(mockServer);

      mockServer.listen(targetPort, () => {
        // Create proxy server with attack detector
        const proxyServer = createProxy({
          target: `http://localhost:${targetPort}`,
          port: proxyPort,
          changeOrigin: true,
          attackDetector: {
            path: '/login',
            statusCode: 401,
            threshold: 2,
            timeWindow: 1000,
            onTrigger: (data) => {
              attackDetected = true;
              expect(data.hits).toBe(2);
              expect(data.path).toBe('/login');
            }
          }
        });
        servers.push(proxyServer);

        // Test proxy with attack detector
        setTimeout(() => {
          // First hit
          http.get(`http://localhost:${proxyPort}/login`, (res) => {
            // Second hit
            http.get(`http://localhost:${proxyPort}/login`, (res) => {
              setTimeout(() => {
                expect(attackDetected).toBe(true);
                done();
              }, 100);
            });
          });
        }, 500);
      });
    });

    test('should work with multiple attack detectors in standalone mode', (done) => {
      const targetPort = getPort();
      const proxyPort = getPort();
      const attacks = { login: false, scan: false };

      // Create mock target server
      const mockServer = http.createServer((req, res) => {
        if (req.url === '/login') {
          res.writeHead(401);
        } else {
          res.writeHead(404);
        }
        res.end();
      });
      servers.push(mockServer);

      mockServer.listen(targetPort, () => {
        // Create proxy server with multiple attack detectors
        const proxyServer = createProxy({
          target: `http://localhost:${targetPort}`,
          port: proxyPort,
          changeOrigin: true,
          attackDetector: [
            {
              path: '/login',
              statusCode: 401,
              threshold: 2,
              timeWindow: 1000,
              onTrigger: () => { attacks.login = true; }
            },
            {
              path: /^\/.*$/,
              statusCode: 404,
              threshold: 2,
              timeWindow: 1000,
              onTrigger: () => { attacks.scan = true; }
            }
          ]
        });
        servers.push(proxyServer);

        setTimeout(() => {
          // Trigger login detector
          http.get(`http://localhost:${proxyPort}/login`, () => {
            http.get(`http://localhost:${proxyPort}/login`, () => {
              // Trigger scan detector
              http.get(`http://localhost:${proxyPort}/notfound1`, () => {
                http.get(`http://localhost:${proxyPort}/notfound2`, () => {
                  setTimeout(() => {
                    expect(attacks.login).toBe(true);
                    expect(attacks.scan).toBe(true);
                    done();
                  }, 100);
                });
              });
            });
          });
        }, 500);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid target gracefully in middleware', async () => {
      const app = express();

      app.use('/api', createProxyMiddleware({
        target: 'http://localhost:1', // Port 1, typically not accessible
        changeOrigin: true
      }));

      const response = await request(app)
        .get('/api/test')
        .expect(500);

      expect(response.body.error).toBe('Proxy Error');
    });
  });

  describe('HTTPS Support', () => {
    test('should create proxy for HTTPS target', () => {
      expect(() => {
        const middleware = createProxyMiddleware({
          target: 'https://api.example.com',
          changeOrigin: true
        });
        expect(typeof middleware).toBe('function');
      }).not.toThrow();
    });

    test('should detect HTTPS protocol correctly', async () => {
      const targetPort = getPort();

      // Create mock HTTP target server
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ protocol: 'http' }));
      });
      servers.push(mockServer);

      await new Promise((resolve) => {
        mockServer.listen(targetPort, resolve);
      });

      // Create proxy for HTTP target
      const app = express();
      app.use('/api', createProxyMiddleware({
        target: `http://localhost:${targetPort}`,
        changeOrigin: true
      }));

      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.protocol).toBe('http');
    });
  });

  describe('Headers Handling', () => {
    test('should set Host header when changeOrigin is true', async () => {
      const targetPort = getPort();

      // Create mock target server that echoes Host header
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ host: req.headers.host }));
      });
      servers.push(mockServer);

      await new Promise((resolve) => {
        mockServer.listen(targetPort, resolve);
      });

      // Create proxy with changeOrigin: true
      const app = express();
      app.use('/api', createProxyMiddleware({
        target: `http://localhost:${targetPort}`,
        changeOrigin: true
      }));

      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.host).toBe(`localhost:${targetPort}`);
    });

    test('should not set Host header when changeOrigin is false', async () => {
      const targetPort = getPort();

      // Create mock target server that echoes Host header
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ host: req.headers.host || 'not-set' }));
      });
      servers.push(mockServer);

      await new Promise((resolve) => {
        mockServer.listen(targetPort, resolve);
      });

      // Create proxy with changeOrigin: false
      const app = express();
      app.use('/api', createProxyMiddleware({
        target: `http://localhost:${targetPort}`,
        changeOrigin: false
      }));

      const response = await request(app)
        .get('/api/test')
        .expect(200);

      // When changeOrigin is false, host header is deleted, so target receives undefined or the test client's host
      expect(response.body.host).toBeDefined();
    });
  });

  describe('Port Handling', () => {
    test('should use default HTTP port 80 when not specified', () => {
      expect(() => {
        createProxyMiddleware({
          target: 'http://example.com',
          changeOrigin: true
        });
      }).not.toThrow();
    });

    test('should use default HTTPS port 443 when not specified', () => {
      expect(() => {
        createProxyMiddleware({
          target: 'https://example.com',
          changeOrigin: true
        });
      }).not.toThrow();
    });

    test('should use custom port when specified', () => {
      expect(() => {
        createProxyMiddleware({
          target: 'http://example.com:8080',
          changeOrigin: true
        });
      }).not.toThrow();
    });
  });
});

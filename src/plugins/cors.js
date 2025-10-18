/**
 * CORS (Cross-Origin Resource Sharing) Plugin
 * Handles cross-origin requests with configurable origin validation
 *
 * @param {Object} options - Configuration options
 * @param {string|string[]|Function} options.origin - Allowed origin(s)
 *   - String: Single domain 'https://example.com'
 *   - Array: Multiple domains ['https://example.com', 'https://app.example.com']
 *   - Function: Dynamic validation (requestOrigin) => boolean
 *   - Special: '*' for allow all (development only)
 * @param {string[]} options.methods - Allowed HTTP methods (default: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'])
 * @param {string[]} options.allowedHeaders - Allowed request headers (default: ['Content-Type', 'Authorization'])
 * @returns {Function} Middleware function
 */
function createCors(options = {}) {
  // Normalize options with defaults
  const config = {
    origin: options.origin || '*',
    methods: options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
    allowedHeaders: options.allowedHeaders || ['Content-Type', 'Authorization']
  };

  // Validate options
  if (!config.origin) {
    throw new Error('origin is required');
  }

  if (!Array.isArray(config.methods) || config.methods.length === 0) {
    throw new Error('methods must be a non-empty array');
  }

  if (!Array.isArray(config.allowedHeaders) || config.allowedHeaders.length === 0) {
    throw new Error('allowedHeaders must be a non-empty array');
  }

  // Create origin validator function
  const isOriginAllowed = (() => {
    // Wildcard: allow all origins
    if (config.origin === '*') {
      return () => true;
    }

    // Function: custom validation
    if (typeof config.origin === 'function') {
      return config.origin;
    }

    // String: single origin
    if (typeof config.origin === 'string') {
      return (requestOrigin) => requestOrigin === config.origin;
    }

    // Array: multiple origins
    if (Array.isArray(config.origin)) {
      const allowedOrigins = new Set(config.origin);
      return (requestOrigin) => allowedOrigins.has(requestOrigin);
    }

    throw new Error('origin must be a string, array, function, or "*"');
  })();

  // Pre-compute header values for performance
  const methodsHeader = config.methods.join(', ');
  const headersHeader = config.allowedHeaders.join(', ');

  // Return middleware function
  return (req, res, next) => {
    const requestOrigin = req.headers.origin;

    // If no origin header, skip CORS handling
    // (same-origin requests don't send Origin header)
    if (!requestOrigin) {
      // Still handle OPTIONS preflight for same-origin requests
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Methods': methodsHeader,
          'Access-Control-Allow-Headers': headersHeader
        });
        return res.end();
      }
      return next();
    }

    // Validate origin
    const allowed = isOriginAllowed(requestOrigin);

    if (!allowed) {
      // Origin not allowed, skip CORS headers
      // Let the request continue but without CORS headers
      // Browser will block the response
      return next();
    }

    // Set CORS headers
    const allowOriginValue = config.origin === '*' ? '*' : requestOrigin;

    res.setHeader('Access-Control-Allow-Origin', allowOriginValue);
    res.setHeader('Access-Control-Allow-Methods', methodsHeader);
    res.setHeader('Access-Control-Allow-Headers', headersHeader);

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    // Continue to next middleware
    next();
  };
}

module.exports = createCors;

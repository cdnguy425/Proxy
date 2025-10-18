# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2025-10-18

### Added
- **CORS Plugin** - New plugin for handling cross-origin requests
  - Flexible origin validation (string, array, function, wildcard `*`)
  - Support for dynamic origin validation with custom logic
  - Automatic OPTIONS preflight handling (204 No Content)
  - Configurable methods and allowed headers
  - Per-request origin validation for security
  - Zero dependencies
- **Example Files** - Added CORS usage examples
  - `example/standalone-with-cors.js` - Standalone proxy with CORS whitelist
  - `example/express-with-cors.js` - Express middleware with CORS and JWT auth example
- **NPM Scripts** - Added scripts for CORS examples
  - `npm run example:standalone-cors`
  - `npm run example:express-cors`
- **Comprehensive Test Coverage** - Improved test coverage to **93.5%** (target >90% achieved!)
  - Added 25 test cases for attack-detector plugin (100% coverage)
  - Added 11 integration tests for CORS, attack detector, HTTPS, headers, and ports
  - Total: **86 tests** (up from 51 tests)
- **Coverage Badge** - Added test coverage badge (93.5% brightgreen) to README

### Fixed
- **Package Exports** - Fixed module exports structure for plugins
  - Added `src/cors.js` re-export file (consistent with logger and attack-detector pattern)
  - Updated `package.json` exports to point to correct paths
  - Now users can use `require('simple-proxy-id/cors')` without `/src` prefix

### Changed
- **Documentation** - Comprehensive README.md updates
  - Added CORS plugin to features list
  - Added "With CORS Plugin" usage section with 3 examples (whitelist, dynamic validation, wildcard)
  - Added `createCors(options)` API documentation
  - Updated `createProxy` parameters to include CORS configuration
  - Updated project structure section to mention CORS plugin
  - Added real-world use cases (JWT authentication APIs)

### Improved
- **Test Coverage** - Significant increase from 72.1% to **93.5%**
  - Statements: 72.1% → 93.53%
  - Branches: 57.8% → 85.54%
  - Functions: 71.79% → 92.3%
  - Lines: 72.47% → 93.37%
- **Code Quality** - Better error handling and edge case coverage

## [1.2.0] - 2025-10-12

### Added
- **Path Rewrite Feature**: New capability to rewrite request paths before forwarding to target
  - Support for object rules with regex patterns (e.g., `{'^/backend': '/api'}`)
  - Support for custom function for advanced path transformation
  - Works with both `createProxy()` and `createProxyMiddleware()`
  - Zero dependencies - uses native JavaScript RegExp
  - Fully tested with 5 new test cases covering various scenarios
- Example files demonstrating path rewrite usage:
  - `example/standalone-with-pathrewrite.js`
  - `example/express-with-pathrewrite.js`
- NPM scripts for running path rewrite examples:
  - `npm run example:standalone-pathrewrite`
  - `npm run example:express-pathrewrite`
- TypeScript definitions for path rewrite feature:
  - `PathRewriteRules` type for object-based rules
  - `PathRewriteFunction` type for function-based rewrite
  - Updated `ProxyOptions` and `ProxyMiddlewareOptions` interfaces
- Comprehensive documentation in README:
  - New "With Path Rewrite" usage section
  - Updated API documentation with path rewrite parameters
  - Multiple examples showing different use cases

### Changed
- Updated README feature list to include path rewriting
- Enhanced API documentation with path rewrite examples
- Improved TypeScript examples with path rewrite usage

### Removed
- Removed `ROADMAP.md` file (features will be tracked via GitHub issues)
- Removed roadmap section from README

## [1.1.1] - 2025-10-12

### Added
- `.npmignore` file to exclude unnecessary files from npm package
  - Excludes development files (.git, .github, .vscode, etc.)
  - Excludes test files and benchmark directory
  - Excludes example files
  - Excludes development documentation (CONTRIBUTING.md, ROADMAP.md)
  - Reduces package size for faster installation

## [1.1.0] - 2025-10-03

### Added
- **Attack Detector Plugin**: New middleware for brute force protection and attack detection
  - Monitor specific paths (exact match or RegExp pattern)
  - Track failed requests by status code per IP address
  - Configurable threshold and time window
  - Custom callback for blocking actions (Cloudflare API, Mikrotik, iptables, etc.)
  - Automatic cleanup of tracking data
- **Performance Optimizations**: Significant performance improvements
  - HTTP Agent with connection pooling and keep-alive
  - Cached target URL parsing (parsed once at initialization)
  - Pre-computed error responses
  - TCP_NODELAY enabled for lower latency
  - Connection reuse across requests
  - **Benchmark results**: ~1,660 req/s, 60ms avg latency, p99 138ms
- Autocannon benchmark script for accurate performance testing
- Custom benchmark script for basic performance testing
- Example usage for attack-detector plugin (standalone & Express)
- Comprehensive tests for attack-detector functionality
- Performance section in README with benchmark results

### Changed
- Updated package keywords to include attack-detector, brute-force-protection, and rate-limiter
- Enhanced README with attack detector examples and API documentation
- Updated README with performance metrics and optimizations
- Refactored `forwardRequest()` to accept pre-parsed target and HTTP agent

## [1.0.1] - 2025-10-03

### Fixed
- Fixed logger require path in package structure
- Completed package.json metadata

### Changed
- Improved project structure organization

## [1.0.0] - 2025-10-03

### Added
- Initial release
- Standalone HTTP/HTTPS proxy server
- Express middleware for proxy
- Fixed target security (cannot be changed from requests)
- Optional changeOrigin support
- Automatic error handling
- Logger plugin with daily rotating logs
- IP detection (Cloudflare Tunnel compatible)
- TypeScript definitions
- Zero dependencies
- Comprehensive test suite
- Example usage files

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

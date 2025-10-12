/// <reference types="node" />

import { Server } from 'http';
import { RequestHandler } from 'express';

/**
 * Path rewrite rules as key-value pairs
 * Keys are regex patterns, values are replacements
 */
export type PathRewriteRules = {
  [pattern: string]: string;
};

/**
 * Path rewrite function
 * Takes the original path and returns the rewritten path
 */
export type PathRewriteFunction = (path: string) => string;

/**
 * Options for creating a standalone proxy server
 */
export interface ProxyOptions {
  /**
   * Target URL to proxy requests to (required, fixed)
   */
  target: string;

  /**
   * Set Host header to target (default: false)
   */
  changeOrigin?: boolean;

  /**
   * Port for proxy server (default: 3000)
   */
  port?: number;

  /**
   * Path rewrite configuration (optional)
   * Can be an object with regex patterns or a custom function
   */
  pathRewrite?: PathRewriteRules | PathRewriteFunction;

  /**
   * Logger configuration (optional)
   */
  logger?: LoggerOptions;
}

/**
 * Options for creating a proxy middleware
 */
export interface ProxyMiddlewareOptions {
  /**
   * Target URL to proxy requests to (required, fixed)
   */
  target: string;

  /**
   * Set Host header to target (default: false)
   */
  changeOrigin?: boolean;

  /**
   * Path rewrite configuration (optional)
   * Can be an object with regex patterns or a custom function
   */
  pathRewrite?: PathRewriteRules | PathRewriteFunction;
}

/**
 * Options for logger plugin
 */
export interface LoggerOptions {
  /**
   * Directory to store log files (default: './logs')
   */
  logDir?: string;

  /**
   * Maximum days to keep logs (default: 7)
   */
  maxDays?: number;
}

/**
 * Create standalone HTTP/HTTPS proxy server
 * @param options - Proxy configuration
 * @returns HTTP Server instance
 *
 * @example
 * ```typescript
 * const { createProxy } = require('simple-proxy-id');
 *
 * // Basic usage
 * const server = createProxy({
 *   target: 'https://api.example.com',
 *   changeOrigin: true,
 *   port: 3000
 * });
 *
 * // With path rewrite (object rules)
 * const serverWithRewrite = createProxy({
 *   target: 'https://api.example.com',
 *   changeOrigin: true,
 *   port: 3000,
 *   pathRewrite: {
 *     '^/backend': '/api',
 *     '^/v1': '/api/v1'
 *   }
 * });
 *
 * // With path rewrite (function)
 * const serverWithFunction = createProxy({
 *   target: 'https://api.example.com',
 *   changeOrigin: true,
 *   port: 3000,
 *   pathRewrite: (path) => path.replace(/^\/old/, '/new')
 * });
 *
 * // With logger and path rewrite
 * const serverFull = createProxy({
 *   target: 'https://api.example.com',
 *   changeOrigin: true,
 *   port: 3000,
 *   pathRewrite: {
 *     '^/backend': '/api'
 *   },
 *   logger: {
 *     logDir: './logs',
 *     maxDays: 7
 *   }
 * });
 * ```
 */
export function createProxy(options: ProxyOptions): Server;

/**
 * Create Express middleware for proxy
 * @param options - Proxy configuration
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const express = require('express');
 * const { createProxyMiddleware } = require('simple-proxy-id');
 *
 * const app = express();
 *
 * // Basic usage
 * app.use('/api', createProxyMiddleware({
 *   target: 'https://api.example.com',
 *   changeOrigin: true
 * }));
 *
 * // With path rewrite (object rules)
 * app.use('/backend', createProxyMiddleware({
 *   target: 'https://api.example.com',
 *   changeOrigin: true,
 *   pathRewrite: {
 *     '^/backend': '/api'
 *   }
 * }));
 *
 * // With path rewrite (function)
 * app.use('/legacy', createProxyMiddleware({
 *   target: 'https://api.example.com',
 *   changeOrigin: true,
 *   pathRewrite: (path) => path.replace(/^\/old/, '/new')
 * }));
 * ```
 */
export function createProxyMiddleware(options: ProxyMiddlewareOptions): RequestHandler;

/**
 * Create logger middleware for tracking requests
 * @param options - Logger configuration
 * @returns Express/Connect middleware function
 *
 * @example
 * ```typescript
 * const createLogger = require('simple-proxy-id/logger');
 *
 * app.use(createLogger({
 *   logDir: './logs',
 *   maxDays: 7
 * }));
 * ```
 */
export function createLogger(options?: LoggerOptions): RequestHandler;

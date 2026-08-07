/**
 * SecurityHeadersConstants
 *
 * Security headers configuration (helmet, X-* headers).
 * Single Responsibility: Security header patterns and config file locations
 */
export class SecurityHeadersConstants {
  static readonly HEADER_PATTERNS = [
    'helmet',
    'X-Frame-Options',
    'X-XSS-Protection',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
  ];

  static readonly CONFIG_FILES = [
    'angular.json',
    'webpack.config.js',
    'vite.config.js',
    'next.config.js',
  ];
}

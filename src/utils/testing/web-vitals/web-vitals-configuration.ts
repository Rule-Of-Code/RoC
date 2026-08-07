/**
 * Web Vitals Testing Configuration
 * RULE 1: Single source of truth for all hardcoded values
 * Centralized configuration eliminates duplication and improves maintainability
 * RULE 2: Optimized internals - uses FileSystemSearcher utility for consistency
 */
import { FileSystemSearcher } from '../file-system-searcher';

/**
 * PackageJson interface for type-safe package.json operations
 * RULE 1: Centralized interface definition
 */
export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Metrics check configuration interface
 * RULE 1: Single source of truth for metrics configuration
 */
export interface MetricsCheckConfig {
  checker: (content: string) => boolean;
  message: string;
}

export class WebVitalsConfiguration {
  /**
   * Web Vitals and performance monitoring libraries
   * Used to detect if project has web vitals testing tools installed
   */
  static readonly WEB_VITALS_LIBRARIES = [
    'web-vitals',
    'lighthouse',
    '@lhci/cli',
    'lighthouse-ci',
    'puppeteer',
    'playwright',
    'webpagetest',
    'gtmetrix',
  ];

  /**
   * Test file patterns for web vitals testing
   * Regex patterns to find test files related to web vitals
   */
  static readonly TEST_PATTERNS = [
    /web.*vitals.*\.(test|spec)\.(js|ts)$/i,
    /vitals.*\.(test|spec)\.(js|ts)$/i,
    /lighthouse.*\.(test|spec)\.(js|ts)$/i,
    /performance.*vitals.*\.(test|spec)\.(js|ts)$/i,
    /core.*web.*vitals.*\.(test|spec)\.(js|ts)$/i,
  ];

  /**
   * Lighthouse configuration file names
   * Standard names for lighthouse configuration files
   */
  static readonly LIGHTHOUSE_CONFIG_FILES = [
    'lighthouse.config.js',
    'lighthouserc.js',
    '.lighthouserc.json',
    '.lighthouserc.yml',
    'lighthouse-ci.config.js',
  ];

  /**
   * Directories to skip during file system traversal
   * Excludes common non-relevant directories for performance
   */
  static readonly SKIP_DIRECTORIES = [
    'node_modules',
    'dist',
    '.git',
    'coverage',
    '.nx',
  ];

  /**
   * Source file extensions to analyze
   * Only these file types are considered for content analysis
   */
  static readonly SOURCE_FILE_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx'];

  /**
   * Test file patterns to exclude
   * Files matching these patterns are skipped during source file analysis
   */
  static readonly TEST_FILE_PATTERNS = ['.test.', '.spec.'];

  /**
   * Maximum number of files to analyze for performance metrics
   * Prevents excessive file system operations
   */
  static readonly MAX_FILES_TO_ANALYZE = 50;

  /**
   * Metrics check configuration
   * RULE 1: Centralized mapping of pattern matchers to their descriptions
   * Each entry combines a detection function with its corresponding message
   */
  static readonly METRICS_CHECK_CONFIG: MetricsCheckConfig[] = [
    {
      checker: (content: string) =>
        content.includes('web-vitals') &&
        (content.includes('getCLS') ||
          content.includes('getFID') ||
          content.includes('getLCP')),
      message: 'Web Vitals monitoring code detected',
    },
    {
      checker: (content: string) =>
        content.includes('PerformanceObserver') && content.includes('observe'),
      message: 'Performance Observer API usage detected',
    },
    {
      checker: (content: string) =>
        content.includes('lighthouse') ||
        content.includes('runLighthouse') ||
        content.includes('audit'),
      message: 'Lighthouse integration detected',
    },
  ];

  /**
   * Check if directory should be skipped during traversal
   * RULE 2: Uses FileSystemSearcher utility for consistency
   * @param dirname Directory name to check
   * @returns true if directory should be skipped
   */
  static shouldSkipDirectory(dirname: string): boolean {
    return FileSystemSearcher.containsPattern(dirname, this.SKIP_DIRECTORIES);
  }
}

import { DIRECTORY_NAMES, FILE_EXTENSIONS } from '../../constants';

/**
 * FileHeaderComplianceConfiguration
 * Centralized configuration management for constitutional file header compliance analysis
 */
export class FileHeaderComplianceConfiguration {
  private static readonly Config = FileHeaderComplianceConfiguration;

  /**
   * File header analysis configuration (RULE 1: 100% internal coverage)
   */
  static readonly FILE_HEADER_ANALYSIS_CONFIG = {
    maxSampleFiles: 20,
    maxSearchDepth: 3,
    maxExampleFiles: 3,
    fileHeaderAnalysisLines: 10,
  } as const;

  /**
   * Header indicator patterns for detecting compliance headers (RULE 1: 100% internal coverage)
   */
  static readonly HEADER_INDICATOR_PATTERNS = {
    patterns: [
      'copyright',
      'license',
      '@fileoverview',
      '@description',
      'constitutional compliance',
      'policies.md',
      'constitution.md',
      'mit license',
      'apache license',
      'gpl license',
      '@author',
      '@since',
      '@version',
    ] as readonly string[],
  } as const;

  /**
   * Source file extension patterns (RULE 1: 100% internal coverage)
   */
  static readonly SOURCE_FILE_CONFIG = {
    extensions: [
      FILE_EXTENSIONS.TYPESCRIPT,
      FILE_EXTENSIONS.JAVASCRIPT,
      FILE_EXTENSIONS.TSX,
      FILE_EXTENSIONS.JSX,
      FILE_EXTENSIONS.VUE,
      FILE_EXTENSIONS.PYTHON,
      FILE_EXTENSIONS.JAVA,
      FILE_EXTENSIONS.GO,
    ] as readonly string[],
    skipPatterns: ['.test.', '.spec.', '.d.ts', 'index.'] as readonly string[],
  } as const;

  /**
   * Directory filtering configuration (RULE 1: 100% internal coverage)
   */
  static readonly DIRECTORY_FILTER_CONFIG = {
    skipDirectories: [
      'node_modules',
      'dist',
      'build',
      '.git',
      'coverage',
      '.nx',
      '.angular',
      'tmp',
      'temp',
      'test',
      'tests',
      '__tests__',
    ] as readonly string[],
    srcDirectory: DIRECTORY_NAMES.SRC,
  } as const;

  /**
   * File reading configuration (RULE 1: 100% internal coverage)
   */
  static readonly FILE_READING_CONFIG = {
    encoding: 'utf8' as BufferEncoding,
    errorHandling: 'skip' as const,
  } as const;

  /**
   * Validation messages configuration (RULE 1: 100% internal coverage)
   */
  static readonly VALIDATION_MESSAGES = {
    violations: {
      missingHeaders: 'sample files lack constitutional compliance headers',
    },
    suggestions: {
      addHeaders: 'Add headers to files like',
      includeCompliance:
        'Include copyright, license, and constitutional compliance information in file headers',
    },
  } as const;

  /**
   * Get file header analysis configuration (RULE 2: Caching)
   */
  static getFileHeaderAnalysisConfig(_config?: unknown): {
    maxSampleFiles: number;
    maxSearchDepth: number;
    maxExampleFiles: number;
    fileHeaderAnalysisLines: number;
  } {
    return this.Config.FILE_HEADER_ANALYSIS_CONFIG;
  }

  /**
   * Get header indicator patterns for detecting compliance headers (RULE 2: Caching)
   */
  static getHeaderIndicatorPatterns(_config?: unknown): {
    patterns: readonly string[];
  } {
    return this.Config.HEADER_INDICATOR_PATTERNS;
  }

  /**
   * Get source file extension patterns (RULE 2: Caching)
   */
  static getSourceFileConfig(_config?: unknown): {
    extensions: readonly string[];
    skipPatterns: readonly string[];
  } {
    return this.Config.SOURCE_FILE_CONFIG;
  }

  /**
   * Get directory filtering configuration (RULE 2: Caching)
   */
  static getDirectoryFilterConfig(_config?: unknown): {
    skipDirectories: readonly string[];
    srcDirectory: string;
  } {
    return this.Config.DIRECTORY_FILTER_CONFIG;
  }

  /**
   * Get file reading configuration (RULE 2: Caching)
   */
  static getFileReadingConfig(_config?: unknown): {
    encoding: BufferEncoding;
    errorHandling: 'skip' | 'throw';
  } {
    return this.Config.FILE_READING_CONFIG;
  }

  /**
   * Get validation messages configuration (RULE 2: Caching)
   */
  static getValidationMessages(_config?: unknown): {
    violations: {
      missingHeaders: string;
    };
    suggestions: {
      addHeaders: string;
      includeCompliance: string;
    };
  } {
    return this.Config.VALIDATION_MESSAGES;
  }

  /**
   * Check if directory should be skipped based on configuration (RULE 2: Caching)
   */
  static shouldSkipDirectory(dirname: string): boolean {
    const config = this.Config.DIRECTORY_FILTER_CONFIG;
    return config.skipDirectories.includes(dirname);
  }
}

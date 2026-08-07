/**
 * File Patterns Utilities
 * Centralized file extension patterns for glob operations
 * This file has ZERO internal dependencies to break circular imports
 */

/**
 * Create glob patterns for a specific file type
 */
export function createTypePattern(
  type: 'config' | 'javascript' | 'markdown' | 'test' | 'typescript'
): string[] {
  const typeExtensions = {
    typescript: ['ts', 'tsx'],
    javascript: ['js', 'jsx'],
    config: ['json', 'yaml', 'yml'],
    test: ['test.*', 'spec.*'],
    markdown: ['md', 'markdown'],
  };

  const extensions = typeExtensions[type];

  if (type === 'test') {
    // Special handling for test patterns
    return [
      `**/*.${extensions[0]}`,
      `**/*.${extensions[1]}`,
      '**/test/**',
      '**/tests/**',
    ];
  }

  return extensions.map(ext => `**/*.${ext}`);
}

/**
 * Create a glob pattern for multiple file extensions
 */
export function createMultiExtensionPattern(extensions: string[]): string {
  if (extensions.length === 1) {
    return `**/*.${extensions[0]}`;
  }
  return `**/*.{${extensions.join(',')}}`;
}

/**
 * Create standard glob patterns for common use cases
 */
export function getStandardPatterns(): {
  allFiles: string;
  allDirectories: string;
  allFilesAndDirectories: string;
} {
  return {
    allFiles: '**/*',
    allDirectories: '**/',
    allFilesAndDirectories: '**',
  };
}

/**
 * Standard file patterns for different file types
 */
export interface FilePatterns {
  typescript: string[];
  javascript: string[];
  config: string[];
  test: string[];
  markdown: string[];
}

/**
 * Get standard file patterns for different file types
 */
export function getFilePatterns(): FilePatterns {
  return {
    typescript: createTypePattern('typescript'),
    javascript: createTypePattern('javascript'),
    config: createTypePattern('config'),
    test: createTypePattern('test'),
    markdown: createTypePattern('markdown'),
  };
}

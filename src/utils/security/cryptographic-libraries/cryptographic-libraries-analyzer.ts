/**
 * Cryptographic Libraries Analyzer
 * Specialized analyzer for checking cryptographic library usage and security
 *
 * This is a facade that delegates to:
 * - CryptographicLibrariesConfiguration: Patterns, messages, and constants
 * - CryptographicLibrariesValidationPatterns: Validation workflow
 */

import { CryptographicLibrariesConfiguration as Config } from './cryptographic-libraries-configuration';
import { CryptographicLibrariesValidationPatterns as ValidationPatterns } from './cryptographic-libraries-validation-patterns';

export class CryptographicLibrariesAnalyzer {
  /**
   * Main entry point for cryptographic library analysis
   * Delegates to ValidationPatterns for complete workflow
   */
  static checkCryptographicLibraries(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    return ValidationPatterns.validateAllCryptographicPatterns(projectRoot);
  }

  /**
   * Returns cryptographic library recommendations
   * Delegates to Configuration constants
   */
  static getCryptoLibraryRecommendations(): string[] {
    return [...Config.RECOMMENDATIONS];
  }
}

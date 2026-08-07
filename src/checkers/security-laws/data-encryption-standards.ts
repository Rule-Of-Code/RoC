/**
 * Data Encryption Standards Law - Streamlined
 * Enforces proper data encryption and cryptographic standards
 * Delegates to specialized analyzers for SRP compliance
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CryptographicLibrariesAnalyzer } from '../../utils/security/cryptographic-libraries';
import { DataStorageSecurityAnalyzer } from '../../utils/security/data-storage-security';
import { EncryptionImplementationAnalyzer } from '../../utils/security/encryption-implementation';
import { SecurityLawResultBuilder } from './security-law-result-builder';

export class DataEncryptionStandardsLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Delegate to specialized analyzers
    const encryptionAnalysis =
      EncryptionImplementationAnalyzer.checkEncryptionImplementation(
        context.projectRoot,
        context.config
      );
    violations.push(...encryptionAnalysis.violations);
    suggestions.push(...encryptionAnalysis.suggestions);

    const cryptoLibsAnalysis =
      CryptographicLibrariesAnalyzer.checkCryptographicLibraries(
        context.projectRoot
      );
    violations.push(...cryptoLibsAnalysis.violations);
    suggestions.push(...cryptoLibsAnalysis.suggestions);

    const dataStorageAnalysis =
      DataStorageSecurityAnalyzer.checkDataStorageSecurity(
        context.projectRoot,
        context.config
      );
    violations.push(...dataStorageAnalysis.violations);
    suggestions.push(...dataStorageAnalysis.suggestions);

    // Collect recommendations from all analyzers
    suggestions.push(
      ...EncryptionImplementationAnalyzer.getEncryptionRecommendations()
    );
    suggestions.push(
      ...CryptographicLibrariesAnalyzer.getCryptoLibraryRecommendations()
    );
    suggestions.push(
      ...DataStorageSecurityAnalyzer.getDataStorageRecommendations()
    );

    return SecurityLawResultBuilder.createResult(
      violations,
      'Data Encryption Standards Law',
      Array.from(new Set(suggestions)), // Remove duplicates
      context
    );
  }
}

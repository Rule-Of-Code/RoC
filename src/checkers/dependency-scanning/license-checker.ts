import type { LawCheckContext, LawResult } from '../../types/law.types';
import { LicenseCheckerLaw } from '../../laws/dependency-scanning/license-checker';

/**
 * License Compatibility Checker
 * Delegates to LicenseCheckerLaw
 */
export class LicenseCompatibilityChecker {
  /**
   * Check for license compatibility issues
   */
  static check(context: LawCheckContext): LawResult {
    return LicenseCheckerLaw.check(context);
  }
}

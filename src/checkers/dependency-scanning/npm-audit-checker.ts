import { NpmAuditCheckerLaw } from '../../laws/dependency-scanning/npm-audit-checker';
import type { LawCheckContext, LawResult } from '../../types/law.types';

/**
 * NPM Audit Checker
 * Delegates to NpmAuditCheckerLaw
 */
export class NpmAuditChecker {
  /**
   * Check npm audit results
   */
  static check(context: LawCheckContext): LawResult {
    return NpmAuditCheckerLaw.check(context);
  }
}

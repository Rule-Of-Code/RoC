/**
 * Code Quality Laws Implementation
 * First batch of Code Quality Laws
 */

import type { LawCheckContext, LawResult } from '../types/law.types';
import { NxCommandsOnlyLaw } from './angular-laws';
import {
  CodeDocumentationLaw,
  ObservableCleanupLaw,
  ZeroToleranceStrictLaw,
} from './code-quality-laws';

export class CodeQualityChecker {
  /**
   * Code Quality Law: Observable Cleanup Requirements
   */
  static checkObservableCleanup(config: LawCheckContext): LawResult {
    return ObservableCleanupLaw.check(config);
  }

  /**
   * Enhanced Zero Tolerance Doctrine - Stricter than Sacred Law 2
   */
  static checkZeroToleranceStrict(config: LawCheckContext): LawResult {
    return ZeroToleranceStrictLaw.check(config);
  }

  /**
   * Nx Commands Only Doctrine
   */
  static checkNxCommandsOnly(config: LawCheckContext): LawResult {
    return NxCommandsOnlyLaw.check(config);
  }

  /**
   * Code Documentation Standards
   */
  static checkCodeDocumentation(config: LawCheckContext): LawResult {
    return CodeDocumentationLaw.check(config);
  }
}

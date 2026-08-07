/**
 * Angular Constitutional Checker
 * Handles Angular-specific checks and best practices
 */

import { Subject } from 'rxjs';
import type { LawCheckContext, LawResult } from '../types/law.types';
import {
  AngularTestingExcellenceLaw,
  GenericAngularLaw,
  ModernAngularControlFlowLaw,
  NgrxActionsHygieneLaw,
  NgrxEffectsErrorHandlingLaw,
  NgrxStorePatternLaw,
  NxCommandsOnlyLaw,
} from './angular-laws';
import { BaseChecker } from './base-checker';

export class AngularChecker extends BaseChecker {
  private readonly destroy$ = new Subject<void>(); // Observable cleanup pattern
  async check(context: LawCheckContext): Promise<LawResult> {
    try {
      if (
        this.law.description.includes('Angular 18+') ||
        this.law.description.includes('@if/@for')
      ) {
        return await Promise.resolve(
          ModernAngularControlFlowLaw.check(context)
        );
      }

      if (this.law.checkFunction === 'checkNxCommandsOnly') {
        return await Promise.resolve(NxCommandsOnlyLaw.check(context));
      }

      if (this.law.checkFunction === 'checkNgrxStorePattern') {
        return await Promise.resolve(NgrxStorePatternLaw.check(context));
      }

      if (this.law.checkFunction === 'checkNgrxActionsHygiene') {
        return await Promise.resolve(NgrxActionsHygieneLaw.check(context));
      }

      if (this.law.checkFunction === 'checkNgrxEffectsErrorHandling') {
        return await Promise.resolve(
          NgrxEffectsErrorHandlingLaw.check(context)
        );
      }

      if (
        this.law.checkFunction === 'checkAngularTestingExcellence' ||
        this.law.checkFunction === 'checkProfessionalComponentTesting'
      ) {
        return await Promise.resolve(
          AngularTestingExcellenceLaw.check(context)
        );
      }

      return await Promise.resolve(GenericAngularLaw.check(context));
    } catch (error) {
      return Promise.resolve(this.createErrorResult(error as Error, context));
    }
  }
}

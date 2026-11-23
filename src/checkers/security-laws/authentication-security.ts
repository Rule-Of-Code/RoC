/**
 * Authentication Security Law Implementation - Refactored Modular Version
 * Enforces proper authentication and authorization security standards
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { ConfigFileUtils } from '../../utils/config-file-utils';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { LawErrorHandlingUtils } from '../../utils/law-error-handling-utils';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { AuthenticationChecker } from './authentication/authentication-checker';
import { AuthorizationChecker } from './authentication/authorization-checker';
import { SecurityCheckerBase } from './authentication/security-checker-base';
import { SessionManagementChecker } from './authentication/session-management-checker';

const LAW_NAME = 'Authentication Security Law';

/** The note when no code file was read (#561). */
export const NO_CODE_READ =
  'No code file was found in src/ (or apps/ and libs/): the code was NOT read, so authentication, authorization and sessions were not judged';

export class AuthenticationSecurityLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    try {
      // The three checkers below recognise authn/authz only in JS/TS shapes
      // (AuthService, @UseGuards, canActivate, express-session). A Python
      // service guards its routes with decorators and role checks instead —
      // and a concern satisfied the Python way IS satisfied
      const guardedInPython = this.isGuardedInPython(context.projectRoot);

      // Nothing read, nothing judged (#427, #561): a project whose code lives
      // outside src/ (and apps/, libs/) gives the checkers no file. Their
      // answers on an empty set — "no RBAC", "no role concept" — would be
      // claims about code that was never read.
      if (
        !guardedInPython &&
        SecurityCheckerBase.readCodeFiles(context.projectRoot, context.config)
          .length === 0
      ) {
        return markJudgedNothing(
          this.createResult([NO_CODE_READ], LAW_NAME, [], context)
        );
      }

      // Check for authentication implementation
      const authAnalysis =
        AuthenticationChecker.checkAuthenticationImplementation(
          context.projectRoot,
          context.config
        );
      this.collect(violations, suggestions, authAnalysis, guardedInPython);

      // Check for authorization patterns
      const authzAnalysis = AuthorizationChecker.checkAuthorizationPatterns(
        context.projectRoot,
        context.config
      );
      this.collect(violations, suggestions, authzAnalysis, guardedInPython);

      // Check for session management
      const sessionAnalysis = SessionManagementChecker.checkSessionManagement(
        context.projectRoot,
        context.config
      );
      this.collect(violations, suggestions, sessionAnalysis, guardedInPython);

      return this.createResult(violations, LAW_NAME, suggestions, context);
    } catch (_error: unknown) {
      return LawErrorHandlingUtils.createErrorResult(
        _error,
        'authentication security',
        context.config
      );
    }
  }

  /**
   * Merge one checker's findings. When the routes are guarded the Python way,
   * the JS/TS-only findings are false alarms and are not raised as violations;
   * the suggestions still carry, since advice costs nothing.
   */
  private static collect(
    violations: string[],
    suggestions: string[],
    analysis: { violations: string[]; suggestions: string[] },
    guardedInPython: boolean
  ): void {
    if (!guardedInPython) {
      violations.push(...analysis.violations);
    }
    suggestions.push(...analysis.suggestions);
  }

  /**
   * The Python-native answer to "are the routes guarded?" — auth decorators
   * (@login_required, @jwt_required), role checks, token verification, 401/403
   * aborts. Asked only for Python projects, so JS/TS detection is untouched.
   */
  private static isGuardedInPython(projectRoot: string): boolean {
    return (
      PythonSatisfaction.isPython(projectRoot) &&
      PythonSatisfaction.hasAuthGuards(projectRoot)
    );
  }

  private static createResult(
    violations: string[],
    lawName: string,
    suggestions: string[],
    context?: { config: RuleOfCodeConfig }
  ): LawResult {
    const passed = violations.length === 0;
    const score = Math.max(0, 100 - violations.length * 15);

    return {
      passed,
      message: passed
        ? `${lawName} compliance verified`
        : `${violations.length} ${lawName.toLowerCase()} violation(s) found`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score,
      fixable: violations.length > 0,
      config: context?.config ?? ConfigFileUtils.getMinimalDefaultConfig(),
    };
  }
}

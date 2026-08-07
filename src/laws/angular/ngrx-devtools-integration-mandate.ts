/**
 * NgRx DevTools Integration Mandate Law
 * Ensures StoreDevtools is configured for development environment debugging
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { NgRxDevToolsPatternConstants as Patterns } from './ngrx-devtools-integration-mandate/constants/patterns';
import { NgRxDevToolsConfigService } from './ngrx-devtools-integration-mandate/services/config.service';
import { NgRxDevToolsDependencyService } from './ngrx-devtools-integration-mandate/services/dependency.service';

export class NgRxDevToolsIntegrationMandateLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const projectRoot = context.projectRoot || process.cwd();

    // Check dependency
    const depResult =
      NgRxDevToolsDependencyService.checkDependency(projectRoot);

    if (!depResult.installed) {
      violations.push(Patterns.VIOLATION_MESSAGES.NOT_INSTALLED);
      suggestions.push(Patterns.SUGGESTION_MESSAGES.INSTALL_PACKAGE);
      score -= Patterns.SCORE_DEDUCTIONS.NOT_INSTALLED;
      return {
        passed: false,
        score: Math.max(0, score),
        message: `DevTools integration issues found: ${violations.join(', ')}`,
        details: [...violations, ...suggestions],
        violations,
        suggestions,
        fixable: true,
        config: context.config,
      };
    }

    // Check configuration with pathMappings support
    const configResult = await NgRxDevToolsConfigService.analyzeConfiguration(
      projectRoot,
      context.config
    );

    if (!configResult.configured) {
      violations.push(Patterns.VIOLATION_MESSAGES.NOT_CONFIGURED);
      suggestions.push(Patterns.SUGGESTION_MESSAGES.ADD_MODULE);
      score -= Patterns.SCORE_DEDUCTIONS.NOT_CONFIGURED;
    } else {
      if (!configResult.hasEnvironmentCheck) {
        violations.push(Patterns.VIOLATION_MESSAGES.NO_ENV_CHECK);
        suggestions.push(Patterns.SUGGESTION_MESSAGES.ADD_ENV_CHECK);
        score -= Patterns.SCORE_DEDUCTIONS.NO_ENV_CHECK;
      }

      if (!configResult.hasConfigOptions) {
        violations.push(Patterns.VIOLATION_MESSAGES.MISSING_OPTIONS);
        suggestions.push(Patterns.SUGGESTION_MESSAGES.ADD_OPTIONS);
        score -= Patterns.SCORE_DEDUCTIONS.MISSING_OPTIONS;
      }
    }

    // Use score for passed determination (constitutional compliance)
    const finalScore = Math.max(0, score);

    return {
      passed: finalScore >= 100,
      score: finalScore,
      message:
        violations.length === 0
          ? 'NgRx DevTools integration properly implemented'
          : `DevTools integration issues found: ${violations.join(', ')}`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      fixable: true,
      config: context.config,
    };
  }
}

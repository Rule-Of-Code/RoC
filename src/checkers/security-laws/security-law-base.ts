/**
 * Security Law Base Class
 * Provides common functionality for security-related laws
 */

import type { LawResult, RuleOfCodeConfig } from '../../types/law.types';
import { ConfigFileUtils } from '../../utils/config-file-utils';

export class SecurityLawBase {
  static createResult(
    violations: string[],
    title: string,
    _category = 'SECURITY',
    suggestions: string[] = [],
    context?: { config: RuleOfCodeConfig }
  ): LawResult {
    const passed = violations.length === 0;
    const score = passed ? 100 : Math.max(0, 100 - violations.length * 15);

    if (passed) {
      return {
        passed: true,
        message: `✅ Security compliance verified - ${title}`,
        details: [...violations, ...suggestions],
        violations,
        suggestions,
        score,
        fixable: false,
        config: context?.config ?? ConfigFileUtils.getMinimalDefaultConfig(),
      };
    } else {
      return {
        passed: false,
        message: `🚨 Security violation in ${title}: ${violations.join(', ')}`,
        details: [...violations, ...suggestions],
        violations,
        suggestions,
        score,
        fixable: true,
        config: context?.config ?? ConfigFileUtils.getMinimalDefaultConfig(),
      };
    }
  }
}

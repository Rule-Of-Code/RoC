/**
 * Security Tooling Analyzer
 * Clean facade for security tooling analysis
 *
 * Architecture: Analyzer (facade) → Configuration → ValidationPatterns
 * Triplet pattern: 263 → ~25 lines (90% reduction)
 */

import * as Config from './security-tooling-configuration';
import * as Patterns from './security-tooling-validation-patterns';

export class SecurityToolingAnalyzer {
  static analyzeSecurityTooling(
    packageJson: unknown,
    projectRoot: string
  ): Config.ToolingAnalysisResult {
    return Patterns.performSecurityToolingAnalysis(packageJson, projectRoot);
  }

  static getSecurityToolingRecommendations(): readonly string[] {
    return Config.RECOMMENDATIONS;
  }
}

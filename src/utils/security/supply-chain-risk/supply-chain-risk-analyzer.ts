/**
 * Supply Chain Risk Analyzer
 * Clean facade for supply chain risk analysis
 *
 * Architecture: Analyzer (facade) → Configuration → ValidationPatterns
 * Triplet pattern: 332 → ~25 lines (92% reduction)
 */

import * as Config from './supply-chain-risk-configuration';
import * as Patterns from './supply-chain-risk-validation-patterns';

export class SupplyChainRiskAnalyzer {
  static analyzeSupplyChainRisks(
    packageJson: unknown,
    projectRoot: string
  ): Config.RiskAnalysisResult {
    return Patterns.performSupplyChainAnalysis(packageJson, projectRoot);
  }

  static getSupplyChainRecommendations(): readonly string[] {
    return Config.RECOMMENDATIONS;
  }
}

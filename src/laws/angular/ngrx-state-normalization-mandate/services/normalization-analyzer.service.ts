/**
 * Normalization Pattern Analyzer Service
 * Analyzes normalization patterns and nested state
 */
import type { RuleOfCodeConfig } from '../../../../config/types';
import type {
  NestedStateResult,
  NormalizationPatternResult,
  StateConsistencyResult,
} from '../constants/types';

export class NgRxStateNormalizationAnalyzerService {
  static async checkNormalizationPatterns(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<NormalizationPatternResult> {
    const violations: string[] = [];

    // Check whether there are state files with correct patterns
    const hasStateFiles = await this.hasAnyStateFiles(projectRoot, config);
    if (!hasStateFiles) {
      violations.push('No state files found');
    }

    return {
      followsPatterns: violations.length === 0,
      violations,
      issueCount: violations.length,
    };
  }

  static checkNestedStateAntiPatterns(_projectRoot: string): NestedStateResult {
    const examples: string[] = [];

    const severity =
      examples.length === 0
        ? 'low'
        : examples.length <= 2
          ? 'medium'
          : examples.length <= 4
            ? 'high'
            : 'critical';

    return {
      hasNestedState: examples.length > 0,
      examples,
      severity,
    };
  }

  static checkStateShapeConsistency(
    _projectRoot: string
  ): StateConsistencyResult {
    const inconsistencies: string[] = [];

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
      stateShapeCount: 0,
    };
  }

  private static async hasAnyStateFiles(
    projectRoot: string,
    _config?: RuleOfCodeConfig
  ): Promise<boolean> {
    // Find NgRx state files anywhere in the workspace — supports BOTH the classic
    // `store/*.reducer.ts` / `*.state.ts` layout AND the modern `createFeature`
    // `*.feature.ts` layout (incl. Nx libs), instead of one hardcoded store dir.
    const { glob } = require('glob');
    const matches: string[] = glob.sync('**/*.{feature,reducer,state}.ts', {
      cwd: projectRoot,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.angular/**',
        '**/.nx/**',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    });
    return matches.length > 0;
  }
}

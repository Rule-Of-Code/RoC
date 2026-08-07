/**
 * Sacred Metrics Law (Investment-Grade Quality)
 * 10/10 perfect score is our MINIMUM STANDARD, not a goal
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { SacredLawBase } from './sacred-law-base';

export class SacredMetricsLaw {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const _packageJson = SacredLawBase.getPackageJson(projectRoot);

    // Check for testing framework
    const hasTests =
      SacredLawBase.hasDependency(projectRoot, 'jest') ||
      SacredLawBase.hasDependency(projectRoot, 'vitest') ||
      SacredLawBase.hasDependency(projectRoot, 'cypress');

    if (!hasTests) {
      violations.push(
        'Testing framework not configured for 10/10 quality metrics'
      );
    }

    // Check for quality tools
    const qualityTools = ['eslint', 'prettier', 'typescript'];
    const missingTools = qualityTools.filter(
      tool => !SacredLawBase.hasDependency(projectRoot, tool)
    );

    missingTools.forEach(tool => {
      violations.push(`Quality tool missing: ${tool}`);
    });

    // Check for TypeScript
    const hasTsConfig = FileUtils.fileExistsSync(
      PathOperations.join(projectRoot, 'tsconfig.json')
    );
    if (!hasTsConfig) {
      violations.push(
        'TypeScript configuration missing for investment-grade quality'
      );
    }

    return SacredLawBase.createResult(
      violations,
      'Investment-Grade Quality (Sacred Metrics)',
      'SACRED_LAW',
      [
        'Configure testing framework',
        'Setup TypeScript',
        'Implement quality metrics monitoring',
      ]
    );
  }
}

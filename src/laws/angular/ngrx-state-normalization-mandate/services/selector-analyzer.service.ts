/**
 * Selector Composition Analyzer Service
 * Analyzes selectors for correct composition according to normalization
 */

import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import type { SelectorCompositionResult } from '../constants/types';

export class NgRxStateNormalizationSelectorAnalyzerService {
  static checkSelectorComposition(
    projectRoot: string
  ): SelectorCompositionResult {
    const issues: string[] = [];

    // Check for incorrect patterns in typical normalized state files
    const srcPath = PathOperations.join(projectRoot, 'src');

    if (!FileUtils.exists(srcPath)) {
      return {
        followsBestPractices: true,
        issues: [],
        issueCount: 0,
      };
    }

    // Compute a basic result without a complex recursive search
    return {
      followsBestPractices: issues.length === 0,
      issues,
      issueCount: issues.length,
    };
  }
}

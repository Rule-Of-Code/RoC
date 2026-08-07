import { FileUtils, PathOperations } from '../../../../utils';
import {
  DatabaseQueryOptimizationCheckConstants,
  DatabaseQueryOptimizationFileDiscoveryConstants,
} from '../constants';

/**
 * FirestoreOptimizationAnalyzerService
 *
 * Responsibility:
 * - Analyze Firestore query optimization patterns
 * - Check for limit(), orderBy(), where() combinations
 */
export class FirestoreOptimizationAnalyzerService {
  /**
   * Analyze Firestore optimization patterns
   */
  static analyze(projectRoot: string): { optimized: boolean } {
    const rulePaths =
      DatabaseQueryOptimizationFileDiscoveryConstants.getFirestoreRulesPaths();

    for (const rulePath of rulePaths) {
      const fullPath = PathOperations.join(projectRoot, rulePath);
      if (FileUtils.exists(fullPath)) {
        try {
          const content = FileUtils.readFile(fullPath);
          if (
            DatabaseQueryOptimizationCheckConstants.hasFirestoreOptimization(
              content
            )
          ) {
            return { optimized: true };
          }
        } catch {
          // Ignore file read errors
        }
      }
    }

    return { optimized: false };
  }
}

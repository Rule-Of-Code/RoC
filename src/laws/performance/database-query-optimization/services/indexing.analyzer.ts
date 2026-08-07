import { FileUtils, PathOperations } from '../../../../utils';
import {
  DatabaseQueryOptimizationFileDiscoveryConstants,
  DatabaseQueryOptimizationIndexConstants,
} from '../constants';

/**
 * IndexingAnalyzerService
 *
 * Responsibility:
 * - Analyze Firestore indexing configuration
 * - Verify composite indexes are defined
 */
export class IndexingAnalyzerService {
  /**
   * Analyze indexing configuration
   */
  static analyze(projectRoot: string): { configured: boolean } {
    const indexPaths =
      DatabaseQueryOptimizationFileDiscoveryConstants.getIndexPaths();

    for (const indexPath of indexPaths) {
      const fullPath = PathOperations.join(projectRoot, indexPath);
      if (FileUtils.exists(fullPath)) {
        try {
          const content = FileUtils.readFile(fullPath);
          const indexConfig = JSON.parse(content);

          if (
            DatabaseQueryOptimizationIndexConstants.hasCompositeIndexes(
              indexConfig
            )
          ) {
            return { configured: true };
          }
        } catch {
          // Ignore JSON parsing errors
        }
      }
    }

    return { configured: false };
  }
}

import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { FileUtils, PathOperations } from '../../../../utils';
import { CheckerUtils } from '../../../../utils/checker-utils';
import { DatabaseQueryOptimizationFileDiscoveryConstants } from '../constants';

/**
 * DatabaseQueryOptimizationFileDiscoveryService
 *
 * Responsibilities:
 * - Discover database-related files in the project
 * - Scan for service files and configuration files
 * - Analyze files for database query patterns
 */
export class DatabaseQueryOptimizationFileDiscoveryService {
  /**
   * Find all database-related service files
   */
  static findServiceFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const serviceFiles: string[] = [];
    const searchDirs =
      DatabaseQueryOptimizationFileDiscoveryConstants.SCAN_DIRECTORIES.map(
        dir => PathOperations.join(projectRoot, dir)
      );

    for (const searchDir of searchDirs) {
      if (FileUtils.exists(searchDir)) {
        this.discoverFilesInDirectory(searchDir, serviceFiles, config);
      }
    }

    return serviceFiles;
  }

  /**
   * Discover files by pattern in directory
   */
  private static discoverFilesInDirectory(
    dir: string,
    files: string[],
    config: RuleOfCodeConfig
  ): void {
    try {
      const allFiles = CheckerUtils.findFilesByExtension(
        dir,
        CheckerUtils.getCommonExtensions().ALL_CODE,
        config
      );

      for (const filePath of allFiles) {
        const filename = PathOperations.getBasename(filePath);
        if (
          DatabaseQueryOptimizationFileDiscoveryConstants.isServiceFile(
            filename
          )
        ) {
          files.push(filePath);
        }
      }
    } catch {
      // Ignore directory traversal errors
    }
  }

  /**
   * Get content of service files
   */
  static readServiceFileContent(servicePath: string): string {
    try {
      return FileUtils.readFile(servicePath);
    } catch {
      return '';
    }
  }
}

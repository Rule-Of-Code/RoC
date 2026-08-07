import type { RuleOfCodeConfig } from '../../../../types/law.types';
import {
  DatabaseQueryOptimizationCheckConstants,
  DatabaseQueryOptimizationFileDiscoveryConstants,
} from '../constants';
import { DatabaseQueryOptimizationFileDiscoveryService } from './file-discovery.service';

/**
 * NPlusOneAnalyzerService
 *
 * Responsibility:
 * - Analyze N+1 query prevention patterns
 * - Detect loop + query anti-patterns
 */
export class NPlusOneAnalyzerService {
  /**
   * Analyze N+1 query prevention
   */
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { addressed: boolean } {
    const serviceFiles =
      DatabaseQueryOptimizationFileDiscoveryService.findServiceFiles(
        projectRoot,
        config
      );

    for (const serviceFile of serviceFiles) {
      const content =
        DatabaseQueryOptimizationFileDiscoveryService.readServiceFileContent(
          serviceFile
        );

      // Check for prevention patterns
      if (
        DatabaseQueryOptimizationCheckConstants.hasNPlusOnePrevention(content)
      ) {
        return { addressed: true };
      }

      // Check for N+1 anti-patterns
      if (this.detectNPlusOneAntiPattern(content)) {
        if (
          !DatabaseQueryOptimizationCheckConstants.hasNPlusOnePrevention(
            content
          )
        ) {
          return { addressed: false };
        }
      }
    }

    // If no obvious N+1 patterns found, assume it's addressed
    return { addressed: true };
  }

  /**
   * Detect N+1 anti-pattern (loop with query)
   */
  private static detectNPlusOneAntiPattern(content: string): boolean {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (DatabaseQueryOptimizationFileDiscoveryConstants.hasLoop(line)) {
        // Check next few lines for database queries
        for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
          const nextLine = lines[j] ?? '';
          if (
            DatabaseQueryOptimizationFileDiscoveryConstants.hasQuery(nextLine)
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }
}

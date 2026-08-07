import { FileUtils, PathOperations } from '../../../../utils';
import { LighthouseConstants } from '../constants';

/**
 * Lighthouse Analyzer
 *
 * Single Responsibility: Analyzing Lighthouse configuration
 */
export class LighthouseAnalyzer {
  static analyze(projectRoot: string): string[] {
    const violations: string[] = [];

    for (const configPath of LighthouseConstants.CONFIG_PATHS) {
      const fullPath = PathOperations.join(projectRoot, configPath);
      if (FileUtils.exists(fullPath)) {
        try {
          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
          if (!LighthouseConstants.hasPerformanceThreshold(content)) {
            violations.push(
              `Lighthouse configuration missing performance threshold ≥90`
            );
          }
          return violations; // Found config, return result
        } catch (_error) {
          // Continue searching
        }
      }
    }

    violations.push('Lighthouse performance configuration not found');
    return violations;
  }
}

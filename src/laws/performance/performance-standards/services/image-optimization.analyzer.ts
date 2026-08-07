import type { RuleOfCodeConfig } from '../../../../config/types';
import { FileUtils, PathOperations } from '../../../../utils';
import { PathResolver } from '../../../../utils/path-resolver';
import { ImageOptimizationConstants } from '../constants';

/**
 * Image Optimization Analyzer
 *
 * Single Responsibility: Analyzing image optimization configuration
 */
export class ImageOptimizationAnalyzer {
  static async analyze(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<string[]> {
    const violations: string[] = [];

    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (!FileUtils.exists(packageJsonPath)) {
      violations.push(ImageOptimizationConstants.VIOLATION_MESSAGE);
      return violations;
    }

    try {
      const packageJsonContent = FileUtils.readFile(packageJsonPath, {
        encoding: 'utf8',
      });

      // Check for image optimization tools
      if (
        ImageOptimizationConstants.hasImageOptimizationTools(packageJsonContent)
      ) {
        return violations;
      }

      // Get config files using PathResolver
      let configFiles: string[];
      if (config?.pathMappings) {
        const resolver = PathResolver.create(config, projectRoot);
        const [appConfigPaths, appModulePaths] = await Promise.all([
          resolver.getAppConfigPaths(),
          resolver.getAppModulePaths(),
        ]);
        configFiles = [...appConfigPaths, ...appModulePaths];
      } else {
        configFiles = [
          PathOperations.join(projectRoot, 'src/app/app.config.ts'),
          PathOperations.join(projectRoot, 'src/app/app.module.ts'),
        ];
      }

      for (const fullPath of configFiles) {
        if (FileUtils.exists(fullPath)) {
          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
          if (ImageOptimizationConstants.hasImageOptimizationConfig(content)) {
            return violations;
          }
        }
      }

      violations.push(ImageOptimizationConstants.VIOLATION_MESSAGE);
    } catch (_error) {
      violations.push(ImageOptimizationConstants.VIOLATION_MESSAGE);
    }

    return violations;
  }
}

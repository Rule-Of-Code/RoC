import { glob } from 'glob';
import type { RuleOfCodeConfig } from '../../../../config/types';
import { FileUtils, PathOperations } from '../../../../utils';
import { PathResolver } from '../../../../utils/path-resolver';
import { CoreWebVitalsConstants } from '../constants';

/**
 * Core Web Vitals Analyzer
 *
 * Single Responsibility: Analyzing Core Web Vitals implementation
 */
export class CoreWebVitalsAnalyzer {
  static async analyze(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<string[]> {
    const violations: string[] = [];

    // Check for web-vitals dependency
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (!FileUtils.exists(packageJsonPath)) {
      violations.push(CoreWebVitalsConstants.VIOLATION_MESSAGE);
      return violations;
    }

    try {
      const packageJsonContent = FileUtils.readFile(packageJsonPath, {
        encoding: 'utf8',
      });

      if (!CoreWebVitalsConstants.hasWebVitalsDependency(packageJsonContent)) {
        violations.push(CoreWebVitalsConstants.VIOLATION_MESSAGE);
        return violations;
      }

      // Always resolve via PathResolver: it returns the standard root paths AND
      // auto-detects monorepo (Nx/Lerna) variants, so this works with or without
      // an explicit `pathMappings` config.
      const resolver = PathResolver.create(config, projectRoot);
      const [mainTsPaths, appComponentPaths] = await Promise.all([
        resolver.getMainTsPaths(),
        resolver.getAppComponentPaths(),
      ]);

      // web-vitals is typically wired in a dedicated monitoring/performance service
      // (e.g. `performance-monitoring.service.ts`), not necessarily in main.ts — so
      // also scan likely integration files anywhere under the workspace source.
      const integrationFiles = glob.sync(
        '**/*{performance,monitoring,vitals,web-vitals,analytics}*.{ts,js}',
        {
          cwd: projectRoot,
          absolute: true,
          ignore: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.angular/**',
            '**/coverage/**',
            '**/.nx/**',
            '**/*.spec.ts',
            '**/*.test.ts',
          ],
        }
      );

      const mainFiles = [
        ...mainTsPaths,
        ...appComponentPaths,
        ...integrationFiles,
      ];

      let foundUsage = false;
      for (const fullPath of mainFiles) {
        if (FileUtils.exists(fullPath)) {
          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
          if (CoreWebVitalsConstants.usesWebVitals(content)) {
            foundUsage = true;
            break;
          }
        }
      }

      if (!foundUsage) {
        violations.push(CoreWebVitalsConstants.INTEGRATION_VIOLATION_MESSAGE);
      }
    } catch (_error) {
      violations.push(CoreWebVitalsConstants.VIOLATION_MESSAGE);
    }

    return violations;
  }
}

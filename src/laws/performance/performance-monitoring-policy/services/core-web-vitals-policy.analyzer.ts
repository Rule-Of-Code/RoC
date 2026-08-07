import type { RuleOfCodeConfig } from '../../../../config/types';
import { ProjectTypeDetectorValidation } from '../../../../utils';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { PathResolver } from '../../../../utils/path-resolver';
import { CoreWebVitalsPolicyConstants } from '../constants/core-web-vitals-policy.constants';

/**
 * Core Web Vitals Policy Analyzer Service
 *
 * Single Responsibility: Analyze Core Web Vitals monitoring configuration
 */
export class CoreWebVitalsPolicyAnalyzerService {
  static async checkCoreWebVitalsMonitoring(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<{
    monitored: boolean;
    implementations: string[];
  }> {
    const implementations: string[] = [];

    // Check for web-vitals library usage
    const allDeps =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

    if (CoreWebVitalsPolicyConstants.hasWebVitalsLibrary(allDeps)) {
      implementations.push('web-vitals library');
    }

    // Get TypeScript files using PathResolver
    let tsFiles: string[];
    if (config?.pathMappings) {
      const resolver = PathResolver.create(config, projectRoot);
      const [mainTsPaths, appComponentPaths] = await Promise.all([
        resolver.getMainTsPaths(),
        resolver.getAppComponentPaths(),
      ]);
      tsFiles = [
        ...mainTsPaths,
        PathOperations.join(projectRoot, 'src/index.ts'),
        ...appComponentPaths,
      ];
    } else {
      tsFiles = [
        PathOperations.join(projectRoot, 'src/main.ts'),
        PathOperations.join(projectRoot, 'src/index.ts'),
        PathOperations.join(projectRoot, 'src/app/app.component.ts'),
      ];
    }

    let hasCWVTracking = false;
    for (const fullPath of tsFiles) {
      try {
        if (FileUtils.exists(fullPath)) {
          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
          if (CoreWebVitalsPolicyConstants.hasCoreWebVitalsTracking(content)) {
            hasCWVTracking = true;
            break;
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    if (hasCWVTracking) {
      implementations.push('Core Web Vitals tracking code');
    }

    return {
      monitored: implementations.length > 0,
      implementations,
    };
  }
}

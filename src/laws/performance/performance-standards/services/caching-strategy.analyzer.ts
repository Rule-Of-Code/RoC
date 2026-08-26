import type { RuleOfCodeConfig } from '../../../../config/types';
import { FileUtils, PathOperations } from '../../../../utils';
import { PathResolver } from '../../../../utils/path-resolver';
import { BrowserCachingAnalyzerService } from '../../core-web-vitals-compliance/services/browser-caching.analyzer';
import { CachingStrategyConstants } from '../constants';

/**
 * Caching Strategy Analyzer
 *
 * Single Responsibility: Analyzing caching strategy implementation
 */
export class CachingStrategyAnalyzer {
  static async analyze(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<string[]> {
    const violations: string[] = [];

    // Skip service worker check for Capacitor mobile apps
    // Service workers are not applicable for native mobile applications
    if (this.isCapacitorApp(projectRoot)) {
      // This is a Capacitor mobile app, service worker not required
      return violations;
    }

    // Check for service worker files
    if (this.hasServiceWorkerFile(projectRoot)) {
      return violations;
    }

    // Get config files using PathResolver
    let configFiles: string[];
    if (config?.pathMappings) {
      const resolver = PathResolver.create(config, projectRoot);
      const appConfigPaths = await resolver.getAppConfigPaths();
      configFiles = [
        PathOperations.join(projectRoot, 'angular.json'),
        ...appConfigPaths,
      ];
    } else {
      configFiles = [
        PathOperations.join(projectRoot, 'angular.json'),
        PathOperations.join(projectRoot, 'src/app/app.config.ts'),
      ];
    }

    if (this.hasServiceWorkerConfigInFiles(configFiles)) {
      return violations;
    }

    // The shared reader, which is what the sibling law already consults.
    //
    // This analyzer returned clean only for a service worker or a Capacitor
    // app, and never read the static host's config. So a prerendered site with
    // correct immutable `Cache-Control` headers was told it had no caching
    // strategy — by one law, while another law in the SAME audit run had
    // already confirmed it did.
    //
    // Its advice was half wrong for that shape too: a fully prerendered site
    // behind a CDN gains nothing from a service worker except a second cache
    // to invalidate.
    if (BrowserCachingAnalyzerService.analyze(projectRoot).hasStrategy) {
      return violations;
    }

    violations.push('Browser caching strategy not implemented');
    return violations;
  }

  private static isCapacitorApp(projectRoot: string): boolean {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageContent = FileUtils.readFile(packageJsonPath, {
          encoding: 'utf8',
        });
        if (packageContent.includes('@capacitor/core')) {
          return true;
        }
      } catch (_error) {
        // Continue
      }
    }
    return false;
  }

  private static hasServiceWorkerFile(projectRoot: string): boolean {
    for (const swPath of CachingStrategyConstants.SERVICE_WORKER_PATHS) {
      const fullPath = PathOperations.join(projectRoot, swPath);
      if (FileUtils.exists(fullPath)) {
        return true;
      }
    }
    return false;
  }

  private static hasServiceWorkerConfigInFiles(configFiles: string[]): boolean {
    for (const fullPath of configFiles) {
      if (FileUtils.exists(fullPath)) {
        try {
          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
          if (CachingStrategyConstants.hasServiceWorkerConfig(content)) {
            return true;
          }
        } catch (_error) {
          // Continue
        }
      }
    }
    return false;
  }
}

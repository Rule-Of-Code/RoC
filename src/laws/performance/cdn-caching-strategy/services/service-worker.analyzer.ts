import type { RuleOfCodeConfig } from '../../../../config/types';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { CdnCachingStrategyCachingStrategiesConstants as CachingStrategies } from '../constants/caching-strategies';
import { CdnCachingStrategyFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import type { ServiceWorkerResult } from '../constants/types';
import { PerformanceAnalyzerBase } from './performance-analyzer-base';

export class ServiceWorkerAnalyzerService extends PerformanceAnalyzerBase {
  static async analyze(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<ServiceWorkerResult> {
    return {
      implemented:
        this.hasAngularServiceWorkerConfig(projectRoot) ||
        this.hasServiceWorkerFiles(projectRoot) ||
        (await this.hasServiceWorkerRegistration(projectRoot, config)),
    };
  }

  private static hasAngularServiceWorkerConfig(projectRoot: string): boolean {
    const content = this.readAngularJsonContent(projectRoot);
    if (!content) {
      return false;
    }

    try {
      return CachingStrategies.SERVICE_WORKER_KEYWORDS.some(keyword =>
        content.includes(keyword)
      );
    } catch {
      return false;
    }
  }

  private static hasServiceWorkerFiles(projectRoot: string): boolean {
    const serviceWorkerPaths =
      FileDiscovery.getServiceWorkerFilePaths(projectRoot);

    if (
      serviceWorkerPaths.some(swPath => FileUtils.exists(swPath)) ||
      FileDiscovery.getServiceWorkerFilePaths(projectRoot).some(swPath =>
        FileUtils.exists(swPath)
      )
    ) {
      return true;
    }

    // Check for ngsw config files
    const ngswConfigs = [
      PathOperations.join(projectRoot, 'ngsw-config.json'),
      PathOperations.join(projectRoot, 'src/ngsw-config.json'),
    ];

    return ngswConfigs.some(config => FileUtils.exists(config));
  }

  private static async hasServiceWorkerRegistration(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<boolean> {
    const appFiles = await FileDiscovery.getAppFilePaths(projectRoot, config);

    for (const appFile of appFiles) {
      if (FileUtils.exists(appFile)) {
        try {
          const content = FileUtils.readFile(appFile, { encoding: 'utf8' });
          if (this.hasServiceWorkerKeywords(content)) {
            return true;
          }
        } catch {
          // Ignore file read errors
        }
      }
    }

    return false;
  }

  private static hasServiceWorkerKeywords(content: string): boolean {
    return CachingStrategies.SERVICE_WORKER_KEYWORDS.some(keyword =>
      content.includes(keyword)
    );
  }
}

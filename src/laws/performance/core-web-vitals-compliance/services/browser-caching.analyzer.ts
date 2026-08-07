import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { CoreWebVitalsFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import { CoreWebVitalsPerformanceChecksConstants as Checks } from '../constants/performance-checks';
import type { BrowserCachingResult } from '../constants/types';

export class BrowserCachingAnalyzerService {
  static analyze(projectRoot: string): BrowserCachingResult {
    const strategies: string[] = [];

    // Check for service worker
    if (this.hasServiceWorker(projectRoot)) {
      strategies.push('Service Worker detected');
    }

    // Check for PWA manifest
    if (this.hasManifest(projectRoot)) {
      strategies.push('PWA manifest found');
    }

    // Check for HTTP caching headers
    if (this.hasCachingHeaders(projectRoot)) {
      strategies.push('HTTP caching headers configured');
    }

    return {
      hasStrategy: strategies.length > 0,
      strategies,
    };
  }

  private static hasServiceWorker(projectRoot: string): boolean {
    const swPaths = [
      PathOperations.join(projectRoot, 'src/sw.js'),
      PathOperations.join(projectRoot, 'src/service-worker.js'),
      PathOperations.join(projectRoot, 'public/sw.js'),
      PathOperations.join(projectRoot, 'public/service-worker.js'),
      PathOperations.join(projectRoot, 'ngsw-config.json'),
    ];

    return swPaths.some(path => FileUtils.exists(path));
  }

  private static hasManifest(projectRoot: string): boolean {
    const manifestPath = FileDiscovery.getManifestPath(projectRoot);
    return FileUtils.exists(manifestPath);
  }

  private static hasCachingHeaders(projectRoot: string): boolean {
    const nginxPath = FileDiscovery.getNginxConfigPath(projectRoot);
    if (!FileUtils.exists(nginxPath)) {
      return false;
    }

    try {
      const content = FileUtils.readFile(nginxPath, { encoding: 'utf8' });
      return (
        content.includes(Checks.CACHING_KEYWORDS.EXPIRES) ||
        content.includes(Checks.CACHING_KEYWORDS.CACHE_CONTROL)
      );
    } catch {
      return false;
    }
  }
}

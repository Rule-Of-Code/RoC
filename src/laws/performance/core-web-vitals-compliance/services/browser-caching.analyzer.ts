import { FileUtils } from '../../../../utils/file-utils';
import { declaresAnyHeader } from '../../../../utils/host-headers';
import { NxWorkspace } from '../../../../utils/nx-workspace';
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

  /**
   * Angular's service worker config is `ngsw-config.json`, and in a monorepo it
   * lives beside the app — `apps/<name>/ngsw-config.json` — not at the
   * workspace root. This joined it onto the root only, two lines from a sibling
   * check that already resolved through NxWorkspace.
   */
  private static hasServiceWorker(projectRoot: string): boolean {
    const relativePaths = [
      'src/sw.js',
      'src/service-worker.js',
      'public/sw.js',
      'public/service-worker.js',
      'ngsw-config.json',
    ];

    return relativePaths.some(
      relative =>
        FileUtils.exists(PathOperations.join(projectRoot, relative)) ||
        NxWorkspace.resolveSourceFiles(projectRoot, relative).length > 0
    );
  }

  private static hasManifest(projectRoot: string): boolean {
    return FileDiscovery.getManifestPaths(projectRoot).some(path =>
      FileUtils.exists(path)
    );
  }

  /**
   * Caching headers, from whichever host config the project actually uses.
   *
   * This read `nginx.conf` and nothing else, so a site on Firebase Hosting —
   * with a `firebase.json` declaring Cache-Control on hashed assets — had "no
   * browser caching strategy" by construction. Firebase is read through the
   * shared header helper, which knows its schema is an array of {key, value}.
   */
  private static hasCachingHeaders(projectRoot: string): boolean {
    return (
      this.hasNginxCachingHeaders(projectRoot) ||
      this.hasFirebaseCachingHeaders(projectRoot)
    );
  }

  private static hasNginxCachingHeaders(projectRoot: string): boolean {
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

  private static hasFirebaseCachingHeaders(projectRoot: string): boolean {
    const firebasePath = PathOperations.join(projectRoot, 'firebase.json');
    if (!FileUtils.exists(firebasePath)) {
      return false;
    }

    try {
      const config = JSON.parse(
        FileUtils.readFile(firebasePath, { encoding: 'utf8' })
      ) as { hosting?: { headers?: Array<{ headers?: unknown }> } };
      const entries = config.hosting?.headers;
      if (!Array.isArray(entries)) return false;

      return entries.some(entry =>
        declaresAnyHeader(entry.headers, ['Cache-Control', 'ETag', 'Expires'])
      );
    } catch {
      return false;
    }
  }
}

import { FileUtils } from '../../../../utils/file-utils';
import { CoreWebVitalsFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import { CoreWebVitalsPerformanceChecksConstants as Checks } from '../constants/performance-checks';
import type { ResourceHintsResult } from '../constants/types';

export class ResourceHintsAnalyzerService {
  static analyze(projectRoot: string): ResourceHintsResult {
    const hints: string[] = [];
    const indexPath = FileDiscovery.getIndexHtmlPath(projectRoot);

    if (!FileUtils.exists(indexPath)) {
      return { hasHints: false, hints: [] };
    }

    try {
      const content = FileUtils.readFile(indexPath, { encoding: 'utf8' });
      hints.push(...this.extractResourceHints(content));
    } catch {
      // Ignore file read errors
    }

    return {
      hasHints: hints.length > 0,
      hints,
    };
  }

  private static extractResourceHints(content: string): string[] {
    const hints: string[] = [];

    if (content.includes(Checks.RESOURCE_HINT_KEYWORDS.PRELOAD)) {
      hints.push('Preload hints found');
    }
    if (content.includes(Checks.RESOURCE_HINT_KEYWORDS.PREFETCH)) {
      hints.push('Prefetch hints found');
    }
    if (content.includes(Checks.RESOURCE_HINT_KEYWORDS.DNS_PREFETCH)) {
      hints.push('DNS prefetch hints found');
    }
    if (content.includes(Checks.RESOURCE_HINT_KEYWORDS.PRECONNECT)) {
      hints.push('Preconnect hints found');
    }

    return hints;
  }
}

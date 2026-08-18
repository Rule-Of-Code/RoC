import { glob } from 'glob';
import { FileUtils } from '../../../../utils/file-utils';
import { NxWorkspace } from '../../../../utils/nx-workspace';
import { PathOperations } from '../../../../utils/path-operations';
import { CoreWebVitalsFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import { CoreWebVitalsPerformanceChecksConstants as Checks } from '../constants/performance-checks';
import type { ResourceHintsResult } from '../constants/types';

/** Built output is scanned too, but never more of it than this. */
const MAX_BUILT_DOCUMENTS = 20;

export class ResourceHintsAnalyzerService {
  /**
   * Resource hints are read from the BUILD OUTPUT as well as from source.
   *
   * A preload hint for a content-hashed asset cannot exist in source:
   * `IBMPlexSerif-<hash>.woff2` does not have a name until the bundler has run,
   * so the tag is stamped in afterwards by a post-build step. Reading only
   * `src/index.html` therefore finds zero hints on every correctly built
   * project that preloads its own fonts — the more careful the project, the
   * more certain the false finding.
   *
   * The artefact is what ships, so the artefact is the honest place to look.
   * Source is still read, so a project that writes its hints by hand and has
   * not built yet is unaffected.
   */
  static analyze(projectRoot: string): ResourceHintsResult {
    const hints = new Set<string>();

    for (const document of this.indexDocuments(projectRoot)) {
      try {
        const content = FileUtils.readFile(document, { encoding: 'utf8' });
        for (const hint of this.extractResourceHints(content)) {
          hints.add(hint);
        }
      } catch {
        // Ignore file read errors
      }
    }

    return { hasHints: hints.size > 0, hints: [...hints] };
  }

  /** The source index.html, plus any built one the project has produced. */
  private static indexDocuments(projectRoot: string): string[] {
    const documents: string[] = [];

    const sourceIndex = FileDiscovery.getIndexHtmlPath(projectRoot);
    if (FileUtils.exists(sourceIndex)) {
      documents.push(sourceIndex);
    }

    documents.push(...this.builtIndexDocuments(projectRoot));

    return [...new Set(documents)];
  }

  /**
   * Built `index.html` files: the output paths the build config declares, and
   * the conventional `dist/` tree for a project that declares none.
   */
  private static builtIndexDocuments(projectRoot: string): string[] {
    const patterns = new Set<string>(['dist/**/index.html']);

    for (const outputPath of this.declaredOutputPaths(projectRoot)) {
      patterns.add(`${outputPath.replace(/\\/g, '/')}/**/index.html`);
    }

    const found: string[] = [];
    for (const pattern of patterns) {
      found.push(
        ...glob.sync(pattern, {
          cwd: projectRoot,
          absolute: true,
          ignore: ['**/node_modules/**'],
        })
      );
    }

    return [...new Set(found)].slice(0, MAX_BUILT_DOCUMENTS);
  }

  /** Every `outputPath` a build target declares, in any workspace shape. */
  private static declaredOutputPaths(projectRoot: string): string[] {
    const paths: string[] = [];

    const collect = (node: unknown): void => {
      if (node === null || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(collect);
        return;
      }

      const record = node as Record<string, unknown>;
      const outputPath = record.outputPath;
      if (typeof outputPath === 'string' && outputPath.length > 0) {
        paths.push(outputPath);
      } else if (
        outputPath !== null &&
        typeof outputPath === 'object' &&
        typeof (outputPath as { base?: unknown }).base === 'string'
      ) {
        // Angular 17+ allows `outputPath: { base, browser, server }`.
        paths.push((outputPath as { base: string }).base);
      }

      Object.values(record).forEach(collect);
    };

    NxWorkspace.getBuildConfigDocuments(projectRoot).forEach(collect);

    return [...new Set(paths)].filter(p => !PathOperations.isAbsolute(p));
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

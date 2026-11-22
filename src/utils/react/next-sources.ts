/**
 * What the Next.js laws that read files one at a time share: every Next app
 * of the workspace and its scanned React source, parsed once. The laws that
 * follow imports walk the one module graph instead (next-module-graph.ts,
 * next-entries.ts).
 */

import type { LawCheckContext } from '../../types/law.types';
import { PathOperations } from '../path-operations';
import { type AppFile, NextAppFiles, type PagesFile } from './next-app-files';
import { type NextApp, ReactProject } from './react-project';
import {
  loadTypeScript,
  type TsxSource,
  type TypeScriptModule,
} from './tsx-source';

export interface NextSources {
  apps: NextApp[];
  /** Scanned, non-test React source (ignores applied). */
  files: string[];
  /** Every scanned file that parsed, by normalized path. */
  parsed: Map<string, TsxSource>;
  /** Files that were not read — each one a violation for the law that needed it. */
  unread: string[];
  appFiles: AppFile[];
  pagesFiles: PagesFile[];
  /** The parser; null when it could not be loaded (then `unread` says so). */
  ts: TypeScriptModule | null;
}

/** True when a module's directive prologue holds `directive`. */
export function hasDirective(
  source: TsxSource,
  directive: 'use client' | 'use server'
): boolean {
  return source.directives().includes(directive);
}

/**
 * Builds the shared NextSources of a workspace (apps, scanned React files,
 * their parses, unread files, App and Pages Router files) and answers
 * whether any app has a router directory.
 */
export class NextSourcesLoader {
  /** Scan, parse and classify the workspace's React source for the Next laws. */
  static load(
    context: LawCheckContext,
    extensions?: readonly string[]
  ): NextSources {
    const apps = ReactProject.nextApps(context.projectRoot);
    const files = ReactProject.sourceFiles(context, extensions).map(file =>
      PathOperations.normalize(file)
    );
    const { sources, unread } = ReactProject.parse(context, files);
    return {
      apps,
      files,
      parsed: sourcesByFile(sources),
      unread,
      appFiles: NextAppFiles.appFiles(apps, files),
      pagesFiles: NextAppFiles.pagesFiles(apps, files),
      ts: loadTypeScript(context.projectRoot),
    };
  }

  /** True when some Next app of the workspace has an App Router or Pages Router directory. */
  static hasRouter(sources: Pick<NextSources, 'apps'>): boolean {
    return sources.apps.some(
      app => app.appDirs.length > 0 || app.pagesDirs.length > 0
    );
  }

  /** True when some Next app has an App Router directory. */
  static hasAppRouter(sources: Pick<NextSources, 'apps'>): boolean {
    return sources.apps.some(app => app.appDirs.length > 0);
  }
}

/** Parsed sources keyed by normalized path. */
function sourcesByFile(sources: readonly TsxSource[]): Map<string, TsxSource> {
  return new Map(
    sources.map(source => [PathOperations.normalize(source.fileName), source])
  );
}

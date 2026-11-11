/**
 * What the React and Next.js laws share: which files are React source, how to
 * parse them, and where a Next app keeps its routes.
 *
 * A Next app is found by its manifest, not by a path: every workspace
 * package.json that declares `next` is an app root, and its router lives in
 * `app/` or `src/app/` (App Router) and `pages/` or `src/pages/` (Pages
 * Router) beneath it — the four places Next itself looks.
 */

import * as fs from 'fs';
import type { LawCheckContext } from '../../types/law.types';
import { FileSystemOperations } from '../file-system-operations';
import { FileUtils } from '../file-utils';
import { NxWorkspace } from '../nx-workspace';
import { PathOperations } from '../path-operations';
import {
  loadTypeScript,
  parserUnavailable,
  TsxSource,
  type TypeScriptModule,
} from './tsx-source';

/** The extensions React source is written in. */
export const REACT_SOURCE_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js', '.mjs'];

/** A test file in any of the React spellings — never React source. */
export const REACT_TEST_FILE = /\.(?:spec|test|cy|e2e)\.[cm]?[jt]sx?$/;

export interface ParsedSources {
  /** Parsed files, in scan order. Empty when the parser could not be loaded. */
  sources: TsxSource[];
  /**
   * Why files were NOT read: the parser was unavailable, or a file could not
   * be opened. A law that gets a non-empty list here must report it as a
   * violation — those files were not inspected.
   */
  unread: string[];
}

export interface NextApp {
  /** The directory whose package.json declares `next`. */
  root: string;
  /** Existing App Router directories (`app`, `src/app`). */
  appDirs: string[];
  /** Existing Pages Router directories (`pages`, `src/pages`). */
  pagesDirs: string[];
}

type Manifest = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

export class ReactProject {
  /**
   * Non-test React source through the normal scan, so `ignores` apply.
   * `extensions` narrows it (`['.tsx', '.jsx']` for JSX-only laws).
   */
  static sourceFiles(
    context: LawCheckContext,
    extensions: readonly string[] = REACT_SOURCE_EXTENSIONS
  ): string[] {
    return FileUtils.scanForFiles(
      context.projectRoot,
      context.config,
      [...extensions],
      context.lawId,
      false
    ).filter(file => !REACT_TEST_FILE.test(file) && !file.endsWith('.d.ts'));
  }

  /** Parse `files` with the project's TypeScript; see ParsedSources for the contract. */
  static parse(context: LawCheckContext, files: readonly string[]): ParsedSources {
    if (files.length === 0) return { sources: [], unread: [] };
    const ts: TypeScriptModule | null = loadTypeScript(context.projectRoot);
    if (!ts) {
      return {
        sources: [],
        unread: [`${files.length} file(s): ${parserUnavailable(context.projectRoot)}`],
      };
    }
    const sources: TsxSource[] = [];
    const unread: string[] = [];
    for (const file of files) {
      let text: string;
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch {
        unread.push(`${this.relative(context, file)}: could not be read`);
        continue;
      }
      sources.push(TsxSource.parse(ts, file, text));
    }
    return { sources, unread };
  }

  /** A path relative to the project root, with forward slashes, for messages. */
  static relative(context: LawCheckContext, file: string): string {
    return PathOperations.getRelative(context.projectRoot, file);
  }

  /** Every workspace package that declares `next`, with its router directories. */
  static nextApps(projectRoot: string): NextApp[] {
    const apps: NextApp[] = [];
    for (const manifestFile of NxWorkspace.resolveSourceFiles(projectRoot, 'package.json')) {
      let manifest: Manifest | null = null;
      try {
        manifest = FileSystemOperations.readJsonFile<Manifest>(manifestFile);
      } catch {
        continue;
      }
      const declares = Boolean(
        manifest?.dependencies?.next ?? manifest?.devDependencies?.next
      );
      if (!declares) continue;
      const root = PathOperations.getDirectory(manifestFile);
      const existing = (dirs: string[]): string[] =>
        dirs
          .map(dir => PathOperations.join(root, dir))
          .filter(dir => FileUtils.isDirectory(dir));
      apps.push({
        root,
        appDirs: existing(['app', 'src/app']),
        pagesDirs: existing(['pages', 'src/pages']),
      });
    }
    return apps;
  }
}

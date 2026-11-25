/**
 * Capacitor Sync Artefacts Match Dependencies
 *
 * `cap sync` writes android/capacitor.settings.gradle — one `include` per
 * dependency that ships an android/ directory — and the file is generated AND
 * tracked (Capacitor's own android/.gitignore does not list it). It is a
 * snapshot of package.json at the last sync. Add a plugin without syncing and
 * a clean checkout builds a shell without it ("not implemented" on the device,
 * green everywhere else); remove one and the dead include breaks the build.
 * iOS keeps the same list in ios/App/Podfile or ios/App/CapApp-SPM/Package.swift.
 *
 * What git publishes is judged (#638): a tracked artefact, and an untracked
 * one that is not ignored (`git add -A` would publish it). A git-ignored
 * artefact is not part of a clean checkout and is not judged; when every
 * artefact is ignored the law judged nothing, which is not a pass. When git
 * does not answer (no git, not a work tree, a broken index) the artefacts are
 * judged from the disk, and the result says so instead of "verified".
 */

import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  configValue,
  relative,
} from '../../utils/capacitor/capacitor-law-support';
import {
  type CapacitorProject,
  CapacitorProjects,
} from '../../utils/capacitor/capacitor-project';
import {
  type PublishedListing,
  publishedListing,
} from '../../utils/git/git-layout';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { declaredDependencies } from '../../utils/law-requirements';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

type Platform = 'android' | 'ios';

interface Artefact {
  platform: Platform;
  file: string;
}

/** The platform packages are referenced too; they are not plugins. */
const PLATFORM_PACKAGES = new Set(['@capacitor/android', '@capacitor/ios']);
const NODE_MODULES_REF = /node_modules[\\/]((?:@[^/\\'"]+[\\/])?[^/\\'"]+)/g;

export class CapacitorSyncArtefactsMatchDependenciesLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Sync Artefacts Match Dependencies';

  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const judged: string[] = [];
    const ignored: string[] = [];
    // null: git did not answer, and the disk is all there is to read.
    const listing = publishedListing(context.projectRoot);
    for (const project of CapacitorProjects.find(context.projectRoot)) {
      for (const artefact of this.artefacts(context, project)) {
        const where = relative(context, artefact.file);
        if (listing && !this.published(listing, where)) {
          ignored.push(where);
          continue;
        }
        judged.push(where);
        violations.push(...this.checkArtefact(context, project, artefact));
      }
    }
    if (judged.length === 0 && ignored.length > 0) {
      return this.nothingPublished(context, ignored);
    }
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'DEPLOYMENT',
      [
        'After every change to a native dependency run `npx cap sync` and commit the regenerated files in the same commit',
      ],
      context
    );
    const details = [
      ...(listing === null && judged.length > 0
        ? [`git did not answer, judged from the disk: ${judged.join(', ')}`]
        : []),
      ...(ignored.length > 0
        ? [`not judged, git ignores: ${ignored.join(', ')}`]
        : []),
    ];
    if (details.length > 0) result.details = details;
    if (listing === null && judged.length > 0 && violations.length === 0) {
      result.message = `${this.LAW_NAME}: the artefacts match the dependencies — git did not answer, judged from the disk (${judged.join(', ')})`;
    }
    return result;
  }

  /** Tracked, or untracked and not ignored: what a clean checkout or `git add -A` carries. */
  private static published(listing: PublishedListing, rel: string): boolean {
    return listing.tracked.has(rel) || listing.unignored.has(rel);
  }

  /** Every artefact is git-ignored: there is nothing a clean checkout carries to judge. */
  private static nothingPublished(
    context: LawCheckContext,
    ignored: string[]
  ): LawResult {
    const note = `${this.LAW_NAME} judged nothing: git ignores ${ignored.join(', ')} — a clean checkout carries none of them, nothing was judged`;
    return markJudgedNothing({
      passed: false,
      lawName: this.LAW_NAME,
      message: note,
      violations: [note],
      suggestions: [
        'Track the sync artefacts cap sync generates (Capacitor does not ignore android/capacitor.settings.gradle), or declare the law not applicable (laws.notApplicable) with a reason',
      ],
      score: 0,
      config: context.config,
    });
  }

  private static artefacts(
    context: LawCheckContext,
    project: CapacitorProject
  ): Artefact[] {
    const native = CapacitorProjects.nativePaths(project, context.projectRoot);
    const iosApp = PathOperations.join(native.iosDir, 'App');
    return [
      { platform: 'android' as const, file: native.capacitorSettingsGradle },
      {
        platform: 'ios' as const,
        file: PathOperations.join(iosApp, 'Podfile'),
      },
      {
        platform: 'ios' as const,
        file: PathOperations.join(iosApp, 'CapApp-SPM', 'Package.swift'),
      },
    ].filter(artefact => fs.existsSync(artefact.file));
  }

  private static checkArtefact(
    context: LawCheckContext,
    project: CapacitorProject,
    { platform, file }: Artefact
  ): string[] {
    const where = relative(context, file);
    const paths = [project.root, context.projectRoot];
    if (!this.packageDir('@capacitor/core', paths)) {
      return [
        `${where}: node_modules is not installed, so which dependencies ship native code cannot be known — this law does not pass on a guess`,
      ];
    }
    const expected = this.expected(context, project, platform, paths);
    const referenced = this.referenced(
      CapacitorProjects.readNative(file) ?? ''
    );
    const sync = `run \`npx cap sync ${platform}\` and commit the result`;
    return [
      ...[...expected]
        .filter(name => !referenced.has(name))
        .map(
          name =>
            `${where}: ${name} is a dependency with a ${platform}/ directory and is not in this file — ${sync}`
        ),
      ...[...referenced]
        .filter(name => !expected.has(name))
        .map(
          name =>
            `${where}: references ${name}, which is not a dependency (or not installed) — the next clean build fails on it; ${sync}`
        ),
    ];
  }

  /** Dependencies shipping native code for the platform, narrowed by a stated includePlugins list. */
  private static expected(
    context: LawCheckContext,
    project: CapacitorProject,
    platform: Platform,
    paths: string[]
  ): Set<string> {
    const resolution = CapacitorProjects.resolve(project, context.projectRoot);
    const config = resolution.ok ? resolution.config : {};
    const allow = (configValue(config, `${platform}.includePlugins`) ??
      configValue(config, 'includePlugins')) as string[] | undefined;
    const expected = new Set<string>();
    for (const name of declaredDependencies(context.projectRoot)) {
      if (PLATFORM_PACKAGES.has(name) || (allow && !allow.includes(name)))
        continue;
      const dir = this.packageDir(name, paths);
      if (dir && fs.existsSync(PathOperations.join(dir, platform)))
        expected.add(name);
    }
    return expected;
  }

  /** Every package the artefact points into node_modules for, platform packages excluded. */
  static referenced(text: string): Set<string> {
    const names = new Set<string>();
    for (const match of text.matchAll(NODE_MODULES_REF)) {
      const name = (match[1] ?? '').replace(/\\/g, '/');
      if (!PLATFORM_PACKAGES.has(name)) names.add(name);
    }
    return names;
  }

  private static packageDir(name: string, paths: string[]): string | null {
    try {
      return PathOperations.getDirectory(
        require.resolve(`${name}/package.json`, { paths })
      );
    } catch {
      return null;
    }
  }
}

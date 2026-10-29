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
 * Only a TRACKED artefact can drift from a clean checkout, so an untracked one
 * is reported as not read — never as green.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { configValue, relative } from '../../utils/capacitor/capacitor-law-support';
import { type CapacitorProject, CapacitorProjects } from '../../utils/capacitor/capacitor-project';
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
    const notRead: string[] = [];
    for (const project of CapacitorProjects.find(context.projectRoot)) {
      for (const artefact of this.artefacts(context, project)) {
        const result = this.checkArtefact(context, project, artefact);
        violations.push(...result.violations);
        notRead.push(...result.notRead);
      }
    }
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'DEPLOYMENT',
      ['After every change to a native dependency run `npx cap sync` and commit the regenerated files in the same commit'],
      context
    );
    if (violations.length === 0 && notRead.length > 0) {
      result.message = `${result.message} — not read: ${notRead.join('; ')}`;
    }
    return result;
  }

  private static artefacts(context: LawCheckContext, project: CapacitorProject): Artefact[] {
    const native = CapacitorProjects.nativePaths(project, context.projectRoot);
    const iosApp = PathOperations.join(native.iosDir, 'App');
    return [
      { platform: 'android' as const, file: native.capacitorSettingsGradle },
      { platform: 'ios' as const, file: PathOperations.join(iosApp, 'Podfile') },
      { platform: 'ios' as const, file: PathOperations.join(iosApp, 'CapApp-SPM', 'Package.swift') },
    ].filter(artefact => fs.existsSync(artefact.file));
  }

  private static checkArtefact(
    context: LawCheckContext,
    project: CapacitorProject,
    { platform, file }: Artefact
  ): { violations: string[]; notRead: string[] } {
    const where = relative(context, file);
    if (!this.tracked(context.projectRoot, file)) {
      return { violations: [], notRead: [`${where} is not tracked, so it cannot drift from a clean checkout`] };
    }
    const paths = [project.root, context.projectRoot];
    if (!this.packageDir('@capacitor/core', paths)) {
      return {
        violations: [`${where}: node_modules is not installed, so which dependencies ship native code cannot be known — this law does not pass on a guess`],
        notRead: [],
      };
    }
    const expected = this.expected(context, project, platform, paths);
    const referenced = this.referenced(CapacitorProjects.readNative(file) ?? '');
    const sync = `run \`npx cap sync ${platform}\` and commit the result`;
    return {
      violations: [
        ...[...expected]
          .filter(name => !referenced.has(name))
          .map(name => `${where}: ${name} is a dependency with a ${platform}/ directory and is not in this file — ${sync}`),
        ...[...referenced]
          .filter(name => !expected.has(name))
          .map(name => `${where}: references ${name}, which is not a dependency (or not installed) — the next clean build fails on it; ${sync}`),
      ],
      notRead: [],
    };
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
      if (PLATFORM_PACKAGES.has(name) || (allow && !allow.includes(name))) continue;
      const dir = this.packageDir(name, paths);
      if (dir && fs.existsSync(PathOperations.join(dir, platform))) expected.add(name);
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

  private static tracked(projectRoot: string, file: string): boolean {
    try {
      execFileSync('git', ['ls-files', '--error-unmatch', file], { cwd: projectRoot, stdio: 'ignore', windowsHide: true });
      return true;
    } catch {
      return false;
    }
  }

  private static packageDir(name: string, paths: string[]): string | null {
    try {
      return PathOperations.getDirectory(require.resolve(`${name}/package.json`, { paths }));
    } catch {
      return null;
    }
  }
}

/**
 * A Capacitor project declares the version it ships three times: package.json
 * (the web build), android/app/build.gradle (versionName — Google Play), and
 * the Xcode project (MARKETING_VERSION — App Store Connect). `cap sync` touches
 * neither native field, so the stores can be told a different version than
 * the one the law reads.
 *
 * A LITERAL native version that differs from package.json is drift. A value
 * injected at build time (a Gradle property, `$(MARKETING_VERSION)` from an
 * xcconfig) cannot be judged statically, and the law says it did not compare
 * it. The build numbers (versionCode, CURRENT_PROJECT_VERSION) are reported,
 * not compared: whether they only grow is a question about history.
 */

import * as fs from 'fs';
import { REQUIRES_CAPACITOR } from '../../utils/capacitor/capacitor-law-support';
import { type CapacitorProject, CapacitorProjects } from '../../utils/capacitor/capacitor-project';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { lawRequirementsMet } from '../../utils/law-requirements';
import { PathOperations } from '../../utils/path-operations';
import { TsClasses } from '../../utils/ts-classes';

export interface NativeVersionFindings {
  violations: string[];
  /** What was read but deliberately not compared. */
  notes: string[];
}

const VERSION_NAME = /\bversionName\b\s*=?\s*([^\n]+)/g;
const VERSION_CODE = /\bversionCode\b\s*=?\s*([^\n]+)/;
const MARKETING = /\bMARKETING_VERSION\s*=\s*([^;\n]+);?/g;
const BUILD_NUMBER = /\bCURRENT_PROJECT_VERSION\s*=\s*([^;\n]+);?/;
const STRING_LITERAL = /^(['"])([^'"]+)\1$/;

export class CapacitorNativeVersions {
  static check(projectRoot: string): NativeVersionFindings {
    const findings: NativeVersionFindings = { violations: [], notes: [] };
    if (!lawRequirementsMet(REQUIRES_CAPACITOR, projectRoot)) return findings;
    for (const project of CapacitorProjects.find(projectRoot)) {
      const declared = this.declaredVersion(projectRoot, project);
      if (!declared) continue;
      const native = CapacitorProjects.nativePaths(project, projectRoot);
      const rel = (file: string) => PathOperations.getRelative(projectRoot, file).replace(/\\/g, '/');
      this.android(rel(native.androidAppBuildGradle), CapacitorProjects.readNative(native.androidAppBuildGradle), declared, findings);
      for (const file of [native.xcodeProjectFile, ...this.xcconfigs(native.iosDir)]) {
        this.ios(rel(file), CapacitorProjects.readNative(file), declared, findings);
      }
    }
    return findings;
  }

  /** The app's own package.json version if it has one, else the workspace's. */
  private static declaredVersion(projectRoot: string, project: CapacitorProject): string | null {
    for (const dir of [project.root, projectRoot]) {
      try {
        const pkg = FileSystemOperations.readJsonFile<{ version?: unknown }>(
          PathOperations.join(dir, 'package.json')
        );
        if (typeof pkg.version === 'string') return pkg.version;
      } catch {
        // no manifest here
      }
    }
    return null;
  }

  private static android(
    where: string,
    text: string | null,
    declared: string,
    findings: NativeVersionFindings
  ): void {
    if (text === null) return;
    const code = TsClasses.mask(text); // Groovy/Kotlin comments use the same syntax
    for (const match of code.matchAll(VERSION_NAME)) {
      this.compare(where, 'versionName', (match[1] ?? '').trim(), declared, findings);
    }
    const versionCode = VERSION_CODE.exec(code)?.[1]?.trim();
    if (versionCode) findings.notes.push(`${where}: versionCode ${versionCode} (reported, not compared)`);
  }

  private static ios(
    where: string,
    text: string | null,
    declared: string,
    findings: NativeVersionFindings
  ): void {
    if (text === null) return;
    const code = TsClasses.mask(text);
    const values = new Set([...code.matchAll(MARKETING)].map(match => (match[1] ?? '').trim()));
    for (const value of values) {
      this.compare(where, 'MARKETING_VERSION', value.replace(STRING_LITERAL, '$2'), declared, findings, !value.includes('$('));
    }
    const build = BUILD_NUMBER.exec(code)?.[1]?.trim();
    if (build) findings.notes.push(`${where}: CURRENT_PROJECT_VERSION ${build} (reported, not compared)`);
  }

  /**
   * Gradle values are literal only when quoted; an Xcode value is literal
   * unless it is a `$(…)` reference.
   */
  private static compare(
    where: string,
    field: string,
    raw: string,
    declared: string,
    findings: NativeVersionFindings,
    literal = STRING_LITERAL.test(raw)
  ): void {
    if (!literal) {
      findings.notes.push(`${where}: ${field} is injected at build time (${raw}); not compared`);
      return;
    }
    const value = raw.replace(STRING_LITERAL, '$2');
    if (this.sameVersion(value, declared)) return;
    findings.violations.push(
      `${where}: ${field} ${value} ≠ package.json ${declared} — the store is told a different version than the one the project declares`
    );
  }

  /** "1.0" and "1.0.0" are one version; prerelease and build metadata do not reach the stores. */
  private static sameVersion(native: string, declared: string): boolean {
    const semver = require('semver') as { coerce: (v: string) => { version: string } | null };
    const a = semver.coerce(native)?.version;
    const b = semver.coerce(declared)?.version;
    return a !== undefined && a === b;
  }

  /** `.xcconfig` files under ios/App (Pods excluded) — a project may keep the literal there. */
  private static xcconfigs(iosDir: string, depth = 0, dir = PathOperations.join(iosDir, 'App')): string[] {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    return entries.flatMap(entry => {
      const full = PathOperations.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === 'Pods' || depth >= 3 ? [] : this.xcconfigs(iosDir, depth + 1, full);
      }
      return entry.name.endsWith('.xcconfig') ? [full] : [];
    });
  }
}

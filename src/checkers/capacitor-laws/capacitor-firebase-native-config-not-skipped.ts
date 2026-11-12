/**
 * Capacitor Firebase Native Config Not Skipped
 *
 * Every Android shell @capacitor/cli 8.5.1 generates applies the Google
 * Services plugin inside `try { … } catch (Exception e) { logger.info(…) }`
 * (android-template, app/build.gradle:47-54). Without google-services.json
 * the build is green and the APK has no Firebase configuration — push never
 * registers, native sign-in does nothing — and google-services.json is
 * rightly git-ignored, so every fresh checkout is in that state.
 *
 * Red: the plugin applied inside a try whose catch does not throw, or behind
 * a condition in a script that never fails the build; a google-services.json
 * present for a variant with no client for that variant's package.
 * A missing google-services.json is not red: it is ignored by design, and the
 * law judges the build that would run without it.
 *
 * The build script is read as the commit holds it (CommittedShell): a
 * script on this disk that git does not track is not what a clean checkout
 * builds. google-services.json, ignored by design, is read from disk.
 */

import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AndroidShell } from '../../utils/capacitor/android-shell';
import {
  type PlatformProject,
  projectsWithPlatform,
  relative,
} from '../../utils/capacitor/capacitor-law-support';
import { FIREBASE_ANDROID_DEPENDENCIES } from '../../utils/capacitor/capacitor-native-tables';
import { CommittedShell, notReadReason } from '../../utils/capacitor/committed-shell';
import { type GradleBlock, GradleText, gradleStringValue } from '../../utils/capacitor/gradle-text';
import { declaredDependencies } from '../../utils/law-requirements';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

const GOOGLE_SERVICES = 'com.google.gms.google-services';
const SERVICES_JSON = 'google-services.json';
const APPLY_SITES = [
  /\bapply\s*\(?\s*plugin\s*[:=]\s*["']com\.google\.gms\.google-services["']/g,
  /\bid\s*\(?\s*["']com\.google\.gms\.google-services["']/g,
];
const THROWS = /\bthrow\b/;
const INIT_WITH = /\binitWith\s*\(?\s*(?:buildTypes\.)?(?:getByName\s*\(\s*["'])?(\w+)/;
const DEFAULT_BUILD_TYPES = ['debug', 'release'];

interface Verdict {
  violations: string[];
  notes: string[];
}

export class CapacitorFirebaseNativeConfigNotSkippedLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Firebase Native Config Not Skipped';

  static check(context: LawCheckContext): LawResult {
    const needing = this.needingFirebase(context.projectRoot);
    const { projects, notRead } = needing.length > 0
      ? projectsWithPlatform(context, 'android')
      : { projects: [], notRead: [] };
    const verdicts = projects.map(project => this.checkProject(context, project, needing));
    const result = this.createResult(
      [...notRead, ...verdicts.flatMap(verdict => verdict.violations)],
      this.LAW_NAME,
      'FRAMEWORK',
      [
        "Replace the template's try/catch with a Gradle task that fails the build when google-services.json is missing for that variant, and check that the file's package_name equals the variant's applicationId (with suffix) before cap sync",
      ],
      context
    );
    const notes = verdicts.flatMap(verdict => verdict.notes);
    if (notes.length > 0) result.details = notes;
    return result;
  }

  /** Installed dependencies that bring a Firebase SDK into the Android build. */
  private static needingFirebase(projectRoot: string): string[] {
    const listed = new Set(FIREBASE_ANDROID_DEPENDENCIES.map(row => row.dependency));
    return [...declaredDependencies(projectRoot)].filter(
      name => listed.has(name) || name.startsWith('@capacitor-firebase/')
    );
  }

  private static checkProject(context: LawCheckContext, { native }: PlatformProject, needing: string[]): Verdict {
    const script = AndroidShell.buildScript(native, AndroidShell.committed(context.projectRoot, native));
    if ('notRead' in script) {
      const scriptPath = relative(context, script.file);
      const what = script.notRead.state === 'absent' ? `${relative(context, native.androidAppBuildGradle)}(.kts)` : scriptPath;
      return {
        violations: [`${what} ${notReadReason(script.notRead)} — this law reads the committed app build script and does not pass without it`],
        notes: [],
      };
    }
    const where = relative(context, script.file);
    const gradle = new GradleText(script.text);
    const files = this.checkServicesFiles(context, native, gradle);
    return { violations: [...this.checkApply(where, gradle, needing), ...files.violations], notes: files.notes };
  }

  private static checkApply(where: string, gradle: GradleText, needing: string[]): string[] {
    const sites = APPLY_SITES.flatMap(pattern =>
      [...gradle.plain.matchAll(pattern)]
        .map(match => match.index ?? 0)
        // A match inside a string (a message quoting the line) is not an apply.
        .filter(offset => /\w/.test(gradle.code[offset] ?? ''))
    );
    if (sites.length === 0) {
      return [
        `${where}: ${needing.join(', ')} need${needing.length === 1 ? 's' : ''} Firebase on Android, and this script does not apply ${GOOGLE_SERVICES} — if a convention plugin or buildSrc applies it, this law cannot read it and does not pass on a guess`,
      ];
    }
    return sites.flatMap(offset => this.judgeSite(where, gradle, offset));
  }

  private static judgeSite(where: string, gradle: GradleText, offset: number): string[] {
    const line = `${where}:${gradle.lineOf(offset)}`;
    const enclosing = gradle.enclosing(offset);
    const tryBlock = [...enclosing].reverse().find(block => block.name === 'try');
    if (tryBlock) {
      const handler = this.catchOf(gradle, tryBlock);
      if (handler && THROWS.test(gradle.code.slice(handler.open, handler.close))) return [];
      return [
        `${line}: ${GOOGLE_SERVICES} is applied inside try/catch and the catch does not throw — without ${SERVICES_JSON} the build stays green and the APK has no Firebase configuration (the Capacitor template's form)`,
      ];
    }
    const conditional = enclosing.some(block => block.name === 'if');
    if (conditional && !THROWS.test(gradle.code)) {
      return [
        `${line}: ${GOOGLE_SERVICES} is applied only when a condition holds, and nothing in the script fails the build — a checkout without ${SERVICES_JSON} builds green without Firebase`,
      ];
    }
    return [];
  }

  /** The catch block following a try block. */
  private static catchOf(gradle: GradleText, tryBlock: GradleBlock): GradleBlock | undefined {
    return gradle
      .children(tryBlock.parent)
      .find(block => block.open > tryBlock.close && block.name === 'catch');
  }

  private static checkServicesFiles(
    context: LawCheckContext,
    native: PlatformProject['native'],
    gradle: GradleText
  ): Verdict {
    const appDir = AndroidShell.appDir(native);
    // google-services.json is git-ignored by design: the copy a local build would use is the one on disk.
    const sets = AndroidShell.sourceSets(native, CommittedShell.onDisk(context.projectRoot))
      .map(set => ({ name: set.name, file: PathOperations.join(set.dir, SERVICES_JSON) }))
      .filter(({ file }) => fs.existsSync(file));
    const root = PathOperations.join(appDir, SERVICES_JSON);
    if (sets.length === 0 && !fs.existsSync(root)) return { violations: [], notes: [] };

    const defaultConfig = gradle.named('defaultConfig')[0];
    const applicationId = defaultConfig ? gradleStringValue(gradle.ownText(defaultConfig), 'applicationId') : undefined;
    if (!applicationId) {
      return { violations: [], notes: [`${relative(context, root)}: applicationId is not a string literal in defaultConfig, so the package in ${SERVICES_JSON} was not compared`] };
    }
    const suffixes = this.buildTypeSuffixes(gradle);
    const violations: string[] = [];
    const notes: string[] = [];
    for (const { name, file } of sets) {
      const suffix = suffixes.get(name);
      if (suffix === undefined) {
        notes.push(`${relative(context, file)}: ${name} is not a build type of this script (a flavour?), so its package was not compared`);
        continue;
      }
      violations.push(...this.comparePackages(context, file, [`${applicationId}${suffix}`]));
    }
    if (fs.existsSync(root)) {
      const own = new Set(sets.map(set => set.name));
      const expected = [...suffixes].filter(([name]) => !own.has(name)).map(([, suffix]) => `${applicationId}${suffix}`);
      violations.push(...this.comparePackages(context, root, [...new Set(expected)]));
    }
    return { violations, notes };
  }

  /** Each build type's applicationIdSuffix ('' for none), following initWith once. */
  static buildTypeSuffixes(gradle: GradleText): Map<string, string> {
    const suffixes = new Map(DEFAULT_BUILD_TYPES.map(name => [name, '']));
    const blocks = gradle.named('buildTypes').flatMap(container => gradle.children(container));
    const inherits = new Map<string, string>();
    for (const block of blocks) {
      const text = gradle.ownText(block);
      suffixes.set(block.name, gradleStringValue(text, 'applicationIdSuffix') ?? '');
      const parent = INIT_WITH.exec(text)?.[1];
      if (parent && gradleStringValue(text, 'applicationIdSuffix') === undefined) inherits.set(block.name, parent);
    }
    for (const [name, parent] of inherits) suffixes.set(name, suffixes.get(parent) ?? '');
    return suffixes;
  }

  private static comparePackages(context: LawCheckContext, file: string, expected: string[]): string[] {
    const where = relative(context, file);
    let packages: string[];
    try {
      packages = this.packagesOf(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch {
      return [`${where}: cannot be read as JSON — the google-services plugin would fail on it, and this law does not pass it`];
    }
    return expected
      .filter(name => !packages.includes(name))
      .map(name => `${where}: has no client for ${name} (it lists ${packages.join(', ') || 'none'}) — a file from another Firebase project or applicationId passes the template's check`);
  }

  private static packagesOf(json: unknown): string[] {
    const clients = (json as { client?: unknown })?.client;
    if (!Array.isArray(clients)) return [];
    return clients
      .map(client => (client as { client_info?: { android_client_info?: { package_name?: unknown } } })
        ?.client_info?.android_client_info?.package_name)
      .filter((name): name is string => typeof name === 'string');
  }
}

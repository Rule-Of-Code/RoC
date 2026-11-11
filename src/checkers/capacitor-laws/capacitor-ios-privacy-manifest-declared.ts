/**
 * Capacitor iOS Privacy Manifest Declared
 *
 * Apple asks an app that calls certain APIs to declare each with a reason in
 * PrivacyInfo.xcprivacy, and Capacitor's guide names @capacitor/preferences
 * (UserDefaults; CA92.1 in its sample) as a plugin that brings the duty.
 * Nothing in `cap add ios`, `cap sync` or the Xcode build creates the file,
 * so the project learns of it at App Store upload.
 *
 * Table-driven (capacitor-native-tables.ts): each row names the dependency,
 * the API category and the source it was read from. Presence of the category
 * and of a reason string is judged; whether the reason fits is reported only.
 */

import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  type PlatformProject,
  projectsWithPlatform,
  relative,
} from '../../utils/capacitor/capacitor-law-support';
import { PRIVACY_MANIFEST_ROWS, type PrivacyManifestRow } from '../../utils/capacitor/capacitor-native-tables';
import { CapacitorProjects } from '../../utils/capacitor/capacitor-project';
import { type GitExposure, gitExposure } from '../../utils/git/git-layout';
import { declaredDependencies } from '../../utils/law-requirements';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

export const PRIVACY_MANIFEST = 'PrivacyInfo.xcprivacy';

/** Directories under ios/App that hold build output or other packages' manifests, not the app's. */
const NOT_THE_APP = new Set(['Pods', 'build', 'DerivedData', 'public', 'CapApp-SPM', 'node_modules']);
const SEARCH_DEPTH = 3;

/** One NSPrivacyAccessedAPITypes entry: its category and reason strings. */
export interface AccessedApi {
  category: string;
  reasons: string[];
}

export class CapacitorIosPrivacyManifestDeclaredLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor iOS Privacy Manifest Declared';

  static check(context: LawCheckContext): LawResult {
    const installed = declaredDependencies(context.projectRoot);
    const rows = PRIVACY_MANIFEST_ROWS.filter(row => installed.has(row.dependency));
    const { projects, notRead } = rows.length > 0 ? projectsWithPlatform(context, 'ios') : { projects: [], notRead: [] };
    const reported: string[] = [];
    const violations = [
      ...notRead,
      ...projects.flatMap(project => this.checkProject(context, project, rows, reported)),
    ];
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'DEPLOYMENT',
      [
        'Add ios/App/App/PrivacyInfo.xcprivacy to the App target and declare, for each installed plugin that uses a required-reason API, its NSPrivacyAccessedAPIType with the reason code that matches your use',
      ],
      context
    );
    if (reported.length > 0) result.details = reported;
    return result;
  }

  private static checkProject(
    context: LawCheckContext,
    { native }: PlatformProject,
    rows: readonly PrivacyManifestRow[],
    reported: string[]
  ): string[] {
    const file = this.locate(native.iosTargetDir, PathOperations.getDirectory(native.iosTargetDir));
    const needed = rows.map(row => `${row.dependency} → ${row.category} (e.g. ${row.exampleReason}; ${row.source})`);
    if (!file) {
      return [
        `${relative(context, PathOperations.join(native.iosTargetDir, PRIVACY_MANIFEST))} does not exist, and the installed plugins need it: ${needed.join('; ')}`,
      ];
    }
    const where = relative(context, file);
    const exposure = this.exposure(context.projectRoot, where);
    if (exposure === 'ignored') {
      return [`${where} exists here but git ignores it, so a clean checkout builds without it — commit it`];
    }
    const declared = this.accessedApis(CapacitorProjects.readNative(file) ?? '');
    const violations: string[] = [];
    for (const row of rows) {
      const entry = declared.find(api => api.category === row.category);
      if (!entry) {
        violations.push(`${where}: no NSPrivacyAccessedAPITypes entry for ${row.category}, which ${row.dependency} uses (${row.source})`);
      } else if (entry.reasons.length === 0) {
        violations.push(`${where}: ${row.category} is declared without a reason in NSPrivacyAccessedAPITypeReasons (Capacitor's sample: ${row.exampleReason})`);
      } else {
        reported.push(`${where}: ${row.category} declared with ${entry.reasons.join(', ')} (reason not judged)`);
      }
    }
    return violations;
  }

  /** The app's manifest: the target directory first, then elsewhere under ios/App (not Pods or build output). */
  private static locate(targetDir: string, appDir: string): string | null {
    const direct = PathOperations.join(targetDir, PRIVACY_MANIFEST);
    if (fs.existsSync(direct)) return direct;
    const search = (dir: string, depth: number): string | null => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return null;
      }
      const file = entries.find(entry => entry.isFile() && entry.name === PRIVACY_MANIFEST);
      if (file) return PathOperations.join(dir, file.name);
      if (depth === 0) return null;
      for (const entry of entries) {
        if (!entry.isDirectory() || NOT_THE_APP.has(entry.name) || entry.name.startsWith('.')) continue;
        const found = search(PathOperations.join(dir, entry.name), depth - 1);
        if (found) return found;
      }
      return null;
    };
    return search(appDir, SEARCH_DEPTH);
  }

  private static exposure(projectRoot: string, file: string): GitExposure | undefined {
    return gitExposure(projectRoot, [file])?.get(file);
  }

  /** Every NSPrivacyAccessedAPITypes entry of a privacy manifest (an XML property list). */
  static accessedApis(plist: string): AccessedApi[] {
    const text = plist.replace(/<!--[\s\S]*?-->/g, ' ');
    const key = /<key>\s*NSPrivacyAccessedAPITypes\s*<\/key>\s*<array>/.exec(text);
    if (!key) return [];
    const types = this.arrayBody(text, key.index + key[0].length);
    return [...types.matchAll(/<dict>([\s\S]*?)<\/dict>/g)].map(([, entry]) => {
      const body = entry ?? '';
      const category = /<key>\s*NSPrivacyAccessedAPIType\s*<\/key>\s*<string>\s*([^<]*?)\s*<\/string>/.exec(body)?.[1] ?? '';
      const reasonList = /<key>\s*NSPrivacyAccessedAPITypeReasons\s*<\/key>\s*<array>([\s\S]*?)<\/array>/.exec(body)?.[1] ?? '';
      const reasons = [...reasonList.matchAll(/<string>\s*([^<]*?)\s*<\/string>/g)]
        .map(match => match[1] ?? '')
        .filter(Boolean);
      return { category, reasons };
    });
  }

  /** The body of an `<array>` opened just before `from`, nested arrays included. */
  private static arrayBody(text: string, from: number): string {
    let depth = 1;
    const tag = /<(\/?)array\s*(\/?)>/g;
    tag.lastIndex = from;
    for (let match = tag.exec(text); match; match = tag.exec(text)) {
      if (match[2]) continue; // <array/>
      depth += match[1] ? -1 : 1;
      if (depth === 0) return text.slice(from, match.index);
    }
    return text.slice(from);
  }
}

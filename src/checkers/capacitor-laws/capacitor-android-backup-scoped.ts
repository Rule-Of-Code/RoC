/**
 * Capacitor Android Backup Scoped
 *
 * The Android shell Capacitor generates declares `android:allowBackup="true"`
 * and no backup rules (@capacitor/cli 8.5.1, android-template,
 * app/src/main/AndroidManifest.xml:5). Auto Backup then copies shared
 * preferences, getDir() directories and databases to the user's cloud backup
 * and to a new device — in a Capacitor app that is the Preferences store, the
 * WebView's storage and native SDK session tokens.
 *
 * The law asks only that the decision be written: backup off, or on with
 * both rule files (dataExtractionRules for API 31+, fullBackupContent for
 * API 30 and lower) present. What the rules exclude is reported, not judged.
 *
 * The manifest and the rules are read as the commit holds them
 * (CommittedShell): a manifest on this disk that git does not track is not
 * what a clean checkout builds.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AndroidShell } from '../../utils/capacitor/android-shell';
import {
  type PlatformProject,
  projectsWithPlatform,
  relative,
} from '../../utils/capacitor/capacitor-law-support';
import { notReadReason } from '../../utils/capacitor/committed-shell';
import { LawBase } from '../law-base';

const ALLOW_BACKUP = 'android:allowBackup';
const RULE_ATTRIBUTES: ReadonlyArray<{ attribute: string; api: string }> = [
  { attribute: 'android:dataExtractionRules', api: 'Android 12+' },
  { attribute: 'android:fullBackupContent', api: 'Android 11 and lower' },
];
const EXCLUDE = /<exclude\b([^>]*)\/?>/g;

interface ProjectVerdict {
  violations: string[];
  decisions: string[];
}

export class CapacitorAndroidBackupScopedLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Android Backup Scoped';

  static check(context: LawCheckContext): LawResult {
    const { projects, notRead } = projectsWithPlatform(context, 'android');
    const verdicts = projects.map(project => this.checkProject(context, project));
    const violations = [...notRead, ...verdicts.flatMap(verdict => verdict.violations)];
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        'Decide it in the manifest: android:allowBackup="false", or keep it true and add android:dataExtractionRules and android:fullBackupContent that exclude the sharedpref, database and app_webview domains holding credentials',
      ],
      context
    );
    const decisions = verdicts.flatMap(verdict => verdict.decisions);
    if (decisions.length > 0) result.details = decisions;
    return result;
  }

  private static checkProject(context: LawCheckContext, { native }: PlatformProject): ProjectVerdict {
    const where = relative(context, native.androidManifest);
    const shell = AndroidShell.committed(context.projectRoot, native);
    const read = shell.read(native.androidManifest);
    if (read.state !== 'read') {
      return {
        violations: [`${where}: ${notReadReason(read)} — this law reads the committed main manifest and does not pass without it`],
        decisions: [],
      };
    }
    const attributes = AndroidShell.applicationAttributes(read.text);
    if (!attributes) {
      return {
        violations: [`${where}: no readable <application> element — this law reads the main manifest and does not pass without it`],
        decisions: [],
      };
    }
    const allow = attributes.get(ALLOW_BACKUP)?.trim();
    if (allow?.includes('${')) {
      return {
        violations: [`${where}: ${ALLOW_BACKUP}="${allow}" is filled in by the build — not judged, and not passed`],
        decisions: [],
      };
    }
    if (allow?.toLowerCase() === 'false') return { violations: [], decisions: [`${where}: backup off`] };

    const stated = allow === undefined ? `${ALLOW_BACKUP} absent (Android's default is true)` : `${ALLOW_BACKUP}="${allow}"`;
    const missing: string[] = [];
    const decisions: string[] = [];
    for (const { attribute, api } of RULE_ATTRIBUTES) {
      const reference = attributes.get(attribute);
      const resource = reference === undefined ? null : AndroidShell.xmlResource(native, shell, 'main', reference);
      if (!resource) {
        missing.push(reference === undefined ? `${attribute} (${api})` : `${attribute}="${reference}" (no such res/xml file)`);
        continue;
      }
      decisions.push(`${relative(context, resource.file)}: ${this.excluded(resource.text)}`);
    }
    if (missing.length === 0) return { violations: [], decisions };
    return {
      violations: [
        `${where}: ${stated} without ${missing.join(' and ')} — Auto Backup copies shared preferences (Capacitor's Preferences store), databases and the WebView's storage to the user's cloud backup and to a new device`,
      ],
      decisions: [],
    };
  }

  /** What a rules file excludes, in its own words: `sharedpref:x.xml, database:.`. */
  private static excluded(xml: string): string {
    const excludes = [...AndroidShell.withoutComments(xml).matchAll(EXCLUDE)].map(match => {
      const attributes = AndroidShell.attributes(match[1] ?? '');
      return `${attributes.get('domain') ?? '?'}:${attributes.get('path') ?? '?'}`;
    });
    return excludes.length > 0 ? `excludes ${[...new Set(excludes)].join(', ')}` : 'excludes nothing';
  }
}

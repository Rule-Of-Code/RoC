/**
 * Capacitor Signing Secrets Outside Repo
 *
 * A Capacitor shell's release keystore and its passwords are the app's
 * identity in the store: lose them and the app cannot be updated, leak them
 * and someone else can publish an update that installs over it. They show up
 * in three places no source scanner reads — a key file in the tree, a
 * storePassword literal in a Gradle script, a password in a .properties file
 * — and a release build type that falls back to the debug key installs fine
 * and then fails to update on users' phones.
 *
 * "In the repository" is asked of git (tracked, or present and not ignored —
 * one `git add -A` away), never of the disk: an ignored keystore next to the
 * project is exactly what a correct setup has. A secret's value is never
 * repeated in a finding.
 */

import { execFileSync } from 'child_process';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { relative } from '../../utils/capacitor/capacitor-law-support';
import { CapacitorProjects } from '../../utils/capacitor/capacitor-project';
import { GradleText } from '../../utils/capacitor/gradle-text';
import { gitExposure, readPublishableFiles } from '../../utils/git/git-layout';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

/** Signing keys (Android keystores, iOS certificates and profiles, APNs keys). */
export const KEY_MATERIAL_EXTENSIONS: readonly string[] = ['jks', 'keystore', 'p12', 'mobileprovision', 'p8'];

const PASSWORD_ASSIGNMENT = /\b(storePassword|keyPassword)\b\s*(?:=\s*|\(\s*|[ \t]+)(["'])([^"'\n]*)\2/g;
const PASSWORD_KEY = /(store|key)[._]?pass(word)?/i;
const DEBUG_SIGNING = /signingConfigs\s*(?:\.\s*debug\b|\.\s*getByName\s*\(\s*["']debug["']\s*\)|\[\s*["']debug["']\s*\])/;
const NEVER_COMMIT = 'keep it in a secret manager or CI secret';

interface Listed {
  file: string;
  content: string;
}

export class CapacitorSigningSecretsOutsideRepoLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Signing Secrets Outside Repo';

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const androidDirs = CapacitorProjects.find(projectRoot).map(project =>
      relative(context, CapacitorProjects.nativePaths(project, projectRoot).androidDir)
    );
    const listed = this.gitList(projectRoot, [
      ...KEY_MATERIAL_EXTENSIONS.map(ext => `:(glob)**/*.${ext}`),
      ...androidDirs.flatMap(dir => ['gradle', 'gradle.kts', 'properties'].map(ext => `:(glob)${dir}/**/*.${ext}`)),
    ]);
    const violations = listed
      ? [
          ...this.keyMaterial(projectRoot, listed),
          ...this.scripts(readPublishableFiles(projectRoot, listed.filter(file => /\.gradle(\.kts)?$/.test(file)))),
          ...this.properties(readPublishableFiles(projectRoot, listed.filter(file => file.endsWith('.properties')))),
        ]
      : [
          'git could not be asked which files are in the repository (not a work tree, or no git), so key material and properties files were not checked — this law does not pass without asking',
          ...this.scripts(this.fixedScripts(context)),
        ];
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        'Keep key material out of git (secret manager or CI secret), read keystore paths and passwords through project properties or environment variables, and leave a release build unsigned, never debug-signed, when they are absent',
      ],
      context
    );
  }

  /** Tracked and untracked-but-not-ignored files matching the pathspecs; null when git cannot answer. */
  private static gitList(projectRoot: string, pathspecs: string[]): string[] | null {
    try {
      const inside = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
      });
      if (inside.trim() !== 'true') return null;
      const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...pathspecs], {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
        maxBuffer: 64 * 1024 * 1024,
      });
      return [...new Set(out.split('\0').filter(Boolean))];
    } catch {
      return null;
    }
  }

  private static keyMaterial(projectRoot: string, listed: string[]): string[] {
    const keys = listed.filter(file => KEY_MATERIAL_EXTENSIONS.some(ext => file.toLowerCase().endsWith(`.${ext}`)));
    if (keys.length === 0) return [];
    const states = gitExposure(projectRoot, keys);
    return keys.map(file =>
      states?.get(file) === 'tracked'
        ? `${file}: signing key material is tracked by git — remove it from the index (git rm --cached), rotate what it protects, and ${NEVER_COMMIT}`
        : `${file}: signing key material is present and not ignored, so \`git add -A\` commits it — ignore it and ${NEVER_COMMIT}`
    );
  }

  /** Password literals and a release build type signed with the debug key. */
  private static scripts(files: Listed[]): string[] {
    return files.flatMap(({ file, content }) => {
      const gradle = new GradleText(content);
      const literals = [...gradle.plain.matchAll(PASSWORD_ASSIGNMENT)]
        .filter(match => /\w/.test(gradle.code[match.index ?? 0] ?? ''))
        .filter(match => (match[3] ?? '').length > 0 && !(match[2] === '"' && (match[3] ?? '').includes('$')))
        .map(match => `${file}:${gradle.lineOf(match.index ?? 0)}: ${match[1]} is a string literal — read it from a project property or an environment variable, and rotate the key it opens`);
      const debugSigned = gradle
        .named('release')
        .filter(block => block.parent?.name === 'buildTypes' && DEBUG_SIGNING.test(gradle.body(block)))
        .map(block => `${file}:${gradle.lineOf(block.open)}: the release build type can be signed with signingConfigs.debug — that APK installs, then the next real-key update fails to install over it on users' phones; leave release unsigned when the key is absent`);
      return [...literals, ...debugSigned];
    });
  }

  private static properties(files: Listed[]): string[] {
    return files.flatMap(({ file, content }) =>
      content
        .split(/\r?\n/)
        .map((line, index) => ({ line: line.trim(), index }))
        .filter(({ line }) => line && !line.startsWith('#') && !line.startsWith('!'))
        .map(({ line, index }) => {
          const separator = line.search(/[=:]/);
          const key = (separator < 0 ? line : line.slice(0, separator)).trim();
          const value = separator < 0 ? '' : line.slice(separator + 1).trim();
          return PASSWORD_KEY.test(key) && value.length > 0
            ? `${file}:${index + 1}: ${key} holds a value in a file git publishes — ${NEVER_COMMIT}, and rotate the key it opens`
            : null;
        })
        .filter((finding): finding is string => finding !== null)
    );
  }

  /** Without git: the app and root build scripts at their fixed paths. */
  private static fixedScripts(context: LawCheckContext): Listed[] {
    return CapacitorProjects.find(context.projectRoot).flatMap(project => {
      const native = CapacitorProjects.nativePaths(project, context.projectRoot);
      const app = native.androidAppBuildGradle;
      const root = PathOperations.join(native.androidDir, 'build.gradle');
      return [app, `${app}.kts`, root, `${root}.kts`].flatMap(file => {
        const content = CapacitorProjects.readNative(file);
        return content === null ? [] : [{ file: relative(context, file), content }];
      });
    });
  }
}

/**
 * A Capacitor project as Capacitor itself sees it.
 *
 * Two rules every Capacitor law follows, and this module is where they live:
 *
 * 1. The config is read RESOLVED, by Capacitor's own CLI (`cap config --json`),
 *    never by a pattern over `capacitor.config.ts`. The file is a program: a
 *    comment can hold the safe value above a real unsafe one, the platform
 *    block (`android.loggingBehavior`) wins over the top-level key, values are
 *    lower-cased by the native side, and any of it can be computed. A text
 *    match answers a different question than the one the device answers.
 *
 * 2. The native shells are opened by their FIXED paths, independent of
 *    `ignores`. Most of `android/` and `ios/` is Capacitor's mirror of the web
 *    build, so a project legitimately excludes those trees from the file scan —
 *    but `AndroidManifest.xml`, `Info.plist`, the entitlements and the
 *    generated-and-tracked `capacitor.settings.gradle` are source inside the
 *    excluded tree. The git laws open `.git` the same way.
 *
 * When the CLI cannot be run, the result says so (`ok: false`). A law that
 * could not look must say it could not look; it must never pass.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import { FileSystemOperations } from '../file-system-operations';
import { NxWorkspace } from '../nx-workspace';
import { PathOperations } from '../path-operations';

/** In the order Capacitor's own loader tries them (config.js loadExtConfig). */
export const CAPACITOR_CONFIG_FILES: readonly string[] = [
  'capacitor.config.ts',
  'capacitor.config.js',
  'capacitor.config.json',
];

export interface CapacitorProject {
  /** The directory holding the config — where `cap` runs and the shells live. */
  root: string;
  /** The config file Capacitor would load from `root`. */
  configFile: string;
}

export interface CapacitorNativePaths {
  androidDir: string;
  androidManifest: string;
  androidAppBuildGradle: string;
  capacitorSettingsGradle: string;
  iosDir: string;
  iosTargetDir: string;
  infoPlist: string;
  xcodeProjectFile: string;
}

export type CapacitorConfigResolution =
  | {
      ok: true;
      /** The project's config object, resolved (`app.extConfig`). */
      config: Record<string, unknown>;
      native: CapacitorNativePaths;
    }
  | { ok: false; reason: string };

type ResolvedPlatform = Record<string, unknown>;

/** Resolving runs the project's config program; allow a slow machine, not a hang. */
const CLI_TIMEOUT_MS = 60_000;

export class CapacitorProjects {
  private static readonly resolutions = new Map<string, CapacitorConfigResolution>();

  /** Every directory, at the root or in a workspace project, that holds a Capacitor config. */
  static find(projectRoot: string): CapacitorProject[] {
    const byRoot = new Map<string, CapacitorProject>();
    for (const name of CAPACITOR_CONFIG_FILES) {
      for (const file of NxWorkspace.resolveSourceFiles(projectRoot, name)) {
        const root = PathOperations.getDirectory(file);
        // First name wins, as in Capacitor's loader: .ts over .js over .json.
        if (!byRoot.has(root)) byRoot.set(root, { root, configFile: file });
      }
    }
    return [...byRoot.values()];
  }

  /**
   * The config as `cap config --json` prints it, run with the project's own
   * installed CLI. Never `npx`: an audit must not download a package.
   * Memoised per config file and its mtime — several laws ask, one run answers.
   */
  static resolve(
    project: CapacitorProject,
    workspaceRoot: string = project.root
  ): CapacitorConfigResolution {
    const key = this.cacheKey(project);
    const cached = this.resolutions.get(key);
    if (cached) return cached;
    const resolution = this.runCli(project, workspaceRoot);
    this.resolutions.set(key, resolution);
    return resolution;
  }

  /**
   * The native file paths: Capacitor's resolved ones when the CLI ran (they
   * honour `android.path` / `ios.path`), otherwise Capacitor's defaults.
   */
  static nativePaths(
    project: CapacitorProject,
    workspaceRoot: string = project.root
  ): CapacitorNativePaths {
    const resolution = this.resolve(project, workspaceRoot);
    return resolution.ok ? resolution.native : this.defaultNativePaths(project.root);
  }

  static defaultNativePaths(root: string): CapacitorNativePaths {
    const androidDir = PathOperations.join(root, 'android');
    const iosDir = PathOperations.join(root, 'ios');
    const iosTargetDir = PathOperations.join(iosDir, 'App', 'App');
    return {
      androidDir,
      androidManifest: PathOperations.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml'),
      androidAppBuildGradle: PathOperations.join(androidDir, 'app', 'build.gradle'),
      capacitorSettingsGradle: PathOperations.join(androidDir, 'capacitor.settings.gradle'),
      iosDir,
      iosTargetDir,
      infoPlist: PathOperations.join(iosTargetDir, 'Info.plist'),
      xcodeProjectFile: PathOperations.join(iosDir, 'App', 'App.xcodeproj', 'project.pbxproj'),
    };
  }

  /** A file's text, or null when it does not exist — read regardless of `ignores`. */
  static readNative(file: string): string | null {
    try {
      return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    } catch {
      return null;
    }
  }

  /**
   * Every file a Capacitor law may open by fixed path, for each project in the
   * workspace. The audit cache keys on these: they sit outside the scanned
   * file set, so without them a cached verdict would survive an edit to the
   * manifest it was computed from.
   */
  static fixedPathInputs(projectRoot: string): string[] {
    return this.find(projectRoot).flatMap(project => {
      const native = this.defaultNativePaths(project.root);
      return [
        project.configFile,
        native.androidManifest,
        native.androidAppBuildGradle,
        native.capacitorSettingsGradle,
        PathOperations.join(native.androidDir, '.gitignore'),
        native.infoPlist,
        native.xcodeProjectFile,
        PathOperations.join(native.iosDir, '.gitignore'),
        PathOperations.join(native.iosDir, 'App', 'Podfile'),
        PathOperations.join(native.iosDir, 'App', 'CapApp-SPM', 'Package.swift'),
        ...this.entitlementFiles(native),
      ];
    });
  }

  /** The `*.entitlements` files of the iOS target (Xcode names them after the target). */
  static entitlementFiles(native: CapacitorNativePaths): string[] {
    try {
      return fs
        .readdirSync(native.iosTargetDir)
        .filter(name => name.endsWith('.entitlements'))
        .map(name => PathOperations.join(native.iosTargetDir, name));
    } catch {
      return [];
    }
  }

  /** Forget memoised resolutions (tests; a long-lived process after edits). */
  static clearCache(): void {
    this.resolutions.clear();
  }

  private static cacheKey(project: CapacitorProject): string {
    try {
      const stat = fs.statSync(project.configFile);
      return `${project.configFile}:${stat.mtimeMs}:${stat.size}`;
    } catch {
      return project.configFile;
    }
  }

  private static runCli(
    project: CapacitorProject,
    workspaceRoot: string
  ): CapacitorConfigResolution {
    const bin = this.locateCli(project.root, workspaceRoot);
    if (!bin) {
      return {
        ok: false,
        reason:
          '@capacitor/cli is not installed here, so the config cannot be resolved the way Capacitor resolves it (run npm install)',
      };
    }

    let stdout: string;
    try {
      stdout = execFileSync(process.execPath, [bin, 'config', '--json'], {
        cwd: project.root,
        encoding: 'utf8',
        timeout: CLI_TIMEOUT_MS,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (error) {
      const stderr = String((error as { stderr?: unknown }).stderr ?? '').trim();
      const firstLine = stderr.split('\n').find(line => line.trim()) ?? String(error);
      return { ok: false, reason: `\`cap config --json\` failed: ${firstLine.trim()}` };
    }

    return this.parse(stdout, project.root);
  }

  private static parse(stdout: string, root: string): CapacitorConfigResolution {
    const line = stdout
      .split('\n')
      .map(text => text.trim())
      .reverse()
      .find(text => text.startsWith('{'));
    let printed: { app?: { extConfig?: unknown }; android?: unknown; ios?: unknown };
    try {
      printed = JSON.parse(line ?? '');
    } catch {
      return { ok: false, reason: '`cap config --json` printed no JSON' };
    }
    const config = printed.app?.extConfig;
    if (!config || typeof config !== 'object') {
      return { ok: false, reason: '`cap config --json` printed no app.extConfig' };
    }
    return {
      ok: true,
      config: config as Record<string, unknown>,
      native: this.resolvedNativePaths(
        root,
        printed.android as ResolvedPlatform | undefined,
        printed.ios as ResolvedPlatform | undefined
      ),
    };
  }

  private static resolvedNativePaths(
    root: string,
    android: ResolvedPlatform | undefined,
    ios: ResolvedPlatform | undefined
  ): CapacitorNativePaths {
    const fallback = this.defaultNativePaths(root);
    const dir = (platform: ResolvedPlatform | undefined, field: string): string | undefined => {
      const value = platform?.[field];
      return typeof value === 'string' && value.length > 0 ? value : undefined;
    };
    const androidDir = dir(android, 'platformDirAbs') ?? fallback.androidDir;
    const androidApp = dir(android, 'appDirAbs');
    const androidMain = dir(android, 'srcMainDirAbs');
    const iosDir = dir(ios, 'platformDirAbs') ?? fallback.iosDir;
    const iosTargetDir = dir(ios, 'nativeTargetDirAbs') ?? fallback.iosTargetDir;
    const xcodeProj = dir(ios, 'nativeXcodeProjDirAbs');
    return {
      androidDir,
      androidManifest: androidMain
        ? PathOperations.join(androidMain, 'AndroidManifest.xml')
        : fallback.androidManifest,
      androidAppBuildGradle: androidApp
        ? PathOperations.join(androidApp, 'build.gradle')
        : fallback.androidAppBuildGradle,
      capacitorSettingsGradle: PathOperations.join(androidDir, 'capacitor.settings.gradle'),
      iosDir,
      iosTargetDir,
      infoPlist: PathOperations.join(iosTargetDir, 'Info.plist'),
      xcodeProjectFile: xcodeProj
        ? PathOperations.join(xcodeProj, 'project.pbxproj')
        : fallback.xcodeProjectFile,
    };
  }

  /** The project's own `@capacitor/cli` entry point, or null when it is not installed. */
  private static locateCli(root: string, workspaceRoot: string): string | null {
    let manifestPath: string;
    try {
      manifestPath = require.resolve('@capacitor/cli/package.json', {
        paths: [root, workspaceRoot],
      });
    } catch {
      return null;
    }
    let manifest: { bin?: string | Record<string, string> } | null = null;
    try {
      manifest = FileSystemOperations.readJsonFile(manifestPath);
    } catch {
      return null;
    }
    const bin =
      typeof manifest?.bin === 'string' ? manifest.bin : manifest?.bin?.cap;
    if (!bin) return null;
    const entry = PathOperations.join(PathOperations.getDirectory(manifestPath), bin);
    return fs.existsSync(entry) ? entry : null;
  }
}

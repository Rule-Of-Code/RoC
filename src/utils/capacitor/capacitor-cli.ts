/**
 * Capacitor's config resolved by Capacitor's own CLI: `cap config --json`
 * run with the project's installed `@capacitor/cli` (never `npx`), its
 * printed `app.extConfig` and the native paths it resolved. See
 * capacitor-project.ts for why the config is read this way.
 */

import { execFileSync } from '../child-process';
import * as fs from 'fs';
import { FileSystemOperations } from '../file-system-operations';
import { PathOperations } from '../path-operations';
import type {
  CapacitorConfigResolution,
  CapacitorNativePaths,
  CapacitorProject,
} from './capacitor-project';

/** The Android manifest's file name. */
export const ANDROID_MANIFEST = 'AndroidManifest.xml';
/** The Gradle build script's file name. */
export const BUILD_GRADLE = 'build.gradle';

/** Resolving runs the project's config program; allow a slow machine, not a hang. */
const CLI_TIMEOUT_MS = 60_000;

type ResolvedPlatform = Record<string, unknown>;

/**
 * Run `cap config --json` with the project's own CLI and read what it
 * prints; `defaults` gives the native paths the CLI did not resolve.
 */
export function runCapacitorCli(
  project: CapacitorProject,
  workspaceRoot: string,
  defaults: (root: string) => CapacitorNativePaths
): CapacitorConfigResolution {
  const bin = locateCli(project.root, workspaceRoot);
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
    const firstLine =
      stderr.split('\n').find(line => line.trim()) ?? String(error);
    return {
      ok: false,
      reason: `\`cap config --json\` failed: ${firstLine.trim()}`,
    };
  }

  return parseConfigOutput(stdout, project.root, defaults);
}

function parseConfigOutput(
  stdout: string,
  root: string,
  defaults: (root: string) => CapacitorNativePaths
): CapacitorConfigResolution {
  const line = stdout
    .split('\n')
    .map(text => text.trim())
    .reverse()
    .find(text => text.startsWith('{'));
  let printed: {
    app?: { extConfig?: unknown };
    android?: unknown;
    ios?: unknown;
  };
  try {
    printed = JSON.parse(line ?? '');
  } catch {
    return { ok: false, reason: '`cap config --json` printed no JSON' };
  }
  const config = printed.app?.extConfig;
  if (!config || typeof config !== 'object') {
    return {
      ok: false,
      reason: '`cap config --json` printed no app.extConfig',
    };
  }
  return {
    ok: true,
    config: config as Record<string, unknown>,
    native: resolvedNativePaths(
      defaults,
      root,
      printed.android as ResolvedPlatform | undefined,
      printed.ios as ResolvedPlatform | undefined
    ),
  };
}

function resolvedNativePaths(
  defaults: (root: string) => CapacitorNativePaths,
  root: string,
  android: ResolvedPlatform | undefined,
  ios: ResolvedPlatform | undefined
): CapacitorNativePaths {
  const fallback = defaults(root);
  const dir = (
    platform: ResolvedPlatform | undefined,
    field: string
  ): string | undefined => {
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
      ? PathOperations.join(androidMain, ANDROID_MANIFEST)
      : fallback.androidManifest,
    androidAppBuildGradle: androidApp
      ? PathOperations.join(androidApp, BUILD_GRADLE)
      : fallback.androidAppBuildGradle,
    capacitorSettingsGradle: PathOperations.join(
      androidDir,
      'capacitor.settings.gradle'
    ),
    iosDir,
    iosTargetDir,
    infoPlist: PathOperations.join(iosTargetDir, 'Info.plist'),
    xcodeProjectFile: xcodeProj
      ? PathOperations.join(xcodeProj, 'project.pbxproj')
      : fallback.xcodeProjectFile,
  };
}

/** The project's own `@capacitor/cli` entry point, or null when it is not installed. */
function locateCli(root: string, workspaceRoot: string): string | null {
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
  const entry = PathOperations.join(
    PathOperations.getDirectory(manifestPath),
    bin
  );
  return fs.existsSync(entry) ? entry : null;
}

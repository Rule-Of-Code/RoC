/**
 * A Capacitor project for the Capacitor law tests: @capacitor/core declared
 * and installed, a config file, and a stand-in CLI that prints `extConfig` the
 * way `cap config --json` does. Pass `extConfig: null` for a project whose CLI
 * is not installed.
 */
import { execFileSync } from 'child_process';
import { CapacitorProjects } from '../../../src/utils/capacitor/capacitor-project';
import {
  fakeCapacitorCli,
  manifest,
  printedConfig,
  project,
  writeFiles,
} from '../toolkit-fixture';

export function capacitorProject(
  files: Record<string, string> = {},
  extConfig: Record<string, unknown> | null = { appId: 'com.example.app', webDir: 'dist' },
  dependencies: Record<string, string> = {}
): string {
  CapacitorProjects.clearCache();
  const root = project({
    'package.json': manifest({ '@capacitor/core': '8.5.1', ...dependencies }),
    'capacitor.config.ts': 'export default {};',
    'node_modules/@capacitor/core/package.json': JSON.stringify({ name: '@capacitor/core', version: '8.5.1' }),
    ...files,
  });
  if (extConfig) fakeCapacitorCli(root, printedConfig(root, extConfig));
  return root;
}

/** Install a package into the fixture's node_modules. */
export function installPackage(
  root: string,
  name: string,
  files: Record<string, string> = {}
): void {
  writeFiles(root, {
    [`node_modules/${name}/package.json`]: JSON.stringify({ name, version: '1.0.0' }),
    ...Object.fromEntries(
      Object.entries(files).map(([file, content]) => [`node_modules/${name}/${file}`, content])
    ),
  });
}

/** Make the fixture a git repository with the given paths tracked. */
export function track(root: string, ...paths: string[]): void {
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, stdio: 'ignore', windowsHide: true });
  git('init', '-q');
  git('add', ...paths);
}

/** Every shell fixture excludes android/ and ios/ from the scan, as projects rightly do. */
export const IGNORING_SHELLS = {
  ignores: { global: ['android/**', 'ios/**'], tests: [], build: [], design: [] },
};
export const MANIFEST = 'android/app/src/main/AndroidManifest.xml';
export const androidManifest = (...lines: string[]): string =>
  `<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n${lines.join('\n')}\n<application></application>\n</manifest>`;

/**
 * What a Capacitor project must keep out of git, on top of the stack's usual
 * entries: the two Firebase configuration files that carry API keys, and the
 * copies and build output `cap sync`, Gradle and CocoaPods write into the
 * native shells.
 *
 * `npx cap add` writes android/.gitignore and ios/.gitignore covering the
 * generated paths — and lists google-services.json only as a comment. So the
 * question "is this path ignored?" is asked of git itself (check-ignore reads
 * every .gitignore on the way down), and the textual fallback, outside a git
 * repository, reads the root file and the two nested ones.
 *
 * A committed credential is found through the index (git ls-files), not by a
 * file existing on disk: an ignored, untracked copy is exactly what a correct
 * project has.
 */

import { execFileSync } from 'child_process';
import { lawRequirementsMet } from '../../utils/law-requirements';
import { REQUIRES_CAPACITOR } from '../../utils/capacitor/capacitor-law-support';
import { CapacitorProjects } from '../../utils/capacitor/capacitor-project';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';

interface Requirement {
  path: string;
  why: string;
  credential: boolean;
  /** A directory: `build/` matches only directories, so git is asked about a file inside it. */
  dir?: boolean;
}

const CREDENTIALS = ['google-services.json', 'GoogleService-Info.plist'];

export class CapacitorIgnoreRequirements {
  /** Violations for a Capacitor project; [] for any other project. */
  static check(projectRoot: string): string[] {
    if (!lawRequirementsMet(REQUIRES_CAPACITOR, projectRoot)) return [];
    const required = this.required(projectRoot);
    const notIgnored = this.notIgnored(projectRoot, required);
    return [
      ...notIgnored.map(req =>
        req.credential
          ? `Missing .gitignore entry: ${PathOperations.getFilename(req.path)} (${req.why}; ${req.path} carries API keys)`
          : `Not ignored: ${req.path} (${req.why})`
      ),
      ...this.trackedCredentials(projectRoot).map(
        file => `Tracked credential file: ${file} — remove it from the index (git rm --cached) and rotate the keys it holds`
      ),
    ];
  }

  /** The paths that must be ignored, for every platform directory that exists. */
  private static required(projectRoot: string): Requirement[] {
    const required: Requirement[] = [];
    const rel = (file: string) => PathOperations.getRelative(projectRoot, file).replace(/\\/g, '/');
    for (const project of CapacitorProjects.find(projectRoot)) {
      const native = CapacitorProjects.defaultNativePaths(project.root);
      if (FileUtils.isDirectory(native.androidDir)) {
        const android = rel(native.androidDir);
        const assets = `${android}/app/src/main/assets`;
        required.push(
          { path: `${android}/app/google-services.json`, why: 'Firebase configuration', credential: true },
          { path: `${assets}/public`, why: 'the web build cap sync copies', credential: false, dir: true },
          { path: `${assets}/capacitor.config.json`, why: 'the resolved config cap sync copies', credential: false },
          { path: `${assets}/capacitor.plugins.json`, why: 'the plugin list cap sync writes', credential: false },
          { path: `${android}/.gradle`, why: 'Gradle cache', credential: false, dir: true },
          { path: `${android}/build`, why: 'Gradle build output', credential: false, dir: true },
          { path: `${android}/app/build`, why: 'Gradle build output', credential: false, dir: true },
          { path: `${android}/local.properties`, why: 'machine-local SDK paths', credential: false }
        );
      }
      if (FileUtils.isDirectory(native.iosDir)) {
        const target = rel(native.iosTargetDir);
        const app = rel(PathOperations.join(native.iosDir, 'App'));
        required.push(
          { path: `${target}/GoogleService-Info.plist`, why: 'Firebase configuration', credential: true },
          { path: `${target}/public`, why: 'the web build cap sync copies', credential: false, dir: true },
          { path: `${target}/capacitor.config.json`, why: 'the resolved config cap sync copies', credential: false },
          { path: `${app}/Pods`, why: 'CocoaPods output', credential: false, dir: true },
          { path: `${app}/build`, why: 'Xcode build output', credential: false, dir: true }
        );
      }
    }
    return required;
  }

  private static notIgnored(projectRoot: string, required: Requirement[]): Requirement[] {
    if (required.length === 0) return [];
    const probe = (r: Requirement) => (r.dir ? `${r.path}/.roc-probe` : r.path);
    const ignored = this.ignoredByGit(projectRoot, required.map(probe));
    if (ignored) return required.filter(r => !ignored.has(probe(r)));
    return required.filter(r => !this.coveredByText(projectRoot, r.path));
  }

  /** The subset git ignores, or null when git cannot answer (not a repository). */
  private static ignoredByGit(projectRoot: string, paths: string[]): Set<string> | null {
    try {
      const out = execFileSync('git', ['check-ignore', '--no-index', '--stdin'], {
        cwd: projectRoot,
        input: paths.join('\n'),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
        windowsHide: true,
      });
      return new Set(out.split('\n').map(line => line.trim()).filter(Boolean));
    } catch (error) {
      // Exit 1 = "none of them is ignored", a real answer; anything else is not.
      return (error as { status?: number }).status === 1 ? new Set() : null;
    }
  }

  /** Outside git: a line of the root, android/ or ios/ ignore file covering the path. */
  private static coveredByText(projectRoot: string, path: string): boolean {
    const files: Array<[string, string]> = [['', '.gitignore']];
    const top = path.split('/')[0] ?? '';
    files.push([`${top}/`, `${top}/.gitignore`]);
    return files.some(([prefix, file]) => {
      const content = FileUtils.readFileContentSync(PathOperations.join(projectRoot, file)) ?? '';
      if (!path.startsWith(prefix)) return false;
      const local = path.slice(prefix.length);
      return content
        .split('\n')
        .map(line => line.trim().replace(/^\/|\/$/g, '').replace(/^\*\*\//, ''))
        .filter(line => line && !line.startsWith('#') && !line.startsWith('!'))
        .some(line => local === line || local.startsWith(`${line}/`) || local.split('/').includes(line));
    });
  }

  /** Credential files git tracks, anywhere in the tree. */
  private static trackedCredentials(projectRoot: string): string[] {
    try {
      const out = execFileSync(
        'git',
        ['ls-files', '--', ...CREDENTIALS.map(name => `:(glob)**/${name}`)],
        { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }
      );
      return out.split('\n').map(line => line.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
}

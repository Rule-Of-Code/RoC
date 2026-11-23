/**
 * Reading a Python project: its manifest and declared version, its gate
 * configuration and its first-party sources. PythonSatisfaction extends this
 * with the concerns it answers; the reading is kept apart so each file holds
 * one job (#559). Moved unchanged.
 */

import { glob } from 'glob';
import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';
import { ProjectTypeDetector } from './config/project-type-detector';

/** Never scan dependencies, virtualenvs or build output. */
export const NODE_MODULES = '**/node_modules/**';
export const VENV = '**/.venv/**';
const BUILD_OUT = '**/build/**';
const DIST_OUT = '**/dist/**';

/** The Node manifest — read as gate config, and probed as a substrate marker. */
export const PACKAGE_JSON = 'package.json';

/** The PEP 621 manifest — version source, and a Python substrate marker. */
const PYPROJECT_TOML = 'pyproject.toml';

/** Files that describe how the project is built/tested/gated. */
const GATE_FILES = [
  PYPROJECT_TOML,
  'setup.cfg',
  'pytest.ini',
  'tox.ini',
  'noxfile.py',
  '.pre-commit-config.yaml',
  'Makefile',
  '.coveragerc',
  PACKAGE_JSON,
];

export class PythonProject {
  /** Is this a Python project at all? */
  static isPython(projectRoot: string): boolean {
    return ProjectTypeDetector.isPythonProject(projectRoot);
  }

  /** The manifests that describe a Python project, in precedence order. */
  private static readonly MANIFESTS = [PYPROJECT_TOML, 'setup.py', 'setup.cfg'];

  /** The Python project's declared manifest file, or null when it has none. */
  static projectManifest(projectRoot: string): string | null {
    return (
      this.MANIFESTS.find(m =>
        FileUtils.exists(PathOperations.join(projectRoot, m))
      ) ?? null
    );
  }

  /**
   * The version a Python project declares — PEP 621 `[project] version` or
   * Poetry's `[tool.poetry] version`.
   *
   * Node has package.json; Python's equivalent lives in a TOML table, and until
   * v7.13.0 nothing read it. Laws that resolve "the project's version" only via
   * package.json therefore failed EVERY Python project unconditionally, with no
   * way to pass but to add a Node manifest — a law satisfiable only by a lie.
   *
   * Returns null when no version is declared (a real finding), which the caller
   * must not confuse with "not a Python project".
   */
  static projectVersion(projectRoot: string): string | null {
    const content = this.read(projectRoot, PYPROJECT_TOML);
    if (!content) {
      return null;
    }
    for (const table of ['project', 'tool.poetry']) {
      const section = this.tomlTable(content, table);
      const match = /^\s*version\s*=\s*["']([^"']+)["']/m.exec(section);
      if (match?.[1]) {
        return match[1];
      }
    }
    return null;
  }

  /** The body of a single TOML table, so a key cannot be read across tables. */
  private static tomlTable(content: string, header: string): string {
    const out: string[] = [];
    let inSection = false;
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[')) {
        inSection = trimmed === `[${header}]`;
        continue;
      }
      if (inSection) {
        out.push(line);
      }
    }
    return out.join('\n');
  }

  /** Read a project-root file, or '' when absent. */
  protected static read(projectRoot: string, rel: string): string {
    const p = PathOperations.join(projectRoot, rel);
    return FileUtils.exists(p) ? (FileUtils.readFileContentSync(p) ?? '') : '';
  }

  /** Concatenated gate/config files — where tooling declares itself. */
  static gateConfig(projectRoot: string): string {
    return GATE_FILES.map(rel => this.read(projectRoot, rel)).join('\n');
  }

  /** First-party Python sources (excludes venvs, caches, build output). */
  static pythonFiles(projectRoot: string): string[] {
    return glob.sync('**/*.py', {
      cwd: projectRoot,
      absolute: true,
      ignore: [
        NODE_MODULES,
        VENV,
        '**/venv/**',
        '**/__pycache__/**',
        BUILD_OUT,
        DIST_OUT,
        '**/site-packages/**',
      ],
    });
  }

  /** Does any Python source match this pattern? */
  static anyPythonSource(projectRoot: string, pattern: RegExp): boolean {
    return this.pythonFiles(projectRoot).some(file => {
      const content = FileUtils.readFileContentSync(file);
      return !!content && pattern.test(content);
    });
  }

  /** Project has TypeScript/JavaScript sources at all (substrate check). */
  static hasJsTsSources(projectRoot: string): boolean {
    return (
      glob.sync('**/*.{ts,tsx,js,jsx}', {
        cwd: projectRoot,
        ignore: [
          NODE_MODULES,
          DIST_OUT,
          BUILD_OUT,
          '**/coverage/**',
          '**/*.d.ts',
        ],
      }).length > 0
    );
  }
}

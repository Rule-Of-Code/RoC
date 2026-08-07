/**
 * Python Law Base Class
 * Base functionality for the Python domain — a FastAPI + Clean Architecture/CQRS
 * stack (the backend equivalent of Angular + NgRx). Mirrors AngularLawBase:
 * project gating, source discovery, and comment/string stripping so regex
 * detection does not match inside comments or string literals.
 *
 * RoC has no Python runtime, so detection is regex/string-based on .py files and
 * project config (pyproject.toml / requirements.txt) — heuristic and low-FP,
 * exactly like the Angular laws on .ts/.html.
 */

import { glob } from 'glob';
import { minimatch } from 'minimatch';
import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

export class PythonLawBase extends LawBase {
  private static readonly DEP_FILES = [
    'pyproject.toml',
    'requirements.txt',
    'requirements/base.txt',
    'Pipfile',
    'setup.py',
    'setup.cfg',
  ];

  /** Is this a Python project at all (pyproject/setup/requirements/lockfile)? */
  protected static hasPythonProject(projectRoot: string): boolean {
    return ProjectTypeDetector.isPythonProject(projectRoot);
  }

  /**
   * Does the project use FastAPI? FastAPI/Clean-Architecture laws gate on this,
   * the way Angular laws gate on isAngularProject — so a non-FastAPI Python
   * project is not flagged for FastAPI conventions.
   */
  protected static hasFastApi(projectRoot: string): boolean {
    return this.dependencyFilesContain(projectRoot, /(^|[^\w-])fastapi([^\w-]|$)/im);
  }

  /** Read a file relative to the project root, or null if it does not exist. */
  protected static readProjectFile(
    projectRoot: string,
    rel: string
  ): string | null {
    const p = PathOperations.join(projectRoot, rel);
    if (!FileUtils.exists(p)) return null;
    return FileUtils.readFileContentSync(p);
  }

  /** Whether a file exists at projectRoot/rel. */
  protected static projectFileExists(projectRoot: string, rel: string): boolean {
    return FileUtils.exists(PathOperations.join(projectRoot, rel));
  }

  /** Whether any dependency manifest references a pattern (e.g. a library). */
  protected static dependencyFilesContain(
    projectRoot: string,
    pattern: RegExp
  ): boolean {
    return this.DEP_FILES.some(rel => {
      const p = PathOperations.join(projectRoot, rel);
      if (!FileUtils.exists(p)) return false;
      const content = FileUtils.readFileContentSync(p);
      return !!content && pattern.test(content);
    });
  }

  /**
   * All first-party Python source files (excludes venvs, caches, build dirs).
   * Honours `config.ignores.global` (e.g. a frozen `legacy/` tree) AND a
   * non-empty `config.includes.global` whitelist — the same contract as the
   * JS/TS checkers, so the two law families never disagree on scope (QA-2).
   */
  static getPythonFiles(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): string[] {
    const globalIgnores = config?.ignores?.global ?? [];
    const found = glob.sync('**/*.py', {
      cwd: projectRoot,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/.venv/**',
        '**/venv/**',
        '**/env/**',
        '**/__pycache__/**',
        '**/.tox/**',
        '**/.nox/**',
        '**/build/**',
        '**/dist/**',
        '**/site-packages/**',
        '**/.eggs/**',
        '**/*.egg-info/**',
        '**/migrations/**',
        ...globalIgnores,
      ],
    });

    const includes = config?.includes?.global ?? [];
    if (includes.length === 0) return found;
    // Include patterns are project-root-relative — match against the
    // relative path, keep returning absolute ones.
    return found.filter(
      file =>
        FileUtils.applyInclusionFilters(
          [PathOperations.getRelative(projectRoot, file)],
          includes
        ).length > 0
    );
  }

  /** Is this a pytest-style test file (test_*.py / *_test.py / under tests/)? */
  protected static isTestFile(filePath: string): boolean {
    const p = filePath.replace(/\\/g, '/').toLowerCase();
    return (
      /(^|\/)tests?\//.test(p) ||
      /(^|\/)test_[^/]*\.py$/.test(p) ||
      /_test\.py$/.test(p) ||
      /(^|\/)conftest\.py$/.test(p)
    );
  }

  /**
   * Whether pytest is configured for automatic async handling
   * (asyncio_mode = auto / anyio_mode = auto) — in which case async tests do not
   * need a per-test marker. Checked across the usual config files.
   */
  protected static pytestAutoAsyncio(projectRoot: string): boolean {
    const configs = ['pyproject.toml', 'pytest.ini', 'setup.cfg', 'tox.ini'];
    const pattern = /(asyncio_mode|anyio_mode)\s*[:=]\s*["']?auto/i;
    return configs.some(rel => {
      const p = PathOperations.join(projectRoot, rel);
      if (!FileUtils.exists(p)) return false;
      const content = FileUtils.readFileContentSync(p);
      return !!content && pattern.test(content);
    });
  }

  /** A FastAPI router/endpoint module heuristic (path or content based). */
  protected static isApiLayerFile(filePath: string): boolean {
    const p = filePath.replace(/\\/g, '/').toLowerCase();
    return (
      /\/(api|routers?|endpoints?|interface|presentation|web)\//.test(p) ||
      /(_router|_routes|_api|_endpoints?)\.py$/.test(p) ||
      /\/(router|routes|api|endpoints?)\.py$/.test(p)
    );
  }

  /**
   * Canonical Clean-Architecture layer of a file path (or null if it is not in a
   * recognised layer). Directory aliases are folded onto four canonical layers.
   */
  protected static layerOfPath(
    filePath: string
  ): 'domain' | 'application' | 'infrastructure' | 'interface' | null {
    const p = filePath.replace(/\\/g, '/').toLowerCase();
    if (/\/domain\//.test(p)) return 'domain';
    if (/\/(application|use_cases|usecases)\//.test(p)) return 'application';
    if (/\/(infrastructure|infra|adapters|persistence)\//.test(p))
      return 'infrastructure';
    if (/\/(interface|presentation|api|web|routers?|endpoints?)\//.test(p))
      return 'interface';
    return null;
  }

  /** Canonical layer referenced by an `import`/`from` statement, or null. */
  protected static layerOfImport(
    importLine: string
  ): 'domain' | 'application' | 'infrastructure' | 'interface' | null {
    if (!/^\s*(?:from|import)\s/.test(importLine)) return null;
    if (/\bdomain\b/.test(importLine)) return 'domain';
    if (/\b(application|use_cases|usecases)\b/.test(importLine))
      return 'application';
    if (/\b(infrastructure|infra|adapters|persistence)\b/.test(importLine))
      return 'infrastructure';
    if (/\b(interface|presentation|endpoints?)\b/.test(importLine))
      return 'interface';
    return null;
  }

  /** Split source into lines, tolerating CRLF / lone-CR (Windows) endings. */
  protected static splitLines(content: string): string[] {
    return content.split(/\r\n|\r|\n/);
  }

  /**
   * Whether a relative path matches a config allowlist entry (glob or
   * substring, forward-slash normalized) — the shared shape of the
   * thresholds.python.*Boundary / allow*In knobs.
   */
  protected static pathMatchesAllowlist(
    rel: string,
    allowlist: string[]
  ): boolean {
    if (allowlist.length === 0) return false;
    const norm = rel.replace(/\\/g, '/');
    return allowlist.some(p => minimatch(norm, p) || norm.includes(p));
  }

  /**
   * Strip comments and string literals so detection regexes do not match inside
   * them. CRLF/CR are normalised to LF first so end-anchored patterns (e.g.
   * `#.*$`) work on Windows-checked-out files. Order: triple-quoted strings
   * (docstrings) → single/double strings → `#` line comments. Replacement
   * preserves newlines for line-number stability.
   */
  static stripPython(content: string): string {
    return content
      .replace(/\r\n|\r/g, '\n')
      .replace(/'''[\s\S]*?'''|"""[\s\S]*?"""/g, m => m.replace(/[^\n]/g, ' '))
      .replace(/(['"])(?:\\.|(?!\1).)*\1/g, m => m.replace(/[^\n]/g, ' '))
      .replace(/#[^\n]*/g, '');
  }

  /**
   * Given the index of an opening "(", return the text inside the matching close
   * paren (handles nesting), or null if unbalanced. Useful for reading a call's
   * or a def signature's arguments across lines.
   */
  protected static readBalancedParens(s: string, open: number): string | null {
    let depth = 0;
    for (let i = open; i < s.length; i++) {
      const ch = s[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) return s.slice(open + 1, i);
      }
    }
    return null;
  }

  /**
   * Extract top-level-ish class blocks by indentation. Returns the class name,
   * the 0-based line index of the `class` header, and the body text (lines more
   * indented than the header). Operates on already-stripped content.
   */
  protected static pythonClassBlocks(
    content: string
  ): { name: string; line: number; body: string }[] {
    const lines = content.split('\n');
    const blocks: { name: string; line: number; body: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const m = (lines[i] ?? '').match(/^(\s*)class\s+(\w+)/);
      if (!m) continue;
      const indent = (m[1] ?? '').length;
      const bodyLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const line = lines[j] ?? '';
        if (line.trim() === '') {
          bodyLines.push(line);
          continue;
        }
        const lineIndent = line.length - line.trimStart().length;
        if (lineIndent <= indent) break;
        bodyLines.push(line);
      }
      blocks.push({ name: m[2] ?? '', line: i + 1, body: bodyLines.join('\n') });
    }
    return blocks;
  }

  /**
   * Early return for a "requires Python project" (or any gate) check, mirroring
   * AngularLawBase.createAngularRequiredResult.
   */
  protected static createPythonRequiredResult(
    lawName: string,
    projectRoot: string,
    gate: (projectRoot: string) => boolean,
    context: LawCheckContext
  ): LawResult | null {
    if (!gate(projectRoot)) {
      return this.createResult([], lawName, 'PYTHON_LAW', [], context);
    }
    return null;
  }
}

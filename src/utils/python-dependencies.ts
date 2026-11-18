/**
 * The Python packages a project declares — what `requires.anyPythonDependency`
 * reads.
 *
 * `anyDependency` reads package.json manifests only, so a law about a Python
 * database client, an ORM or an OpenTelemetry SDK could not be gated on the
 * package it is about: it ran on every Python project and inspected nothing
 * where the package is absent. This module reads the manifests a Python
 * project keeps its dependencies in:
 *
 * - `requirements*.txt` and `requirements/*.txt` (one requirement per line;
 *   `-r`/`-c` includes and options are skipped, `#egg=` names are read);
 * - `pyproject.toml`: PEP 621 `[project] dependencies` and
 *   `[project.optional-dependencies]`, PEP 735 `[dependency-groups]`, Poetry's
 *   `[tool.poetry.dependencies]` and `[tool.poetry.group.<g>.dependencies]`
 *   tables, `[tool.uv] dev-dependencies` and `[tool.pdm.dev-dependencies]`;
 * - `Pipfile` `[packages]` and `[dev-packages]`;
 * - `setup.cfg` `install_requires` and `setup.py` `install_requires=[...]`.
 *
 * A Python service often lives in a subdirectory of a repository whose root
 * holds something else (a client app, infrastructure), so manifests are found
 * up to three directories deep, outside virtual environments and installed or
 * built code. Names are normalised per PEP 503 (lowercase; runs of `-`, `_`
 * and `.` become `-`), so `Google_Cloud.Firestore` and `google-cloud-firestore`
 * are the same package. An unreadable manifest declares nothing.
 */

import * as fs from 'fs';
import { glob } from 'glob';

/** PEP 503 normalised form of a distribution name. */
export function normalizePythonName(name: string): string {
  return name.trim().toLowerCase().replace(/[-_.]+/g, '-');
}

const MANIFEST_GLOB =
  '{,*/,*/*/,*/*/*/}{requirements*.txt,requirements/*.txt,pyproject.toml,Pipfile,setup.cfg,setup.py}';

const IGNORE = [
  '**/node_modules/**',
  '**/.venv/**',
  '**/venv/**',
  '**/env/**',
  '**/.tox/**',
  '**/.nox/**',
  '**/site-packages/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
];

/** The leading distribution name of a PEP 508 requirement string, or null. */
export function requirementName(spec: string): string | null {
  const egg = spec.match(/#egg=([A-Za-z0-9][A-Za-z0-9._-]*)/);
  if (egg?.[1]) return normalizePythonName(egg[1]);
  const m = spec.trim().match(/^([A-Za-z0-9][A-Za-z0-9._-]*)/);
  return m?.[1] ? normalizePythonName(m[1]) : null;
}

/** The package one requirements.txt line names, or null (comment, option, include). */
function requirementsLineName(raw: string): string | null {
  const line = raw.replace(/(^|\s)#(?!egg=).*$/, '').trim();
  if (!line) return null;
  const hasEgg = /#egg=/.test(raw);
  // -r/-c include another file (found by the glob on its own); -e and URL or
  // path requirements name a package only through #egg=; other options none.
  if (line.startsWith('-') || /^[a-z]+:\/\//i.test(line) || /^[./]/.test(line)) {
    return hasEgg ? requirementName(raw) : null;
  }
  return requirementName(line);
}

function readRequirementsTxt(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map(requirementsLineName)
    .filter((n): n is string => n !== null);
}

/** Index just past the end of the token at `i` (a comment or a quoted string), with the string's text. */
function skipToken(text: string, i: number): { next: number; str?: string } {
  const ch = text[i];
  if (ch === '#') {
    const nl = text.indexOf('\n', i);
    return { next: nl < 0 ? text.length : nl + 1 };
  }
  const end = text.indexOf(ch as string, i + 1);
  if (end < 0) return { next: text.length };
  return { next: end + 1, str: text.slice(i + 1, end) };
}

/** Quoted strings inside the TOML array that opens at `start` (the `[`). */
function quotedStringsInArray(text: string, start: number): string[] {
  const out: string[] = [];
  let depth = 0;
  let i = start;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '#' || ch === '"' || ch === "'") {
      const { next, str } = skipToken(text, i);
      if (str !== undefined) out.push(str);
      i = next;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) break;
    i++;
  }
  return out;
}

/** `[header]` → body text, for each table of a TOML/INI-like file. */
function tables(content: string): Array<{ header: string; body: string }> {
  const out: Array<{ header: string; body: string }> = [];
  const re = /^\s*\[([^\]\n]+)\]\s*$/gm;
  const heads: Array<{ header: string; index: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    heads.push({ header: (m[1] ?? '').trim(), index: m.index, end: re.lastIndex });
  }
  heads.forEach((h, i) => {
    const next = heads[i + 1];
    out.push({ header: h.header, body: content.slice(h.end, next ? next.index : undefined) });
  });
  return out;
}

/** Names from every `key = [ "spec", ... ]` array in a table body (all keys, or the listed ones). */
function arrayRequirements(body: string, keys?: readonly string[]): string[] {
  const names: string[] = [];
  const re = /^\s*["']?([A-Za-z0-9_.-]+)["']?\s*=\s*\[/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (keys && !keys.includes(m[1] ?? '')) continue;
    const open = body.indexOf('[', m.index + m[0].length - 1);
    for (const spec of quotedStringsInArray(body, open)) {
      const name = requirementName(spec);
      if (name) names.push(name);
    }
  }
  return names;
}

/** Names that are the KEYS of a table (`fastapi = "^0.110"`, `x = { version = … }`). */
function tableKeys(body: string): string[] {
  const names: string[] = [];
  const re = /^\s*["']?([A-Za-z0-9][A-Za-z0-9_.-]*)["']?\s*=/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const key = normalizePythonName(m[1] ?? '');
    if (key !== 'python') names.push(key);
  }
  return names;
}

function readPyproject(content: string): string[] {
  const names: string[] = [];
  for (const { header, body } of tables(content)) {
    if (header === 'project') names.push(...arrayRequirements(body, ['dependencies']));
    else if (header === 'project.optional-dependencies' || header === 'dependency-groups') {
      names.push(...arrayRequirements(body));
    } else if (header === 'tool.uv') {
      names.push(...arrayRequirements(body, ['dev-dependencies']));
    } else if (header === 'tool.pdm.dev-dependencies') {
      names.push(...arrayRequirements(body));
    } else if (
      header === 'tool.poetry.dependencies' ||
      header === 'tool.poetry.dev-dependencies' ||
      /^tool\.poetry\.group\.[^.]+\.dependencies$/.test(header)
    ) {
      names.push(...tableKeys(body));
    }
  }
  return names;
}

function readPipfile(content: string): string[] {
  return tables(content)
    .filter(t => t.header === 'packages' || t.header === 'dev-packages')
    .flatMap(t => tableKeys(t.body));
}

function readSetupCfg(content: string): string[] {
  const m = content.match(/^\s*install_requires\s*=([^\n]*(?:\n[ \t]+[^\n]*)*)/m);
  if (!m?.[1]) return [];
  return m[1]
    .split(/[\n;]/)
    .map(s => requirementName(s.replace(/#.*$/, '')))
    .filter((n): n is string => n !== null);
}

function readSetupPy(content: string): string[] {
  const at = content.search(/install_requires\s*=\s*\[/);
  if (at < 0) return [];
  const open = content.indexOf('[', at);
  return quotedStringsInArray(content, open)
    .map(requirementName)
    .filter((n): n is string => n !== null);
}

function namesIn(file: string, content: string): string[] {
  const base = file.replace(/\\/g, '/').split('/').pop() ?? '';
  if (base === 'pyproject.toml') return readPyproject(content);
  if (base === 'Pipfile') return readPipfile(content);
  if (base === 'setup.cfg') return readSetupCfg(content);
  if (base === 'setup.py') return readSetupPy(content);
  return readRequirementsTxt(content);
}

/** Every Python distribution any manifest in the project declares (PEP 503 names). */
export function declaredPythonDependencies(projectRoot: string): Set<string> {
  const names = new Set<string>();
  const files = glob.sync(MANIFEST_GLOB, {
    cwd: projectRoot,
    absolute: true,
    nodir: true,
    ignore: IGNORE,
  });
  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue; // an unreadable manifest declares nothing
    }
    for (const name of namesIn(file, content)) names.add(name);
  }
  return names;
}

/**
 * The version a project declares, and the manifest it was read from.
 *
 * A Python project releases from pyproject.toml (PEP 621 `[project]` or
 * Poetry) or setup.cfg (`[metadata]`). A package.json beside it often exists
 * only for tooling — hooks, lint scripts — and its version is not the
 * project's (#546). So a Python manifest that declares a version is read
 * first; package.json is the declared manifest of every other project, and of
 * a Python one whose manifests declare none.
 */

import { FileSystemOperations } from '../../utils/file-system-operations';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonSatisfaction } from '../../utils/python-satisfaction';

export type VersionManifest = 'package.json' | 'pyproject.toml' | 'setup.cfg';

const PACKAGE_JSON = 'package.json';

export interface DeclaredVersion {
  manifest: VersionManifest;
  /** null: the manifest exists but declares no version. */
  version: string | null;
  /** Set when the manifest could not be read or parsed. */
  unreadable?: true;
}

/** `version = …` in the `[metadata]` section; `attr:` / `file:` are not a literal version. */
function setupCfgVersion(projectRoot: string): string | null {
  const file = PathOperations.join(projectRoot, 'setup.cfg');
  if (!FileUtils.exists(file)) return null;
  const content = FileUtils.readFileContentSync(file) ?? '';
  let inMetadata = false;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[')) {
      inMetadata = trimmed === '[metadata]';
      continue;
    }
    if (!inMetadata) continue;
    const match = /^version\s*[=:]\s*(\S.*)$/.exec(trimmed);
    if (match?.[1]) {
      const value = match[1].trim();
      return /^(?:attr|file):/.test(value) ? null : value;
    }
  }
  return null;
}

/** A Python manifest's literal version, or null when none declares one. */
function pythonVersion(projectRoot: string): DeclaredVersion | null {
  if (!PythonSatisfaction.isPython(projectRoot)) return null;
  const pyproject = PythonSatisfaction.projectVersion(projectRoot);
  if (pyproject !== null) {
    return { manifest: 'pyproject.toml', version: pyproject };
  }
  const setupCfg = setupCfgVersion(projectRoot);
  if (setupCfg !== null) return { manifest: 'setup.cfg', version: setupCfg };
  return null;
}

function packageJsonVersion(projectRoot: string): DeclaredVersion | null {
  const file = PathOperations.join(projectRoot, PACKAGE_JSON);
  if (!FileUtils.exists(file)) return null;
  try {
    const json =
      FileSystemOperations.readJsonFile<Record<string, unknown>>(file);
    return {
      manifest: PACKAGE_JSON,
      version: json.version ? String(json.version as string) : null,
    };
  } catch {
    return { manifest: PACKAGE_JSON, version: null, unreadable: true };
  }
}

/**
 * The declared version, or null when the project has no manifest this law
 * reads. A Python project with no literal version in its manifests and no
 * package.json is reported by the caller as such.
 */
export function declaredVersion(projectRoot: string): DeclaredVersion | null {
  return pythonVersion(projectRoot) ?? packageJsonVersion(projectRoot);
}

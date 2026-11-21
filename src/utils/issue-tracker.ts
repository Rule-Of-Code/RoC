/**
 * Does the project declare where it tracks its open work?
 *
 * Read by Strategic Document Updates: a CHANGELOG (where the project has
 * been) and an issue tracker (where it is going) are the status record a
 * PROJECT_STATUS / ROADMAP file would restate.
 */

import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';

/** Issue templates for GitHub or GitLab. */
const ISSUE_TEMPLATES = [
  '.github/ISSUE_TEMPLATE',
  '.github/ISSUE_TEMPLATE.md',
  '.github/issue_template.md',
  '.gitlab/issue_templates',
];

/** An Issues / Bug Tracker URL in pyproject.toml ([project.urls]). */
const PYPROJECT_ISSUES =
  /^\s*["']?(?:issues|bug[ _-]?tracker|bug[ _-]?reports?)["']?\s*=\s*["']https?:/im;

function read(projectRoot: string, rel: string): string {
  const file = PathOperations.join(projectRoot, rel);
  if (!FileUtils.exists(file)) return '';
  try {
    return FileUtils.readFile(file, { encoding: 'utf8' });
  } catch {
    return '';
  }
}

/** A `bugs` URL (string or { url }) in package.json. */
function packageJsonBugs(projectRoot: string): boolean {
  try {
    const pkg = JSON.parse(read(projectRoot, 'package.json') || '{}') as {
      bugs?: string | { url?: string };
    };
    return Boolean(typeof pkg.bugs === 'string' ? pkg.bugs : pkg.bugs?.url);
  } catch {
    // An unreadable package.json declares no tracker.
    return false;
  }
}

/**
 * Where the project tracks its open work: a `bugs` URL in package.json, an
 * Issues / Bug Tracker URL in pyproject.toml, or issue templates for
 * GitHub (.github/ISSUE_TEMPLATE) or GitLab (.gitlab/issue_templates).
 */
export function hasIssueTracker(projectRoot: string): boolean {
  return (
    ISSUE_TEMPLATES.some(rel =>
      FileUtils.exists(PathOperations.join(projectRoot, rel))
    ) ||
    packageJsonBugs(projectRoot) ||
    PYPROJECT_ISSUES.test(read(projectRoot, 'pyproject.toml'))
  );
}

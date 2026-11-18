/**
 * Code that runs once, not per request.
 *
 * The request-path laws (Independent Awaits Run Concurrently, Document Read
 * Once Per Request, Count With An Aggregation, the N+1 check of Database Query
 * Optimization) judge what a user's request waits for. A backfill, a
 * migration, a maintenance job or a CLI entry point is started by hand, by a
 * deploy step or by a scheduler; its awaits are often ordered on purpose, and
 * a sequential round trip there is at most a throughput note, not latency
 * every user pays (#384).
 *
 * Recognised by location only, at any depth: the conventional directories
 * below and Django management commands. Code a request handler imports from
 * such a directory is left out with it; nothing here follows imports.
 *
 * One list, read two ways: as globs by an `anyFileContaining` gate (its
 * `exclude`), and as a path test by the source discovery the laws without
 * such a gate use, so a law and its gate never read different sets.
 */

/** Directory names whose contents run once: scripts, migrations, seeds, CLI entry points. */
export const ONE_OFF_SCRIPT_DIRS: readonly string[] = [
  'scripts',
  'migrations',
  'alembic',
  'bin',
  'seeds',
  'seeders',
];

/** Django management commands: `<app>/management/commands/<name>.py`. */
const MANAGEMENT_COMMANDS = 'management/commands';

/** The same locations as globs, for an `anyFileContaining` entry's `exclude`. */
export const ONE_OFF_SCRIPT_GLOBS: readonly string[] = [
  ...ONE_OFF_SCRIPT_DIRS.map(dir => `**/${dir}/**`),
  `**/${MANAGEMENT_COMMANDS}/**`,
];

const ONE_OFF_SCRIPT_PATH = new RegExp(
  `(?:^|/)(?:${ONE_OFF_SCRIPT_DIRS.join('|')}|${MANAGEMENT_COMMANDS})/`
);

/** True for a project-relative path (forward slashes) under a one-off location. */
export function isOneOffScript(relativePath: string): boolean {
  return ONE_OFF_SCRIPT_PATH.test(relativePath);
}

/** `scripts/, migrations/, …, management/commands/`: said in messages. */
export const ONE_OFF_SCRIPT_LOCATIONS = [...ONE_OFF_SCRIPT_DIRS, MANAGEMENT_COMMANDS]
  .map(dir => `${dir}/`)
  .join(', ');

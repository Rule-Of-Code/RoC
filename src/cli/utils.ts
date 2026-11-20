import { ModularLawsRegistry } from '../registry/modular-laws-registry';
import { CONSTITUTIONAL_PATHS } from '../utils/constants';
import { FileSystemOperations } from '../utils/file-system-operations';
import { PathOperations } from '../utils/path-operations';

/**
 * Get version from package.json
 */
export function getVersion(): string {
  try {
    const packageJsonPath = PathOperations.join(
      __dirname,
      '..',
      '..',
      'package.json'
    );
    const packageJson = FileSystemOperations.readJsonFile<{ version?: string }>(
      packageJsonPath
    );
    return packageJson.version ?? '2.4.0';
  } catch {
    return '2.4.0'; // Fallback version
  }
}

/**
 * Get the npm name this RoC build is published under (for report provenance).
 * RoC ships under more than one name (unscoped `ruleofcode`, scoped
 * `@ruleofcode/core`); reading it from package.json means the report always
 * names the package the consumer actually installed.
 */
export function getToolName(): string {
  try {
    const packageJsonPath = PathOperations.join(
      __dirname,
      '..',
      '..',
      'package.json'
    );
    const packageJson = FileSystemOperations.readJsonFile<{ name?: string }>(
      packageJsonPath
    );
    return packageJson.name ?? 'ruleofcode';
  } catch {
    return 'ruleofcode'; // Fallback name
  }
}

/**
 * Get law counts
 */
export const TOTAL_LAWS_COUNT = ModularLawsRegistry.getAll().length;
export const PARETO_LAWS_COUNT = ModularLawsRegistry.getParetoCore().length;

/**
 * Check if running in RoC self-exclusion path
 */
export function isRoCPath(path?: string): boolean {
  const currentPath = path ?? process.cwd();
  return (
    currentPath.includes(CONSTITUTIONAL_PATHS.RULEOFCODE_PACKAGE) ||
    currentPath.includes(CONSTITUTIONAL_PATHS.CONSTITUTIONAL_COMPLIANCE_PATTERN)
  );
}

/** The write failed because the reader closed the pipe. */
const BROKEN_PIPE = 'EPIPE';
/** A later write to a stream that went down with that broken pipe. */
const WRITE_AFTER_BROKEN_PIPE = 'ERR_STREAM_DESTROYED';

/**
 * A reader that closes the pipe early (`audit --json | head`) stops the
 * writing, never the command (#405).
 *
 * Exiting on the broken pipe used a hard-coded 0, so under `pipefail` a failed
 * audit read by `head` passed. Now an EPIPE on stdout or stderr marks that
 * stream closed and is swallowed; the command runs to its end and exits with
 * its own code — a failed audit 1, a passing one 0 — whether or not anyone
 * read it. ERR_STREAM_DESTROYED counts as the same closed pipe only after an
 * EPIPE on that stream. Any other stream error is thrown: a fault, not a pass.
 *
 * No SIGPIPE listener: Node ignores SIGPIPE unless one is installed, so on
 * POSIX the write fails with EPIPE and lands here too. No uncaughtException
 * listener: an EPIPE anywhere else (a child process's stdin, a socket) is a
 * real failure and ends the process the way Node ends it, with exit 1.
 */
export function setupErrorHandlers(): void {
  for (const stream of [process.stdout, process.stderr]) {
    let closed = false;
    stream.on('error', (err: Error & { code?: string }) => {
      if (err.code === BROKEN_PIPE) {
        closed = true;
        return;
      }
      if (closed && err.code === WRITE_AFTER_BROKEN_PIPE) return;
      throw err;
    });
  }
}

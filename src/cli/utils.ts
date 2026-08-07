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

/**
 * Setup process error handlers
 * @param exitFn - Function to call on exit (defaults to process.exit)
 */
export function setupErrorHandlers(
  exitFn: (code: number) => void = code => process.exit(code)
): void {
  // Graceful handling of broken pipes
  process.on('SIGPIPE', () => {
    exitFn(0);
  });

  // Handle EPIPE errors gracefully
  process.on('uncaughtException', (err: Error & { code?: string }) => {
    if (err.code === 'EPIPE') {
      exitFn(0);
    }
    throw err;
  });
}

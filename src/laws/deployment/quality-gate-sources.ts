/**
 * Where Automated Code Quality Gates looks for a gate: a step in a CI config,
 * or a package.json script whose name or command names the tool, and the
 * Jest coverage settings package.json declares.
 */
import type { RuleOfCodeConfig } from '../../config/types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { ciConfigContent } from '../../utils/project-discovery';

/** Does a CI config run a linter? */
export function checkLintingInPipeline(
  projectRoot: string,
  config?: RuleOfCodeConfig
): boolean {
  return checkPatternInPipelineFiles(projectRoot, [/lint/i, /eslint/i], config);
}

/** Does a CI config run a formatter? */
export function checkFormattingInPipeline(
  projectRoot: string,
  config?: RuleOfCodeConfig
): boolean {
  return checkPatternInPipelineFiles(
    projectRoot,
    [/prettier/i, /format/i],
    config
  );
}

/** Does a CI config build or compile? */
export function checkBuildInPipeline(
  projectRoot: string,
  config?: RuleOfCodeConfig
): boolean {
  return checkPatternInPipelineFiles(
    projectRoot,
    [/build/i, /compile/i],
    config
  );
}

/** Does a CI config run an audit or security scan? */
export function checkSecurityInPipeline(
  projectRoot: string,
  config?: RuleOfCodeConfig
): boolean {
  return checkPatternInPipelineFiles(
    projectRoot,
    [/audit/i, /security/i, /vulnerability/i],
    config
  );
}

function checkPatternInPipelineFiles(
  projectRoot: string,
  patterns: RegExp[],
  config?: RuleOfCodeConfig
): boolean {
  // The combined text of every CI config the shared discovery finds. This
  // kept its own list, naming GitHub workflow files by exact filename — so a
  // pipeline whose job lives in any other file, on any other provider, or at
  // a declared path had no build, lint or security step as far as these
  // checks could see.
  const pipelineContent = ciConfigContent(projectRoot, config);
  if (!pipelineContent) {
    return false;
  }

  return patterns.some(pattern => pattern.test(pipelineContent));
}

/** Does a package.json script lint? */
export function checkLintingScripts(projectRoot: string): boolean {
  return checkScriptInPackageJson(projectRoot, [/lint/i]);
}

/** Does a package.json script format? */
export function checkFormattingScripts(projectRoot: string): boolean {
  return checkScriptInPackageJson(projectRoot, [/format/i, /prettier/i]);
}

/** Does a package.json script build or compile? */
export function checkBuildScripts(projectRoot: string): boolean {
  return checkScriptInPackageJson(projectRoot, [/build/i, /compile/i]);
}

/** Does a package.json script audit? */
export function checkAuditScripts(projectRoot: string): boolean {
  return checkScriptInPackageJson(projectRoot, [/audit/i, /security/i]);
}

function checkScriptInPackageJson(
  projectRoot: string,
  patterns: RegExp[]
): boolean {
  const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
  if (FileUtils.exists(packageJsonPath)) {
    try {
      const packageJson =
        FileSystemOperations.readJsonFile<Record<string, unknown>>(
          packageJsonPath
        );
      const scriptObj = packageJson.scripts as
        Record<string, string> | undefined;
      if (scriptObj) {
        // Script NAMES as well as their commands. Only the commands were
        // scanned, so the conventional `"build": "tsc"` was invisible — the
        // name says what the script is for, and the command names the tool.
        // Every toolchain whose binary is not spelled "build" (tsc, ng, vite,
        // esbuild, rollup) was judged to have no build script at all.
        const scripts = [
          ...Object.keys(scriptObj),
          ...Object.values(scriptObj),
        ].join(' ');
        return patterns.some(pattern => pattern.test(scripts));
      }
    } catch (_error) {
      // Skip if can't read package.json
    }
  }
  return false;
}

/** Jest coverage collection and thresholds declared in package.json. */
export function checkPackageJsonForCoverage(projectRoot: string): {
  hasCoverageConfig: boolean;
  hasCoverageThresholds: boolean;
} {
  const packageJsonPath = PathOperations.join(projectRoot, 'package.json');

  if (!FileUtils.exists(packageJsonPath)) {
    return { hasCoverageConfig: false, hasCoverageThresholds: false };
  }

  try {
    const packageJson =
      FileSystemOperations.readJsonFile<Record<string, unknown>>(
        packageJsonPath
      );
    const jest = packageJson.jest as Record<string, unknown> | undefined;
    const hasCoverageConfig = !!jest?.collectCoverage;
    const hasCoverageThresholds = !!jest?.coverageThreshold;

    return { hasCoverageConfig, hasCoverageThresholds };
  } catch (_error) {
    return { hasCoverageConfig: false, hasCoverageThresholds: false };
  }
}

/**
 * Base Abstract Checker Class
 * Foundation for all constitutional law checkers
 */

import chalk from 'chalk';
import type {
  LawCheckContext,
  LawResult,
  RawConstitutionalLaw,
} from '../types/law.types';
import { ProjectTypeDetectorValidation } from '../utils/config/project-type-detector/project-type-detector-validation';
import { FileSystemOperations } from '../utils/file-system-operations';
import { FileUtils } from '../utils/file-utils';
import { PathOperations } from '../utils/path-operations';
import { ResultBuilder } from '../utils/result-builder';
// Force chalk to use colors
chalk.level = 1;

export abstract class BaseChecker {
  protected lawNumber: number;
  protected law: RawConstitutionalLaw;

  constructor(law: RawConstitutionalLaw, lawNumber: number) {
    this.law = law;
    this.lawNumber = lawNumber;
  }

  /**
   * Main check method - must be implemented by subclasses
   */
  abstract check(context: LawCheckContext): Promise<LawResult>;

  /**
   * Helper method to create consistent LawResult
   */
  protected createResult(
    violations: string[],
    title: string,
    type: string,
    suggestions: string[] = [],
    context: LawCheckContext
  ): LawResult {
    return ResultBuilder.create({
      violations,
      title,
      type,
      suggestions,
      config: context.config,
    });
  }

  /**
   * Helper to create error result
   */
  protected createErrorResult(
    error: Error,
    context: LawCheckContext
  ): LawResult {
    return {
      passed: false,
      message: `Check failed - ${error.message}`,
      score: 0,
      fixable: false,
      config: context.config,
    };
  }

  /**
   * Helper to create success result
   */
  protected createSuccessResult(
    message = 'Compliance verified',
    context: LawCheckContext
  ): LawResult {
    return {
      passed: true,
      message,
      score: 100,
      fixable: false,
      config: context.config,
    };
  }

  /**
   * Get files matching pattern
   */
  protected getMatchingFiles(
    context: LawCheckContext,
    pattern: string,
    excludePatterns?: string[]
  ): string[] {
    // Use FileUtils.findFilesSync for consistent config handling
    const allFiles = FileUtils.findFilesSync(
      context.projectRoot,
      context.config,
      pattern
    );

    // Apply additional exclude patterns if provided
    let filtered = allFiles;
    if (excludePatterns && excludePatterns.length > 0) {
      filtered = allFiles.filter(
        file => !excludePatterns.some(exclude => file.includes(exclude))
      );
    }
    return filtered;
  }

  /**
   * Scan files for patterns
   */
  protected scanFilesForPatterns(
    files: string[],
    patterns: RegExp[],
    context: LawCheckContext,
    errorMessage: string
  ): string[] {
    const violations: string[] = [];

    for (const file of files) {
      if (FileUtils.shouldIgnoreFile(file, context.config, context.lawId)) {
        continue;
      }

      const content = FileUtils.readFileContent(
        PathOperations.join(context.projectRoot, file)
      );

      if (!content) continue;

      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          // Create a beautifully colored violation message
          const coloredMessage =
            `${chalk.yellowBright('⚠️ ')} ${chalk.cyan(
              `${errorMessage} in`
            )} ` +
            `${chalk.blue(`${file}:`)} ${chalk.redBright(matches.join(', '))}`;

          violations.push(coloredMessage);
        }
      }
    }

    return violations;
  }

  /**
   * Execute shell command safely
   */
  protected executeCommand(
    command: string,
    cwd: string
  ): { stdout: string; stderr: string; success: boolean } {
    try {
      const { execSync } = require('child_process');
      const output = execSync(command, {
        cwd,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      return {
        stdout: output,
        stderr: '',
        success: true,
      };
    } catch (error: unknown) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      return {
        stdout: execError.stdout ?? '',
        stderr: execError.stderr ?? execError.message ?? 'Unknown error',
        success: false,
      };
    }
  }

  /**
   * Check if package.json has specific dependency
   */
  protected hasDependency(projectRoot: string, dependency: string): boolean {
    try {
      const deps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      return Object.keys(deps).includes(dependency);
    } catch {
      return false;
    }
  }

  /**
   * Get package.json content
   */
  protected getPackageJson(
    projectRoot: string
  ): Record<string, unknown> | null {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');

    try {
      return FileSystemOperations.readJsonFile(packageJsonPath);
    } catch {
      return null;
    }
  }
}

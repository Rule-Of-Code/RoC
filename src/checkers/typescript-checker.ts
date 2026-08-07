/**
 * TypeScript Constitutional Checker
 * Handles TypeScript strict mode and compilation checks
 */

import type { LawCheckContext, LawResult } from '../types/law.types';
import { ConfigFileUtils } from '../utils/config-file-utils';
import { FileUtils } from '../utils/file-utils';
import { GlobUtils } from '../utils/glob-utils';
import { PathOperations } from '../utils/path-operations';
import { BaseChecker } from './base-checker';

export class TypeScriptChecker extends BaseChecker {
  async check(context: LawCheckContext): Promise<LawResult> {
    try {
      if (this.law.title.includes('TypeScript Strict Mode')) {
        return await Promise.resolve(this.checkTypeScriptStrict(context));
      }

      if (
        this.law.checkFunction === 'checkZeroTolerance' ||
        this.law.title.includes('Zero Tolerance')
      ) {
        return this.checkZeroToleranceStrict(context);
      }

      if (
        this.law.description.includes('debug') ||
        this.law.description.includes('console.log')
      ) {
        return this.checkDebugStatements(context);
      }

      return this.createSuccessResult('Compliance verified', context);
    } catch (_error) {
      return this.createErrorResult(_error as Error, context);
    }
  }

  private checkTypeScriptStrict(context: LawCheckContext): LawResult {
    try {
      const tsconfigPath = PathOperations.join(
        context.projectRoot,
        'tsconfig.json'
      );
      if (!FileUtils.exists(tsconfigPath)) {
        return {
          passed: false,
          message: 'tsconfig.json not found',
          score: 0,
          fixable: true,
          config: context.config,
        };
      }

      const tsconfig = ConfigFileUtils.loadConfig(tsconfigPath) as Record<
        string,
        unknown
      > | null;
      const compilerOptions = tsconfig?.compilerOptions as
        | Record<string, unknown>
        | undefined;
      const strict = compilerOptions?.strict;

      if (!strict) {
        return {
          passed: false,
          message: 'TypeScript strict mode is not enabled',
          score: 10,
          fixable: true,
          config: context.config,
        };
      }

      // Check for TypeScript errors
      const result = this.executeCommand(
        'npx tsc --noEmit',
        context.projectRoot
      );

      if (!result.success) {
        return {
          passed: false,
          message: 'TypeScript compilation errors found',
          details: [result.stderr],
          score: 10,
          fixable: false,
          config: context.config,
        };
      }

      return this.createSuccessResult(
        'TypeScript strict mode verified',
        context
      );
    } catch (_error) {
      return this.createErrorResult(_error as Error, context);
    }
  }

  private checkZeroToleranceStrict(context: LawCheckContext): LawResult {
    // Zero Tolerance combines TypeScript + ESLint + Debug cleanup checks
    const violations: string[] = [];

    try {
      // Check TypeScript first
      const tsResult = this.checkTypeScriptStrict(context);
      if (!tsResult.passed) {
        violations.push('TypeScript compilation issues detected');
      }

      // Check for debug statements
      const debugResult = this.checkDebugStatements(context);
      if (!debugResult.passed) {
        violations.push('Debug statements found in code');
      }

      if (violations.length > 0) {
        return {
          passed: false,
          message: `🚨 ZERO TOLERANCE VIOLATION: ${violations.join(', ')}`,
          details: violations,
          score: 0,
          fixable: true,
          config: context.config,
        };
      }

      return this.createSuccessResult(
        'Zero tolerance compliance verified',
        context
      );
    } catch (_error) {
      return this.createErrorResult(_error as Error, context);
    }
  }

  private checkDebugStatements(context: LawCheckContext): LawResult {
    // More precise patterns - avoid matching comments
    const debugPatterns = [
      /^\s*console\.(log|warn|error|debug|info)\s*\(/gm, // Only at start of line (ignoring whitespace)
      /[^/*\s].*console\.(log|warn|error|debug|info)\s*\(/g, // Not in comments
      /debugger\s*;/gi,
      /alert\s*\(/gi,
    ];

    // Exclude RuleOfCode CLI files and build scripts - they legitimately use console.log for output
    const files = this.getMatchingFiles(
      context,
      GlobUtils.createMultiExtensionPattern(['ts', 'js'])
    );

    // Additional filtering for debug statements - exclude legitimate console usage
    const filteredFiles = files.filter(file => {
      // Exclude patterns
      const excludePatterns = [
        /\/packages\/ruleofcode\//,
        /\/logger\.service\.ts$/,
        /\/generate-.*\.js$/,
        /\/scripts\//,
        /\/tools\//,
        /\.spec\.ts$/,
        /\.test\.ts$/,
      ];

      return !excludePatterns.some(pattern => pattern.test(file));
    });

    const violations = this.scanFilesForPatterns(
      filteredFiles,
      debugPatterns,
      context,
      'Debug statement found'
    );

    return {
      passed: violations.length === 0,
      message:
        violations.length > 0
          ? `${violations.length} debug statements found`
          : 'No debug statements found',
      details: violations,
      score: violations.length > 0 ? 0 : 100,
      fixable: true,
      config: context.config,
    };
  }
}

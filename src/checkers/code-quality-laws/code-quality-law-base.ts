/**
 * Code Quality Law Base Class
 * Common functionality for Code Quality laws
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { ConfigFileUtils } from '../../utils/config-file-utils';
import { FileUtils } from '../../utils/file-utils';
import { ObservableCleanup } from '../../utils/observable-cleanup';
import { PathOperations } from '../../utils/path-operations';

export abstract class CodeQualityLawBase {
  protected static findTypeScriptFiles(
    projectRoot: string,
    context: LawCheckContext
  ): string[] {
    return FileUtils.getAllTypeScriptFiles(
      projectRoot,
      context.config,
      undefined,
      false
    );
  }

  /**
   * Find code files for analysis
   */
  protected static findCodeFilesForAnalysis(
    projectRoot: string,
    context: LawCheckContext
  ): string[] {
    // The law id is passed so `ignores.byRule` keyed by that id resolves as
    // well as the readable slug the registry publishes. Without it only the
    // slug form worked, and the id form silently filtered nothing.
    return CheckerUtils.findFilesByExtension(
      projectRoot,
      ['ts', 'js', 'tsx', 'jsx'],
      context.config,
      context.lawId
    );
  }

  protected static hasObservableSubscriptions(content: string): boolean {
    return (
      content.includes('.subscribe(') ||
      (content.includes('.pipe(') && content.includes('subscribe'))
    );
  }

  protected static hasProperCleanup(content: string): boolean {
    return (
      content.includes('takeUntil') ||
      content.includes('OnDestroy') ||
      ObservableCleanup.hasUnsubscribePattern(content) ||
      content.includes('destroy$')
    );
  }

  protected static hasStrictTypeScriptConfig(tsconfigContent: string): boolean {
    try {
      const config = ConfigFileUtils.loadConfig(tsconfigContent);
      if (!config || typeof config !== 'object') {
        return false;
      }

      const configObj = config as Record<string, unknown>;
      const compilerOptions = configObj.compilerOptions as Record<
        string,
        unknown
      >;

      return !!(
        compilerOptions.strict &&
        compilerOptions.noImplicitAny &&
        compilerOptions.strictNullChecks
      );
    } catch {
      return false;
    }
  }

  protected static hasProperDocumentation(content: string): boolean {
    // Check for JSDoc comments
    const jsdocPattern = /\/\*\*[\s\S]*?\*\//g;
    const jsdocMatches = content.match(jsdocPattern) ?? [];

    // Check for class/function documentation
    const classPattern = /export class \w+/g;
    const functionPattern = /export (function|const \w+ = )/g;

    const classes = content.match(classPattern) ?? [];
    const functions = content.match(functionPattern) ?? [];

    return jsdocMatches.length >= (classes.length + functions.length) * 0.5;
  }

  /**
   * Strip comments (line, block, JSDoc) so detection regexes never match inside a
   * comment. Protocol-relative URLs (`http://…`) are preserved. Over-stripping (a
   * `//` inside a string) only ever REDUCES matches, never adds false positives.
   */
  protected static stripComments(content: string): string {
    return content
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  }

  protected static createResult(
    violations: string[],
    title: string,
    category: string,
    recommendations: string[] = [],
    context: LawCheckContext
  ): LawResult {
    if (violations.length === 0) {
      return {
        passed: true,
        message: `✅ ${title} compliance verified`,
        details: [`All ${category.toLowerCase()} requirements met`],
        violations: [],
        suggestions: [],
        score: 100,
        fixable: false,
        config: context.config,
      };
    }

    return {
      passed: false,
      message: `⚠️ ${title} violations: ${violations.length} issues found`,
      details: [...violations, ...recommendations],
      violations,
      suggestions: recommendations,
      score: Math.max(100 - violations.length * 5, 0),
      fixable: true,
      fixCommand: recommendations.join('; '),
      config: context.config,
    };
  }

  // findAngularFiles was removed here: none of the 14 subclasses ever called it,
  // and it filtered Angular artifacts by the *.component/service/directive/pipe.ts
  // suffix — blind to Angular 20's suffix-less names. Rather than teach dead code a
  // new trick, it is deleted; live component discovery uses AngularComponentFiles
  // (by @Component decorator). Its only exerciser was a test of the method itself.

  protected static findSpecFiles(
    projectRoot: string,
    context: LawCheckContext
  ): string[] {
    return FileUtils.getAllTypeScriptFiles(
      projectRoot,
      context.config,
      undefined,
      true
    ).filter(file => file.includes('.spec.ts'));
  }

  /**
   * Find and parse ESLint configuration
   * Shared by multiple code quality laws (complexity, magic numbers, etc.)
   * Supports both legacy and flat config formats
   */
  protected static findESLintConfig(
    projectRoot: string
  ): Record<string, unknown> | null {
    const configFiles = CheckerUtils.getCommonExtensions().CONFIG;

    for (const configFile of configFiles) {
      // Try common ESLint config file names
      const configNames = this.getESLintConfigNames(configFile);

      for (const configName of configNames) {
        const configPath = PathOperations.join(projectRoot, configName);
        if (!FileUtils.exists(configPath)) continue;
        try {
          if (configFile.endsWith('.js') || configFile.endsWith('.mjs')) {
            return this.loadESLintJsConfig(configPath);
          } else if (configFile.endsWith('.json')) {
            return ConfigFileUtils.loadConfig(configPath);
          }
        } catch (_error) {
          // Continue if config can't be parsed
        }
      }
    }

    return null;
  }

  /**
   * Build the candidate ESLint config file names for a given extension
   */
  private static getESLintConfigNames(configFile: string): string[] {
    return [
      configFile.startsWith('.')
        ? `eslint${configFile}`
        : `.eslintrc${configFile}`,
      `eslint.config${configFile}`,
    ];
  }

  /**
   * Load an ESLint config from a .js/.mjs file
   * For .mjs and .js files, try to require them
   * Note: .mjs files with ESM syntax won't work with require(),
   * but we'll try to extract rules from file content as fallback
   */
  private static loadESLintJsConfig(
    configPath: string
  ): Record<string, unknown> | null {
    try {
      const config = require(configPath);
      // Handle flat config (array) vs legacy config (object)
      if (Array.isArray(config) || Array.isArray(config.default)) {
        // Flat config format - merge all rules from array
        const configArray = Array.isArray(config) ? config : config.default;
        const mergedRules: Record<string, unknown> = {};
        for (const item of configArray) {
          if (item && typeof item === 'object' && 'rules' in item) {
            Object.assign(mergedRules, item.rules);
          }
        }
        return { rules: mergedRules };
      }
      return config;
    } catch {
      // Fallback: read file content and try to extract rules
      const content = FileUtils.readFile(configPath);
      return this.extractRulesFromESLintFile(content);
    }
  }

  /**
   * Extract ESLint rules from file content (fallback for .mjs files)
   * Looks for common rule patterns in the file text
   */
  private static extractRulesFromESLintFile(
    content: string
  ): Record<string, unknown> | null {
    const rules: Record<string, unknown> = {};

    // Match patterns like: 'rule-name': 'error', or 'rule-name': ['error', options]
    const rulePattern =
      /['"](@[\w-]+\/)?[\w-]+['"]\s*:\s*['"\[](?:error|warn|off)/g;
    const matches = content.match(rulePattern);

    if (matches) {
      for (const match of matches) {
        // Extract rule name
        const nameMatch = match.match(/['"](@[\w-]+\/)?[\w-]+['"]/);
        if (nameMatch) {
          const ruleName = nameMatch[0].replace(/['"]/g, '');
          rules[ruleName] = 'detected'; // Mark as present
        }
      }
    }

    return Object.keys(rules).length > 0 ? { rules } : null;
  }

  /**
   * RULE 2: Generic ESLint rule checker helper
   * Eliminates duplicate pattern across multiple code quality checkers
   * Checks if any of the provided rule names exist in eslint config
   */
  protected static hasAnyESLintRule(
    eslintConfig: Record<string, unknown> | null,
    ruleNames: string[]
  ): boolean {
    if (!eslintConfig) return false;
    const rules =
      (eslintConfig.rules as Record<string, unknown> | undefined) ?? {};
    return ruleNames.some(ruleName => rules[ruleName]);
  }

  /**
   * Check if ESLint config has complexity rules
   */
  protected static hasComplexityRules(
    eslintConfig: Record<string, unknown> | null
  ): boolean {
    return this.hasAnyESLintRule(eslintConfig, [
      'complexity',
      'max-lines',
      'max-depth',
    ]);
  }

  /**
   * RULE 2: Initialize analysis with empty violations and suggestions
   * Consolidates common pattern across code quality law checkers
   */
  protected static initializeAnalysis(): {
    violations: string[];
    suggestions: string[];
  } {
    return {
      violations: [],
      suggestions: [],
    };
  }

  protected static checkRequiredTools(
    projectRoot: string,
    requiredTools: string[]
  ): string[] {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (!FileUtils.exists(packageJsonPath)) {
      return requiredTools; // All tools missing if no package.json
    }

    try {
      const packageJson = require(packageJsonPath) as {
        devDependencies?: Record<string, string>;
        dependencies?: Record<string, string>;
      };
      const allDeps = {
        ...(packageJson.devDependencies ?? {}),
        ...(packageJson.dependencies ?? {}),
      };

      return requiredTools.filter(tool => !allDeps[tool]);
    } catch (_error) {
      return requiredTools; // Assume all missing if error reading
    }
  }
}

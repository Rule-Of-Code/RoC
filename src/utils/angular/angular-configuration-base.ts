/**
 * Base class for Angular Configuration utilities
 * Consolidates common configuration patterns across NgRx, Signals, and other Angular utilities
 * - File extension management
 * - Message placeholder handling
 * - Validation message templating
 * - Violations and suggestions initialization
 * - Project configuration validation
 */
import type { RuleOfCodeConfig } from '../../config/types';
import { CheckerUtils } from '../checker-utils';
import { DIRECTORY_NAMES } from '../constants';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { MessagePlaceholderHelper } from './message-placeholder-helper';
import { AngularComponentFiles, type AngularKind } from '../angular-component-files';

/** The Angular class suffixes an analyzer may list, and the kind each one names. */
const ANGULAR_SUFFIX_KINDS: Record<string, AngularKind | undefined> = {
  '.component.ts': 'component',
  '.service.ts': 'service',
  '.directive.ts': 'directive',
  '.pipe.ts': 'pipe',
  '.module.ts': 'module',
  '.guard.ts': 'guard',
};

export abstract class AngularConfigurationBase {
  /**
   * Helper: Apply fileName placeholder to validation messages
   * RULE 1: Centralized message templating for single placeholder
   */
  protected static applyFileNamePlaceholder(
    message: string,
    fileName: string
  ): string {
    return MessagePlaceholderHelper.applyFileNamePlaceholder(message, fileName);
  }

  /**
   * Build validation message with fileName placeholder
   * RULE 1: Consolidates message construction with fileName
   */
  static buildMessage(messageTemplate: string, fileName: string): string {
    return MessagePlaceholderHelper.buildMessage(messageTemplate, fileName);
  }

  /**
   * Initialize violations and suggestions arrays for analysis
   * Validates src directory exists and finds files by extension
   * Returns empty violations/suggestions if src directory doesn't exist
   */
  protected static initializeAnalysis(
    projectRoot: string,
    extensions: string[],
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
    files: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    if (!FileUtils.exists(srcPath)) {
      return { violations, suggestions, files: [] };
    }

    const byName = CheckerUtils.findFilesByExtension(srcPath, extensions, config);
    // An Angular class suffix in the list also admits Angular 20's unsuffixed
    // file of that kind — `hero.ts` with @Component — read by its decorator.
    // Every analyzer on this base picked files by suffix alone (#336/#337).
    const kinds = extensions
      .map(extension => ANGULAR_SUFFIX_KINDS[extension])
      .filter((kind): kind is AngularKind => kind !== undefined);
    if (kinds.length === 0) return { violations, suggestions, files: byName };
    const named = new Set(byName);
    const unsuffixed = CheckerUtils.findFilesByExtension(srcPath, ['.ts'], config).filter(
      file => !named.has(file) && AngularComponentFiles.isKind(file, kinds)
    );
    return { violations, suggestions, files: [...byName, ...unsuffixed] };
  }

  /**
   * RULE 2: Generic project configuration validation helper
   * Eliminates 9+ duplicate validateProjectConfig implementations
   * Returns standard validation result with errors and warnings
   */
  protected static validateProjectRootPath(projectRoot: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!projectRoot) {
      errors.push('Project root path is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

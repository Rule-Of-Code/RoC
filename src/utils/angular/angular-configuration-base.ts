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

    const files = CheckerUtils.findFilesByExtension(
      srcPath,
      extensions,
      config
    );
    return { violations, suggestions, files };
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

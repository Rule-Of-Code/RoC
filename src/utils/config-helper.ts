/**
 * Config Helper
 * Utilities for working with RuleOfCodeConfig
 */
import type { RuleOfCodeConfig } from '../config/types';
import type { LawCheckContext } from '../types/law.types';

export class ConfigHelper {
  /**
   * Gets config from context
   * Context.config is always valid and never undefined
   */
  static getConfigFromContext(context: LawCheckContext): RuleOfCodeConfig {
    return context.config;
  }
}

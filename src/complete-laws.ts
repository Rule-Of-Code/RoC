/**
 * 🏛️ COMPLETE CONSTITUTIONAL LAWS - ENHANCED MODULAR VERSION
 *
 * Professional enterprise-grade modular law system
 * Refactored from monolithic structure to specialized modules
 *
 * ⚡ This file now serves as a clean import proxy to the modular system
 * 🎯 All laws are organized by domain and priority using Pareto principles
 *
 * @version 2.0.0-enhanced
 * @architecture Modular Enterprise Architecture
 */

import chalk from 'chalk';

// Re-export enhanced laws system for backwards compatibility
export {
  ANGULAR_LAWS,
  CODE_QUALITY_LAWS,
  ALL_ENHANCED_CONSTITUTIONAL_LAWS as COMPLETE_CONSTITUTIONAL_LAWS,
  FRAMEWORK_LAWS,
  getDefaultEnabledLaws,
  getFrameworkLaws,
  getLawsByCategory,
  getLawsByPriority,
  getParetoOptimizedLaws,
  getProjectLaws,
  PARETO_CATEGORIES,
  PROJECT_LAWS,
  SACRED_LAWS,
  VERSION_CONTROL_LAWS,
} from './data/enhanced-laws';

// Re-export enhanced registry
export {
  enhancedLawsRegistry as completeConstitutionalLawsRegistry,
  EnhancedConstitutionalLawsRegistry,
} from './registry/enhanced-laws-registry';

// Re-export enhanced types
export {
  AutomationType,
  EnhancedConstitutionalLaw as CompleteConstitutionalLaw,
  LawCategory,
  LawPriority,
  LawSeverity,
} from './types/enhanced-law.types';

// 🎯 CONVENIENCE FUNCTIONS FOR COMPLETE LAWS SYSTEM

/**
 * Get all constitutional laws (alias for backwards compatibility)
 */
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from './data/enhanced-laws';
export const COMPLETE_LAWS = ALL_ENHANCED_CONSTITUTIONAL_LAWS;

/**
 * Quick audit function using enhanced laws
 */
export function getCompleteAuditLaws(options?: {
  framework?: 'angular' | 'react' | 'vue';
  priority?: 'CRITICAL' | 'HIGH' | 'LOW' | 'MEDIUM';
  paretoOptimized?: boolean;
}): unknown {
  const {
    enhancedLawsRegistry: registry,
  } = require('./registry/enhanced-laws-registry');

  if (options?.paretoOptimized) {
    return registry.getParetoOptimizedLaws();
  }

  if (options?.priority) {
    return registry.getLawsByPriority(options.priority);
  }

  if (options?.framework) {
    return registry.getFrameworkLaws(options.framework);
  }

  return registry.getAllLaws();
}

/**
 * Get statistics about the complete laws system
 */
export function getCompleteLawsStats(): unknown {
  const { enhancedLawsRegistry } = require('./registry/enhanced-laws-registry');
  return enhancedLawsRegistry.getRegistryStats();
}

// 📊 SYSTEM INFORMATION
process.stdout.write(
  `${chalk.magentaBright('🏛️ Constitutional Laws v2.0.0-enhanced loaded')}\n`
);
process.stdout.write(
  `${chalk.cyanBright(
    '📊 Enterprise modular architecture with enhanced laws system'
  )}\n`
);
process.stdout.write(
  `${chalk.yellowBright(
    '🎯 Pareto-optimized system - 20% of laws catch 80% of problems'
  )}\n`
);

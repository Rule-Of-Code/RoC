/**
 * RuleOfCode - Professional Constitutional Compliance System
 * Main entry point for the npm package
 */

import { ConfigLoader } from './config/loader';
import { ANGULAR_CONFIG, DEFAULT_CONFIG, REACT_CONFIG } from './config/types';
import type { AuditOptions, AuditResult } from './core/auditor';
import { RuleOfCodeAuditor } from './core/auditor';
import { ConstitutionalLawsRegistry } from './core/laws';
import { GitHooksInstaller } from './hooks/installer';
import { FileSystemOperations } from './utils/file-system-operations';

// Enhanced Laws System exports
export {
  ALL_ENHANCED_CONSTITUTIONAL_LAWS,
  ANGULAR_LAWS,
  CODE_QUALITY_LAWS,
  getDefaultEnabledLaws,
  getFrameworkLaws,
  getLawsByCategory,
  getLawsByPriority,
  getParetoOptimizedLaws,
  getProjectLaws,
  PARETO_CATEGORIES,
  SACRED_LAWS,
  VERSION_CONTROL_LAWS,
} from './data/enhanced-laws';
export {
  EnhancedConstitutionalLawsRegistry,
  enhancedLawsRegistry,
} from './registry/enhanced-laws-registry';
export {
  AutomationType,
  EnhancedConstitutionalLaw,
  LawCategory,
  LawPriority,
  LawSeverity,
} from './types/enhanced-law.types';

// Core exports (Legacy compatibility)
export { AuditOptions, AuditResult, RuleOfCodeAuditor } from './core/auditor';
export {
  ConstitutionalLaw,
  ConstitutionalLawsRegistry,
  LawResult,
} from './core/laws';

// Configuration exports
export { CodeQualityChecker } from './checkers/code-quality-checker';
export { ConfigLoader } from './config/loader';
export {
  ANGULAR_CONFIG,
  DEFAULT_CONFIG,
  REACT_CONFIG,
  RuleOfCodeConfig,
} from './config/types';

// Registry exports
export { ModularLawsRegistry } from './registry/modular-laws-registry';

// Hooks integration exports
export { GitHooksInstaller, HooksInstallOptions } from './hooks/installer';

// Convenience function for quick audit
export async function audit(options: AuditOptions = {}): Promise<AuditResult> {
  const config = ConfigLoader.load(options.projectRoot ?? process.cwd());
  const auditor = await RuleOfCodeAuditor.create({ ...options, config });
  return auditor.audit();
}

// Version info - Dynamic reading from package.json
import { dirname, join } from 'path';

function getVersion(): string {
  try {
    const packageJsonPath = join(dirname(__dirname), 'package.json');
    const packageJson =
      FileSystemOperations.readJsonFile<Record<string, unknown>>(
        packageJsonPath
      );
    return packageJson.version as string;
  } catch {
    return '2.0.0'; // Fallback version
  }
}

export const VERSION = getVersion();

// Default export for CommonJS compatibility
export default {
  RuleOfCodeAuditor,
  ConstitutionalLawsRegistry,
  ConfigLoader,
  GitHooksInstaller,
  audit,
  DEFAULT_CONFIG,
  ANGULAR_CONFIG,
  REACT_CONFIG,
  VERSION,
};

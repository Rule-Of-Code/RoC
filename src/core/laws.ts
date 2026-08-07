/**
 * Constitutional Laws Registry
 * Central registry for all FileHeaderComplianceAnalyzer laws
 *
 * REFACTORED: Now uses modular architecture with specialized checkers
 */

// Re-export types for backward compatibility
export { ConstitutionalLaw, LawResult } from '../types/law.types';

// Re-export modular registry as primary
export { ModularLawsRegistry } from '../registry/modular-laws-registry';
// Re-export legacy registry for compatibility
export { ConstitutionalLawsRegistry } from '../registry/laws-registry';

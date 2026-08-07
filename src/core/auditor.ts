/**
 * RuleOfCode Audit Engine - Refactored for maintainability
 * Main entry point for FileHeaderComplianceAnalyzer auditing
 */

export { RuleOfCodeAuditor } from './auditing/audit-engine';
export type {
  AuditOptions,
  AuditResult,
  AuditStats,
} from './auditing/audit-types';
export { AuditResultProcessor } from './auditing/result-processor';

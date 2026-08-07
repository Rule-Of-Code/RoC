/**
 * Constitutional Laws Definition - ENHANCED MODULAR VERSION
 *
 * This file now serves as a compatibility layer that re-exports
 * the enhanced modular law system while maintaining backwards compatibility
 *
 * 🏗️ ENTERPRISE ARCHITECTURE: Refactored from 1200+ line monolith to modular system
 * ⚡ PERFORMANCE: Lazy-loaded specialized modules with Pareto optimization
 * 🎯 MAINTAINABILITY: Domain-separated laws with clear responsibilities
 *
 * @version 2.0.0-enhanced
 * @architecture Modular Enterprise Architecture
 */

// Re-export enhanced modular law system for backwards compatibility
export {
  AutomationType,
  EnhancedConstitutionalLaw as ConstitutionalLaw,
  LawCategory,
  LawPriority,
  LawSeverity,
} from '../types/enhanced-law.types';

export {
  ANGULAR_LAWS,
  CODE_QUALITY_LAWS,
  ALL_ENHANCED_CONSTITUTIONAL_LAWS as CONSTITUTIONAL_LAWS,
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
} from './enhanced-laws';

// Legacy type mapping for backwards compatibility
export type EnforcementLevel = 'CRITICAL' | 'HIGH' | 'LOW' | 'MEDIUM';

// 📊 SYSTEM INFORMATION
// Constitutional Laws v2.0.0-enhanced loaded
// Enterprise modular architecture with enhanced laws system
// Pareto-optimized system - 20% of laws catch 80% of problems

// 🚀 PERFORMANCE BOOST: From 1200+ line monolith to modular system!
// ✅ BACKWARDS COMPATIBLE: All existing imports continue working
// 🏗️ FUTURE READY: Enterprise architecture for scalability

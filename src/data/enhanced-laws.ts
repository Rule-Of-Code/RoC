/**
 * Enhanced Constitutional Laws Data Aggregator
 * Enterprise-grade modular law system with Pareto optimization
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { ACCESSIBILITY_LAWS } from './accessibility-laws';
import { ANGULAR_LAWS } from './angular-laws';
import { CODE_QUALITY_LAWS } from './code-quality-laws';
import { DEPLOYMENT_LAWS } from './deployment-laws';
import { DOCUMENTATION_LAWS } from './documentation-laws';
import {
  FRAMEWORK_LAWS,
  PARETO_CATEGORIES,
  PROJECT_LAWS,
} from './pareto-optimization';
import { FE_ARCHITECTURE_LAWS } from './fe-architecture-laws';
import { META_GATE_LAWS } from './meta-gate-laws';
import { PERFORMANCE_LAWS } from './performance-laws';
import { PYTHON_LAWS } from './python-laws';
import { SACRED_LAWS } from './sacred-laws';
import { SECURITY_LAWS } from './security-laws';
import { TESTING_LAWS } from './testing-laws';
import { VERSION_CONTROL_LAWS } from './version-control-laws';

// 🏛️ ALL ENHANCED CONSTITUTIONAL LAWS - MODULARLY ORGANIZED
export const ALL_ENHANCED_CONSTITUTIONAL_LAWS: EnhancedConstitutionalLaw[] = [
  ...SACRED_LAWS, // 🔴 5 Sacred Laws - ALWAYS ENABLED (IDs 1-5)
  ...CODE_QUALITY_LAWS, // 🟡 Code Quality Laws - HIGH IMPACT (IDs 10-12)
  ...VERSION_CONTROL_LAWS, // 🟢 Version Control Laws - HIGH IMPACT (IDs 20-22)
  ...ANGULAR_LAWS, // 🔷 Angular-specific Laws - FRAMEWORK CONDITIONAL (IDs 30-37)
  ...SECURITY_LAWS, // 🔐 Security & Compliance Laws (IDs 40-44)
  ...PERFORMANCE_LAWS, // ⚡ Performance & Optimization Laws (IDs 50-55)
  ...TESTING_LAWS, // 🧪 Testing & Quality Assurance Laws (IDs 60-64)
  ...DEPLOYMENT_LAWS, // 🚀 CI/CD & Deployment Laws (IDs 70-75)
  ...DOCUMENTATION_LAWS, // 📄 Documentation & Standards Laws (IDs 80-87)
  ...ACCESSIBILITY_LAWS, // ♿ Accessibility (a11y) Laws (IDs 90-94)
  ...PYTHON_LAWS, // 🐍 Python domain — FastAPI + Clean Architecture/CQRS (IDs 200+)
  ...META_GATE_LAWS, // 💓 Gate-integrity meta laws (universal; IDs 226+)
  ...FE_ARCHITECTURE_LAWS, // 🏛️ FE architecture audit laws (frontend; IDs 301+)
];

// Re-export for easy access
export {
  ACCESSIBILITY_LAWS,
  ANGULAR_LAWS,
  CODE_QUALITY_LAWS,
  DEPLOYMENT_LAWS,
  DOCUMENTATION_LAWS,
  FE_ARCHITECTURE_LAWS,
  META_GATE_LAWS,
  FRAMEWORK_LAWS,
  PARETO_CATEGORIES,
  PERFORMANCE_LAWS,
  PROJECT_LAWS,
  PYTHON_LAWS,
  SACRED_LAWS,
  SECURITY_LAWS,
  TESTING_LAWS,
  VERSION_CONTROL_LAWS,
};

// 🎯 UTILITY FUNCTIONS FOR LAW FILTERING

/**
 * Get laws by priority level
 */
export function getLawsByPriority(
  priority: 'CRITICAL' | 'HIGH' | 'LOW' | 'MEDIUM'
): EnhancedConstitutionalLaw[] {
  return ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
    law => law.priority === priority
  );
}

/**
 * Get laws by category
 */
export function getLawsByCategory(
  category: EnhancedConstitutionalLaw['category']
): EnhancedConstitutionalLaw[] {
  return ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
    law => law.category === category
  );
}

/**
 * Get Pareto-optimized laws (high impact only)
 */
export function getParetoOptimizedLaws(): EnhancedConstitutionalLaw[] {
  return ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(law =>
    PARETO_CATEGORIES.HIGH_IMPACT.includes(law.id)
  );
}

/**
 * Get framework-specific laws
 */
export function getFrameworkLaws(
  framework: 'angular' | 'react' | 'vue'
): EnhancedConstitutionalLaw[] {
  const frameworkLawIds = FRAMEWORK_LAWS[framework];
  return ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(law =>
    frameworkLawIds.includes(law.id)
  );
}

/**
 * Get project-specific laws
 */
export function getProjectLaws(
  projectName: string
): EnhancedConstitutionalLaw[] {
  const projectLawIds = PROJECT_LAWS[projectName] ?? [];
  return ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(law =>
    projectLawIds.includes(law.id)
  );
}

/**
 * Get laws enabled by default
 */
export function getDefaultEnabledLaws(): EnhancedConstitutionalLaw[] {
  return ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(law => law.defaultEnabled);
}

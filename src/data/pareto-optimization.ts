/**
 * Pareto Optimization Data Module - UPDATED WITH HASH IDS
 * Professional-grade law categorization for optimal performance with dynamic hash-based IDs
 * Note: This file now references dynamic hash IDs instead of static numeric IDs
 */

import type {
  FrameworkLaws,
  ParetoCategories,
  ProjectLaws,
} from '../types/enhanced-law.types';

// Import all law arrays to get their actual hash IDs
import { ACCESSIBILITY_LAWS } from './accessibility-laws';
import { ANGULAR_LAWS } from './angular-laws';
import { CODE_QUALITY_LAWS } from './code-quality-laws';
import { DEPLOYMENT_LAWS } from './deployment-laws';
import { DOCUMENTATION_LAWS } from './documentation-laws';
import { PERFORMANCE_LAWS } from './performance-laws';
import { SACRED_LAWS } from './sacred-laws';
import { SECURITY_LAWS } from './security-laws';
import { TESTING_LAWS } from './testing-laws';
import { VERSION_CONTROL_LAWS } from './version-control-laws';

// 🎯 PARETO OPTIMIZATION CATEGORIES - USING DYNAMIC HASH IDs
// 20% of laws catch 80% of problems - TRUE PARETO OPTIMIZATION
export const PARETO_CATEGORIES: ParetoCategories = {
  // 🔴 HIGH-IMPACT (STRICT 20% of laws, 80% of problems) - CRITICAL ONLY
  HIGH_IMPACT: [
    // All Sacred Laws (ALWAYS CRITICAL) - ~5 laws
    ...SACRED_LAWS.map(law => law.id),
    // ONLY CRITICAL priority laws from all categories - ~16 more laws
    ...CODE_QUALITY_LAWS.filter(law => law.priority === 'CRITICAL').map(
      law => law.id
    ),
    ...VERSION_CONTROL_LAWS.filter(law => law.priority === 'CRITICAL').map(
      law => law.id
    ),
    ...ANGULAR_LAWS.filter(law => law.priority === 'CRITICAL').map(
      law => law.id
    ),
    ...SECURITY_LAWS.filter(law => law.priority === 'CRITICAL').map(
      law => law.id
    ),
    ...DEPLOYMENT_LAWS.filter(law => law.priority === 'CRITICAL').map(
      law => law.id
    ),
    // Note: PERFORMANCE_LAWS currently has no CRITICAL priority items - this is expected dead code
    ...PERFORMANCE_LAWS.filter(law => law.priority === 'CRITICAL').map(
      law => /* istanbul ignore next */ law.id
    ),
    ...TESTING_LAWS.filter(law => law.priority === 'CRITICAL').map(
      law => law.id
    ),
  ],

  // 🟡 MEDIUM-IMPACT (Context dependent) - CONDITIONAL
  MEDIUM_IMPACT: [
    // Angular Framework (context-dependent)
    ...ANGULAR_LAWS.filter(
      law => law.priority === 'HIGH' && !law.title.includes('NgRx')
    ).map(law => law.id),
    // Security Standards (non-critical)
    ...SECURITY_LAWS.filter(
      law => law.priority === 'HIGH' || law.priority === 'MEDIUM'
    ).map(law => law.id),
    // Accessibility (a11y) — HIGH priority a11y laws
    ...ACCESSIBILITY_LAWS.filter(law => law.priority === 'HIGH').map(
      law => law.id
    ),
    // All Performance Laws
    ...PERFORMANCE_LAWS.map(law => law.id),
    // All Testing Laws
    ...TESTING_LAWS.map(law => law.id),
    // Non-critical Deployment Laws
    ...DEPLOYMENT_LAWS.filter(law => law.priority !== 'CRITICAL').map(
      law => law.id
    ),
  ],

  // 🟢 LOW-IMPACT (Optional but recommended) - DEFAULT DISABLED
  LOW_IMPACT: [
    // All Documentation Laws
    ...DOCUMENTATION_LAWS.map(law => law.id),
    // Low priority Angular laws
    ...ANGULAR_LAWS.filter(
      law => law.priority === 'LOW' || law.priority === 'MEDIUM'
    ).map(law => law.id),
    // Low priority Code Quality laws
    ...CODE_QUALITY_LAWS.filter(
      law => law.priority === 'LOW' || law.priority === 'MEDIUM'
    ).map(law => law.id),
    // Lower-priority Accessibility laws
    ...ACCESSIBILITY_LAWS.filter(
      law => law.priority === 'LOW' || law.priority === 'MEDIUM'
    ).map(law => law.id),
  ],
};

// 🏗️ FRAMEWORK-SPECIFIC LAWS
export const FRAMEWORK_LAWS: FrameworkLaws = {
  angular: [
    ...ANGULAR_LAWS.map(law => law.id), // All Angular-specific laws
    ...SECURITY_LAWS.filter(law => law.title.includes('Angular')).map(
      law => law.id
    ), // Angular Security
    ...TESTING_LAWS.filter(law => law.title.includes('Angular')).map(
      law => law.id
    ), // Angular Testing
  ],
  react: [
    // React-specific laws will be added when implemented
  ],
  vue: [
    // Vue-specific laws will be added when implemented
  ],
};

// 🎯 PROJECT-SPECIFIC LAW PROFILES
// Generic, config-driven mechanism: a consumer may map a project name to a
// curated subset of law ids via their own configuration. RoC ships no
// project-specific profiles of its own (it is framework- and vendor-neutral).
export const PROJECT_LAWS: ProjectLaws = {};

/**
 * Get optimization category for a law
 */
export function getOptimizationCategory(
  lawId: string
): 'HIGH_IMPACT' | 'LOW_IMPACT' | 'MEDIUM_IMPACT' {
  if (PARETO_CATEGORIES.HIGH_IMPACT.includes(lawId)) return 'HIGH_IMPACT';
  if (PARETO_CATEGORIES.MEDIUM_IMPACT.includes(lawId)) return 'MEDIUM_IMPACT';
  return 'LOW_IMPACT';
}

/**
 * Get framework relevance for a law
 */
export function getFrameworkRelevance(lawId: string): string[] {
  const frameworks: string[] = [];

  for (const [framework, laws] of Object.entries(FRAMEWORK_LAWS)) {
    if (laws.includes(lawId)) {
      frameworks.push(framework);
    }
  }

  return frameworks;
}

/**
 * Check if law is project-specific
 */
export function isProjectSpecific(lawId: string): boolean {
  return Object.values(PROJECT_LAWS).some(laws => laws.includes(lawId));
}

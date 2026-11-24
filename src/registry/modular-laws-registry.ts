/**
 * Modular Constitutional Laws Registry
 * Uses the new modular architecture for law execution
 */

import { FileFilterUtils } from '../utils/file-filter-utils';
import * as LawIdentity from '../utils/law-identity';
import { honouredWaiverReason } from '../utils/law-waivers';

// Ionic Laws Modular Imports — gated by `requires` on an Ionic binding
import {
  IonicEdgeChromePaysSafeAreaLaw,
  IonicFixedContentInFixedSlotLaw,
  IonicGestureTouchActionLaw,
} from '../checkers/ionic-laws';

// Security Laws Modular Imports
import {
  ContentSecurityPolicyLaw,
  EnvironmentVariablesLaw,
  XSSPreventionLaw,
} from '../checkers/security-laws';
import { AuthenticationSecurityLaw } from '../checkers/security-laws/authentication-security';
import { DataEncryptionStandardsLaw } from '../checkers/security-laws/data-encryption-standards';
import { EnvironmentSecurityEnforcementLaw } from '../checkers/security-laws/environment-security-enforcement';
import { SecurityVulnerabilityResponseLaw } from '../checkers/security-laws/security-vulnerability-response';
import { ApiSecurityStandardsLaw } from '../laws/security/api-security-standards';
import { DependencySecurityScanningLaw } from '../laws/security/dependency-security-scanning';
import { SecurityTestingRequirementsLaw } from '../laws/security/security-testing-requirements';

// Deployment Laws

// Documentation Laws

// Performance Laws - CDN

// Performance Laws Modular Imports
import {
  BundleSizeOptimizationLaw,
  MemoryManagementLaw,
} from '../checkers/performance-laws';
import { BundleOptimizationStrategyLaw } from '../laws/performance/bundle-optimization-strategy';
import { CdnCachingStrategyLaw } from '../laws/performance/cdn-caching-strategy';
import { CoreWebVitalsComplianceLaw } from '../laws/performance/core-web-vitals-compliance';
import { DatabaseQueryOptimizationLaw } from '../laws/performance/database-query-optimization';
// Request-path laws (round trips per request, Python + TS/JS call sites)
import {
  CountWithAggregationLaw,
  DocumentReadOncePerRequestLaw,
  IndependentAwaitsRunConcurrentlyLaw,
} from '../checkers/request-path-laws';
import { PerformanceBudgetComplianceLaw } from '../laws/performance/performance-budget-compliance';
import { PerformanceMonitoringPolicyLaw } from '../laws/performance/performance-monitoring-policy';
import { PerformanceMonitoringStandardsLaw } from '../laws/performance/performance-monitoring-standards';
import { PerformanceStandardsLaw } from '../laws/performance/performance-standards';

// Testing Laws Modular Imports
import {
  JestUnitTest100CoverageMandateLaw,
  NoFocusedTestsLaw,
  NoTestOnlyLeakageLaw,
  PlaywrightLocatorsUserFacingLaw,
  PlaywrightNoFixedWaitLaw,
  RtlQueryByRoleLaw,
  TestCoverageRequirementsLaw,
  UnitTestQualityLaw,
} from '../checkers/testing-laws';
import { TestCoverageConstitutionalStandardLaw } from '../checkers/testing-laws/test-coverage-constitutional-standard';
import { APITestingStandardsLaw } from '../laws/testing/api-testing-standards';
import { E2ETestingStandardsLaw } from '../checkers/testing-laws/e2e-testing-standards';
import { PerformanceTestRequirementsLaw } from '../laws/testing/performance-test-requirements';
import { ProfessionalComponentTestingPolicyLaw } from '../laws/testing/professional-component-testing-policy';
import { TestDataManagementLaw } from '../laws/testing/test-data-management';
import { TestDocumentationRequirementsLaw } from '../laws/testing/test-documentation-requirements';
import { TestIsolationEnforcementLaw } from '../laws/testing/test-isolation-enforcement';

// Deployment Laws Modular Imports
import { EnvironmentParityStandardsLaw } from '../checkers/deployment-laws';
import { AutomatedCodeQualityGatesLaw } from '../laws/deployment/automated-code-quality-gates';
import { CicdConstitutionalTribunalLaw } from '../laws/deployment/cicd-constitutional-tribunal';
import { HealthCheckMonitoringLaw } from '../laws/deployment/health-check-monitoring';
import { LaunchReadinessChecklistLaw } from '../laws/deployment/launch-readiness-checklist';
import { PreDeploymentChecklistLaw } from '../laws/deployment/pre-deployment-checklist';
import { PrePrQualityGatesLaw } from '../laws/deployment/pre-pr-quality-gates';

// Documentation Laws Modular Imports
import { ErrorHandlingStandardsLaw } from '../laws/documentation/error-handling-standards';
import { IncidentResponseProtocolLaw } from '../laws/documentation/incident-response-protocol';
import { InternationalizationCompliancePolicyLaw } from '../laws/documentation/internationalization-compliance-policy';
import { MdFooterFooterConsistencyLaw } from '../laws/documentation/md-footer-footer-consistency';
import { MdFooterTemplateLaw } from '../laws/documentation/md-footer-template';
import { StrategicDocumentUpdatesLaw } from '../laws/documentation/strategic-document-updates';
import { TodoManagementLaw } from '../laws/documentation/todo-management';
import { TodoManagementStandardsLaw } from '../laws/documentation/todo-management-standards';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../data/enhanced-laws';
import { paretoCoreIds } from '../data/pareto-core';
import type {
  EnhancedConstitutionalLaw,
  LawRequirement,
} from '../types/enhanced-law.types';
import type {
  ConstitutionalLaw,
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../types/law.types';

import { LAW_CLASS_MAPPING } from './law-class-mapping';

/**
 * The registry of every law RoC runs. It maps each law card's
 * `checkFunction` to the class that implements it (LAW_CLASS_MAPPING), turns
 * the cards into runnable laws with a `check(projectRoot, config)` that sets
 * the law's ignore context, and decides which laws a config enables: identity
 * keys (name, slug, id, legacyId), unambiguous waiver keys for
 * `laws.notApplicable`, categories, stack applicability and the Pareto core.
 * A law with no implementation fails as a wiring bug unless it is MANUAL.
 */
export class ModularLawsRegistry {
  private static instance?: ModularLawsRegistry;

  static getInstance(): ModularLawsRegistry {
    this.instance ??= new ModularLawsRegistry();
    return this.instance;
  }

  /**
   * Get laws by categories
   */
  getLawsByCategories(categories: string[]): ConstitutionalLaw[] {
    return this.getAllLaws().filter(law =>
      ModularLawsRegistry.matchesCategories(law, categories)
    );
  }

  /** A law of one of `categories` (by its category, or a category word in its id). */
  static matchesCategories(
    law: { id: string; category: string },
    categories: readonly string[]
  ): boolean {
    return categories.some(
      category => law.category === category || law.id.includes(category)
    );
  }

  /** What `categories` can match: each law's tier, and the word before `_` in each law id. */
  static categoryVocabulary(): { tiers: string[]; idWords: string[] } {
    const laws = this.getAll();
    const sorted = (values: string[]): string[] =>
      [...new Set(values)].sort((a, b) => a.localeCompare(b));
    return {
      tiers: sorted(laws.map(law => law.category)),
      idWords: sorted(
        laws.map(law => law.id.split('_')[0] ?? '').filter(Boolean)
      ),
    };
  }

  /** The `categories` values that match no law at all. */
  static unknownCategories(categories: readonly string[]): string[] {
    const laws = this.getAll();
    return categories.filter(
      category => !laws.some(law => this.matchesCategories(law, [category]))
    );
  }

  /**
   * Narrow a selection to `categories` (none: unchanged). The always-on
   * meta-gates stay whatever their category: a narrowing must not remove
   * the gates that judge it (#370).
   */
  static inCategories<
    T extends {
      id: string;
      category: string;
      alwaysEnabled?: boolean | undefined;
    },
  >(laws: T[], categories: readonly string[]): T[] {
    if (categories.length === 0) return laws;
    return laws.filter(
      law =>
        law.alwaysEnabled === true || this.matchesCategories(law, categories)
    );
  }

  /**
   * Get all laws from enhanced constitution
   */
  getAllLaws(): ConstitutionalLaw[] {
    // Use the static method that properly converts enhanced laws to ConstitutionalLaw with check functions
    return ModularLawsRegistry.getAll();
  }

  /**
   * Get enhanced constitution
   */
  getEnhancedConstitution(): ConstitutionalLaw[] {
    const {
      ALL_ENHANCED_CONSTITUTIONAL_LAWS,
    } = require('../data/enhanced-laws');
    return ALL_ENHANCED_CONSTITUTIONAL_LAWS;
  }

  /**
   * Get all laws from enhanced constitution
   */
  /**
   * Mapping from checkFunction names to modular law classes
   * Made public readonly for testing purposes
   */
  static readonly LAW_CLASS_MAPPING = {
    ...LAW_CLASS_MAPPING,
    'IonicEdgeChromePaysSafeAreaLaw.check': IonicEdgeChromePaysSafeAreaLaw,
    'IonicGestureTouchActionLaw.check': IonicGestureTouchActionLaw,
    'IonicFixedContentInFixedSlotLaw.check': IonicFixedContentInFixedSlotLaw,

    // Security Laws
    checkEnvironmentVariables: EnvironmentVariablesLaw,
    checkXSSPrevention: XSSPreventionLaw,
    checkAPISecurityStandards: ApiSecurityStandardsLaw,
    checkDependencySecurityScanning: DependencySecurityScanningLaw,
    'EnvironmentSecurityEnforcementLaw.check':
      EnvironmentSecurityEnforcementLaw,
    'SecurityVulnerabilityResponseLaw.check': SecurityVulnerabilityResponseLaw,
    'DataEncryptionStandardsLaw.check': DataEncryptionStandardsLaw,
    'AuthenticationSecurityLaw.check': AuthenticationSecurityLaw,
    'APISecurityStandardsLaw.check': ApiSecurityStandardsLaw,
    'DependencySecurityScanningLaw.check': DependencySecurityScanningLaw,
    checkSecurityTestingRequirements: SecurityTestingRequirementsLaw,
    // legacyId 44 judges the CSP; the sinks are legacyId 43's (one defect, one result)
    checkSecurityStandards: ContentSecurityPolicyLaw,
    'ContentSecurityPolicyLaw.check': ContentSecurityPolicyLaw,
    'XSSPreventionLaw.check': XSSPreventionLaw,

    // Performance Laws
    checkBundleSizeOptimization: BundleSizeOptimizationLaw,
    'BundleSizeOptimizationLaw.check': BundleSizeOptimizationLaw,
    checkMemoryLeakPrevention: MemoryManagementLaw,
    checkCoreWebVitalsCompliance: CoreWebVitalsComplianceLaw,
    checkPerformanceMonitoringStandards: PerformanceMonitoringStandardsLaw,
    checkBundleOptimizationStrategy: BundleOptimizationStrategyLaw,
    checkPerformanceStandards: PerformanceStandardsLaw,
    checkDatabaseQueryOptimization: DatabaseQueryOptimizationLaw,
    'IndependentAwaitsRunConcurrentlyLaw.check':
      IndependentAwaitsRunConcurrentlyLaw,
    'DocumentReadOncePerRequestLaw.check': DocumentReadOncePerRequestLaw,
    'CountWithAggregationLaw.check': CountWithAggregationLaw,
    checkCDNAndCachingStrategy: CdnCachingStrategyLaw,
    checkCDNCachingStrategy: CdnCachingStrategyLaw,
    checkPerformanceBudgetCompliance: PerformanceBudgetComplianceLaw,

    // Performance Laws - Real Implementations
    checkCoreWebVitals: CoreWebVitalsComplianceLaw,
    checkBundleOptimization: BundleOptimizationStrategyLaw,
    checkPerformanceMonitoring: PerformanceMonitoringPolicyLaw,

    // Testing Laws
    checkTestCoverage: TestCoverageRequirementsLaw,
    checkE2ETestingStandards: E2ETestingStandardsLaw,
    checkAPITestingStandards: APITestingStandardsLaw,
    checkTestDataManagement: TestDataManagementLaw,
    checkTestIsolationEnforcement: TestIsolationEnforcementLaw,
    checkPerformanceTestRequirements: PerformanceTestRequirementsLaw,
    checkComponentTesting: ProfessionalComponentTestingPolicyLaw,
    checkTestDocumentationRequirements: TestDocumentationRequirementsLaw,
    'TestCoverageConstitutionalStandardLaw.check':
      TestCoverageConstitutionalStandardLaw,
    checkUnitTestQuality: UnitTestQualityLaw,
    checkJestUnitTest100Coverage: JestUnitTest100CoverageMandateLaw,

    // Test Integrity Laws (gated on the runner or library they read)
    'NoFocusedTestsLaw.check': NoFocusedTestsLaw,
    'PlaywrightNoFixedWaitLaw.check': PlaywrightNoFixedWaitLaw,
    'PlaywrightLocatorsUserFacingLaw.check': PlaywrightLocatorsUserFacingLaw,
    'RtlQueryByRoleLaw.check': RtlQueryByRoleLaw,
    'NoTestOnlyLeakageLaw.check': NoTestOnlyLeakageLaw,

    // Deployment Laws
    checkEnvironmentParityStandards: EnvironmentParityStandardsLaw,
    checkAutomatedQualityGates: AutomatedCodeQualityGatesLaw,
    checkCICDTribunal: CicdConstitutionalTribunalLaw,
    checkPreDeploymentChecklist: PreDeploymentChecklistLaw,
    checkPrePRQualityGates: PrePrQualityGatesLaw,
    checkHealthCheckMonitoring: HealthCheckMonitoringLaw,
    checkLaunchReadinessChecklist: LaunchReadinessChecklistLaw,

    // Documentation Laws
    checkMDFooterTemplate: MdFooterTemplateLaw,
    checkTODOManagement: TodoManagementLaw,
    checkErrorHandlingStandards: ErrorHandlingStandardsLaw,
    checkIncidentResponseProtocol: IncidentResponseProtocolLaw,
    checkInternationalization: InternationalizationCompliancePolicyLaw,
    checkStrategicDocumentUpdates: StrategicDocumentUpdatesLaw,
    checkMDFooterConsistency: MdFooterFooterConsistencyLaw,
    checkTODOManagementStandards: TodoManagementStandardsLaw,
  };

  /**
   * Get all constitutional laws with modular implementations
   */
  static getAll(): ConstitutionalLaw[] {
    return ALL_ENHANCED_CONSTITUTIONAL_LAWS.map((law, _index) => ({
      id: law.id,
      name: law.title,
      description: law.description,
      category: this.mapCategory(law.priority, law.automation),
      // Authored defaultSeverity is the source of truth (warn-first rollouts
      // depend on it); priority-derived severity is only the fallback.
      severity: law.defaultSeverity ?? this.mapSeverity(law.priority),
      impact: this.mapImpact(law.priority),
      paretoCore: this.isParetoCore(law),
      alwaysEnabled: law.alwaysEnabled,
      defaultEnabled: law.defaultEnabled,
      staticSiteHtml: law.staticSiteHtml,
      applicableFrameworks: this.getApplicableFrameworks(law),
      legacyId: law.legacyId,
      stack: law.stack,
      requires: law.requires,
      check: this.createModularCheckFunction(law, law.id),
    }));
  }

  /** The audit output prints slugged law names — same transform as law-base. */
  static slugifyLawName(name: string): string {
    return LawIdentity.slugifyLawName(name);
  }

  /** A URL-safe, registry-unique path segment for `/laws/:slug`. */
  static urlSlugForLawName(name: string): string {
    return LawIdentity.urlSlugForLawName(name);
  }

  /**
   * Every public spelling of a law's identity: canonical name, the name with
   * a trailing decorative parenthetical stripped ("Zero Tolerance Doctrine
   * (SACRED LAW)" → "Zero Tolerance Doctrine"), the printed slugs of both,
   * the law id, and the legacyId. Config keys (laws.enabled / laws.severity /
   * laws.notApplicable) must resolve identically through ALL of them — the
   * law's identity is a public contract.
   */
  static lawIdentityKeys(law: {
    name?: string | undefined;
    id?: string | undefined;
    legacyId?: number | string | undefined;
  }): string[] {
    return LawIdentity.lawIdentityKeys(law);
  }

  /**
   * Whether a law applies to a project type given its stack scope. Universal laws
   * (no stack) always apply; an unknown project type is treated permissively
   * (everything applies) so detection gaps never silently drop coverage.
   */
  static lawAppliesToProjectType(
    stack: string | undefined,
    projectType: string | undefined,
    projectRoot?: string,
    law?: { staticSiteHtml?: boolean | undefined },
    ignores?: readonly string[]
  ): boolean {
    return LawIdentity.lawAppliesToProjectType(
      stack,
      projectType,
      projectRoot,
      law,
      ignores
    );
  }

  /** Identity keys that resolve to exactly ONE law — the only ones a config may use. */
  static unambiguousIdentityKeys(law: {
    name?: string | undefined;
    id?: string | undefined;
    legacyId?: number | string | undefined;
  }): string[] {
    if (!this.ambiguousKeys) {
      const counts = new Map<string, number>();
      for (const candidate of this.getAll()) {
        for (const key of LawIdentity.lawIdentityKeys(candidate)) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      this.ambiguousKeys = new Set(
        [...counts.entries()].filter(([, n]) => n > 1).map(([key]) => key)
      );
    }
    return LawIdentity.lawIdentityKeys(law).filter(
      key => !this.ambiguousKeys?.has(key)
    );
  }

  private static ambiguousKeys: Set<string> | undefined;

  /**
   * The reason `laws.notApplicable` gives for this law, when an entry waives
   * it: keyed by an UNAMBIGUOUS identity of the law, with a non-blank reason
   * (trimmed). Null when nothing waives it. The selection drops a law exactly
   * when this is non-null, and the audit names the waiver with this reason.
   */
  static waiverReasonOf(
    law: {
      name?: string | undefined;
      id?: string | undefined;
      legacyId?: number | string | undefined;
    },
    notApplicable: Record<string, unknown> | undefined
  ): string | null {
    if (!notApplicable) return null;
    for (const key of ModularLawsRegistry.unambiguousIdentityKeys(law)) {
      const reason = honouredWaiverReason(notApplicable[key]);
      if (reason !== null) return reason;
    }
    return null;
  }

  /**
   * Get enabled laws based on config
   */
  static getEnabled(config: RuleOfCodeConfig): ConstitutionalLaw[] {
    const allLaws = this.getAll();

    return allLaws.filter(law => {
      // The gate of the gate. Audit Liveness / Config Integrity exist to catch
      // exactly the config mistakes that shrink the law set — so the very
      // config that shrinks it must not be able to remove them. A meta-gate a
      // config can disable is not a gate (QA-4, v7.8.0).
      if (law.alwaysEnabled) return true;

      // A project may declare specific laws Not Applicable (with a documented
      // reason) — e.g. a no-Firestore app skipping DB-query optimization, or an
      // SVG-only UI skipping raster image optimization. Such laws are excluded
      // from the audit instead of counted as failing.
      // An AMBIGUOUS key is never honoured. `legacyId` is not unique — 25 values
      // are shared by 51 laws — so `notApplicable: { "20": "…" }` used to silence
      // TWO laws while the team believed it had silenced one. A hidden waiver,
      // produced by us, in the tool whose whole purpose is to make waivers
      // visible (a downstream consumer). Config Integrity Guard reports such a key as a
      // violation; here we simply refuse to act on it.
      // An entry with no reason ('' or whitespace only) is not a waiver:
      // the law runs, and the engine warns about the entry.
      const notApplicable = (config.laws as Record<string, unknown>)
        .notApplicable as Record<string, unknown> | undefined;
      if (ModularLawsRegistry.waiverReasonOf(law, notApplicable) !== null) {
        return false;
      }

      // Check if paretoMode is enabled - only return Pareto core laws
      if ((config.laws as Record<string, unknown>).paretoMode === true) {
        return law.paretoCore === true;
      }

      // Special case: if user config explicitly wants all laws (no laws.enabled specified)
      if ((config.laws as Record<string, unknown>).__userWantsAllLaws) {
        return true; // Enable all 108 laws
      }

      // Check if laws.enabled configuration exists and is not undefined
      if (config.laws.enabled !== undefined) {
        // If laws.enabled is specified, only return laws explicitly enabled.
        // Keys resolve through every public identity (name/slug/id/legacyId).
        const enabled = config.laws.enabled;
        return ModularLawsRegistry.lawIdentityKeys(law).some(
          key => enabled[key] === true
        );
      }

      // Fallback to individual law config (deprecated format)
      const lawConfig = (config.laws as Record<string, unknown>)[law.id];
      if (lawConfig && typeof lawConfig === 'object') {
        return (lawConfig as { enabled?: boolean }).enabled !== false;
      }

      // Default (no laws.enabled): every law except the opt-in ones. An opt-in
      // law (`defaultEnabled: false`) needs something a default project does not
      // have — a build's stats, a domain vocabulary — and run anyway it reports
      // "not measured" or judges a UI by words that are not its own. It runs
      // when `laws.enabled` names it (the branch above) or when `laws.severity`
      // gives it a severity — the way to turn one on without an allowlist, and
      // what a config that already set its severity meant.
      return LawIdentity.runsWithoutAllowlist(
        law,
        (config.laws as Record<string, unknown>).severity as
          Record<string, unknown> | undefined
      );
    });
  }

  /**
   * Get Pareto-optimized laws (20% that catch 80% of issues)
   */
  static getParetoCore(): ConstitutionalLaw[] {
    return this.getAll().filter(law => law.paretoCore);
  }

  /**
   * Format error result for failed check
   * Extracted for testability
   */
  static formatErrorResult(error: Error, config: RuleOfCodeConfig): LawResult {
    return {
      passed: false,
      message: `❌ Check failed - ${error.message}`,
      score: 0,
      fixable: false,
      config,
    };
  }

  /**
   * Execute law check with error handling
   * Extracted for testability
   */
  static async executeLawCheck(
    law: EnhancedConstitutionalLaw,
    context: LawCheckContext,
    config: RuleOfCodeConfig
  ): Promise<LawResult> {
    try {
      // Get modular law class from mapping
      const mappingKey = law.checkFunction as string;
      // Law checking in progress

      if (mappingKey in this.LAW_CLASS_MAPPING) {
        const LawClass =
          this.LAW_CLASS_MAPPING[
            mappingKey as keyof typeof this.LAW_CLASS_MAPPING
          ];
        // Use modular law implementation
        return LawClass.check(context);
      }
      // No checker resolved for this law's checkFunction.
      // MANUAL/policy laws cannot be auto-verified — surface them honestly as
      // "manual review required" rather than a false green pass.
      if (law.automation === 'MANUAL') {
        return {
          passed: true,
          message: `📋 Manual review required - ${law.title} (policy law, not auto-verified)`,
          score: 100,
          fixable: false,
          config,
        };
      }
      // An AUTOMATED/CONFIGURABLE law with no checker is a RoC wiring bug, NOT a
      // passing project. Fail loudly so it can never silently report compliance.
      return {
        passed: false,
        message: `❌ No checker implementation for "${law.title}" (checkFunction: ${law.checkFunction}) — RoC wiring bug, not a passing project`,
        score: 0,
        fixable: false,
        config,
      };
    } catch (_error) {
      return this.formatErrorResult(_error as Error, config);
    }
  }

  /**
   * Create check function using modular law classes
   */
  private static createModularCheckFunction(
    law: EnhancedConstitutionalLaw,
    lawId: string
  ): (projectRoot: string, config: RuleOfCodeConfig) => Promise<LawResult> {
    return async (
      projectRoot: string,
      config: RuleOfCodeConfig
    ): Promise<LawResult> => {
      // read the slug from the title → enables readable `ignores.byRule` keys
      // (e.g. "Magic Number Prevention" → "magic-number-prevention"), instead
      // of matching only by the hashed lawId.
      const lawConfigKey = law.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const context: LawCheckContext = {
        projectRoot,
        config,
        lawId,
      };

      // global "current law" slug — read by FileFilterUtils.getIgnorePatterns,
      // because many checkers reconstruct the context without lawId along the
      // file-scanning chain. Safe: the audit is sequential (maxConcurrent: 1).
      FileFilterUtils.currentLawConfigKey = lawConfigKey;
      FileFilterUtils.currentProjectRoot = projectRoot;
      try {
        const result = await this.executeLawCheck(law, context, config);
        // Every result echoes the config the law RAN with. Some result
        // builders filled in a minimal default config instead, so a Next app
        // whose laws ran as `react` reported `generic` in six of them (#320).
        return { ...result, config };
      } finally {
        FileFilterUtils.currentLawConfigKey = undefined;
        FileFilterUtils.currentProjectRoot = undefined;
      }
    };
  }

  // === MAPPING METHODS - Made static for testability ===

  static mapCategory(
    enforcement: string,
    automation: string
  ):
    | 'foundational'
    | 'maintainability'
    | 'performance'
    | 'quality'
    | 'security' {
    if (enforcement === 'CRITICAL') return 'foundational';
    if (automation === 'ESLINT' || automation === 'TEST') return 'quality';
    if (automation === 'AUDIT') return 'security';
    if (enforcement === 'HIGH') return 'performance';
    return 'maintainability';
  }

  static mapSeverity(enforcement: string): 'error' | 'info' | 'warning' {
    if (enforcement === 'CRITICAL') return 'error';
    if (enforcement === 'HIGH') return 'error';
    if (enforcement === 'MEDIUM') return 'warning';
    return 'info';
  }

  static mapImpact(enforcement: string): 'high' | 'low' | 'medium' {
    if (enforcement === 'CRITICAL') return 'high';
    if (enforcement === 'HIGH') return 'high';
    if (enforcement === 'MEDIUM') return 'medium';
    return 'low';
  }

  /**
   * Whether a law is in the Pareto core — derived from the registry's own
   * fields by the rule in data/pareto-core (#383), never from a list.
   */
  static isParetoCore(law: EnhancedConstitutionalLaw): boolean {
    this.paretoCore ??= paretoCoreIds(ALL_ENHANCED_CONSTITUTIONAL_LAWS);
    return this.paretoCore.has(law.id);
  }

  private static paretoCore: Set<string> | undefined;

  /**
   * The frameworks a law is about. `requires` is the authority: a law gated
   * on `@ionic/angular` is an Ionic law whatever words its description uses
   * (a card about `ion-router-outlet` never says "Ionic", and was rendered as
   * universal). The description's words still add a framework, so a card
   * without `requires` keeps the tag it had.
   */
  static getApplicableFrameworks(law: EnhancedConstitutionalLaw): string[] {
    const frameworks = new Set<string>();
    if (law.description.includes('Angular')) frameworks.add('angular');
    if (law.description.includes('React')) frameworks.add('react');
    if (law.description.includes('Vue')) frameworks.add('vue');
    if (law.description.includes('Node')) frameworks.add('node');
    if (law.description.includes('TypeScript')) frameworks.add('typescript');
    if (law.description.includes('Ionic')) frameworks.add('ionic');
    if (law.description.includes('Capacitor')) frameworks.add('capacitor');
    for (const framework of this.requiredFrameworks(law.requires))
      frameworks.add(framework);
    return frameworks.size > 0 ? [...frameworks] : ['*'];
  }

  /**
   * Frameworks `requires` implies. Every package of `allDependencies` is
   * required, so each one's framework counts. `anyDependency` is satisfied
   * by any one of its packages, so it names a framework only when EVERY
   * package in it maps to one: `["next", "express"]` is not a React law.
   */
  static requiredFrameworks(requires: LawRequirement | undefined): string[] {
    if (!requires) return [];
    const found = new Set<string>();
    for (const name of requires.allDependencies ?? []) {
      const framework = frameworkOfPackage(name);
      if (framework) found.add(framework);
    }
    const any = (requires.anyDependency ?? []).map(frameworkOfPackage);
    if (any.length > 0 && any.every(Boolean))
      any.forEach(framework => found.add(framework as string));
    return [...found];
  }
}

/** The framework a package belongs to, in the `applicableFrameworks` vocabulary; null for none. */
export function frameworkOfPackage(name: string): string | null {
  if (name.startsWith('@ionic/')) return 'ionic';
  if (name.startsWith('@capacitor/') || name.startsWith('@capacitor-firebase/'))
    return 'capacitor';
  if (name.startsWith('@angular/') || name.startsWith('@ngrx/'))
    return 'angular';
  if (['react', 'react-dom', 'next', '@testing-library/react'].includes(name))
    return 'react';
  if (['vue', 'nuxt'].includes(name)) return 'vue';
  if (name === 'typescript') return 'typescript';
  return null;
}

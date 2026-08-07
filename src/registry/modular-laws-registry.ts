/**
 * Modular Constitutional Laws Registry
 * Uses the new modular architecture for law execution
 */

import { FileFilterUtils } from '../utils/file-filter-utils';
import * as LawIdentity from '../utils/law-identity';

// Sacred Laws Modular Imports
import {
  AutomationFirstLaw,
  ConstitutionalSupremacyLaw,
  ContinuousComplianceLaw,
  ProfessionalExcellenceLaw,
  SacredMetricsLaw,
  TypeScriptStrictLaw,
  ZeroToleranceLaw,
} from '../checkers/sacred-laws';

// Angular Laws Modular Imports
import {
  AngularTestingExcellenceLaw,
  GenericAngularLaw,
  ModernAngularControlFlowLaw,
  NgrxActionsHygieneLaw,
  NgrxEffectsErrorHandlingLaw,
  NgrxStorePatternLaw,
  NxCommandsOnlyLaw,
  OnPushChangeDetectionLaw,
} from '../checkers/angular-laws';

// Git Laws Modular Imports
import {
  BranchGovernanceLaw,
  CommitDescriptionStandardsLaw,
  CommitMessageStandardsLaw,
  SemVerComplianceLaw,
} from '../checkers/git-laws';

// Version Control Laws Modular Imports
import { ConstitutionalComplianceHeadersLaw } from '../checkers/constitutional-laws/constitutional-compliance-headers';

// Angular Laws Imports
import { AngularFormValidationStandardsLaw } from '../checkers/angular-laws/angular-form-validation-standards';
import { AngularLifecycleManagementLaw } from '../checkers/angular-laws/angular-lifecycle-management';
import { AngularServiceLayerArchitectureLaw } from '../checkers/angular-laws/angular-service-layer-architecture';
import { AngularSignalAdoptionLaw } from '../checkers/angular-laws/angular-signal-adoption';
import { LazyLoadingImplementationLaw } from '../checkers/angular-laws/lazy-loading-implementation';
import { NgRxFeatureStoreStructureMandateLaw } from '../checkers/angular-laws/ngrx-feature-store-structure-mandate';
import { NgRxReducersImmutabilityProtectionLaw } from '../checkers/angular-laws/ngrx-reducers-immutability-protection';
import { NgRxRxJSOperatorsSelectionMandateLaw } from '../checkers/angular-laws/ngrx-rxjs-operators-selection-mandate';
import { NgRxSelectorsMemoizationMandateLaw } from '../checkers/angular-laws/ngrx-selectors-memoization-mandate';
import { StandaloneComponentsArchitectureLaw } from '../checkers/angular-laws/standalone-components-architecture';
import { CodeReviewQualityLaw } from '../checkers/git-laws/code-review-quality';
import { CommitSizeControlLaw } from '../checkers/git-laws/commit-size-control';
import { FeatureBranchProtectionLaw } from '../checkers/git-laws/feature-branch-protection';
import { GitHistoryIntegrityLaw } from '../checkers/git-laws/git-history-integrity';
import { GitHookComplianceLaw } from '../checkers/git-laws/git-hook-compliance';
import { MergeConflictPreventionLaw } from '../checkers/git-laws/merge-conflict-prevention';
import { PRWorkflowStandardsLaw } from '../checkers/git-laws/pr-workflow-standards';
import { ReleaseTagStandardsLaw } from '../checkers/git-laws/release-tag-standards';
import {
  BranchProtectionStandardsLaw,
  GitHooksStandardsLaw,
  GitIgnoreStandardsLaw,
} from '../checkers/version-control-laws';

// Documentation Laws Modular Imports
import {
  DocumentationStandardsLaw,
  ProjectStructureStandardsLaw,
} from '../checkers/documentation-laws';

// Code Quality Laws Modular Imports
import {
  CentralizedLoggingLaw,
  CodeComplexityControlLaw,
  CodeDocumentationLaw,
  CodeDuplicationControlLaw,
  DeadCodeEliminationLaw,
  ErrorHandlingCompletenessLaw,
  MagicNumberPreventionLaw,
  NamingConventionEnforcementLaw,
  NoDoubleCastLaw,
  NoExplicitAnyNonNullLaw,
  ObservableCleanupLaw,
  PreferUnionOverEnumLaw,
  TypedHttpBoundariesLaw,
  WebStorageEncapsulationLaw,
  ZeroToleranceStrictLaw,
} from '../checkers/code-quality-laws';
import { FunctionalIoQueryApiLaw } from '../checkers/angular-laws/functional-io-query-api';
import { InjectOverConstructorDiLaw } from '../checkers/angular-laws/inject-over-constructor-di';
import { AliasRepeatedTemplateExpressionsLaw } from '../checkers/angular-laws/alias-repeated-template-expressions';
import { DeclarativeReadSubscriptionsLaw } from '../checkers/angular-laws/declarative-read-subscriptions';
import { DeferHeavyBlocksLaw } from '../checkers/angular-laws/defer-heavy-blocks';
import { NoMethodCallsInTemplatesLaw } from '../checkers/angular-laws/no-method-calls-in-templates';
import { NoSubscribeInEffectLaw } from '../checkers/angular-laws/no-subscribe-in-effect';
import { SideEffectsInNgrxEffectsLaw } from '../checkers/angular-laws/side-effects-in-ngrx-effects';

// Accessibility Laws Modular Imports
import {
  AccessibilityLintingEnforcementLaw,
  DisclosureControlAriaStateLaw,
  ExplicitButtonTypeLaw,
  FormControlLabelingLaw,
  ModalDialogAccessibilityLaw,
} from '../checkers/accessibility-laws';

// Python Laws Modular Imports — FastAPI + Clean Architecture/CQRS domain
import {
  AsyncTestsAreMarkedLaw,
  CleanArchitectureDependencyDirectionLaw,
  CommandsQueriesAreMessagesLaw,
  DependencyInjectionViaDependsLaw,
  DomainLayerFrameworkIndependenceLaw,
  FastApiTypedRequestBodiesLaw,
  FastApiTypedResponsesLaw,
  InsecureDeserializationLaw,
  LockedDependenciesLaw,
  MypyConfiguredLaw,
  NoBareExceptLaw,
  NoBlockingInAsyncLaw,
  NoEvalExecLaw,
  NoHardcodedSecretsPythonLaw,
  NoLiveNetworkInTestsLaw,
  NoMutableDefaultArgumentsLaw,
  NoShellInjectionLaw,
  NoSleepInTestsLaw,
  NoWebFrameworkOutsideInterfaceLaw,
  BanditConfiguredLaw,
  DeclaredConcurrencyBoundariesLaw,
  FloatToleranceInTestsLaw,
  NoAssertGuardsLaw,
  NoSilentExceptionSwallowingLaw,
  NoWallClockInDomainLaw,
  NoWallClockInTestsLaw,
  PipAuditConfiguredLaw,
  PublicDocstringsLaw,
  PyprojectMetadataLaw,
  PythonModuleSizeLaw,
  QueriesAreReadOnlyLaw,
  RequestsHaveTimeoutLaw,
  RuffConfiguredLaw,
  SeededRandomnessLaw,
  SettingsViaBaseSettingsLaw,
  StrictExpectedFailuresLaw,
  TimezoneAwareDatetimesLaw,
} from '../checkers/python-laws';

// Meta-gate laws — integrity of the gate itself (universal; arch proposal 2026-07)
import {
  AuditLivenessLaw,
  ConfigIntegrityGuardLaw,
  GoldenFixtureImmutabilityLaw,
} from '../checkers/meta-gate-laws';

// FE Architecture Laws Modular Imports — frontend audit (stack: frontend)
import {
  DefensiveArrayCoercionLaw,
  NoHostnameGatingLaw,
  NoLayoutTransitionLaw,
  NoPassthroughCastLaw,
  NoRiskLiteralsLaw,
  PollViaSanctionedSourceLaw,
  RequiresSpecLaw,
  RootServiceNoTimerLaw,
  StoresInDataAccessLaw,
  TimerCleanupLaw,
} from '../checkers/fe-architecture-laws';

// Security Laws Modular Imports
import {
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
import { PerformanceBudgetComplianceLaw } from '../laws/performance/performance-budget-compliance';
import { PerformanceMonitoringPolicyLaw } from '../laws/performance/performance-monitoring-policy';
import { PerformanceMonitoringStandardsLaw } from '../laws/performance/performance-monitoring-standards';
import { PerformanceStandardsLaw } from '../laws/performance/performance-standards';

// Angular Laws - Additional Imports
import { NgRxDevToolsIntegrationMandateLaw } from '../laws/angular/ngrx-devtools-integration-mandate';
import { NgRxStateNormalizationMandateLaw } from '../laws/angular/ngrx-state-normalization-mandate';

// Testing Laws Modular Imports
import {
  JestUnitTest100CoverageMandateLaw,
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

import { ComponentSelectorPrefixLaw } from '../checkers/angular-laws/component-selector-prefix';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../data/enhanced-laws';
import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import type {
  ConstitutionalLaw,
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../types/law.types';

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
    const constitution = this.getAllLaws();
    return constitution.filter((law: ConstitutionalLaw) =>
      categories.some(
        category => law.category === category || law.id.includes(category)
      )
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
    // Sacred Laws
    checkAutomationFirst: AutomationFirstLaw,
    checkConstitutionalSupremacy: ConstitutionalSupremacyLaw,
    checkContinuousCompliance: ContinuousComplianceLaw,
    checkProfessionalExcellence: ProfessionalExcellenceLaw,
    checkZeroTolerance: ZeroToleranceLaw,
    checkSacredMetrics: SacredMetricsLaw,
    checkTypeScriptStrict: TypeScriptStrictLaw,

    // Angular Laws
    checkNgrxStorePattern: NgrxStorePatternLaw,
    checkNgrxActionsHygiene: NgrxActionsHygieneLaw,
    checkNgrxEffectsErrorHandling: NgrxEffectsErrorHandlingLaw,
    checkModernControlFlow: ModernAngularControlFlowLaw,
    checkNxCommandsOnly: NxCommandsOnlyLaw,
    checkAngularTestingExcellence: AngularTestingExcellenceLaw,
    checkGenericAngular: GenericAngularLaw,
    checkOnPushChangeDetection: OnPushChangeDetectionLaw,

    // Git Laws
    checkBranchGovernance: BranchGovernanceLaw,
    'CommitMessageStandardsLaw.check': CommitMessageStandardsLaw,
    'CommitDescriptionStandardsLaw.check': CommitDescriptionStandardsLaw,
    checkSemVerCompliance: SemVerComplianceLaw,

    // Version Control Laws
    checkGitIgnoreStandards: GitIgnoreStandardsLaw,
    checkGitHooksStandards: GitHooksStandardsLaw,
    checkBranchProtectionStandards: BranchProtectionStandardsLaw,
    'PRWorkflowStandardsLaw.check': PRWorkflowStandardsLaw,
    'GitHistoryIntegrityLaw.check': GitHistoryIntegrityLaw,
    'FeatureBranchProtectionLaw.check': FeatureBranchProtectionLaw,
    'CommitSizeControlLaw.check': CommitSizeControlLaw,
    'MergeConflictPreventionLaw.check': MergeConflictPreventionLaw,
    'ReleaseTagStandardsLaw.check': ReleaseTagStandardsLaw,
    'CodeReviewQualityLaw.check': CodeReviewQualityLaw,
    'GitHookComplianceLaw.check': GitHookComplianceLaw,
    'ConstitutionalComplianceHeadersLaw.check':
      ConstitutionalComplianceHeadersLaw,

    // Angular Laws
    'StandaloneComponentsArchitectureLaw.check':
      StandaloneComponentsArchitectureLaw,
    'AngularSignalAdoptionLaw.check': AngularSignalAdoptionLaw,
    'LazyLoadingImplementationLaw.check': LazyLoadingImplementationLaw,
    'AngularServiceLayerArchitectureLaw.check':
      AngularServiceLayerArchitectureLaw,
    'AngularFormValidationStandardsLaw.check':
      AngularFormValidationStandardsLaw,
    'AngularLifecycleManagementLaw.check': AngularLifecycleManagementLaw,
    'NgRxSelectorsMemoizationMandateLaw.check':
      NgRxSelectorsMemoizationMandateLaw,
    'NgRxReducersImmutabilityProtectionLaw.check':
      NgRxReducersImmutabilityProtectionLaw,
    'NgRxFeatureStoreStructureMandateLaw.check':
      NgRxFeatureStoreStructureMandateLaw,
    'NgRxRxJSOperatorsSelectionMandateLaw.check':
      NgRxRxJSOperatorsSelectionMandateLaw,
    checkNgrxStateNormalization: NgRxStateNormalizationMandateLaw,
    checkNgrxStateNormalizationMandate: NgRxStateNormalizationMandateLaw,
    checkNgrxDevtools: NgRxDevToolsIntegrationMandateLaw,
    checkNgrxDevToolsIntegrationMandate: NgRxDevToolsIntegrationMandateLaw,
    checkComponentSelectorPrefix: ComponentSelectorPrefixLaw,
    // Documentation Laws
    checkDocumentationStandards: DocumentationStandardsLaw,
    checkProjectStructureStandards: ProjectStructureStandardsLaw,

    // Code Quality Laws
    checkCodeComplexityControl: CodeComplexityControlLaw,
    checkCodeDuplicationControl: CodeDuplicationControlLaw,
    checkDeadCodeElimination: DeadCodeEliminationLaw,
    checkErrorHandlingCompleteness: ErrorHandlingCompletenessLaw,
    checkMagicNumberPrevention: MagicNumberPreventionLaw,
    checkNamingConventionEnforcement: NamingConventionEnforcementLaw,
    checkObservableCleanup: ObservableCleanupLaw,
    checkZeroToleranceStrict: ZeroToleranceStrictLaw,
    checkCodeDocumentation: CodeDocumentationLaw,
    // TypeScript safety laws (v7.2.0)
    'NoExplicitAnyNonNullLaw.check': NoExplicitAnyNonNullLaw,
    'NoDoubleCastLaw.check': NoDoubleCastLaw,
    'TypedHttpBoundariesLaw.check': TypedHttpBoundariesLaw,
    'PreferUnionOverEnumLaw.check': PreferUnionOverEnumLaw,
    // Hygiene laws (v7.2.0)
    'CentralizedLoggingLaw.check': CentralizedLoggingLaw,
    'WebStorageEncapsulationLaw.check': WebStorageEncapsulationLaw,
    // Modern Angular API laws (v7.2.0)
    'FunctionalIoQueryApiLaw.check': FunctionalIoQueryApiLaw,
    'InjectOverConstructorDiLaw.check': InjectOverConstructorDiLaw,
    // Template / performance / NgRx laws (v7.2.0)
    'NoMethodCallsInTemplatesLaw.check': NoMethodCallsInTemplatesLaw,
    'SideEffectsInNgrxEffectsLaw.check': SideEffectsInNgrxEffectsLaw,
    'NoSubscribeInEffectLaw.check': NoSubscribeInEffectLaw,
    'DeclarativeReadSubscriptionsLaw.check': DeclarativeReadSubscriptionsLaw,
    'DeferHeavyBlocksLaw.check': DeferHeavyBlocksLaw,
    'AliasRepeatedTemplateExpressionsLaw.check':
      AliasRepeatedTemplateExpressionsLaw,

    // Accessibility Laws (v7.2.0)
    'AccessibilityLintingEnforcementLaw.check':
      AccessibilityLintingEnforcementLaw,
    'ModalDialogAccessibilityLaw.check': ModalDialogAccessibilityLaw,
    'FormControlLabelingLaw.check': FormControlLabelingLaw,
    'ExplicitButtonTypeLaw.check': ExplicitButtonTypeLaw,
    'DisclosureControlAriaStateLaw.check': DisclosureControlAriaStateLaw,

    // Python Laws (v7.3.0) — FastAPI + Clean Architecture/CQRS
    'DomainLayerFrameworkIndependenceLaw.check':
      DomainLayerFrameworkIndependenceLaw,
    'FastApiTypedResponsesLaw.check': FastApiTypedResponsesLaw,
    'NoBlockingInAsyncLaw.check': NoBlockingInAsyncLaw,
    'DependencyInjectionViaDependsLaw.check': DependencyInjectionViaDependsLaw,
    'FastApiTypedRequestBodiesLaw.check': FastApiTypedRequestBodiesLaw,
    'CleanArchitectureDependencyDirectionLaw.check':
      CleanArchitectureDependencyDirectionLaw,
    'NoWebFrameworkOutsideInterfaceLaw.check':
      NoWebFrameworkOutsideInterfaceLaw,
    'QueriesAreReadOnlyLaw.check': QueriesAreReadOnlyLaw,
    'CommandsQueriesAreMessagesLaw.check': CommandsQueriesAreMessagesLaw,
    'SettingsViaBaseSettingsLaw.check': SettingsViaBaseSettingsLaw,
    'NoMutableDefaultArgumentsLaw.check': NoMutableDefaultArgumentsLaw,
    'NoBareExceptLaw.check': NoBareExceptLaw,
    'AsyncTestsAreMarkedLaw.check': AsyncTestsAreMarkedLaw,
    'NoLiveNetworkInTestsLaw.check': NoLiveNetworkInTestsLaw,
    'NoSleepInTestsLaw.check': NoSleepInTestsLaw,
    'NoEvalExecLaw.check': NoEvalExecLaw,
    'InsecureDeserializationLaw.check': InsecureDeserializationLaw,
    'NoShellInjectionLaw.check': NoShellInjectionLaw,
    'RequestsHaveTimeoutLaw.check': RequestsHaveTimeoutLaw,
    'NoHardcodedSecretsPythonLaw.check': NoHardcodedSecretsPythonLaw,
    'RuffConfiguredLaw.check': RuffConfiguredLaw,
    'MypyConfiguredLaw.check': MypyConfiguredLaw,
    'PyprojectMetadataLaw.check': PyprojectMetadataLaw,
    'LockedDependenciesLaw.check': LockedDependenciesLaw,
    'PublicDocstringsLaw.check': PublicDocstringsLaw,
    'PythonModuleSizeLaw.check': PythonModuleSizeLaw,
    'TimezoneAwareDatetimesLaw.check': TimezoneAwareDatetimesLaw,
    'NoAssertGuardsLaw.check': NoAssertGuardsLaw,
    'StrictExpectedFailuresLaw.check': StrictExpectedFailuresLaw,
    'AuditLivenessLaw.check': AuditLivenessLaw,
    'ConfigIntegrityGuardLaw.check': ConfigIntegrityGuardLaw,
    'GoldenFixtureImmutabilityLaw.check': GoldenFixtureImmutabilityLaw,
    'NoWallClockInDomainLaw.check': NoWallClockInDomainLaw,
    'NoSilentExceptionSwallowingLaw.check': NoSilentExceptionSwallowingLaw,
    'BanditConfiguredLaw.check': BanditConfiguredLaw,
    'PipAuditConfiguredLaw.check': PipAuditConfiguredLaw,
    'DeclaredConcurrencyBoundariesLaw.check': DeclaredConcurrencyBoundariesLaw,
    'SeededRandomnessLaw.check': SeededRandomnessLaw,
    'NoWallClockInTestsLaw.check': NoWallClockInTestsLaw,
    'FloatToleranceInTestsLaw.check': FloatToleranceInTestsLaw,

    // FE Architecture Laws (frontend audit)
    'PollViaSanctionedSourceLaw.check': PollViaSanctionedSourceLaw,
    'RootServiceNoTimerLaw.check': RootServiceNoTimerLaw,
    'StoresInDataAccessLaw.check': StoresInDataAccessLaw,
    'RequiresSpecLaw.check': RequiresSpecLaw,
    'NoLayoutTransitionLaw.check': NoLayoutTransitionLaw,
    'NoHostnameGatingLaw.check': NoHostnameGatingLaw,
    'DefensiveArrayCoercionLaw.check': DefensiveArrayCoercionLaw,
    'NoPassthroughCastLaw.check': NoPassthroughCastLaw,
    'TimerCleanupLaw.check': TimerCleanupLaw,
    'NoRiskLiteralsLaw.check': NoRiskLiteralsLaw,

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
    checkSecurityStandards: XSSPreventionLaw,
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
      applicableFrameworks: this.getApplicableFrameworks(law),
      legacyId: law.legacyId,
      stack: law.stack,
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
    name?: string;
    id?: string;
    legacyId?: number | string;
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
    projectType: string | undefined
  ): boolean {
    return LawIdentity.lawAppliesToProjectType(stack, projectType);
  }

  /** Identity keys that resolve to exactly ONE law — the only ones a config may use. */
  static unambiguousIdentityKeys(law: {
    name?: string;
    id?: string;
    legacyId?: number | string;
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
      const notApplicable = (config.laws as Record<string, unknown>)
        .notApplicable as Record<string, string> | undefined;
      if (
        notApplicable &&
        ModularLawsRegistry.unambiguousIdentityKeys(law).some(
          key => notApplicable[key]
        )
      ) {
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

      // Default: return all laws if no laws.enabled specified (all 108 laws)
      return true;
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
      try {
        return await this.executeLawCheck(law, context, config);
      } finally {
        FileFilterUtils.currentLawConfigKey = undefined;
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

  static isParetoCore(law: EnhancedConstitutionalLaw): boolean {
    // Import the actual Pareto categories to ensure consistency
    const { PARETO_CATEGORIES } = require('../data/pareto-optimization');
    return PARETO_CATEGORIES.HIGH_IMPACT.includes(law.id);
  }

  static getApplicableFrameworks(law: EnhancedConstitutionalLaw): string[] {
    const frameworks: string[] = [];
    if (law.description.includes('Angular')) frameworks.push('angular');
    if (law.description.includes('React')) frameworks.push('react');
    if (law.description.includes('Vue')) frameworks.push('vue');
    if (law.description.includes('Node')) frameworks.push('node');
    if (law.description.includes('TypeScript')) frameworks.push('typescript');
    return frameworks.length > 0 ? frameworks : ['*'];
  }
}

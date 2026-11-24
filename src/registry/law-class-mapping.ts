/**
 * The checkFunction → law class table the registry dispatches through
 * (ModularLawsRegistry.LAW_CLASS_MAPPING). A table of data: moved out of the
 * registry unchanged, in order (#559).
 */

import {
  AutomationFirstLaw,
  ConstitutionalSupremacyLaw,
  ContinuousComplianceLaw,
  ProfessionalExcellenceLaw,
  SacredMetricsLaw,
  TypeScriptStrictLaw,
  ZeroToleranceLaw,
} from '../checkers/sacred-laws';
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
import {
  BranchGovernanceLaw,
  CommitDescriptionStandardsLaw,
  CommitMessageStandardsLaw,
  SemVerComplianceLaw,
} from '../checkers/git-laws';
import { ConstitutionalComplianceHeadersLaw } from '../checkers/constitutional-laws/constitutional-compliance-headers';
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
import {
  DocumentationStandardsLaw,
  ProjectStructureStandardsLaw,
} from '../checkers/documentation-laws';
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
import {
  AccessibilityLintingEnforcementLaw,
  DisclosureControlAriaStateLaw,
  ExplicitButtonTypeLaw,
  FormControlLabelingLaw,
  ModalDialogAccessibilityLaw,
} from '../checkers/accessibility-laws';
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
import {
  AuditLivenessLaw,
  ConfigIntegrityGuardLaw,
  GoldenFixtureImmutabilityLaw,
} from '../checkers/meta-gate-laws';
import {
  DefensiveArrayCoercionLaw,
  NoHostnameGatingLaw,
  NoLayoutTransitionLaw,
  NoPassthroughCastLaw,
  PollViaSanctionedSourceLaw,
  RequiresSpecLaw,
  RootServiceNoTimerLaw,
  StoresInDataAccessLaw,
  TimerCleanupLaw,
} from '../checkers/fe-architecture-laws';
import {
  ClientIpSingleBoundaryLaw,
  GuardExemptionMatchesARouteLaw,
  NextClientEnvPublicOnlyLaw,
  NextErrorBoundariesDeclaredLaw,
  NextProxyPlacementAndMatcherLaw,
  NextPublicEnvIsBuildTimeLaw,
  NextRouteHandlerGuardedLaw,
  NextServerActionAuthorizesLaw,
  NextServerOnlyBoundaryLaw,
} from '../checkers/next-laws';
import {
  CapacitorAndroidBackupScopedLaw,
  CapacitorAndroidCleartextDebugOnlyLaw,
  CapacitorDeepLinkContractLaw,
  CapacitorFirebaseNativeConfigNotSkippedLaw,
  CapacitorIosPrivacyManifestDeclaredLaw,
  CapacitorAndroidBackHasOneOwnerLaw,
  CapacitorDurableStateOffWebviewStorageLaw,
  CapacitorListenerHandlesReleasedLaw,
  CapacitorLocalPluginContractLaw,
  CapacitorLoggingNeverProductionLaw,
  CapacitorSigningSecretsOutsideRepoLaw,
  CapacitorNoDevOnlyServerKeysLaw,
  CapacitorPluginConfigDeclaredLaw,
  CapacitorPluginPlatformDeclarationsLaw,
  CapacitorPluginStubHasContractTestLaw,
  CapacitorServiceWorkerNativeDecisionLaw,
  CapacitorSinglePlatformBoundaryLaw,
  CapacitorSyncArtefactsMatchDependenciesLaw,
  CapacitorWebviewOriginDeclaredLaw,
} from '../checkers/capacitor-laws';
import {
  PrimaryLocaleFontPreloadedLaw,
  ServerlessDeployPinsResourcesLaw,
  StartupRequestFanOutLaw,
} from '../checkers/client-deploy-laws';
import {
  HostingRewriteRegionMatchesDeployLaw,
  JobDefinitionDumpsMaskedLaw,
  ProxyTargetKeepsOriginHostLaw,
  TestBuildsUseOwnFirebaseConfigLaw,
  WorkerPublicUrlsDeclaredLaw,
} from '../checkers/edge-deploy-laws';
import {
  DrizzleMigrationJournalIntegrityLaw,
  GuardFunctionHasProductionCallerLaw,
  RetentionRegistryCoversSchemaLaw,
  SqlCheckConstraintNullPassesLaw,
  TsconfigExcludeLeavesCodeUntypedLaw,
} from '../checkers/integrity-laws';
import {
  LatencyBudgetHarnessRealismLaw,
  TestServerLoopbackAddressMatchLaw,
  TracingExplainsLatencyLaw,
} from '../checkers/measurement-laws';
import {
  AsyncCacheSingleFlightLaw,
  DatabaseReadCacheSafetyLaw,
  PerfHarnessMatchesProductionLaw,
  TestRigKeepsRouteGuardsLaw,
} from '../checkers/cache-harness-laws';
import {
  NextOpenRedirectGuardedLaw,
  ReactDangerousHtmlGuardedLaw,
  ReactHrefSchemeGuardedLaw,
} from '../checkers/react-laws';
import {
  IonicE2eLocatorsTargetTheShownPageLaw,
  IonicEdgeChromePaysSafeAreaLaw,
  IonicFixedContentInFixedSlotLaw,
  IonicGestureTouchActionLaw,
  IonicIconsRegisteredLaw,
  IonicLeaveCancelsWhatEnterStartedLaw,
  IonicNavigationSpecsMountTheOutletLaw,
  IonicNoSkipLocationChangeLaw,
  IonicPageStateReadOnEnterLaw,
  IonicRouteReuseStrategyProvidedLaw,
  IonicScrollThroughIonContentLaw,
  IonicSessionExitUsesNavigateRootLaw,
  IonicSingleBuildSystemLaw,
  IonicUniqueUrlKeyPerViewLaw,
  IonicViewHooksOnlyOnPagesLaw,
  IonicViewLifecycleInterfacesLaw,
  IonicViewportFitCoverLaw,
} from '../checkers/ionic-laws';
import {
  HtmlLangDeclaredLaw,
  NextClientPropsSerializableLaw,
  NextHeavyLibInClientGraphLaw,
  NextImageHasDimensionsLaw,
  NextInternalLinkComponentLaw,
  NextLoadingForAsyncPageLaw,
  NextMetadataDeclaredLaw,
  NextRouteJsBudgetLaw,
  NextSegmentConfigConsistentLaw,
  NextThirdPartyScriptDeclaredLaw,
  NextUseClientAtLeavesLaw,
} from '../checkers/next-laws';
import {
  ClientFetchResponseCheckedLaw,
  ReactContextValueStableLaw,
  ReactEffectFetchRaceGuardedLaw,
  ReactEffectResourceCleanupLaw,
  ReactHooksLintEnforcedLaw,
  ReactListKeyStabilityLaw,
  ReactPollVisibilityGatedLaw,
  ReactRenderNoBrowserGlobalLaw,
  ReactStoreSubscriptionUsesSyncExternalStoreLaw,
} from '../checkers/react-laws';
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
import {
  BundleSizeOptimizationLaw,
  MemoryManagementLaw,
} from '../checkers/performance-laws';
import { BundleOptimizationStrategyLaw } from '../laws/performance/bundle-optimization-strategy';
import { CdnCachingStrategyLaw } from '../laws/performance/cdn-caching-strategy';
import { CoreWebVitalsComplianceLaw } from '../laws/performance/core-web-vitals-compliance';
import { DatabaseQueryOptimizationLaw } from '../laws/performance/database-query-optimization';
import {
  CountWithAggregationLaw,
  DocumentReadOncePerRequestLaw,
  IndependentAwaitsRunConcurrentlyLaw,
} from '../checkers/request-path-laws';
import { PerformanceBudgetComplianceLaw } from '../laws/performance/performance-budget-compliance';
import { PerformanceMonitoringPolicyLaw } from '../laws/performance/performance-monitoring-policy';
import { PerformanceMonitoringStandardsLaw } from '../laws/performance/performance-monitoring-standards';
import { PerformanceStandardsLaw } from '../laws/performance/performance-standards';
import { NgRxDevToolsIntegrationMandateLaw } from '../laws/angular/ngrx-devtools-integration-mandate';
import { NgRxStateNormalizationMandateLaw } from '../laws/angular/ngrx-state-normalization-mandate';
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
import { EnvironmentParityStandardsLaw } from '../checkers/deployment-laws';
import { AutomatedCodeQualityGatesLaw } from '../laws/deployment/automated-code-quality-gates';
import { CicdConstitutionalTribunalLaw } from '../laws/deployment/cicd-constitutional-tribunal';
import { HealthCheckMonitoringLaw } from '../laws/deployment/health-check-monitoring';
import { LaunchReadinessChecklistLaw } from '../laws/deployment/launch-readiness-checklist';
import { PreDeploymentChecklistLaw } from '../laws/deployment/pre-deployment-checklist';
import { PrePrQualityGatesLaw } from '../laws/deployment/pre-pr-quality-gates';
import { ErrorHandlingStandardsLaw } from '../laws/documentation/error-handling-standards';
import { IncidentResponseProtocolLaw } from '../laws/documentation/incident-response-protocol';
import { InternationalizationCompliancePolicyLaw } from '../laws/documentation/internationalization-compliance-policy';
import { MdFooterFooterConsistencyLaw } from '../laws/documentation/md-footer-footer-consistency';
import { MdFooterTemplateLaw } from '../laws/documentation/md-footer-template';
import { StrategicDocumentUpdatesLaw } from '../laws/documentation/strategic-document-updates';
import { TodoManagementLaw } from '../laws/documentation/todo-management';
import { TodoManagementStandardsLaw } from '../laws/documentation/todo-management-standards';
import { ComponentSelectorPrefixLaw } from '../checkers/angular-laws/component-selector-prefix';

export const LAW_CLASS_MAPPING = {
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
  'AngularFormValidationStandardsLaw.check': AngularFormValidationStandardsLaw,
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
  'NoWebFrameworkOutsideInterfaceLaw.check': NoWebFrameworkOutsideInterfaceLaw,
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

  // Next.js Laws (gated on next; Client IP Single Boundary on any Node HTTP server)
  'NextServerActionAuthorizesLaw.check': NextServerActionAuthorizesLaw,
  'NextRouteHandlerGuardedLaw.check': NextRouteHandlerGuardedLaw,
  'NextServerOnlyBoundaryLaw.check': NextServerOnlyBoundaryLaw,
  'NextClientEnvPublicOnlyLaw.check': NextClientEnvPublicOnlyLaw,
  'NextProxyPlacementAndMatcherLaw.check': NextProxyPlacementAndMatcherLaw,
  'NextErrorBoundariesDeclaredLaw.check': NextErrorBoundariesDeclaredLaw,
  'NextPublicEnvIsBuildTimeLaw.check': NextPublicEnvIsBuildTimeLaw,
  'GuardExemptionMatchesARouteLaw.check': GuardExemptionMatchesARouteLaw,
  'ClientIpSingleBoundaryLaw.check': ClientIpSingleBoundaryLaw,

  // Capacitor Laws (gated on @capacitor/core + a Capacitor config)
  'CapacitorLoggingNeverProductionLaw.check':
    CapacitorLoggingNeverProductionLaw,
  'CapacitorWebviewOriginDeclaredLaw.check': CapacitorWebviewOriginDeclaredLaw,
  'CapacitorNoDevOnlyServerKeysLaw.check': CapacitorNoDevOnlyServerKeysLaw,
  'CapacitorPluginConfigDeclaredLaw.check': CapacitorPluginConfigDeclaredLaw,
  'CapacitorSinglePlatformBoundaryLaw.check':
    CapacitorSinglePlatformBoundaryLaw,
  'CapacitorPluginPlatformDeclarationsLaw.check':
    CapacitorPluginPlatformDeclarationsLaw,
  'CapacitorDeepLinkContractLaw.check': CapacitorDeepLinkContractLaw,
  'CapacitorSyncArtefactsMatchDependenciesLaw.check':
    CapacitorSyncArtefactsMatchDependenciesLaw,
  // Capacitor native-shell laws (gated on the platform package as well)
  'CapacitorAndroidCleartextDebugOnlyLaw.check':
    CapacitorAndroidCleartextDebugOnlyLaw,
  'CapacitorFirebaseNativeConfigNotSkippedLaw.check':
    CapacitorFirebaseNativeConfigNotSkippedLaw,
  'CapacitorAndroidBackupScopedLaw.check': CapacitorAndroidBackupScopedLaw,
  'CapacitorIosPrivacyManifestDeclaredLaw.check':
    CapacitorIosPrivacyManifestDeclaredLaw,
  'CapacitorSigningSecretsOutsideRepoLaw.check':
    CapacitorSigningSecretsOutsideRepoLaw,

  // Capacitor bridge laws (back button, local plugins, listeners, web-side decisions)
  'CapacitorAndroidBackHasOneOwnerLaw.check':
    CapacitorAndroidBackHasOneOwnerLaw,
  'CapacitorLocalPluginContractLaw.check': CapacitorLocalPluginContractLaw,
  'CapacitorListenerHandlesReleasedLaw.check':
    CapacitorListenerHandlesReleasedLaw,
  'CapacitorServiceWorkerNativeDecisionLaw.check':
    CapacitorServiceWorkerNativeDecisionLaw,
  'CapacitorDurableStateOffWebviewStorageLaw.check':
    CapacitorDurableStateOffWebviewStorageLaw,
  'CapacitorPluginStubHasContractTestLaw.check':
    CapacitorPluginStubHasContractTestLaw,

  // React Laws (gated on react / next)
  'ReactDangerousHtmlGuardedLaw.check': ReactDangerousHtmlGuardedLaw,
  'ReactHrefSchemeGuardedLaw.check': ReactHrefSchemeGuardedLaw,
  'NextOpenRedirectGuardedLaw.check': NextOpenRedirectGuardedLaw,

  // React Laws (gated on react; React Render No Browser Global on next)
  'ReactHooksLintEnforcedLaw.check': ReactHooksLintEnforcedLaw,
  'ReactEffectResourceCleanupLaw.check': ReactEffectResourceCleanupLaw,
  'ReactEffectFetchRaceGuardedLaw.check': ReactEffectFetchRaceGuardedLaw,
  'ReactContextValueStableLaw.check': ReactContextValueStableLaw,
  'ReactStoreSubscriptionUsesSyncExternalStoreLaw.check':
    ReactStoreSubscriptionUsesSyncExternalStoreLaw,
  'ReactRenderNoBrowserGlobalLaw.check': ReactRenderNoBrowserGlobalLaw,
  'ClientFetchResponseCheckedLaw.check': ClientFetchResponseCheckedLaw,
  'ReactPollVisibilityGatedLaw.check': ReactPollVisibilityGatedLaw,
  'ReactListKeyStabilityLaw.check': ReactListKeyStabilityLaw,

  // Next.js client laws (gated on next)
  'NextMetadataDeclaredLaw.check': NextMetadataDeclaredLaw,
  'NextHeavyLibInClientGraphLaw.check': NextHeavyLibInClientGraphLaw,
  'NextImageHasDimensionsLaw.check': NextImageHasDimensionsLaw,
  'NextThirdPartyScriptDeclaredLaw.check': NextThirdPartyScriptDeclaredLaw,
  'HtmlLangDeclaredLaw.check': HtmlLangDeclaredLaw,
  'NextInternalLinkComponentLaw.check': NextInternalLinkComponentLaw,
  'NextUseClientAtLeavesLaw.check': NextUseClientAtLeavesLaw,
  'NextClientPropsSerializableLaw.check': NextClientPropsSerializableLaw,
  'NextRouteJsBudgetLaw.check': NextRouteJsBudgetLaw,
  'NextSegmentConfigConsistentLaw.check': NextSegmentConfigConsistentLaw,
  'NextLoadingForAsyncPageLaw.check': NextLoadingForAsyncPageLaw,

  // Integrity Laws (migrations, CHECKs, guards, tsconfig, retention)
  'DrizzleMigrationJournalIntegrityLaw.check':
    DrizzleMigrationJournalIntegrityLaw,
  'SqlCheckConstraintNullPassesLaw.check': SqlCheckConstraintNullPassesLaw,
  'GuardFunctionHasProductionCallerLaw.check':
    GuardFunctionHasProductionCallerLaw,
  'TsconfigExcludeLeavesCodeUntypedLaw.check':
    TsconfigExcludeLeavesCodeUntypedLaw,
  'RetentionRegistryCoversSchemaLaw.check': RetentionRegistryCoversSchemaLaw,

  // Client start-up and deploy-settings laws
  'StartupRequestFanOutLaw.check': StartupRequestFanOutLaw,
  'PrimaryLocaleFontPreloadedLaw.check': PrimaryLocaleFontPreloadedLaw,
  'ServerlessDeployPinsResourcesLaw.check': ServerlessDeployPinsResourcesLaw,
  // Edge proxy and deploy-security laws
  'ProxyTargetKeepsOriginHostLaw.check': ProxyTargetKeepsOriginHostLaw,
  'WorkerPublicUrlsDeclaredLaw.check': WorkerPublicUrlsDeclaredLaw,
  'HostingRewriteRegionMatchesDeployLaw.check':
    HostingRewriteRegionMatchesDeployLaw,
  'TestBuildsUseOwnFirebaseConfigLaw.check': TestBuildsUseOwnFirebaseConfigLaw,
  'JobDefinitionDumpsMaskedLaw.check': JobDefinitionDumpsMaskedLaw,
  // Measurement Laws (latency budget harness, tracing, test-server loopback)
  'LatencyBudgetHarnessRealismLaw.check': LatencyBudgetHarnessRealismLaw,
  'TracingExplainsLatencyLaw.check': TracingExplainsLatencyLaw,
  'TestServerLoopbackAddressMatchLaw.check': TestServerLoopbackAddressMatchLaw,
  // Cache and harness laws
  'DatabaseReadCacheSafetyLaw.check': DatabaseReadCacheSafetyLaw,
  'AsyncCacheSingleFlightLaw.check': AsyncCacheSingleFlightLaw,
  'TestRigKeepsRouteGuardsLaw.check': TestRigKeepsRouteGuardsLaw,
  'PerfHarnessMatchesProductionLaw.check': PerfHarnessMatchesProductionLaw,

  // Ionic Laws (gated on an Ionic binding)
  'IonicViewLifecycleInterfacesLaw.check': IonicViewLifecycleInterfacesLaw,
  'IonicPageStateReadOnEnterLaw.check': IonicPageStateReadOnEnterLaw,
  'IonicLeaveCancelsWhatEnterStartedLaw.check':
    IonicLeaveCancelsWhatEnterStartedLaw,
  'IonicNoSkipLocationChangeLaw.check': IonicNoSkipLocationChangeLaw,
  'IonicUniqueUrlKeyPerViewLaw.check': IonicUniqueUrlKeyPerViewLaw,
  'IonicSessionExitUsesNavigateRootLaw.check':
    IonicSessionExitUsesNavigateRootLaw,
  'IonicRouteReuseStrategyProvidedLaw.check':
    IonicRouteReuseStrategyProvidedLaw,
  'IonicNavigationSpecsMountTheOutletLaw.check':
    IonicNavigationSpecsMountTheOutletLaw,
  'IonicE2eLocatorsTargetTheShownPageLaw.check':
    IonicE2eLocatorsTargetTheShownPageLaw,

  // Ionic rendering-model laws (gated on an Ionic binding)
  'IonicViewHooksOnlyOnPagesLaw.check': IonicViewHooksOnlyOnPagesLaw,
  'IonicSingleBuildSystemLaw.check': IonicSingleBuildSystemLaw,
  'IonicIconsRegisteredLaw.check': IonicIconsRegisteredLaw,
  'IonicScrollThroughIonContentLaw.check': IonicScrollThroughIonContentLaw,
  'IonicViewportFitCoverLaw.check': IonicViewportFitCoverLaw,
  'IonicEdgeChromePaysSafeAreaLaw.check': IonicEdgeChromePaysSafeAreaLaw,
  'IonicGestureTouchActionLaw.check': IonicGestureTouchActionLaw,
  'IonicFixedContentInFixedSlotLaw.check': IonicFixedContentInFixedSlotLaw,

  // Security Laws
  checkEnvironmentVariables: EnvironmentVariablesLaw,
  checkXSSPrevention: XSSPreventionLaw,
  checkAPISecurityStandards: ApiSecurityStandardsLaw,
  checkDependencySecurityScanning: DependencySecurityScanningLaw,
  'EnvironmentSecurityEnforcementLaw.check': EnvironmentSecurityEnforcementLaw,
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

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
  CapacitorLoggingNeverProductionLaw,
  CapacitorNoDevOnlyServerKeysLaw,
  CapacitorPluginConfigDeclaredLaw,
  CapacitorPluginPlatformDeclarationsLaw,
  CapacitorSinglePlatformBoundaryLaw,
  CapacitorWebviewOriginDeclaredLaw,
} from '../checkers/capacitor-laws';
import { NgRxDevToolsIntegrationMandateLaw } from '../laws/angular/ngrx-devtools-integration-mandate';
import { NgRxStateNormalizationMandateLaw } from '../laws/angular/ngrx-state-normalization-mandate';
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
};

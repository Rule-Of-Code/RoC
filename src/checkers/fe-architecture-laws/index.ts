/**
 * FE Architecture Laws — from the frontend architecture audit (regex/string on
 * .ts/.html/.scss; gated on an Angular project, stack: frontend).
 */

export { FeArchLawBase } from './fe-arch-law-base';
export { StoresInDataAccessLaw } from './stores-in-data-access';
export { RootServiceNoTimerLaw } from './root-service-no-timer';
export { PollViaSanctionedSourceLaw } from './poll-via-sanctioned-source';
export { RequiresSpecLaw } from './requires-spec';
export { NoLayoutTransitionLaw } from './no-layout-transition';
export { NoHostnameGatingLaw } from './no-hostname-gating';
export { DefensiveArrayCoercionLaw } from './defensive-array-coercion';
export { NoPassthroughCastLaw } from './no-passthrough-cast';
export { TimerCleanupLaw } from './timer-cleanup';
export { NoRiskLiteralsLaw } from './no-risk-literals';

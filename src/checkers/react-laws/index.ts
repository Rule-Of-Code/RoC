/**
 * React Laws — what React's runtime assumes and does not enforce (effects
 * that clean up and do not race, renders that touch no browser global, keys
 * and context values that keep their identity), and what a React or Next.js
 * app does with the data it renders. Read on the syntax tree with the
 * project's own TypeScript; selected only where a workspace manifest
 * declares the package the law is about.
 */

export { ClientFetchResponseCheckedLaw } from './client-fetch-response-checked';
export { NextOpenRedirectGuardedLaw } from './next-open-redirect-guarded';
export { ReactContextValueStableLaw } from './react-context-value-stable';
export { ReactDangerousHtmlGuardedLaw } from './react-dangerous-html-guarded';
export { ReactEffectFetchRaceGuardedLaw } from './react-effect-fetch-race-guarded';
export { ReactEffectResourceCleanupLaw } from './react-effect-resource-cleanup';
export { ReactHooksLintEnforcedLaw } from './react-hooks-lint-enforced';
export { ReactHrefSchemeGuardedLaw } from './react-href-scheme-guarded';
export { ReactListKeyStabilityLaw } from './react-list-key-stability';
export { ReactPollVisibilityGatedLaw } from './react-poll-visibility-gated';
export { ReactRenderNoBrowserGlobalLaw } from './react-render-no-browser-global';
export { ReactStoreSubscriptionUsesSyncExternalStoreLaw } from './react-store-subscription-uses-sync-external-store';

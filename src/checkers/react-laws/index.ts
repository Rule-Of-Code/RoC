/**
 * React Laws — what React's runtime assumes and does not enforce: effects
 * that clean up and do not race, renders that touch no browser global, keys
 * and context values that keep their identity. Selected only where the
 * project declares react (or next).
 */

export { ReactEffectResourceCleanupLaw } from './react-effect-resource-cleanup';
export { ReactHooksLintEnforcedLaw } from './react-hooks-lint-enforced';

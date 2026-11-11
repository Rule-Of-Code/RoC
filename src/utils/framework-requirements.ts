/**
 * The `requires` of the laws that are about one framework or library.
 *
 * `stack: "frontend"` admits Angular, React, Vue and Ionic alike, so a law
 * about OnPush, NgRx or `next/image` that is gated by stack alone runs where
 * its subject does not exist. There it either inspects nothing and reports
 * "compliance verified", or demands an artefact of a framework the project
 * does not use — and the only way to pass is to add a fake one. Both teach
 * the team to stop reading the gate. A law here is gated by the package its
 * subject belongs to, so it is not selected and not counted without it.
 *
 * Dependencies are read from every workspace manifest (see law-requirements),
 * so a monorepo that declares the framework only in an app still selects them.
 */

import type { LawRequirement } from '../types/enhanced-law.types';

/** Angular itself: components, templates, DI, the router's `loadChildren`. */
export const REQUIRES_ANGULAR: LawRequirement = { anyDependency: ['@angular/core'] };

/** NgRx: the store, its actions, reducers, effects and selectors. */
export const REQUIRES_NGRX: LawRequirement = { anyDependency: ['@ngrx/store'] };

/** RxJS: Observables and their subscriptions. */
export const REQUIRES_RXJS: LawRequirement = { anyDependency: ['rxjs'] };

/** React: components, hooks, JSX. Next, Remix and Ionic React all declare it. */
export const REQUIRES_REACT: LawRequirement = { anyDependency: ['react'] };

/** Next.js: the App Router, Server Components, route handlers, `next/*`. */
export const REQUIRES_NEXT: LawRequirement = { anyDependency: ['next'] };

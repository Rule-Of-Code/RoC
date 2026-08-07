/**
 * Angular-specific Laws Data Module
 * Framework-specific laws for Angular applications
 * Now using hash-based unique IDs for better maintainability
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const ANGULAR_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Constitutional Compliance Headers',
      'All TypeScript files must have proper FileHeaderComplianceAnalyzer constitutional compliance headers',
      'angular'
    ),
    legacyId: 30,
    article: 'IV',
    subsection: '4.1',
    title: 'Constitutional Compliance Headers',
    rationale:
      'A file header is where a repo states its license, authorship and the rules it lives under — without it, provenance and terms are a guess. This law asks that the header exist and be applied automatically, not by memory.',
    satisfiedBy: { typescript: 'Keep a header template (config/header-template.txt), a CONSTITUTION.md, and automation (a script or hook) that stamps the header on new files.' },
    detectionLimits: [
      'Presence and substring only — a file counts as \'headered\' if the word license/copyright/@author/@version appears ANYWHERE in it (a URL, a dep name, a string).',
      'Samples at most 20 files, depth 3, under src/.',
      'Universal, not Angular-gated.',
    ],
    emoji: '📋',
    description:
      'All TypeScript files must have proper FileHeaderComplianceAnalyzer headers',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'typescript',
    defaultEnabled: false,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'ConstitutionalComplianceHeadersLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.1: Missing compliance headers',
    remediation:
      'Add proper file headers with FileHeaderComplianceAnalyzer information',
  },

  {
    id: generateLawId(
      'OnPush Change Detection Strategy',
      'Components must use OnPush change detection for optimal performance',
      'angular'
    ),
    legacyId: 31,
    article: 'IV',
    subsection: '4.2',
    title: 'OnPush Change Detection Strategy',
    rationale:
      'Default change detection re-checks every component on every event — fine for a small app, a bottleneck for a large one. OnPush tells Angular a component changes only when its inputs do, and that is most of a real app\'s performance budget.',
    satisfiedBy: { angular: 'Add changeDetection: ChangeDetectionStrategy.OnPush to components, especially presentational and @Input-driven ones.' },
    detectionLimits: [
      'Substring-matches ChangeDetectionStrategy.OnPush (a match in a comment counts); only .component.ts.',
      'The "should use OnPush" heuristic fires on the bare word `async` anywhere in a component — a near-universal flag.',
      'A project with no components fails rather than passing; Angular-flavoured but not version-gated.',
    ],
    emoji: '⚡',
    description:
      'Components must use OnPush change detection for optimal performance',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkOnPushChangeDetection',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.2: OnPush change detection required',
    remediation:
      'Set changeDetection: ChangeDetectionStrategy.OnPush in component decorator',
  },

  {
    id: generateLawId(
      'Standalone Components Architecture',
      'Use Angular 17+ standalone components instead of NgModules',
      'angular'
    ),
    legacyId: 33,
    article: 'IV',
    subsection: '4.4',
    title: 'Standalone Components Architecture',
    rationale:
      'Standalone components drop the NgModule boilerplate that made Angular heavy to learn and slow to tree-shake — a component that declares its own imports is one you can move, test and lazy-load on its own.',
    satisfiedBy: { angular: 'Make components standalone (standalone: true where required) and bootstrap with bootstrapApplication, not AppModule.' },
    detectionLimits: [
      'It reads the Angular major version to decide: on v19+ a component counts as standalone unless it says `standalone: false`, before v19 only if it says `standalone: true`. An unreadable version keeps the pre-v19 reading.',
      'main.ts checks are literal substrings; a `standalone: true` in a comment passes.',
      'Not version-gated — it does not read the Angular version before judging standalone.',
    ],
    emoji: '🏗️',
    description: 'Use Angular 17+ standalone components instead of NgModules',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'CONFIGURABLE',
    checkFunction: 'StandaloneComponentsArchitectureLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.4: NgModule usage detected',
    remediation:
      'Migrate to standalone components for better tree-shaking and performance',
  },

  {
    id: generateLawId(
      'Modern Angular Control Flow',
      'Use Angular 17+ @if/@for/@switch control flow instead of structural directives',
      'angular'
    ),
    legacyId: 34,
    article: 'IV',
    subsection: '4.5',
    title: 'Modern Angular Control Flow',
    rationale:
      'Angular\'s built-in @if / @for / @switch are faster and typechecked where *ngIf / *ngFor were neither. This law asks that a v18+ project use the block control flow, not the legacy structural directives.',
    satisfiedBy: { angular: 'Use @if / @for (with track) / @switch instead of *ngIf / *ngFor / *ngSwitch; do not mix the two in one template.' },
    detectionLimits: [
      'Raw substring over .ts/.html/.scss/.css — a `*ngIf` in a comment, a string, or TS code counts, and .scss/.css are scanned pointlessly; only three directives are matched.',
      'Gated on the Angular version parsing to >= 18; a non-numeric version string makes it pass vacuously.',
      'Regex over raw text, no AST — it cannot tell a template directive from the same token in code.',
    ],
    emoji: '🔄',
    description:
      'Use Angular 17+ @if/@for/@switch control flow instead of structural directives',
    priority: 'LOW',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: false,
    defaultSeverity: 'info',
    automation: 'CONFIGURABLE',
    checkFunction: 'checkModernControlFlow',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.5: Legacy control flow detected',
    remediation:
      'Replace *ngIf/*ngFor/*ngSwitch with modern @if/@for/@switch syntax',
  },

  // Extended Angular Laws (35-39)
  {
    id: generateLawId(
      'Angular Signal Adoption',
      'Adopt Angular Signals for reactive state management',
      'angular'
    ),
    legacyId: 35,
    article: 'IV',
    subsection: '4.6',
    title: 'Angular Signal Adoption',
    rationale:
      'Signals make a component\'s state explicit and its change detection precise — a BehaviorSubject for component state is the old, leakier way to say the same thing. This law nudges component state toward signals.',
    satisfiedBy: { angular: 'Use signal()/computed()/input()/model() for component state instead of a private BehaviorSubject; give every signal an initial value.' },
    detectionLimits: [
      'The \'signal used but not imported\' check parses the named specifiers of each import, so grouped, multiline, `import type` and aliased forms all count — but it never resolves the module path, so a `signal` imported from anywhere satisfies it.',
      'The Subject check strips comments but not strings and matches by filename suffix, not framework detection; `Signal<` matches inside `WritableSignal<` (double-count).',
      'Regex over source, no AST — a Subject in a string literal is not distinguished.',
    ],
    emoji: '📡',
    description: 'Adopt Angular Signals for reactive state management',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'CONFIGURABLE',
    checkFunction: 'AngularSignalAdoptionLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.6: Angular Signals not adopted',
    remediation: 'Migrate to Angular Signals for reactive state management',
  },

  {
    id: generateLawId(
      'Lazy Loading Implementation',
      'All feature modules must implement lazy loading',
      'angular'
    ),
    legacyId: 36,
    article: 'IV',
    subsection: '4.7',
    title: 'Lazy Loading Implementation',
    rationale:
      'Loading the whole app up front means the user waits for the checkout page to see the home page. Lazy routes send each feature\'s code only when navigated to — the difference between a fast first paint and a slow one.',
    satisfiedBy: { angular: 'Lazy-load routes with loadChildren / loadComponent and `() => import(...)`; avoid eager component-only routes for heavy features.' },
    detectionLimits: [
      'Both lazy forms count (loadChildren and loadComponent), and preloading is recognised from app.module.ts, app.config.ts or main.ts (preloadingStrategy / PreloadAllModules / withPreloading).',
      'Routing detection is filename-scoped — a file named *routing* or *.routes.* — and substring-based, so a lazy route defined in a differently-named file is invisible and a match inside a comment or string still counts.',
      'Requires src/; Angular-flavoured.',
    ],
    emoji: '⚡',
    description: 'All feature modules must implement lazy loading',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'LazyLoadingImplementationLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.7: Lazy loading not implemented',
    remediation: 'Implement lazy loading for all feature modules',
  },

  {
    id: generateLawId(
      'Angular Service Layer Architecture',
      'Proper service layer architecture with dependency injection',
      'angular'
    ),
    legacyId: 37,
    article: 'IV',
    subsection: '4.8',
    title: 'Angular Service Layer Architecture',
    rationale:
      'A service without @Injectable cannot be injected, and a component reaching around the service layer couples the UI to the data source. This law asks that services be injectable and dependencies stay reasonable.',
    satisfiedBy: { angular: 'Decorate services with @Injectable, keep constructor dependencies few, and import Observable properly.' },
    detectionLimits: [
      'FALSE-fails any component/directive that merely references the word `Service` (e.g. injects a FooService) and lacks @Injectable — the has-service-class check is a substring.',
      'The Observable-import check matches the symbol among an import\'s named specifiers, so grouped and `import type` forms count — it does not verify the import comes from rxjs.',
      'Substring matching, no AST — it reasons about tokens, not the type graph.',
    ],
    emoji: '🏗️',
    description: 'Proper service layer architecture with dependency injection',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'AngularServiceLayerArchitectureLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.8: Service layer architecture violations',
    remediation: 'Implement proper service layer with dependency injection',
  },

  {
    id: generateLawId(
      'Angular Form Validation Standards',
      'All forms must use reactive forms with proper validation',
      'angular'
    ),
    legacyId: 38,
    article: 'IV',
    subsection: '4.9',
    title: 'Angular Form Validation Standards',
    rationale:
      'A form with no validation is a database of whatever the user typed; template-driven forms scatter that logic across the HTML. This law asks for reactive forms with real validation and visible errors.',
    satisfiedBy: { angular: 'Use reactive forms (FormGroup/FormBuilder) with Validators, import ReactiveFormsModule, and show validation errors in the template.' },
    detectionLimits: [
      'The reactive-forms check reads .component.ts CONTENT only — an ngModel in an external .html is not seen by that sub-check.',
      'Substring-based (FormGroup/ngModel in a comment or string counts); no AST.',
      'Reads external templates only for the error-display check.',
    ],
    emoji: '✅',
    description: 'All forms must use reactive forms with proper validation',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'AngularFormValidationStandardsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.9: Form validation standards not met',
    remediation: 'Use reactive forms with comprehensive validation',
  },

  {
    id: generateLawId(
      'Angular Lifecycle Management',
      'Proper implementation of Angular lifecycle hooks',
      'angular'
    ),
    legacyId: 39,
    article: 'IV',
    subsection: '4.10',
    title: 'Angular Lifecycle Management',
    rationale:
      'A lifecycle hook implemented without its interface (or vice versa) is a bug the compiler will not catch, and a subscription started in a hook that is never torn down is a leak. This law asks that hooks be declared correctly and cleaned up.',
    satisfiedBy: { angular: 'Implement the interface for every lifecycle hook you use, and clean up subscriptions/timers in ngOnDestroy (or via takeUntilDestroyed / DestroyRef).' },
    detectionLimits: [
      'Substring detection — `.subscribe`/`interval`/`timer` also match non-RxJS EventEmitter, router events or d3.timer.',
      'The cleanup sub-check credits modern idioms (takeUntilDestroyed / DestroyRef / toSignal) and strips comments; the hook/ondestroy checks do not strip comments.',
      'Angular only; regex over source, no AST-level lifecycle analysis.',
    ],
    emoji: '🔄',
    description: 'Proper implementation of Angular lifecycle hooks',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'AngularLifecycleManagementLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.10: Lifecycle management issues',
    remediation: 'Implement proper Angular lifecycle hook management',
  },

  {
    id: generateLawId(
      'NgRx Store Pattern Mandate (SACRED LAW)',
      'Mandatory use of NgRx store pattern for complex state management instead of service patterns',
      'ngrx'
    ),
    legacyId: 90,
    article: 'VI',
    subsection: '6.15',
    title: 'NgRx Store Pattern Mandate (SACRED LAW)',
    rationale:
      'NgRx without its shape — typed state, createAction, createReducer, createSelector — is a Redux-shaped pile of any. This law asks that the store files follow the pattern the library exists to enforce.',
    satisfiedBy: { angular: 'Type your .state.ts, use createAction/props in .actions.ts, createReducer/on() in .reducer.ts, createSelector in .selectors.ts.' },
    detectionLimits: [
      'Token-presence only, comment/string-blind — the tokens in a comment satisfy it, and correctness is never validated.',
      '.effects.ts files are collected but never checked; a createActionGroup-style API passes only if the literal `props` appears.',
      'Gated on the @ngrx/store dependency (vacuous pass without it).',
    ],
    emoji: '🏛️',
    description:
      'Mandatory use of NgRx store pattern for complex state management instead of service patterns',
    priority: 'CRITICAL',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkNgrxStorePattern',
    violationMessage:
      'SACRED LAW VIOLATION Article VI.6.15: NgRx Store Pattern required for complex state management',
    remediation:
      'Implement NgRx feature store with +state directory containing actions, reducer, effects, and selectors',
  },

  {
    id: generateLawId(
      'NgRx Actions Hygiene Mandate (SACRED LAW)',
      'Actions must follow proper CodeNamingAnalyzer, typing, and Load/Success/Failure patterns',
      'ngrx'
    ),
    legacyId: 91,
    article: 'VI',
    subsection: '6.16',
    title: 'NgRx Actions Hygiene Mandate (SACRED LAW)',
    rationale:
      'An action named inconsistently or carrying an untyped payload is a debugging session waiting to happen — NgRx\'s power is that every state change is a named, typed event. This law keeps action declarations honest.',
    satisfiedBy: { angular: 'Name actions in camelCase, type payloads with props<...> (not a bare payload), and export them as constants.' },
    detectionLimits: [
      'The action-type check is DEAD code — its regex can never emit a violation.',
      'The naming check matches only the exact `export const X = createAction` form — createActionGroup and multi-line declarations are missed; comment/string-blind.',
      'Gated on @ngrx/store (vacuous pass without it).',
    ],
    emoji: '🏷️',
    description:
      'Actions must follow proper CodeNamingAnalyzer, typing, and Load/Success/Failure patterns',
    priority: 'CRITICAL',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkNgrxActionsHygiene',
    violationMessage:
      'SACRED LAW VIOLATION Article VI.6.16: NgRx Actions must follow hygiene patterns',
    remediation:
      'Use proper action naming with [Feature] prefix, typed payloads, and Load/Success/Failure patterns',
  },

  {
    id: generateLawId(
      'NgRx Effects Error Handling Mandate (SACRED LAW)',
      'Effects must handle errors properly, use correct RxJS operators, and never break the action stream',
      'ngrx'
    ),
    legacyId: 92,
    article: 'VI',
    subsection: '6.17',
    title: 'NgRx Effects Error Handling Mandate (SACRED LAW)',
    rationale:
      'An effect with no catchError dies on the first failed request — and takes the whole effect stream down with it, so the feature silently stops working. Error handling in effects keeps one bad response from breaking the app.',
    satisfiedBy: { angular: 'Give every createEffect a catchError that returns an error action via of(...); use switchMap/mergeMap with catchError.' },
    detectionLimits: [
      'Scans only `.effects.ts` (not singular `.effect.ts`) and only the `() =>` createEffect form — functional effects are missed; a catchError/of() in a comment counts.',
      'Flags @Injectable({ providedIn: \'root\' }) as missing @Injectable() — it checks for the literal empty-paren form (false positive).',
      'Gated on @ngrx/store; overlaps the RxJS Operators law\'s error checks.',
    ],
    emoji: '🛡️',
    description:
      'Effects must handle errors properly, use correct RxJS operators, and never break the action stream',
    priority: 'CRITICAL',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkNgrxEffectsErrorHandling',
    violationMessage:
      'SACRED LAW VIOLATION Article VI.6.17: NgRx Effects must have proper error handling',
    remediation:
      'Add catchError to all effects, use proper RxJS operators (switchMap/concatMap/mergeMap), avoid nested subscriptions',
  },

  {
    id: generateLawId(
      'NgRx Selectors Memoization Mandate (SACRED LAW)',
      'Selectors must use createSelector for memoization and performance optimization',
      'ngrx'
    ),
    legacyId: 93,
    article: 'VI',
    subsection: '6.18',
    title: 'NgRx Selectors Memoization Mandate (SACRED LAW)',
    rationale:
      'A selector that isn\'t memoized recomputes on every state change, and a component reaching into state directly bypasses selectors entirely — both turn a fast store slow. This law asks that reads go through memoized selectors.',
    satisfiedBy: { angular: 'Derive state with createSelector/createFeatureSelector; do not access store state directly in components.' },
    detectionLimits: [
      'Scans *.selector(s).ts and *.component.ts by name; the direct-state-access regex is line-shaped and misses multiline selectors; comment/string-blind.',
      'Real issues are DOUBLE-counted (two analyzers push identical violations); \'proper import\' is a bare `@ngrx/store` substring.',
      'Not gated — runs on any project.',
    ],
    emoji: '⚡',
    description:
      'Selectors must use createSelector for memoization and performance optimization',
    priority: 'CRITICAL',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NgRxSelectorsMemoizationMandateLaw.check',
    violationMessage:
      'SACRED LAW VIOLATION Article VI.6.18: NgRx Selectors must be memoized with createSelector',
    remediation:
      'Use createSelector and createFeatureSelector, avoid direct state access in components',
  },

  {
    id: generateLawId(
      'NgRx Reducers Immutability Mandate (SACRED LAW)',
      'Reducers must be pure functions with immutable state updates using createReducer',
      'ngrx'
    ),
    legacyId: 94,
    article: 'VI',
    subsection: '6.19',
    title: 'NgRx Reducers Immutability Mandate (SACRED LAW)',
    rationale:
      'A reducer that mutates state is the bug NgRx exists to prevent — the store guarantees every state is a new object, and a stray push breaks time-travel, memoization and change detection at once.',
    satisfiedBy: { angular: 'Return new state (spread / Immer) from reducers; never mutate state.x, push/pop, or delete state.y.' },
    detectionLimits: [
      'The mutation regex `state.x =` also matches equality `state.x === y` (the `=` of `===`) — a phantom mutation false positive.',
      'The \'no spread\' check is whole-file, so an on() reducer using Immer or returning object literals without `...` is false-flagged; violations are double-counted.',
      'Only .reducer.ts; comment/string-blind; not gated.',
    ],
    emoji: '🔒',
    description:
      'Reducers must be pure functions with immutable state updates using createReducer',
    priority: 'CRITICAL',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NgRxReducersImmutabilityProtectionLaw.check',
    violationMessage:
      'SACRED LAW VIOLATION Article VI.6.19: NgRx Reducers must maintain immutability',
    remediation:
      'Use createReducer with proper on() handlers, avoid state mutations, use spread operators',
  },

  {
    id: generateLawId(
      'NgRx Feature Store Structure Mandate (SACRED LAW)',
      '+state directory structure with actions, reducer, effects, selectors files',
      'ngrx'
    ),
    legacyId: 95,
    article: 'VI',
    subsection: '6.20',
    title: 'NgRx Feature Store Structure Mandate (SACRED LAW)',
    rationale:
      'A feature store scattered across inconsistent filenames is one nobody can navigate. This law asks for the conventional +state layout so every feature looks the same and a barrel exports it cleanly.',
    satisfiedBy: { angular: 'Give each feature a +state/ folder with {feature}.actions/.reducer/.selectors/.models.ts and an index.ts barrel.' },
    detectionLimits: [
      'Enforces an opinionated Nx-style +state/ + .facade.ts/.models.ts convention (not canonical NgRx) and requires src/app/ — a standalone or createFeature layout finds no features and passes vacuously.',
      'Directory/filename presence only, never content; a missing +state/index.ts is counted twice.',
      'Not dependency-gated — it relies on the +state/ filename convention being present.',
    ],
    emoji: '📁',
    description:
      '+state directory structure with actions, reducer, effects, selectors files',
    priority: 'CRITICAL',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NgRxFeatureStoreStructureMandateLaw.check',
    violationMessage:
      'SACRED LAW VIOLATION Article VI.6.20: NgRx Feature must have proper +state structure',
    remediation:
      'Create +state directory with feature.actions.ts, feature.reducer.ts, feature.effects.ts, feature.selectors.ts',
  },

  {
    id: generateLawId(
      'NgRx RxJS Operators Selection Mandate',
      'Proper RxJS operator selection: switchMap for cancellable, concatMap for sequential, mergeMap for parallel',
      'ngrx'
    ),
    legacyId: 96,
    article: 'VI',
    subsection: '6.21',
    title: 'NgRx RxJS Operators Selection Mandate',
    rationale:
      'The wrong flattening operator in an effect is a subtle race — switchMap cancels, mergeMap floods, concatMap queues — and using the wrong one loses updates or duplicates them. This law nudges toward the right operator.',
    satisfiedBy: { angular: 'Use switchMap/mergeMap/exhaustMap/concatMap with catchError; avoid deprecated flatMap/mapTo/pluck/toPromise; keep map from returning an Observable.' },
    detectionLimits: [
      'Discovers effects by filename + a token; an empty set passes vacuously; \'outside pipe\' is whole-file presence of `.pipe(`, not positional.',
      'Missing-catchError is flagged by BOTH this law\'s analyzers AND the Effects Error Handling law — heavy overlap/duplication.',
      'Substring/regex, comment/string-blind; not gated.',
    ],
    emoji: '🔀',
    description:
      'Proper RxJS operator selection: switchMap for cancellable, concatMap for sequential, mergeMap for parallel',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'NgRxRxJSOperatorsSelectionMandateLaw.check',
    violationMessage:
      'HIGH PRIORITY VIOLATION Article VI.6.21: NgRx Effects must use appropriate RxJS operators',
    remediation:
      'Use switchMap for search/autocomplete, concatMap for order-dependent operations, mergeMap for independent parallel calls',
  },

  {
    id: generateLawId(
      'NgRx State Normalization Mandate',
      'Complex state must be normalized with entities pattern for optimal performance',
      'ngrx'
    ),
    legacyId: 97,
    article: 'VI',
    subsection: '6.22',
    title: 'NgRx State Normalization Mandate',
    rationale:
      'Deeply nested or duplicated state is where an update forgets a copy and the UI shows two different truths. Normalized state — entities by id — makes every update land in exactly one place.',
    satisfiedBy: { angular: 'Use @ngrx/entity (or an id-keyed map) for collections; keep state flat and derive nesting with selectors.' },
    detectionLimits: [
      'Runs the SAME detector as "NgRx State Structure Patterns" (a duplicate law entry). Three of its five checks (nested-state, shape-consistency, selector-composition) are STUBS that can never fire.',
      'It is NOT NgRx-gated — an Angular app using no NgRx still fails it (missing @ngrx/entity + no *.feature/reducer/state.ts → score 45).',
      'Check 1 is dependency-presence, check 2 is file-existence; the real normalization regexes are dead code.',
    ],
    emoji: '🗂️',
    description:
      'Complex state must be normalized with entities pattern for optimal performance',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkNgrxStateNormalization',
    violationMessage:
      'HIGH PRIORITY VIOLATION Article VI.6.22: NgRx State should be normalized for collections',
    remediation:
      'Use @ngrx/entity for collections, implement EntityAdapter pattern, normalize relational data',
  },

  {
    id: generateLawId(
      'NgRx DevTools Integration Mandate',
      'StoreDevtools must be configured for development environment debugging',
      'ngrx'
    ),
    legacyId: 98,
    article: 'VI',
    subsection: '6.23',
    title: 'NgRx DevTools Integration Mandate',
    rationale:
      'The Redux DevTools turn \'the state is wrong somehow\' into a timeline you can scrub — without them, debugging a store is guesswork. This law asks that store-devtools be wired in, dev-only.',
    satisfiedBy: { angular: 'Install @ngrx/store-devtools and provide it (provideStoreDevtools / StoreDevtoolsModule), gated to non-production.' },
    detectionLimits: [
      'NOT NgRx-gated — a non-NgRx (or standalone-without-devtools) project FAILS with a -40 \'not installed\' violation.',
      'Config detection reads a fixed set of 3 filenames with loose substring regexes (`name`/`environment` match anywhere); the options check is near-always true (false negative).',
      'Presence, not correct wiring.',
    ],
    emoji: '🛠️',
    description:
      'StoreDevtools must be configured for development environment debugging',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkNgrxDevtools',
    violationMessage:
      'MEDIUM PRIORITY VIOLATION Article VI.6.23: NgRx DevTools integration missing',
    remediation:
      'Add StoreDevtoolsModule.instrument() to app.config.ts with environment check',
  },

  {
    id: generateLawId(
      'NgRx State Structure Patterns',
      'Ensures proper state normalization patterns in NgRx stores',
      'ngrx'
    ),
    legacyId: 51,
    article: 'VI',
    subsection: '6.24',
    title: 'NgRx State Structure Patterns',
    rationale:
      'Deeply nested or duplicated state is where an update forgets a copy and the UI shows two different truths. Normalized state — entities by id — makes every update land in exactly one place.',
    satisfiedBy: { angular: 'Use @ngrx/entity (or an id-keyed map) for collections; keep state flat and derive nesting with selectors.' },
    detectionLimits: [
      'A REDUNDANT law entry — it runs the exact same detector as "NgRx State Normalization Mandate".',
      'Three of its five checks are STUBS that never fire; it is NOT NgRx-gated, so a non-NgRx Angular app fails it (score 45).',
      'Dependency-presence and file-existence only; the real normalization regexes are dead code.',
    ],
    emoji: '🗃️',
    description: 'Ensures proper state normalization patterns in NgRx stores',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkNgrxStateNormalizationMandate',
    violationMessage:
      'MEDIUM PRIORITY VIOLATION Article VI.6.24: NgRx state normalization patterns not implemented',
    remediation:
      'Use @ngrx/entity adapters, implement flat state structures, compose selectors properly, and ensure consistent state shapes',
  },

  {
    id: generateLawId(
      'Component Selector Prefix Compliance',
      'All Angular component selectors must use the configured component prefix',
      'angular'
    ),
    legacyId: 99,
    article: 'IV',
    subsection: '4.11',
    title: 'Component Selector Prefix Compliance',
    rationale:
      'A shared component prefix (app-, ui-) is what stops two libraries\' <button> from colliding and tells a reader at a glance where a component comes from. This law enforces the configured prefix.',
    satisfiedBy: { angular: 'Prefix every component selector with your configured prefix (e.g. app-foo); set project.componentPrefix.' },
    detectionLimits: [
      'Only runs when a componentPrefix is configured; checks only the FIRST @Component per file and does not exclude specs; a commented-out @Component can match.',
      'The decorator regex breaks on a `}` that appears before `selector:` (e.g. host: {...}, an inline template) — the selector is then "not found" and the file is silently skipped (false negative).',
      'Attribute / multi-selectors not in prefix- form are flagged even when legitimate.',
    ],
    emoji: '🏷️',
    description:
      'All Angular component selectors must use the configured component prefix for consistency',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkComponentSelectorPrefix',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.11: Component selector must start with configured prefix',
    remediation:
      'Update component selector to start with the configured componentPrefix from ruleofcode.config.json',
  },

  // Modern Angular API laws (v7.2.0 — from a front-end governance audit, dedup-verified)
  {
    id: generateLawId(
      'Functional IO and Query API',
      'Use input()/output()/viewChild()/contentChild() instead of legacy decorators',
      'angular'
    ),
    legacyId: 40,
    article: 'IV',
    subsection: '4.12',
    title: 'Functional IO and Query API',
    rationale:
      'Angular\'s signal inputs (input()/output()/viewChild()) are typed, reactive and need no decorator — the @Input/@ViewChild decorators they replace are the older, less safe way. This law moves component IO to the functional API.',
    satisfiedBy: { angular: 'Use input()/output()/model()/viewChild()/contentChild() instead of @Input/@Output/@ViewChild/@ContentChild.' },
    detectionLimits: [
      'Forbids the legacy decorators entirely — even a valid @Input() is a violation, regardless of the Angular version (the functional API needs 17.1+).',
      'Strips comments but not strings; scans only component/directive files.',
      'Presence-based — it counts decorators, it does not verify a functional replacement exists.',
    ],
    emoji: '🧩',
    description:
      'Use input()/output()/viewChild()/contentChild() instead of @Input/@Output/@ViewChild decorators',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'FunctionalIoQueryApiLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.12: Legacy IO/query decorator detected',
    remediation:
      'Replace @Input/@Output/@ViewChild(ren)/@ContentChild(ren) with the functional API',
  },

  {
    id: generateLawId(
      'Inject Over Constructor DI',
      'Inject dependencies via inject() instead of constructor parameter-property DI',
      'angular'
    ),
    legacyId: 41,
    article: 'IV',
    subsection: '4.13',
    title: 'Inject Over Constructor DI',
    rationale:
      'The inject() function frees a class from a constructor whose only job is dependency injection — cleaner inheritance, no super() plumbing, DI that works in functions. This law prefers inject() over constructor parameter-properties.',
    satisfiedBy: { angular: 'Acquire dependencies with inject() instead of constructor(private dep: Dep) parameter-properties.' },
    detectionLimits: [
      'Flags only parameter-PROPERTY constructors (private/public/protected/readonly params); a plain-typed param is fine, and it does not verify inject() is actually used.',
      'The param-list capture stops at the first `)`, so a default value containing parens can truncate the scan (false negative on later params).',
      'Only .component/.directive/.service/.pipe/.guard.ts; comments stripped, strings not.',
    ],
    emoji: '💉',
    description:
      'Inject dependencies via inject() instead of constructor parameter-property DI',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'InjectOverConstructorDiLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.13: Constructor parameter-property DI detected',
    remediation: 'Use inject() in a field initializer instead of constructor DI',
  },

  // Template / performance / NgRx laws (v7.2.0 — from a front-end governance audit, dedup-verified)
  {
    id: generateLawId(
      'No Method Calls In Templates',
      'Template bindings must not call component methods (they re-run every CD cycle)',
      'angular'
    ),
    legacyId: 42,
    article: 'IV',
    subsection: '4.14',
    title: 'No Method Calls In Templates',
    rationale:
      'A method call in a template runs on every change-detection cycle — {{ total() }} recomputes constantly and the profiler blames the wrong thing. This law asks that templates read fields and signals, not call methods.',
    satisfiedBy: { angular: 'Bind to a field, a signal, or a computed() in templates; move method calls into the component; allowlist genuinely-cheap ones.' },
    detectionLimits: [
      'Scans only {{...}} and [prop]= bindings — a call inside @if / @for or *ngIf is NOT flagged (a large gap on modern Angular).',
      'Arrow-function class properties are not recognised as methods (false negative); getters read as {{ foo }} are never flagged.',
      'Flags every call to a KNOWN method regardless of purity; the only escape is templateMethodAllowlist.',
    ],
    emoji: '🔁',
    description:
      'Template bindings must not call component methods — use computed()/pure pipe/precomputed model',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoMethodCallsInTemplatesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.14: Method call in template binding',
    remediation:
      'Move derived values to computed(), a pure pipe, or precompute on the model',
  },

  {
    id: generateLawId(
      'Side Effects in NgRx Effects',
      'Long-lived streams and dispatch-in-subscribe belong in NgRx Effects, not components',
      'angular'
    ),
    legacyId: 43,
    article: 'IV',
    subsection: '4.15',
    title: 'Side Effects in NgRx Effects',
    rationale:
      'An interval, a websocket or a fromEvent living in a component instead of an effect is state management leaking into the view — untestable, and often un-cleaned-up. This law flags the timer/stream side effects that belong in an effect.',
    satisfiedBy: { angular: 'Move interval/timer/fromEvent/webSocket streams (and the dispatches they drive) into NgRx effects, not components.' },
    detectionLimits: [
      'Flags a file that contains BOTH a timer/stream call AND `.subscribe(` anywhere — an unrelated interval() and an unrelated subscribe() in the same component both trip it (false positive).',
      'The dispatch-in-subscribe check uses a 300-char window and a fragile single-level param match; strings not stripped.',
      'Scans only .component.ts files — a stream side effect elsewhere is not seen.',
    ],
    emoji: '🌀',
    description:
      'Long-lived streams / dispatch-in-subscribe belong in NgRx Effects, not components',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'SideEffectsInNgrxEffectsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.15: Side effect in component instead of NgRx Effect',
    remediation:
      'Move long-lived streams/polling to an Effect; dispatch actions instead of side-effecting in subscribe()',
  },

  {
    id: generateLawId(
      'No Subscribe In Effect',
      'effect() must not contain .subscribe()/.then() for async orchestration',
      'angular'
    ),
    legacyId: 44,
    article: 'IV',
    subsection: '4.16',
    title: 'No Subscribe In Effect',
    rationale:
      'Calling .subscribe() inside an Angular effect() nests reactivity in a way that leaks and fires unpredictably — the effect should read signals, not manage subscriptions. This law flags subscribe/then inside effect().',
    satisfiedBy: { angular: 'Read signals inside effect(); do not .subscribe() or .then() inside it — derive with computed() or move async work out.' },
    detectionLimits: [
      'Uses a 300-char window, not the effect\'s balanced body — an effect() followed by an UNRELATED .subscribe() within 300 chars is a false positive, and a subscribe deep in a long effect is a false negative.',
      '`effect(` correctly ignores createEffect but matches any function named effect(); comments stripped, strings not.',
      'Only .component/.directive/.service.ts.',
    ],
    emoji: '🎯',
    description:
      'effect() must not contain .subscribe()/.then() — use toSignal()/rxResource()',
    priority: 'LOW',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoSubscribeInEffectLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.16: .subscribe()/.then() inside effect()',
    remediation:
      'Use toSignal()/rxResource() or a lifecycle method instead of subscribing in effect()',
  },

  {
    id: generateLawId(
      'Declarative Read Subscriptions',
      'Read-only subscriptions that only set a signal should use toSignal()/async pipe',
      'angular'
    ),
    legacyId: 45,
    article: 'IV',
    subsection: '4.17',
    title: 'Declarative Read Subscriptions',
    rationale:
      'A .subscribe(v => this.x.set(v)) is imperative glue that a signal or the async pipe expresses declaratively — and glue is where leaks and race conditions hide. This law nudges reads toward toSignal / the async pipe.',
    satisfiedBy: { angular: 'Read observables with toSignal() or the async pipe instead of .subscribe(v => sig.set(v)).' },
    detectionLimits: [
      'Matches only the single-`.set()` callback shape; a multi-statement or non-.set mirror is missed (by design, low precision).',
      '`.set(` matches any .set (Map.set, Set.set) — a minor false positive; it is not signal-specific.',
      'Advisory in intent but still fails the gate on a match; only .component.ts.',
    ],
    emoji: '📡',
    description:
      'Read-only subscriptions that only set a signal should use toSignal()/async pipe',
    priority: 'LOW',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'DeclarativeReadSubscriptionsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.17: Read-only subscribe should be declarative',
    remediation: 'Replace subscribe(v => sig.set(v)) with toSignal()/async pipe',
  },

  {
    id: generateLawId(
      'Defer Heavy Blocks',
      'Large dashboard templates should defer heavy/below-fold blocks with @defer',
      'angular'
    ),
    legacyId: 46,
    article: 'IV',
    subsection: '4.18',
    title: 'Defer Heavy Blocks',
    rationale:
      'A heavy dashboard that renders everything at once blocks first paint on content the user has not scrolled to. Angular\'s @defer streams it in — this law asks that a large template use it.',
    satisfiedBy: { angular: 'Wrap below-the-fold or heavy sections of a large template in @defer (with on viewport/idle triggers).' },
    detectionLimits: [
      'Runs ONLY on *-dashboard.component.html files — a heavy non-\'dashboard\' template is invisible.',
      'A single @defer anywhere exempts the whole file even if everything else renders eagerly; the line count includes blanks and comments.',
      'Threshold is configurable (default 250 lines).',
    ],
    emoji: '⏳',
    description:
      'Large dashboard templates should defer heavy/below-fold blocks with @defer',
    priority: 'LOW',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'DeferHeavyBlocksLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.18: Heavy dashboard template without @defer',
    remediation: 'Wrap heavy/below-fold blocks in @defer (on viewport)',
  },

  {
    id: generateLawId(
      'Alias Repeated Template Expressions',
      'Identical template expressions repeated many times should be aliased with @let',
      'angular'
    ),
    legacyId: 47,
    article: 'IV',
    subsection: '4.19',
    title: 'Alias Repeated Template Expressions',
    rationale:
      'The same function call repeated across a template runs each time and reads worse each time; Angular\'s @let (or an alias) computes it once. This law flags an expression called three or more times.',
    satisfiedBy: { angular: 'Compute a repeated template expression once with @let (or a component field) and reference the alias.' },
    detectionLimits: [
      'Angular-gated, and it counts calls only inside interpolations ({{ … }}) and Angular bindings ([x]="…" / (x)="…"), so plain HTML attributes and inline styles are not scanned; CSS/SVG functions (url/calc/rgba/translate/…) are excluded.',
      'Matching is by EXACT string incl. whitespace (foo(a) != foo(b), foo( a ) != foo(a)); nested calls are not matched.',
      'Excludes nested calls; still fails the gate despite being advisory.',
    ],
    emoji: '🔗',
    description:
      'Identical template expressions repeated many times should be aliased with @let/computed',
    priority: 'LOW',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'AliasRepeatedTemplateExpressionsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.19: Repeated template expression — alias it',
    remediation: 'Alias the repeated expression with @let (Angular 20) or computed()',
  },
];

/**
 * Ionic Laws Data Module
 *
 * Behaviour ion-router-outlet and @ionic/angular add on top of Angular, which
 * the Angular laws cannot see: a page that is left is kept, not destroyed; a
 * held page is shown again without being constructed; a page is found again by
 * its URL alone; hooks are bound by name at runtime. Each law is gated by
 * `requires` on the Ionic binding, so it never runs — and never passes — in a
 * project without one. legacyId range: 401+.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';
import { REQUIRES_IONIC_ANGULAR } from '../utils/ionic/ionic-project';

/** The routing laws read @ionic/angular's outlet; the other bindings route differently. */
const ANGULAR_ROUTER_ONLY =
  'Angular only; IonNav and @ionic/react / @ionic/vue routers are out of scope.';

export const IONIC_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Ionic View Lifecycle Interfaces',
      'Every Ionic page lifecycle hook is declared with its @ionic/angular interface',
      'ionic'
    ),
    legacyId: 401,
    article: 'IV',
    subsection: '4.40',
    title: 'Ionic View Lifecycle Interfaces',
    rationale:
      'Ionic binds ionViewWillEnter/DidEnter/WillLeave/DidLeave by name at runtime and only when the name is a function on the instance (bindLifecycleEvents); a misspelled or mis-cased hook compiles, passes a unit test that calls it directly, and is never called by the outlet. The ViewWillEnter family of interfaces is what makes the compiler hold the name.',
    satisfiedBy: {
      ionic:
        'For every ionView* hook a page implements, add the matching interface from @ionic/angular: `implements ViewWillEnter, ViewWillLeave`.',
    },
    detectionLimits: [
      'Reads class declarations in .ts source; a hook delivered as a DOM listener (renderer.listen(host, "ionViewWillLeave", …)) is a legitimate form this law cannot see and does not need an interface.',
      'An interface declared on a base class is not followed: a subclass that overrides the hook is flagged unless it repeats the interface.',
      'Does not know whether the class is routed under an ion-router-outlet; a hook on a component that is never a page is flagged the same way.',
      'Angular binding only (@ionic/angular); @ionic/react and @ionic/vue expose the hooks differently and are out of scope.',
    ],
    emoji: '🪝',
    description:
      'Every Ionic page lifecycle hook is declared with its @ionic/angular interface',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicViewLifecycleInterfacesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.40: Ionic lifecycle hook without its interface',
    remediation:
      'Implement ViewWillEnter / ViewDidEnter / ViewWillLeave / ViewDidLeave for every ionView* hook',
  },

  {
    id: generateLawId(
      'Ionic Page State Read On Enter',
      'Per-visit state on an Ionic page is read in ionViewWillEnter, not at construction',
      'ionic'
    ),
    legacyId: 402,
    article: 'IV',
    subsection: '4.41',
    title: 'Ionic Page State Read On Enter',
    rationale:
      'ion-router-outlet re-attaches a held page by URL key without constructing it again (getExistingView → activateWith), so a per-visit value read in a constructor, a field initialiser or ngOnInit is read on the first visit only. A one-shot notice read that way vanished for every session that began on that page; the unit test, which built a fresh instance, was green.',
    satisfiedBy: {
      ionic:
        'Read what changes per visit (navigation state, history.state, route.snapshot) in ionViewWillEnter, or subscribe to it (route.paramMap, toSignal, component input binding). Keep the constructor for what is true for the life of the page.',
    },
    detectionLimits: [
      'Cannot know whether the page is routed under an ion-router-outlet or a plain <router-outlet>; a page used only under the latter is flagged although Angular would rebuild it.',
      'Sees four named sources only (getCurrentNavigation(), history.state, .snapshot, window.location); a one-shot read hidden in a service called from the constructor is invisible.',
      'A class with an ionViewWillEnter is not read at all — the law does not prove the per-visit value is re-read there.',
      'A route.snapshot read on a page whose URL always differs per visit is harmless (a different URL is a different held view) and is still flagged.',
    ],
    emoji: '🔁',
    description:
      'Per-visit state on an Ionic page is read in ionViewWillEnter, not at construction',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicPageStateReadOnEnterLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.41: Per-visit state read where a re-attached page never runs again',
    remediation:
      'Read navigation state, history.state and route.snapshot in ionViewWillEnter, or subscribe to them',
  },

  {
    id: generateLawId(
      'Ionic Leave Cancels What Enter Started',
      'What an Ionic page starts on enter is stopped in ionViewWillLeave, not only in ngOnDestroy',
      'ionic'
    ),
    legacyId: 403,
    article: 'IV',
    subsection: '4.42',
    title: 'Ionic Leave Cancels What Enter Started',
    rationale:
      'ion-router-outlet keeps a page on forward navigation (setForward) and only destroys it when popped, so a timer or subscription cleaned up in ngOnDestroy keeps running after the user has left. A 1.5 s timer with onCleanup fired after the page was left, consumed a stored return and navigated the user away; the destroy-based unit test was green. The leave hooks are the only cleanup that runs when the page is merely left.',
    satisfiedBy: {
      ionic:
        'Whatever ionViewWillEnter starts, ionViewWillLeave stops: clear the timer, unsubscribe, remove the listener. Keep ngOnDestroy for the pop; it is not a substitute.',
    },
    detectionLimits: [
      'Token presence, like timer-cleanup: any ionViewWillLeave/ionViewDidLeave in the file (as a method or a listener name) credits every start token, and the law does not prove the leave handler cancels the right thing.',
      'Deliberately does not credit ngOnDestroy / DestroyRef / takeUntilDestroyed — on a held page they are the false green this law exists to replace, so a page that is only ever popped (never left forward) is flagged although destroy would have run.',
      'Start sites read: the constructor, ngOnInit, ionViewWillEnter/DidEnter and field initialisers that call effect(); a start in another method called from them is invisible.',
    ],
    emoji: '🚪',
    description:
      'What an Ionic page starts on enter is stopped in ionViewWillLeave, not only in ngOnDestroy',
    priority: 'HIGH',
    category: 'CODE_QUALITY',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicLeaveCancelsWhatEnterStartedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.42: Ionic page starts work with no leave hook to stop it',
    remediation: 'Stop timers, subscriptions and listeners in ionViewWillLeave',
  },

  {
    id: generateLawId(
      'Ionic No Skip Location Change',
      'An app routed through ion-router-outlet never navigates with skipLocationChange',
      'ionic'
    ),
    legacyId: 404,
    article: 'IV',
    subsection: '4.43',
    title: 'Ionic No Skip Location Change',
    rationale:
      'ion-router-outlet keys its view stack by URL and the hardware Back button pops that stack; skipLocationChange changes the screen without moving the key, so the view the user left stays in the stack and Back shows it. A mutation that replaced replaceUrl with skipLocationChange kept the Location-based Back test green.',
    satisfiedBy: {
      ionic:
        'Use { replaceUrl: true } to drop the current view from the stack. Never skipLocationChange in a routed Ionic app.',
    },
    detectionLimits: [
      'Literal `skipLocationChange: true` in code and the routerLink input in templates; extras built in a variable or spread from a constant are invisible.',
      'Flags the whole project once an ion-router-outlet exists, including a subtree routed through a plain <router-outlet> where the extra would be harmless.',
      ANGULAR_ROUTER_ONLY,
    ],
    emoji: '🔙',
    description:
      'An app routed through ion-router-outlet never navigates with skipLocationChange',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'IonicNoSkipLocationChangeLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.43: skipLocationChange under ion-router-outlet',
    remediation: 'Navigate with { replaceUrl: true } instead of skipLocationChange',
  },

  {
    id: generateLawId(
      'Ionic Unique URL Key Per View',
      'No two routes render a component at the same path under ion-router-outlet',
      'ionic'
    ),
    legacyId: 405,
    article: 'IV',
    subsection: '4.44',
    title: 'Ionic Unique URL Key Per View',
    rationale:
      'ion-router-outlet finds a held page by the URL of its activated route and nothing else; two routes that resolve to the same URL and are told apart by guards share one key, so Ionic re-attaches whichever page it already holds. After sign-in the URL read /events and the screen still showed the launch page; every URL-based test was green.',
    satisfiedBy: {
      ionic:
        'One URL per view. Give sibling pages distinct paths and let an empty path redirect; split by guard only on loadChildren groups whose children carry distinct URLs.',
    },
    detectionLimits: [
      'Reads route array literals (typed Routes, children: [...], provideRouter / forRoot / forChild) one level at a time; routes assembled from spreads or helper functions are not resolved.',
      'Collisions across lazily loaded route files are invisible (two children at "" in two loadChildren groups mounted at the same prefix).',
      ANGULAR_ROUTER_ONLY,
    ],
    emoji: '🔑',
    description:
      'No two routes render a component at the same path under ion-router-outlet',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'IonicUniqueUrlKeyPerViewLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.44: Two views share one ion-router-outlet URL key',
    remediation:
      'Give every component-rendering route its own path; redirect the empty path',
  },

  {
    id: generateLawId(
      'Ionic Session Exit Uses Navigate Root',
      'Ending a session in an Ionic app navigates with navigateRoot, which empties the view stack',
      'ionic'
    ),
    legacyId: 406,
    article: 'IV',
    subsection: '4.45',
    title: 'Ionic Session Exit Uses Navigate Root',
    rationale:
      'Only direction root (NavController.navigateRoot → setRoot) empties the ion-router-outlet stack; a sign-out that navigates forward keeps every page of the old session, and a later sign-in that lands on the same URL re-attaches a page frozen at its last state — measured: same instance, zero requests, an endless skeleton.',
    satisfiedBy: {
      ionic:
        'End a session with NavController.navigateRoot(<final address>). The address must not redirect through a guard: a NavigationCancel resets the direction to forward.',
    },
    detectionLimits: [
      'File-level token heuristic: a session end (a signOut/logout/clearSession/revokeToken call) and a forward navigation in the same file, with no navigateRoot. An exit split across a service and a page is invisible; a file that only reloads the window (location.href) is not flagged and is legitimate.',
      'Cannot verify that the navigateRoot destination does not redirect; the NavigationCancel reset is stated in the card and not detected.',
      ANGULAR_ROUTER_ONLY,
    ],
    emoji: '🧹',
    description:
      'Ending a session in an Ionic app navigates with navigateRoot, which empties the view stack',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicSessionExitUsesNavigateRootLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.45: Session ended with a forward navigation',
    remediation: 'End the session with NavController.navigateRoot(<final address>)',
  },

  {
    id: generateLawId(
      'Ionic Route Reuse Strategy Provided',
      'An Ionic Angular bootstrap provides IonicRouteStrategy as the RouteReuseStrategy',
      'ionic'
    ),
    legacyId: 407,
    article: 'IV',
    subsection: '4.46',
    title: 'Ionic Route Reuse Strategy Provided',
    rationale:
      'IonicRouteStrategy makes a param change a new page (shouldReuseRoute returns false on differing params), which is what lets ion-router-outlet stack /items/1 and /items/2 with a transition and a working Back. provideIonicAngular() does not register it; the starter and the docs do, so a project that assembled its own bootstrap has none and nothing says so. Proposed on the strength of the template and the source, not of a measured incident.',
    satisfiedBy: {
      ionic:
        'Provide { provide: RouteReuseStrategy, useClass: IonicRouteStrategy } next to provideIonicAngular() in the bootstrap providers.',
    },
    detectionLimits: [
      'Token presence in the files of one application that bootstrap it (main.ts, app.config.ts, app.module.ts, or any file calling bootstrapApplication / provideRouter / RouterModule.forRoot); a provider registered in a shared providers array in a library is invisible.',
      'Accepts any RouteReuseStrategy provider; it cannot tell a custom strategy that breaks the param rule from one that extends IonicRouteStrategy.',
      'Applications are told apart by the directory above src/; a workspace with another layout is judged as one application.',
    ],
    emoji: '♻️',
    description:
      'An Ionic Angular bootstrap provides IonicRouteStrategy as the RouteReuseStrategy',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'IonicRouteReuseStrategyProvidedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.46: No RouteReuseStrategy provider for ion-router-outlet',
    remediation:
      'Add { provide: RouteReuseStrategy, useClass: IonicRouteStrategy } to the bootstrap providers',
  },

  {
    id: generateLawId(
      'Ionic Navigation Specs Mount The Outlet',
      'An Ionic navigation spec mounts ion-router-outlet and asserts the shown page, not only the URL',
      'ionic'
    ),
    legacyId: 408,
    article: 'IV',
    subsection: '4.47',
    title: 'Ionic Navigation Specs Mount The Outlet',
    rationale:
      'Under ion-router-outlet the URL and the shown page can disagree (held views, URL-keyed reuse, root vs forward direction, the hardware Back over the view stack). Four shipped defects each had a green spec asserting router.url or location.path(); the layer that decided the screen was not in the test. A navigation spec in an Ionic app mounts the outlet and asserts the visible page.',
    satisfiedBy: {
      ionic:
        'Host the real <ion-app><ion-router-outlet> with the real routes in the spec, navigate, and assert the outlet child that is not .ion-page-hidden. Assert router.url as well if you like; never alone.',
    },
    detectionLimits: [
      'Token presence; a spec that legitimately tests a guard or redirect outcome by URL (no page involved) is flagged.',
      'Does not verify that the outlet-mounting spec asserts the shown child; mounting the outlet (or importing IonRouterOutlet) satisfies the law.',
      'Unit specs only (*.spec.ts outside e2e/ and cypress/); browser specs are the subject of ionic-e2e-locators-target-the-shown-page.',
    ],
    emoji: '🧪',
    description:
      'An Ionic navigation spec mounts ion-router-outlet and asserts the shown page, not only the URL',
    priority: 'MEDIUM',
    category: 'TESTING',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicNavigationSpecsMountTheOutletLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.47: Navigation spec asserts the URL without the outlet',
    remediation: 'Mount <ion-router-outlet> in the spec and assert the visible page',
  },
];

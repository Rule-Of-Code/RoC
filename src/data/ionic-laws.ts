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
];

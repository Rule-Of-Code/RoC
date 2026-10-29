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
];

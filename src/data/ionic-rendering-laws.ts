/**
 * Ionic Rendering Laws Data Module
 *
 * Ionic's rendering model, which a plain Angular app does not have and the
 * Angular laws cannot see: the page does not scroll (ion-content's shadow
 * scroller does), ion-content has a fixed slot outside that scroller, the
 * safe-area insets reach the page only through the viewport meta and only
 * where something reads them, the scroller hands both pan directions to the
 * browser, ionView* hooks are bound only on components Ionic created, the two
 * @ionic/angular builds declare different classes under the same names, and
 * a standalone ion-icon draws only what addIcons registered.
 *
 * The laws that read templates are Angular-only (REQUIRES_IONIC_ANGULAR): the
 * template reader does not read JSX or Vue SFCs, so selecting them in a React
 * or Vue Ionic app would be a green that inspected nothing. legacyId range:
 * 411–419, subsections 4.80–4.89.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';
import { REQUIRES_IONIC_ANGULAR } from '../utils/ionic/ionic-project';

export const IONIC_RENDERING_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Ionic View Hooks Only On Pages',
      'ionView* hooks are declared only on components Ionic creates: route targets and controller-created components',
      'ionic'
    ),
    legacyId: 411,
    article: 'IV',
    subsection: '4.80',
    title: 'Ionic View Hooks Only On Pages',
    rationale:
      "Ionic binds ionViewWillEnter/DidEnter/WillLeave/DidLeave/WillUnload by adding listeners on the host element of a component it created (bindLifecycleEvents, called only from IonRouterOutlet.activateWith and AngularDelegate — the latter for ModalController, PopoverController and ion-nav, whose ion-modal / ion-popover re-dispatch their present/dismiss events as ionView*). A component rendered from another component's template never gets the listeners, which Ionic's docs state as 'only called on components directly mapped by a router'. The hook compiles, satisfies the interface law and a direct unit test, and never runs.",
    satisfiedBy: {
      ionic:
        'Declare ionView* hooks only on route targets and on components created by ModalController / PopoverController / ion-nav. A child that needs per-visit work exposes a method or input that its page calls from its own ionViewWillEnter, or uses ngOnInit / effect.',
    },
    detectionLimits: [
      'A class is green when its name appears as `component: X` anywhere (a route or a controller create call — the same syntax), in `loadComponent … .then(m => m.X)`, as a relative default export loaded by loadComponent, or as an argument of push / setRoot / insert (ion-nav); a `component:` key in an unrelated object also counts as green.',
      'Red only when the class is referred to solely from imports / declarations / exports arrays (rendered from a template). A class passed through a variable, built into routes by a helper, loaded by default export through a path alias, or never referred to is reported as not judged (a note), not red.',
      'Classes are matched by name across the project; two classes with the same name are not told apart.',
      'Does not judge @ionic/react / @ionic/vue (useIonViewWillEnter has its own rule).',
    ],
    emoji: '🪝',
    description:
      'ionView* hooks are declared only on components Ionic creates: route targets and controller-created components',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicViewHooksOnlyOnPagesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.80: ionView* hook on a component Ionic never creates',
    remediation:
      'Move the per-visit work to the page that renders the component, or to ngOnInit / effect',
  },
];

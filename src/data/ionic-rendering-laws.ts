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

const TEMPLATES_ANGULAR_ONLY =
  'Angular templates only (inline `template` and `templateUrl`); @ionic/react and @ionic/vue are not selected because JSX and SFC templates are not read.';

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

  {
    id: generateLawId(
      'Ionic Single Build System',
      'An Ionic Angular app imports from one build: @ionic/angular or @ionic/angular/standalone, never both',
      'ionic'
    ),
    legacyId: 412,
    article: 'IV',
    subsection: '4.81',
    title: 'Ionic Single Build System',
    rationale:
      "@ionic/angular and @ionic/angular/standalone are two builds. ModalController, IonRouterOutlet, IonModal and every component are declared in each entry — different classes, so different DI tokens — and only what both re-export from @ionic/angular/common (NavController, Platform, Config, NavParams, IonicRouteStrategy, DomController, IonModalToken) is shared. Ionic's docs say the two 'cannot be used at the same time'. One auto-imported ModalController from the wrong entry compiles and brings the other build's token and its lazy loader (@ionic/core/loader) into a standalone app.",
    satisfiedBy: {
      ionic:
        "Pick one entry point. In a standalone app import every Ionic symbol, including NavController, ModalController, Platform and provideIonicAngular, from '@ionic/angular/standalone'; enforce it with a no-restricted-imports rule on '@ionic/angular'.",
    },
    detectionLimits: [
      'Import and re-export declarations only; a re-export through a local barrel is attributed to the barrel file.',
      "The shared set is read from the installed @ionic/angular entry's `export … from '@ionic/angular/common'` statements; when both entries are imported and that file cannot be read, the law reports it as not judged.",
      "Type-only imports are ignored; a value import used only as a type (without 'import type') still counts. Shared symbols imported from '@ionic/angular' in a standalone app are reported as a note, not a violation.",
      'Does not measure a runtime symptom or the bundle cost, only the mix the docs forbid; the runtime failure of a mixed app was not measured.',
    ],
    emoji: '🧩',
    description:
      'An Ionic Angular app imports from one build: @ionic/angular or @ionic/angular/standalone, never both',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'IonicSingleBuildSystemLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.81: Both @ionic/angular builds imported in one app',
    remediation:
      "Import every Ionic symbol from one entry; in a standalone app, '@ionic/angular/standalone'",
  },

  {
    id: generateLawId(
      'Ionic Icons Registered',
      'Every ion-icon name a standalone template uses is registered with addIcons',
      'ionic'
    ),
    legacyId: 413,
    article: 'IV',
    subsection: '4.82',
    title: 'Ionic Icons Registered',
    rationale:
      'In the standalone (custom elements) build an <ion-icon name="x"> finds its SVG only in the map addIcons fills; the asset-path fallback throws there and the only signal is a console warning (ionicons getNamedUrl). The name is lower-cased before the lookup, and addIcons({ trashOutline }) registers "trashOutline" and "trash-outline". The registration is camelCase, usually in a constructor, and the template is kebab-case in another file, so a rename on either side is silent.',
    satisfiedBy: {
      ionic:
        "Register every icon a template names with addIcons({ camelCaseName }) from 'ionicons/icons', in the component that renders it, and change both in one commit.",
    },
    detectionLimits: [
      'Literal names only (name / ios / md, a non-URL icon, and [name]="\'x\'"); a computed name is reported as not judged. An icon passed as [icon]="svgData" bypasses the map and is not this law.',
      'Registration is matched project-wide, not per component: an icon registered in another lazy chunk passes even if that chunk has not loaded when the template renders.',
      "addIcons called with a namespace import of 'ionicons/icons' counts as registering every icon; any other non-literal argument is reported as not read.",
      'Applies only to projects that import @ionic/angular/standalone; the module build resolves names through its asset path. Read in ionicons 8.1.0 only.',
      TEMPLATES_ANGULAR_ONLY,
    ],
    emoji: '🖼️',
    description:
      'Every ion-icon name a standalone template uses is registered with addIcons',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicIconsRegisteredLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.82: ion-icon name not registered with addIcons',
    remediation: "Register the icon: addIcons({ camelCaseName }) from 'ionicons/icons'",
  },
];

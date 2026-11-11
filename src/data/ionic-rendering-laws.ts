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
import { REQUIRES_IONIC, REQUIRES_IONIC_ANGULAR } from '../utils/ionic/ionic-project';

const TEMPLATES_ANGULAR_ONLY =
  'Angular templates only (inline `template` and `templateUrl`); @ionic/react and @ionic/vue are not selected because JSX and SFC templates are not read.';
const CSS_BY_CLASS_NAME =
  'CSS is matched to templates by class name (and :host / ::part), without resolving the cascade, specificity or which stylesheet is loaded where.';

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

  {
    id: generateLawId(
      'Ionic Scroll Through Ion Content',
      'Scroll is read and listened to through ion-content, never through the window',
      'ionic'
    ),
    legacyId: 414,
    article: 'IV',
    subsection: '4.83',
    title: 'Ionic Scroll Through Ion Content',
    rationale:
      "Under Ionic the window does not scroll: ion-content scrolls a .inner-scroll in its shadow root and binds that element's scroll listener only when scrollEvents is true (default false, 'for performance reasons'; @ionic/core content.js), and ionScroll, ionScrollStart and ionScrollEnd are all emitted from that listener. An (ionScroll) handler without [scrollEvents]=\"true\" never runs, and window.scrollTo / window.scrollY / a window:scroll listener read 0 and never fire — while working in a plain Angular app and in jsdom.",
    satisfiedBy: {
      ionic:
        'Pair every (ionScroll|ionScrollStart|ionScrollEnd) with [scrollEvents]="true" on the same ion-content, and read or set positions through IonContent (scrollToTop, scrollToPoint, getScrollElement), never through window.',
    },
    detectionLimits: [
      'Template attributes are read per opening tag; scrollEvents set from code (content.scrollEvents = true) is not seen and is reported as a false red.',
      "Window-scroll use (window.scrollTo/scrollBy/scroll/scrollY/scrollX/pageYOffset/pageXOffset, document.scrollingElement, @HostListener('window:scroll'), fromEvent(window, 'scroll'), window.addEventListener('scroll')) is judged in a component whose own template has an ion-content or whose host is placed inside one (followed through parent templates by element selector); a service that scrolls the window is not judged.",
      TEMPLATES_ANGULAR_ONLY,
    ],
    emoji: '📜',
    description: 'Scroll is read and listened to through ion-content, never through the window',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicScrollThroughIonContentLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.83: Scroll handled through the window, or ionScroll without scrollEvents',
    remediation:
      'Add [scrollEvents]="true" next to (ionScroll), and use IonContent instead of window scroll',
  },

  {
    id: generateLawId(
      'Ionic Viewport Fit Cover',
      'The index.html of an Ionic app declares viewport-fit=cover so the safe-area insets reach the page',
      'ionic'
    ),
    legacyId: 415,
    article: 'IV',
    subsection: '4.84',
    title: 'Ionic Viewport Fit Cover',
    rationale:
      "Ionic pads header, footer, tabs and content with --ion-safe-area-*, which @ionic/core's core.css sets from var(--safe-area-inset-*, env(safe-area-inset-*)); env() carries the notch and home-indicator insets only when the viewport meta asks for viewport-fit=cover. Capacitor's Android SystemBars plugin, which injects the --safe-area-inset-* fallback, passes the insets through only when the last <meta name=viewport> contains viewport-fit=cover and pads the WebView natively otherwise. Without the tag every safe-area rule is inert, while desktop Chromium, emulators without a cutout and unit tests look identical. The tag lives in index.html, outside every TS/template scan.",
    satisfiedBy: {
      ionic:
        'Declare <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"> in the index.html the build uses, and keep pinch-zoom enabled unless you decided otherwise.',
    },
    detectionLimits: [
      "Reads the index the Angular application builder uses (the build target's index option, else <sourceRoot>/index.html) from angular.json and every project.json; without either, index.html, src/index.html or public/index.html. A meta tag injected at runtime is not seen.",
      'Only the last <meta name="viewport"> counts, as in browsers and Capacitor SystemBars; comments are ignored. user-scalable=no and maximum-scale ≤ 1 are reported as notes, not violations.',
      'Presence only; whether the app then reads the insets is ionic-edge-chrome-pays-safe-area. The zero inset on iOS without the tag follows from the CSS env() specification and was not measured on a device.',
    ],
    emoji: '📐',
    description:
      'The index.html of an Ionic app declares viewport-fit=cover so the safe-area insets reach the page',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicViewportFitCoverLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.84: index.html viewport without viewport-fit=cover',
    remediation: 'Add viewport-fit=cover to the <meta name="viewport"> content of index.html',
  },

  {
    id: generateLawId(
      'Ionic Edge Chrome Pays Safe Area',
      'Every self-drawn edge container reads the safe-area inset of the edge it touches',
      'ionic'
    ),
    legacyId: 416,
    article: 'IV',
    subsection: '4.85',
    title: 'Ionic Edge Chrome Pays Safe Area',
    rationale:
      "ion-header pays the top inset and ion-footer / ion-tab-bar the bottom one by themselves (@ionic/core header, footer and tab-bar CSS read --ion-safe-area-*); a project's own top bar, bottom bar or sheet must read --ion-safe-area-top/bottom on the edge it touches, and forgetting is invisible in desktop Chromium, device emulation and screenshot gates, which render with no status bar. Measured on an app with its own top bar: --ion-safe-area-bottom read in 6 places, --ion-safe-area-top in 0, content under the status bar on every screen of an Android 16 / targetSdk 36 phone (inset 36px).",
    satisfiedBy: {
      ionic:
        'Use ion-header/ion-footer, or make every self-drawn edge container read var(--ion-safe-area-<edge>) in its padding on that edge; keep the list of edge containers closed (thresholds.ionic.edgeContainers: [{ selector, edge }]) so a new one has to be declared.',
    },
    detectionLimits: [
      'Edge asymmetry (one inset read in the project CSS, the other never, with no ion-header / ion-footer / ion-tab-bar in any template) is the reliable part. The container part is a heuristic: a class used by a template whose rule is position fixed|sticky at top: 0 / bottom: 0 and no rule for that class reads the inset on that edge; a container styled through :host or an element selector is not seen, and an inner element of a host that already pays the inset is reported.',
      'With thresholds.ionic.edgeContainers the heuristic is replaced by the closed list: each selector must exist in the CSS and the last padding / margin / offset declaration on its edge must read the inset (an inset read and then overridden is seen only in this mode).',
      'Checks that the variable is read, never its value. Inline styles and styles set from TS are not read. Judged only when an index.html declares viewport-fit=cover (otherwise ionic-viewport-fit-cover fires first). iOS was not measured.',
      CSS_BY_CLASS_NAME,
      TEMPLATES_ANGULAR_ONLY,
    ],
    emoji: '📱',
    description:
      'Every self-drawn edge container reads the safe-area inset of the edge it touches',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicEdgeChromePaysSafeAreaLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.85: Self-drawn edge container does not read the safe-area inset',
    remediation:
      'Read var(--ion-safe-area-<edge>) in the padding of every self-drawn edge container',
  },

  {
    id: generateLawId(
      'Ionic Gesture Touch Action',
      'A pointer-event gesture inside ion-content sets touch-action on its element, host or the scroll part',
      'ionic'
    ),
    legacyId: 417,
    article: 'IV',
    subsection: '4.86',
    title: 'Ionic Gesture Touch Action',
    rationale:
      "ion-content's .inner-scroll declares touch-action: pan-x pan-y pinch-zoom (@ionic/core content.css), so a horizontal drag built from raw pointerdown/pointerup is taken by the browser and ends in pointercancel; the swipe works with a mouse and never with a finger, and a jsdom test with MouseEvent cannot tell. Measured in Chromium with CDP touch input: touch → pointerdown, pointercancel, screen stuck; mouse → works; touch with ion-content::part(scroll){touch-action:pan-y} → works.",
    satisfiedBy: {
      ionic:
        "Set touch-action (pan-y for horizontal swipes) on ion-content::part(scroll) of the page that hosts the handler, or on the element / :host, or build the gesture with Ionic's createGesture instead of raw pointer events; test with touch input, not MouseEvent.",
    },
    detectionLimits: [
      'A component is judged when it binds pointerdown and pointermove or pointerup (template, host metadata, @HostListener, addEventListener, fromEvent, renderer.listen) and has an ion-content or is placed inside one; createGesture elsewhere in the same component is not credited, because its raw pointer handlers are still raw (and that createGesture itself survives the scroller was not measured).',
      'A touch-action rule (other than auto) is matched by selector: in the component\'s own styles on :host, ::part(scroll) or a class/tag of the binding element; in any stylesheet on ::part(scroll), the component\'s element selector or those classes. A rule that matches through the cascade another way is reported as missing (false warning).',
      'Cannot tell whether the gesture is horizontal or vertical; it only asks that some touch-action be chosen. Gestures from third-party libraries are not judged. WebKit was not measured.',
      TEMPLATES_ANGULAR_ONLY,
    ],
    emoji: '👆',
    description:
      'A pointer-event gesture inside ion-content sets touch-action on its element, host or the scroll part',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicGestureTouchActionLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.86: Pointer gesture inside ion-content without touch-action',
    remediation:
      'Set touch-action: pan-y on ion-content::part(scroll) of the page, or use createGesture',
  },

  {
    id: generateLawId(
      'Ionic Fixed Content In Fixed Slot',
      'Floating UI inside ion-content is placed in its fixed slot, not in the scroller',
      'ionic'
    ),
    legacyId: 418,
    article: 'IV',
    subsection: '4.87',
    title: 'Ionic Fixed Content In Fixed Slot',
    rationale:
      "ion-content projects its default slot inside a shadow .inner-scroll and its fixed slot outside it (@ionic/core content.js); Ionic documents the fixed slot as the place for content 'that should not scroll', and ion-fab's edge doc says 'Should be used with a fixed slot'. A toast or floating action placed as an ordinary child scrolls away or anchors to the content bottom. Measured: a 'copied' toast visible 100% at 393x852 and 0-43% at 1366x657, 1280x720, 320x568 and landscape; 13/13 visible once moved to slot=\"fixed\".",
    satisfiedBy: {
      ionic:
        'Put floating UI as a direct child of ion-content with slot="fixed" (or use ToastController / ion-toast), and measure visibility against the viewport at several sizes, not by querySelector.',
    },
    detectionLimits: [
      'ion-fab inside an ion-content scroller (not through slot="fixed") is checked reliably. Other floating elements are found by a class name matching thresholds.ionic.fixedContentPattern (default toast|snackbar|fab|floating|sticky-cta) whose CSS rule is position fixed|absolute with top/bottom/inset; a differently named one is missed and an absolutely positioned decoration can be flagged.',
      '"Inside the scroller" follows components by element selector: an element in a child component\'s template counts when the child\'s host is placed inside an ion-content (or inside a component that is). ng-container / ng-template are transparent; control flow creates no element.',
      'An element made fixed outside ion-content (in ion-app) is out of scope. Only Chromium was measured; position: fixed inside the scroller on WebKit was not.',
      CSS_BY_CLASS_NAME,
      TEMPLATES_ANGULAR_ONLY,
    ],
    emoji: '📌',
    description: 'Floating UI inside ion-content is placed in its fixed slot, not in the scroller',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_IONIC_ANGULAR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'IonicFixedContentInFixedSlotLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.87: Floating UI inside the ion-content scroller',
    remediation: 'Make it a direct child of ion-content with slot="fixed", or use ToastController',
  },
];

/**
 * Capacitor Bridge Laws Data Module
 *
 * The bridge between the web build and the native shell: who owns Android's
 * back press, whether a local plugin's three hand-kept names agree, whether
 * plugin listeners are released, and the web-side decisions a native shell
 * changes the meaning of (a service worker, WebView storage, a test stub that
 * stands in for a plugin). TypeScript is read as syntax with the project's
 * own compiler; native sources are opened by fixed path, independent of
 * ignores. Every law is gated by `requires`, and a law that could not read
 * what it judges says so as a violation. legacyId range: 441–449.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { REQUIRES_CAPACITOR } from '../utils/capacitor/capacitor-law-support';
import { CAPACITOR_CONFIG_FILES } from '../utils/capacitor/capacitor-project';
import { generateLawId } from '../utils/id-generator';

/** The limit every law that parses TypeScript shares. */
const NEEDS_TYPESCRIPT =
  "Parses source with the project's own `typescript` package; when it cannot be loaded the law reports the files as not read rather than passing.";

export const CAPACITOR_BRIDGE_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Capacitor Android Back Has One Owner',
      'Capacitor Android back reaches Ionic through exactly one App.addListener(backButton), and one press navigates once',
      'capacitor'
    ),
    legacyId: 441,
    article: 'IV',
    subsection: '4.70',
    title: 'Capacitor Android Back Has One Owner',
    rationale:
      "On Android, @capacitor/app (AppPlugin.java, handleOnBackPressed) fires the document 'backbutton' event that Ionic's back-button chain listens for (hardware-back-button.js) only when a JS backButton listener exists; without one the WebView just goes back in history, so an open modal, sheet or menu is never closed and the page under it leaves. Neither @ionic/core nor @ionic/angular registers that listener. With two listeners, or with a navigating listener and Ionic's chain both on, one press acts twice. Nothing fails in either case, and a unit test that dispatches ionBackButton exercises a chain the device never starts.",
    satisfiedBy: {
      capacitor:
        "Register exactly one App.addListener('backButton') for the app. Either let Ionic own the decision (the listener only exits at the root) or set hardwareBackButton: false and let the listener close the top overlay first, then go back.",
      ionic:
        'Ionic starts its back-button chain from the backbutton event Capacitor fires only for a registered listener; with hardwareBackButton: false in provideIonicAngular, the one listener owns the press.',
    },
    detectionLimits: [
      NEEDS_TYPESCRIPT,
      "Counts App.addListener('backButton') calls whose receiver is imported from @capacitor/app (directly or through a relative re-export one module deep); a wrapper that renames addListener or passes the event name as a variable is not seen.",
      'Whether a listener body navigates is a call-name heuristic over its inline body (back, navigate*, pop) and is only a note (PARTIAL); a navigation inside a called helper is not seen.',
      "hardwareBackButton is read from provideIonicAngular / IonicModule.forRoot only; setupIonicReact and IonicVue configs are not read, so with those bindings Ionic's chain is assumed on.",
      "plugins.App.disableBackButtonHandler: true is accepted as 'the project owns back natively' and needs the resolved Capacitor config; Ionic's experimentalCloseWatcher path is not judged.",
      'Android only; iOS has no hardware back.',
    ],
    emoji: '🔙',
    description:
      'Capacitor Android back reaches Ionic through exactly one App.addListener(backButton), and one press navigates once',
    priority: 'CRITICAL',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: {
      anyDependency: ['@ionic/angular', '@ionic/react', '@ionic/vue'],
      allDependencies: ['@capacitor/core', '@capacitor/android'],
      anyFile: CAPACITOR_CONFIG_FILES,
    },
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorAndroidBackHasOneOwnerLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.70: Android back has no owner, or more than one',
    remediation:
      "Register exactly one App.addListener('backButton'); decide whether it or Ionic's chain (hardwareBackButton) navigates",
  },

  {
    id: generateLawId(
      'Capacitor Local Plugin Contract',
      'Capacitor local plugins: registerPlugin name, @CapacitorPlugin name, @PluginMethods and the MainActivity registration agree',
      'capacitor'
    ),
    legacyId: 442,
    article: 'IV',
    subsection: '4.71',
    title: 'Capacitor Local Plugin Contract',
    rationale:
      'A plugin inside the app is joined to JS by three hand-kept names: registerPlugin(\'Name\'), @CapacitorPlugin(name = "Name") with one @PluginMethod per interface method, and registerPlugin(Class.class) in MainActivity before super.onCreate (BridgeActivity.onCreate builds the bridge from the builder\'s plugin list; registerPlugin only appends to it, and capacitor.plugins.json lists npm plugins only). A drift is "not implemented on android" at call time (@capacitor/core) and isPluginAvailable() false, which a capability port reads as "this phone cannot". Measured: three Java-only mutants (registration removed, name changed, method renamed) passed every gate green.',
    satisfiedBy: {
      capacitor:
        'Keep the plugin name in one TS constant used by registerPlugin, mirror it in @CapacitorPlugin(name), annotate every interface method with @PluginMethod, and register the class in MainActivity above super.onCreate.',
    },
    detectionLimits: [
      NEEDS_TYPESCRIPT,
      'A registerPlugin name is read from a string literal or a const string in the same file or one relative import away; anything else is reported as not judged. A name is local when no installed package with a capacitor.android.src tree declares it.',
      'The TS interface is read from the registerPlugin<T> type argument: same-file interfaces (with their extends), type aliases, intersections and type literals, or one import away; a generic or mapped type is not followed and its methods are not compared (a note says so).',
      'Java and Kotlin are read as text (comments masked) under android/app/src/main/java|kotlin by fixed path; @CapacitorPlugin(name = CONSTANT) is not followed, and the legacy @NativePlugin annotation is not read. A registration with no super.onCreate( in the activity to order it against is accepted.',
      'iOS is PARTIAL: a Swift CAPBridgedPlugin with a matching jsName under the iOS target has its pluginMethods compared; how it is registered (a CAPBridgeViewController subclass calling registerPluginInstance) is not judged.',
      'Says nothing about what a method does; only that the bridge can find it. A @PluginMethod without a TS counterpart is a note, not a violation.',
    ],
    emoji: '🧩',
    description:
      'Capacitor local plugins: registerPlugin name, @CapacitorPlugin name, @PluginMethods and the MainActivity registration agree',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_CAPACITOR,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorLocalPluginContractLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.71: a local Capacitor plugin name, method or registration has drifted',
    remediation:
      'Make registerPlugin, @CapacitorPlugin(name), @PluginMethod and the MainActivity registration (above super.onCreate) agree',
  },
];

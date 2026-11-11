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
  {
    id: generateLawId(
      'Capacitor Listener Handles Released',
      'Capacitor plugin listeners registered by components and pages keep their handle and remove it on teardown',
      'capacitor'
    ),
    legacyId: 443,
    article: 'IV',
    subsection: '4.72',
    title: 'Capacitor Listener Handles Released',
    rationale:
      "A Capacitor plugin listener lives as long as the WebView and ends only through its PluginListenerHandle.remove() or removeAllListeners(). Registered from a component or page that drops the handle, it adds one more live listener per instance, and under ion-router-outlet a new page instance comes with every forward navigation. Handlers run N times and the page leaks, and the RxJS, timer and addEventListener cleanup laws do not see plugin listeners.",
    satisfiedBy: {
      capacitor:
        'Register plugin listeners in a root service or app initializer and expose them as an Observable/signal; if a component must register one, keep the handle and remove() it in DestroyRef.onDestroy (or ionViewWillLeave for per-visit listeners).',
      angular:
        "Plugin listeners belong to providedIn: 'root' services or provideAppInitializer factories; a component that registers one releases it through DestroyRef.onDestroy.",
    },
    detectionLimits: [
      NEEDS_TYPESCRIPT,
      'Recognises plugins by import source (@capacitor/*, @capacitor-*/*, @capawesome/*) and registerPlugin(); a plugin re-exported under another name from a local barrel is followed one import deep only.',
      "Judges classes decorated @Component / @Directive / @Pipe, page classes (a .page.ts file or a template with ion-content / ion-header), and @Injectable classes without providedIn 'root' / 'platform' — such a service listed in a root providers array is still judged as short-lived. Module functions, token factories and root services are app-lifetime and not judged; React and Vue components are not read.",
      'Removal is matched by name in the same class: a remove() in ngOnDestroy, ionViewWillLeave, ionViewDidLeave or a DestroyRef.onDestroy callback that mentions the handle, or any removeAllListeners() there; a handle passed to a helper that removes it is not seen, and a handle returned to the caller belongs to the caller.',
    ],
    emoji: '🎧',
    description:
      'Capacitor plugin listeners registered by components and pages keep their handle and remove it on teardown',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    stack: 'frontend',
    requires: REQUIRES_CAPACITOR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorListenerHandlesReleasedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.72: a plugin listener registered by a component or page is never removed',
    remediation:
      'Keep the PluginListenerHandle and remove() it on teardown, or move the listener to a root service',
  },
  {
    id: generateLawId(
      'Capacitor Service Worker Native Decision',
      'Capacitor apps with an Angular service worker turn it off on native, or handle SwUpdate so a store update is not served stale',
      'capacitor'
    ),
    legacyId: 444,
    article: 'IV',
    subsection: '4.73',
    title: 'Capacitor Service Worker Native Decision',
    rationale:
      'A Capacitor shell already serves the bundle from the app package; an Angular service worker enabled by !isDevMode() (SwRegistrationOptions.enabled defaults to true) is active in the native WebView too and keeps the previous release across an in-place store update. Measured: after installing a release candidate over the previous release, cold start 1 drew the old texts and cold start 2 the new ones, while versionName and the APK hash already said "new".',
    satisfiedBy: {
      capacitor:
        'Disable the service worker on native (enabled: !isDevMode() && !Capacitor.isNativePlatform()), or, if you keep it in the shell on purpose, handle SwUpdate VERSION_READY (reload at a safe moment) and unrecoverable, and prove on a device which bundle the WebView ran.',
      angular:
        "SwUpdate.activateUpdate()'s own documentation says to update a client by reloading the page; a VERSION_READY handler that reloads, plus an unrecoverable handler, is the Angular half of the decision.",
    },
    detectionLimits: [
      NEEDS_TYPESCRIPT,
      'Reads the enabled expression of provideServiceWorker / ServiceWorkerModule.register (an object literal or a same-file const); it is accepted as off on native when it mentions Capacitor.isNativePlatform / Capacitor.getPlatform or a name in thresholds.capacitor.nativeFlag. A flag computed in a helper is accepted only when declared there.',
      'The SwUpdate side is matched across the project: versionUpdates and the VERSION_READY literal in one file, a <...>location.reload() call and an unrecoverable access anywhere; whether VERSION_READY actually reaches the reload is not followed (PARTIAL). With them the law passes with a note that the first stale start remains.',
      'Angular service worker only; Workbox or a hand-written worker is not judged. Cannot tell whether keeping the worker on native is right for the product; it asks for a stated decision, not a particular one.',
    ],
    emoji: '🗃️',
    description:
      'Capacitor apps with an Angular service worker turn it off on native, or handle SwUpdate so a store update is not served stale',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    stack: 'frontend',
    requires: {
      anyDependency: ['@capacitor/core'],
      allDependencies: ['@angular/service-worker'],
      anyFile: CAPACITOR_CONFIG_FILES,
    },
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorServiceWorkerNativeDecisionLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.73: an Angular service worker runs in the native shell with no update decision',
    remediation:
      'Turn the service worker off on native, or handle SwUpdate VERSION_READY with a reload and unrecoverable',
  },
  {
    id: generateLawId(
      'Capacitor Durable State Off WebView Storage',
      'Capacitor localStorage and IndexedDB writers have a native durable branch, or their keys are declared disposable',
      'capacitor'
    ),
    legacyId: 445,
    article: 'IV',
    subsection: '4.74',
    title: 'Capacitor Durable State Off WebView Storage',
    rationale:
      "Capacitor's storage guide (capacitorjs.com/docs/guides/storage) says WebView storage 'must be considered transient' because 'the OS will reclaim local storage from Web Views if a device is running low on space' (IndexedDB too, at least on iOS), and recommends its native Preferences API for durable data; WebView storage is also keyed by the app origin, so a hostname or scheme change orphans it on every device. A storage service that wraps localStorage satisfies Web Storage Encapsulation in full while holding data the server cannot give back.",
    satisfiedBy: {
      capacitor:
        'Back durable values with @capacitor/preferences on native (behind the same storage port the web build uses), and declare WebView-only keys as disposable in thresholds.capacitor.disposableStorageKeys.',
    },
    detectionLimits: [
      NEEDS_TYPESCRIPT,
      'Cannot know which values are durable; without the disposable-keys declaration every localStorage / IndexedDB writer without a native branch is a warning, which is the cost of asking for the decision.',
      'Writers: localStorage.setItem, indexedDB.open in a file that also creates an object store or puts/adds to one (an open that only reads is not a writer), new Dexie, openDB from idb, localforage.setItem / createInstance. A Storage object passed in as a parameter is not followed. sessionStorage is only a note.',
      'A native branch is an import of @capacitor/preferences or a thresholds.capacitor.durableStores module in the file of the writer, the file of a class it extends or implements (one import away), or another file that mentions the class; a native store chosen by a DI token in another library must be declared.',
      'Keys are matched against the disposable list only when they are string literals or same-file consts; a generic wrapper whose keys come from its callers cannot be declared disposable key by key.',
    ],
    emoji: '💾',
    description:
      'Capacitor localStorage and IndexedDB writers have a native durable branch, or their keys are declared disposable',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_CAPACITOR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorDurableStateOffWebviewStorageLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.74: durable state kept only in WebView storage',
    remediation:
      'Back the store with @capacitor/preferences on native, or declare its keys in thresholds.capacitor.disposableStorageKeys',
  },
];

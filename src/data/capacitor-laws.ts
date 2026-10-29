/**
 * Capacitor Laws Data Module
 *
 * What ships through Capacitor and no scan of src/ can see: the resolved
 * config (read by the project's own `cap config --json`, never by a pattern
 * over the file), the native shells (opened by fixed path, independent of
 * ignores), and the generated-and-tracked sync artefacts. Each law is gated by
 * `requires` on @capacitor/core plus a capacitor.config.*, and a law that
 * could not look reports that it could not look. legacyId range: 421+.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { REQUIRES_CAPACITOR } from '../utils/capacitor/capacitor-law-support';
import { generateLawId } from '../utils/id-generator';

/** The limits every law reading the resolved config shares. */
const RESOLVED_ON_THIS_MACHINE =
  'Reads the config resolved by `cap config --json` on the auditing machine; a value computed from an environment variable is judged for this environment only.';
const NEEDS_THE_CLI =
  'Requires @capacitor/cli to be installed and runnable; without it the law reports that it could not resolve the config rather than passing.';

export const CAPACITOR_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Capacitor Logging Never Production',
      'Capacitor loggingBehavior is never production, at the top level or under android/ios',
      'capacitor'
    ),
    legacyId: 421,
    article: 'IV',
    subsection: '4.50',
    title: 'Capacitor Logging Never Production',
    rationale:
      "loggingBehavior: 'production' keeps the bridge logger on in release builds, and native-bridge.js logs JSON.stringify(result.data) of every plugin response — the ID token, the push token, the profile — into logcat and every bug report. Measured: 19 lines carrying a live bearer token in 18 minutes. The leak is not in the app's code, so no search of the repository finds it.",
    satisfiedBy: {
      capacitor:
        "loggingBehavior: 'debug' (or 'none') at the top level and under android/ios; never 'production'. State 'debug' explicitly rather than leaving it to the default, and show the failure reason you wanted to see on screen instead.",
    },
    detectionLimits: [
      RESOLVED_ON_THIS_MACHINE,
      NEEDS_THE_CLI,
      'Does not inspect what native plugins log under their own gates, nor console.* calls in the web bundle; those are the same flag and other laws.',
    ],
    emoji: '🔇',
    description:
      'Capacitor loggingBehavior is never production, at the top level or under android/ios',
    priority: 'CRITICAL',
    category: 'SECURITY',
    stack: 'frontend',
    requires: REQUIRES_CAPACITOR,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorLoggingNeverProductionLaw.check',
    violationMessage:
      "CONSTITUTIONAL VIOLATION Article IV.4.50: Capacitor loggingBehavior is 'production'",
    remediation: "Set loggingBehavior to 'debug' or 'none' at every level",
  },

  {
    id: generateLawId(
      'Capacitor WebView Origin Declared',
      'The Capacitor WebView origin is declared: server.hostname, androidScheme and iosScheme stated',
      'capacitor'
    ),
    legacyId: 422,
    article: 'IV',
    subsection: '4.51',
    title: 'Capacitor WebView Origin Declared',
    rationale:
      'The WebView origin is <scheme>://<hostname> from three defaulted keys whose defaults differ per platform (https on Android, capacitor on iOS); the backend CORS allowlist refuses it and every origin-scoped store is keyed by it. Measured: preflight 403 for both default origins, 204 for the declared one; and a hostname change later orphaned the only localStorage value the product keeps, on every device.',
    satisfiedBy: {
      capacitor:
        'State server.hostname, server.androidScheme and server.iosScheme explicitly — the same origin on both platforms unless you mean otherwise — and treat the value as permanent once a build has shipped.',
    },
    detectionLimits: [
      'Declared, not correct: the law cannot know the backend allowlist or the product origin, and cannot compare across repositories.',
      RESOLVED_ON_THIS_MACHINE,
      NEEDS_THE_CLI,
      'Does not detect a hostname change between versions (no history); that belongs to a release checklist.',
    ],
    emoji: '🌐',
    description:
      'The Capacitor WebView origin is declared: server.hostname, androidScheme and iosScheme stated',
    priority: 'HIGH',
    category: 'SECURITY',
    stack: 'frontend',
    requires: REQUIRES_CAPACITOR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorWebviewOriginDeclaredLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.51: Capacitor WebView origin left to per-platform defaults',
    remediation: 'State server.hostname, server.androidScheme and server.iosScheme',
  },

  {
    id: generateLawId(
      'Capacitor No Dev-Only Server Keys',
      'The committed Capacitor config carries none of the keys Capacitor documents as not for production',
      'capacitor'
    ),
    legacyId: 423,
    article: 'IV',
    subsection: '4.52',
    title: 'Capacitor No Dev-Only Server Keys',
    rationale:
      'server.url, server.cleartext, server.allowNavigation, android.allowMixedContent and webContentsDebuggingEnabled are documented by Capacitor itself as not intended for production, and cap sync ships the one committed config to every build type. A debug build that needed cleartext to localhost got it from a debug-only networkSecurityConfig; the key that would have opened it for the release build never entered the config.',
    satisfiedBy: {
      capacitor:
        'Keep the committed config production-shaped. Cleartext and debugging go into android/app/src/debug/ (a networkSecurityConfig for localhost) and the Xcode debug scheme; a live-reload server.url is passed by the CLI (`cap run --livereload`), never committed.',
    },
    detectionLimits: [
      RESOLVED_ON_THIS_MACHINE,
      NEEDS_THE_CLI,
      'allowNavigation has legitimate production uses (an OAuth flow that must stay in the WebView); the law follows Capacitor\'s own statement and expects such a project to park the key in laws.notApplicable with the reason.',
      'Does not read the native source sets, so a cleartext permission committed in the release manifest is not seen.',
    ],
    emoji: '🚧',
    description:
      'The committed Capacitor config carries none of the keys Capacitor documents as not for production',
    priority: 'CRITICAL',
    category: 'SECURITY',
    stack: 'frontend',
    requires: REQUIRES_CAPACITOR,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorNoDevOnlyServerKeysLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.52: Development-only key in the committed Capacitor config',
    remediation:
      'Remove server.url / cleartext / allowNavigation / allowMixedContent / webContentsDebuggingEnabled from the committed config',
  },

  {
    id: generateLawId(
      'Capacitor Plugin Config Declared',
      'Every installed Capacitor plugin that declares a PluginsConfig block gets one in the config',
      'capacitor'
    ),
    legacyId: 424,
    article: 'IV',
    subsection: '4.53',
    title: 'Capacitor Plugin Config Declared',
    rationale:
      'A plugin reads plugins.<Name> from the resolved config at native start and silently takes its own default when the block is absent — for the Firebase Authentication plugin an empty provider list, which rejects every sign-in on the device while the web build, cap sync, Gradle and every unit test stay green. A plugin that declares a PluginsConfig block gets one in the config, even if empty.',
    satisfiedBy: {
      capacitor:
        'For every installed plugin that augments PluginsConfig, write plugins.<Name> in capacitor.config.ts — the values you mean, or {} to state that the defaults are deliberate.',
    },
    detectionLimits: [
      'Cannot judge values; a block with the wrong provider id passes.',
      'Sees only plugins that augment PluginsConfig in dist/esm/definitions.d.ts (the plugin template\'s convention); a plugin that documents config in its README only is invisible.',
      'Needs node_modules installed and the config resolved by `cap config --json` on the auditing machine; without either it reports that it could not look, not green.',
      'Asks for a block even when every option has a default (an `App: {}`); whether that should be info rather than warning is open in the issue it came from.',
    ],
    emoji: '🧩',
    description:
      'Every installed Capacitor plugin that declares a PluginsConfig block gets one in the config',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_CAPACITOR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorPluginConfigDeclaredLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.53: Capacitor plugin left on its own silent defaults',
    remediation: 'Add plugins.<Name> for every installed plugin that declares one ({} is enough)',
  },

  {
    id: generateLawId(
      'Capacitor Single Platform Boundary',
      'Capacitor imports and platform checks live in one boundary, not in feature code',
      'capacitor'
    ),
    legacyId: 425,
    article: 'IV',
    subsection: '4.54',
    title: 'Capacitor Single Platform Boundary',
    rationale:
      'One build serves three targets only while feature code does not know which one it is on; every @capacitor/* import and isNativePlatform() call lives in one boundary behind a port. A project-level ESLint rule holds the line in the hook but is judged wrong by a root-level run (flat config does not layer); RoC sees the tree and can state the boundary as data.',
    satisfiedBy: {
      capacitor:
        'Import @capacitor/* and call Capacitor.isNativePlatform() only under thresholds.capacitor.boundary (one library). Everything else receives a port — an interface with a native implementation or null — through DI.',
    },
    detectionLimits: [
      'Import-line and call-site patterns; a re-export through a barrel inside the boundary and consumed outside is credited to the boundary, and a wrapper that merely renames the plugin API is not detected as leakage.',
      'Platform branching by other means (navigator.userAgent, window.innerWidth) is not this law\'s subject.',
      'Without thresholds.capacitor.boundary the boundary is inferred: green only when exactly one project directory (nearest project.json / package.json) imports Capacitor. A monorepo with one boundary per app should configure it; a root ESLint no-restricted-imports rule naming @capacitor is accepted as the same boundary stated in another tool.',
    ],
    emoji: '🧱',
    description:
      'Capacitor imports and platform checks live in one boundary, not in feature code',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_CAPACITOR,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorSinglePlatformBoundaryLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.54: Capacitor used outside the platform boundary',
    remediation:
      'Move @capacitor/* imports behind a port in one boundary; declare it in thresholds.capacitor.boundary',
  },
];

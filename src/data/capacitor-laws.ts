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
];

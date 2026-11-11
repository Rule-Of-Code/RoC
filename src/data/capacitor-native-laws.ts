/**
 * Capacitor Native Shell Laws Data Module
 *
 * What the Android and iOS shells decide that no scan of src/ can see: the
 * source set a cleartext opening sits in, whether the Google Services plugin
 * may be skipped, what Auto Backup copies, the iOS privacy manifest, and
 * where the signing keys live. Every native file is opened by its fixed path,
 * independent of `ignores`; a law gated on a platform that finds no shell for
 * it says so rather than passing. Tables carry the version they were read at.
 * legacyId range: 431+.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import {
  REQUIRES_CAPACITOR_ANDROID,
} from '../utils/capacitor/capacitor-law-support';
import {
  FIREBASE_ANDROID_DEPENDENCIES,
} from '../utils/capacitor/capacitor-native-tables';
import { generateLawId } from '../utils/id-generator';

const NO_SHELL_NO_PASS =
  'Selected by the platform package; when no Capacitor project has that platform\'s shell on disk, the law reports that it could not read it rather than passing.';

export const CAPACITOR_NATIVE_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Capacitor Android Cleartext Debug Only',
      'Cleartext in the Capacitor Android shell is opened only in a non-release source set, and only to loopback hosts',
      'capacitor'
    ),
    legacyId: 431,
    article: 'IV',
    subsection: '4.60',
    title: 'Capacitor Android Cleartext Debug Only',
    rationale:
      'Gradle merges src/main into every variant, so a usesCleartextTraffic attribute or a network security config that permits cleartext, added there to let a debug build reach http://localhost, ships in the release APK. Measured on a consumer: without any opening, http://localhost failed with ERR_CLEARTEXT_NOT_PERMITTED and the server saw no request; a dev-source-set config scoped to localhost made it 200 and left the merged release manifest without the attribute.',
    satisfiedBy: {
      capacitor:
        "Keep android/app/src/main free of cleartext. Put a network security config that names only localhost / 127.0.0.1 / 10.0.2.2 in src/debug (or a dev build type or flavour) and reference it from that source set's own AndroidManifest.xml.",
    },
    detectionLimits: [
      'Reads every source set\'s AndroidManifest.xml under android/app/src and the res/xml file its networkSecurityConfig names (the set\'s own, else main\'s); a ${placeholder} value or a reference that resolves to no file is reported as not judged.',
      'Does not know which build types or flavours are released: src/main, src/release and a manifest the build script routes them to with sourceSets.<main|release>.manifest.srcFile are treated as shipped; a flavour that ships with a cleartext opening is held to the debug rule (loopback only), not the release one.',
      'Assumes targetSdk 28 or later (Capacitor 8\'s template targets 36), where cleartext is off by default; below 28 Android permits it without any attribute, and that is not judged.',
      'Android only: iOS NSAppTransportSecurity / NSAllowsArbitraryLoads in Info.plist is not read.',
      NO_SHELL_NO_PASS,
    ],
    emoji: '🔓',
    description:
      'Cleartext in the Capacitor Android shell is opened only in a non-release source set, and only to loopback hosts',
    priority: 'CRITICAL',
    category: 'SECURITY',
    stack: 'frontend',
    requires: REQUIRES_CAPACITOR_ANDROID,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorAndroidCleartextDebugOnlyLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.60: Cleartext opened in a shipped Android source set',
    remediation:
      'Move the cleartext opening out of src/main into src/debug and scope it to localhost / 127.0.0.1 / 10.0.2.2',
  },

  {
    id: generateLawId(
      'Capacitor Firebase Native Config Not Skipped',
      'The Capacitor Android build fails, rather than silently skipping Firebase, when google-services.json is missing or names another package',
      'capacitor'
    ),
    legacyId: 432,
    article: 'IV',
    subsection: '4.61',
    title: 'Capacitor Firebase Native Config Not Skipped',
    rationale:
      "The Android shell @capacitor/cli 8.5.1 generates wraps the google-services plugin in try/catch with logger.info (android-template app/build.gradle:47-54), and google-services.json is rightly git-ignored, so every fresh checkout builds a green APK without Firebase: push never registers, native sign-in does nothing, no message anywhere. Measured on a consumer: 143 tasks / 0 GoogleServices / BUILD SUCCESSFUL without the file, 144 / 1 with it. A file from another project or for another applicationId also passes the template's check.",
    satisfiedBy: {
      capacitor:
        "Replace the template's try/catch with a Gradle task that fails the build when google-services.json is missing for that variant, and check that the file's package_name equals the variant's applicationId (with suffix) before cap sync.",
    },
    detectionLimits: [
      'Reads android/app/build.gradle(.kts) as text; a google-services apply moved into a convention plugin, buildSrc or a version-catalog alias is reported as not applied, not as green.',
      'A conditional apply is accepted when the script throws somewhere (a GradleException task); that the throw guards the missing file is not proven.',
      'applicationId / applicationIdSuffix are compared only when they are string literals (initWith followed once); a computed value, or a google-services.json in a flavour directory, is named in the details as not compared.',
      `Table-driven: ${FIREBASE_ANDROID_DEPENDENCIES.map(row => row.dependency).join(', ')}; each row cites where it was read (capacitor-native-tables.ts). Any other @capacitor-firebase/* dependency is treated the same once the law is selected.`,
      'Does not read GoogleService-Info.plist (iOS BUNDLE_ID), and cannot tell that the Firebase project is the right one for the environment — only that the package matches.',
      NO_SHELL_NO_PASS,
    ],
    emoji: '🔥',
    description:
      'The Capacitor Android build fails, rather than silently skipping Firebase, when google-services.json is missing or names another package',
    priority: 'CRITICAL',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: {
      ...REQUIRES_CAPACITOR_ANDROID,
      anyDependency: FIREBASE_ANDROID_DEPENDENCIES.map(row => row.dependency),
    },
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorFirebaseNativeConfigNotSkippedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.61: The Android build can skip Firebase without failing',
    remediation:
      'Fail the build when google-services.json is missing for a variant, and keep its package_name equal to the variant applicationId',
  },
];

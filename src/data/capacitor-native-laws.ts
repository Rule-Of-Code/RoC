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
  REQUIRES_CAPACITOR,
  REQUIRES_CAPACITOR_ANDROID,
  REQUIRES_CAPACITOR_IOS,
} from '../utils/capacitor/capacitor-law-support';
import {
  FIREBASE_ANDROID_DEPENDENCIES,
  PRIVACY_MANIFEST_ROWS,
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

  {
    id: generateLawId(
      'Capacitor Android Backup Scoped',
      'The Capacitor Android manifest decides what Auto Backup copies: backup off, or rules for both backup formats',
      'capacitor'
    ),
    legacyId: 433,
    article: 'IV',
    subsection: '4.62',
    title: 'Capacitor Android Backup Scoped',
    rationale:
      'The Android shell @capacitor/cli 8.5.1 generates sets allowBackup="true" with no extraction rules (android-template AndroidManifest.xml:5), and Auto Backup then copies shared preferences, getDir() directories and databases to the user\'s cloud backup and to a new device (developer.android.com/identity/data/autobackup). In a Capacitor app those hold the Preferences store (SharedPreferences "CapacitorStorage"), the WebView\'s localStorage and IndexedDB, and native SDK session tokens. What leaves the device is a product decision the template makes by default.',
    satisfiedBy: {
      capacitor:
        'Decide it in the manifest: allowBackup="false", or keep it true and add dataExtractionRules (API 31+) and fullBackupContent (API 30 and lower) that exclude the sharedpref, database and app_webview domains holding credentials.',
    },
    detectionLimits: [
      'Presence of the decision only: the domains the rules exclude are reported in the details, not judged. Both rule files are required, since each covers a different range of Android versions.',
      'Reads src/main only; a variant manifest that overrides allowBackup through tools:replace is not merged. A ${placeholder} value is reported as not judged.',
      'Does not know which stored values are sensitive; an app with nothing worth protecting should park the law in laws.notApplicable with that reason.',
      NO_SHELL_NO_PASS,
    ],
    emoji: '☁️',
    description:
      'The Capacitor Android manifest decides what Auto Backup copies: backup off, or rules for both backup formats',
    priority: 'HIGH',
    category: 'SECURITY',
    stack: 'frontend',
    requires: REQUIRES_CAPACITOR_ANDROID,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorAndroidBackupScopedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.62: Android Auto Backup left to the template default',
    remediation:
      'Set android:allowBackup="false", or add android:dataExtractionRules and android:fullBackupContent',
  },

  {
    id: generateLawId(
      'Capacitor iOS Privacy Manifest Declared',
      'The Capacitor iOS app declares, in PrivacyInfo.xcprivacy, the required-reason APIs its installed plugins use',
      'capacitor'
    ),
    legacyId: 434,
    article: 'IV',
    subsection: '4.63',
    title: 'Capacitor iOS Privacy Manifest Declared',
    rationale:
      "Apple asks for a PrivacyInfo.xcprivacy that declares the required-reason APIs an app uses, and Capacitor's guide (capacitorjs.com/docs/ios/privacy-manifest) names @capacitor/preferences — whose iOS store is UserDefaults.standard — as a plugin that brings the duty, with NSPrivacyAccessedAPICategoryUserDefaults and CA92.1 in its sample. Nothing in cap add, cap sync or the Xcode build creates the file; the project learns of it at App Store upload.",
    satisfiedBy: {
      capacitor:
        'Add ios/App/App/PrivacyInfo.xcprivacy to the App target and declare, for each installed plugin that uses a required-reason API, its NSPrivacyAccessedAPIType with the reason code that matches your use.',
    },
    detectionLimits: [
      `Table-driven (${PRIVACY_MANIFEST_ROWS.map(row => `${row.dependency} → ${row.category}`).join('; ')}): only plugins with a row are checked, and each row cites its source. @capacitor/filesystem is not a row: Capacitor's guide names it, but its timestamp reads happen in IONFilesystemLib, which CocoaPods/SPM fetch and node_modules does not hold, so the category could not be confirmed from source.`,
      'Native SDKs pulled in by plugins (Firebase) ship their own manifests and are not judged.',
      'Presence of the category and of a reason string; whether the reason is the right one for the app is reported in the details, not judged.',
      'Looks in ios/App/App first, then elsewhere under ios/App (not Pods, build output or CapApp-SPM); does not check that the file is a member of the App target in project.pbxproj. A file git ignores is red, since a clean checkout builds without it.',
      NO_SHELL_NO_PASS,
    ],
    emoji: '🍏',
    description:
      'The Capacitor iOS app declares, in PrivacyInfo.xcprivacy, the required-reason APIs its installed plugins use',
    priority: 'MEDIUM',
    category: 'DEPLOYMENT',
    stack: 'frontend',
    requires: {
      ...REQUIRES_CAPACITOR_IOS,
      anyDependency: PRIVACY_MANIFEST_ROWS.map(row => row.dependency),
    },
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorIosPrivacyManifestDeclaredLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.63: iOS privacy manifest missing a category an installed plugin needs',
    remediation:
      'Add PrivacyInfo.xcprivacy to the App target with an NSPrivacyAccessedAPIType and reason for each listed plugin',
  },

  {
    id: generateLawId(
      'Capacitor Signing Secrets Outside Repo',
      'Capacitor signing keys and their passwords are not in the repository, and the release build never falls back to the debug key',
      'capacitor'
    ),
    legacyId: 435,
    article: 'IV',
    subsection: '4.64',
    title: 'Capacitor Signing Secrets Outside Repo',
    rationale:
      "A Capacitor shell's release keystore and passwords are the app's store identity: lose them and the app cannot be updated, leak them and someone else can publish an update that installs over it. A tracked .jks/.p12, a storePassword literal in build.gradle or a tracked keystore.properties publishes them with the repository, and no source scanner reads Gradle or binaries. A release build type that falls back to the debug key installs fine and then fails to update on users' phones.",
    satisfiedBy: {
      capacitor:
        'Keep key material out of git (secret manager or CI secret), read paths and passwords through project properties or environment variables, and leave a release build unsigned, never debug-signed, when they are absent.',
    },
    detectionLimits: [
      'Asks git (tracked, or present and not ignored) for *.jks, *.keystore, *.p12, *.mobileprovision and *.p8 anywhere in the repository; a key renamed to another extension is not seen. A committed debug.keystore is flagged like any other keystore.',
      'Gradle scripts and .properties files under each android/ shell are read as text from where git would publish them (the index for tracked files); a password assembled from pieces, a GString with interpolation, or one from a buildSrc helper is not seen.',
      'The debug-key fallback is found as a signingConfigs.debug reference inside buildTypes.release; #265 rates it warning-grade, but a law carries one severity, so it fails this error law.',
      'Does not read iOS signing settings (Xcode automatic signing keeps no secret in the project). Outside a git work tree the key-material and properties checks cannot run and the law fails, saying so.',
    ],
    emoji: '🔑',
    description:
      'Capacitor signing keys and their passwords are not in the repository, and the release build never falls back to the debug key',
    priority: 'CRITICAL',
    category: 'SECURITY',
    stack: 'frontend',
    requires: REQUIRES_CAPACITOR,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'CapacitorSigningSecretsOutsideRepoLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.64: Signing secret in the repository, or release signed with the debug key',
    remediation:
      'Remove key material and password literals from git, rotate them, and leave release unsigned when the key is absent',
  },
];

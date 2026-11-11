/**
 * The tables the native-shell laws are driven by. Each row says where it was
 * read and at which version: a row is only as right as its source, so a row
 * is added one plugin at a time, after reading that plugin.
 */

/** A dependency that brings a Firebase SDK into the Android build. */
export interface FirebaseAndroidRow {
  dependency: string;
  source: string;
}

const CAPAWESOME_WRAPPER =
  'a Firebase SDK wrapper by name (npm registry 8.6.0); its android/build.gradle was not read';

export const FIREBASE_ANDROID_DEPENDENCIES: readonly FirebaseAndroidRow[] = [
  {
    dependency: '@capacitor/push-notifications',
    source: 'android/build.gradle:77 implementation com.google.firebase:firebase-messaging (8.1.2)',
  },
  {
    dependency: '@capacitor-firebase/authentication',
    source: 'android/build.gradle:63 implementation com.google.firebase:firebase-auth (8.4.0)',
  },
  {
    dependency: '@capacitor-firebase/firestore',
    source: 'android/build.gradle:56 implementation com.google.firebase:firebase-firestore (8.4.0)',
  },
  ...[
    'analytics',
    'app',
    'app-check',
    'crashlytics',
    'functions',
    'messaging',
    'performance',
    'remote-config',
    'storage',
  ].map(name => ({ dependency: `@capacitor-firebase/${name}`, source: CAPAWESOME_WRAPPER })),
];

/** An installed plugin that calls an API Apple asks to be declared with a reason. */
export interface PrivacyManifestRow {
  dependency: string;
  /** The NSPrivacyAccessedAPIType value the app's manifest must carry. */
  category: string;
  /** The reason Capacitor's own sample gives; reported, never required. */
  exampleReason: string;
  source: string;
}

export const PRIVACY_MANIFEST_ROWS: readonly PrivacyManifestRow[] = [
  {
    dependency: '@capacitor/preferences',
    category: 'NSPrivacyAccessedAPICategoryUserDefaults',
    exampleReason: 'CA92.1',
    source:
      'ios/Sources/PreferencesPlugin/Preferences.swift:18-19 stores in UserDefaults.standard (8.0.1); category and CA92.1 from the sample in capacitorjs.com/docs/ios/privacy-manifest',
  },
];

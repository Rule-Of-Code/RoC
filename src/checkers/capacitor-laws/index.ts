/**
 * Capacitor Laws — what ships through Capacitor: the resolved config, the
 * native shells, the sync artefacts. Selected only where the project
 * declares @capacitor/core and a capacitor.config.*.
 */

export { CapacitorLoggingNeverProductionLaw } from './capacitor-logging-never-production';
export { CapacitorWebviewOriginDeclaredLaw } from './capacitor-webview-origin-declared';
export { CapacitorNoDevOnlyServerKeysLaw } from './capacitor-no-dev-only-server-keys';
export { CapacitorPluginConfigDeclaredLaw } from './capacitor-plugin-config-declared';
export { CapacitorSinglePlatformBoundaryLaw } from './capacitor-single-platform-boundary';
export { CapacitorPluginPlatformDeclarationsLaw } from './capacitor-plugin-platform-declarations';
export { CapacitorDeepLinkContractLaw } from './capacitor-deep-link-contract';
export { CapacitorSyncArtefactsMatchDependenciesLaw } from './capacitor-sync-artefacts-match-dependencies';
export { CapacitorAndroidCleartextDebugOnlyLaw } from './capacitor-android-cleartext-debug-only';
export { CapacitorFirebaseNativeConfigNotSkippedLaw } from './capacitor-firebase-native-config-not-skipped';
export { CapacitorAndroidBackupScopedLaw } from './capacitor-android-backup-scoped';
export { CapacitorIosPrivacyManifestDeclaredLaw } from './capacitor-ios-privacy-manifest-declared';

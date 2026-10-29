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

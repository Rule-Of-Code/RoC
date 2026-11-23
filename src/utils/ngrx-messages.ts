/**
 * NgRx messages: the fixed texts and the message templates (functions) the
 * NgRx analyzers report with. Kept apart from the NgRx constants, which are
 * data only (#559).
 */

export const NGRX_MESSAGES = {
  // Error messages
  PACKAGE_JSON_NOT_FOUND: 'package.json not found in project root',
  APP_MODULE_NOT_FOUND: 'app.module.ts not found in expected location',
  PROJECT_ROOT_REQUIRED: 'Project root path is required',
  // Recommendation messages
  DEVTOOLS_INTEGRATION:
    'Integrate NgRx DevTools for enhanced debugging capabilities',
  FEATURE_STORE_STRUCTURE:
    'Consider implementing proper feature store structure for better organization',
  // Template messages (use with template function)
  INSTALL_FOR_STATE: (packageName: string) =>
    `Install ${packageName} for state management`,
  INSTALL_FOR_EFFECTS: (packageName: string) =>
    `Consider installing ${packageName} for side effect management`,
  INSTALL_FOR_DEBUGGING: (packageName: string) =>
    `Install ${packageName} for debugging support`,
  MISSING_CONFIG: (moduleName: string, fileName: string) =>
    `Missing ${moduleName} configuration in ${fileName}`,
  ADD_TO_IMPORTS: (moduleName: string, fileName: string) =>
    `Add ${moduleName}() to ${fileName} imports`,
  CONFIGURE_MODULE: (moduleName: string, fileName: string) =>
    `Configure ${moduleName} in ${fileName} using specialized DevTools utilities`,
  SOURCE_DIR_NOT_FOUND: (projectRoot: string, srcDir: string) =>
    `Source directory not found at ${projectRoot}/${srcDir}`,
  APP_MODULE_NOT_FOUND_AT: (path: string) => `App module not found at ${path}`,
} as const;

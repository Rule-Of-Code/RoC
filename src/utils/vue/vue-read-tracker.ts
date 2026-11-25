/**
 * Which law scanned for script files and left `.vue` single-file components
 * out (#607, P0).
 *
 * The shared scanners serve every law. A Vue project keeps most of the code a
 * frontend law is about in `.vue` files, and until the laws read them a law
 * that scanned `.ts` / `.js` passed on the rest in silence. The audit engine
 * runs each law inside `runLawScope`; `DirectoryScanner` reports every scan
 * with script extensions to `noteScriptScan`. The scope lives in
 * AsyncLocalStorage, so laws that run in parallel (`performance.parallel`,
 * `maxConcurrent`) each see their own — never a global "current law".
 *
 * A law whose scan asked for `.vue` as well is taken to read it. The engine
 * then turns a scope that scanned script extensions without `.vue` into a
 * `notRead` note on that law's result (`vueNotReadNote`).
 */

import { AsyncLocalStorage } from 'async_hooks';

/** What one law's run asked the shared scanners for. */
export interface LawScanScope {
  /** Scans that asked for script extensions without `.vue`. */
  scriptScansWithoutVue: number;
  /** Script files those scans returned (anything but `.vue`). */
  scriptFilesFound: number;
  /** A scan that asked for `.vue` too: the law reads Vue files itself. */
  readsVue: boolean;
}

const storage = new AsyncLocalStorage<LawScanScope>();

/** The script extensions a scan is about; `.vue` is the one it can leave out. */
const SCRIPT_EXTENSION = /^\.?(?:[cm]?[jt]sx?)$/i;
const VUE_EXTENSION = /^\.?vue$/i;

/** Run one law's check inside its own scan scope; returns the check's value and the scope. */
export async function runLawScope<T>(
  check: () => T | Promise<T>
): Promise<{ value: T; scope: LawScanScope }> {
  const scope: LawScanScope = {
    scriptScansWithoutVue: 0,
    scriptFilesFound: 0,
    readsVue: false,
  };
  const value = await storage.run(scope, async () => await check());
  return { value, scope };
}

/**
 * Called by the shared scanner for every scan with extensions. Outside a law
 * scope (the engine itself, the CLI) it does nothing.
 */
export function noteScriptScan(
  extensions: readonly string[] | undefined,
  files: readonly string[]
): void {
  const scope = storage.getStore();
  if (!scope || !extensions || extensions.length === 0) return;
  if (extensions.some(ext => VUE_EXTENSION.test(ext))) {
    scope.readsVue = true;
    return;
  }
  if (!extensions.some(ext => SCRIPT_EXTENSION.test(ext))) return;
  scope.scriptScansWithoutVue++;
  scope.scriptFilesFound += files.length;
}

/** How many example paths a note names. */
const EXAMPLES = 3;

/**
 * The note for a law that scanned script files without `.vue` in a project
 * that has some; null when the law read `.vue`, did not scan script files, or
 * the project has none. `judgedNothing` when the `.vue` files are all the
 * script there is: the law's scans found nothing else.
 */
export function vueNotReadNote(
  scope: LawScanScope,
  vueFiles: readonly string[]
): { note: string; judgedNothing: boolean } | null {
  if (vueFiles.length === 0) return null;
  if (scope.readsVue || scope.scriptScansWithoutVue === 0) return null;
  const examples = vueFiles.slice(0, EXAMPLES).join(', ');
  const more = vueFiles.length > EXAMPLES ? ', …' : '';
  const judgedNothing = scope.scriptFilesFound === 0;
  return {
    note: `.vue single-file components were not read: ${vueFiles.length} file(s) (${examples}${more}) — this law reads .ts/.js only so far (#607)${judgedNothing ? '; they are all the script there is, so nothing was judged' : ''}`,
    judgedNothing,
  };
}

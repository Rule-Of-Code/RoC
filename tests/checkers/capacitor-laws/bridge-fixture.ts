/**
 * Shared by the Capacitor bridge law tests: the card a law is gated by, a
 * selection check through the real `requires` reader, and a way to make the
 * project's TypeScript unloadable (the "could not read" path).
 */
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { CAPACITOR_BRIDGE_LAWS } from '../../../src/data/capacitor-bridge-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { manifest, project } from '../toolkit-fixture';

export function card(title: string) {
  const found = CAPACITOR_BRIDGE_LAWS.find(law => law.title === title);
  if (!found) throw new Error(`no card titled ${title}`);
  return found;
}

/** Is the law selected for a project declaring `dependencies` (plus `files`)? */
export function selected(
  title: string,
  dependencies: Record<string, string>,
  files: Record<string, string> = { 'capacitor.config.json': '{}' }
): boolean {
  const root = project({ 'package.json': manifest(dependencies), ...files });
  return lawRequirementsMet(card(title).requires, root);
}

/** Run `body` while the project's `typescript` cannot be loaded. */
export function withoutTypeScript<T>(body: () => T): T {
  const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
  try {
    return body();
  } finally {
    spy.mockRestore();
  }
}

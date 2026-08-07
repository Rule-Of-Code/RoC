/**
 * Canonical recognition of the RuleOfCode package by its npm name.
 *
 * RoC is distributed under more than one npm name — the public unscoped
 * `ruleofcode` and the scoped `@ruleofcode/core` — so every "is RoC a dependency
 * here?" or "is this project RoC itself?" check must accept the whole set, never a
 * single hard-coded string. Hard-coding one name silently misfires on a project
 * that installed the tool under the other name.
 */
export const RULEOFCODE_PACKAGE_NAMES: readonly string[] = [
  'ruleofcode',
  '@ruleofcode/core',
];

/**
 * True when `name` is exactly one of RoC's own published package names. Accepts
 * `unknown` so it can guard loosely-typed package.json fields directly.
 */
export function isRuleOfCodePackageName(name: unknown): boolean {
  return typeof name === 'string' && RULEOFCODE_PACKAGE_NAMES.includes(name);
}

/**
 * True when a dependency map contains RuleOfCode under any of its published names,
 * or any `*ruleofcode*` variant (a fork or a re-scope still wires in the gate).
 */
export function dependenciesIncludeRuleOfCode(
  deps: Record<string, unknown> | null | undefined
): boolean {
  if (!deps) return false;
  return Object.keys(deps).some(
    dep => isRuleOfCodePackageName(dep) || dep.includes('ruleofcode')
  );
}

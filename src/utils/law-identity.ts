/**
 * Law identity utilities — the single source of the public identity contract.
 * Extracted from ModularLawsRegistry so checkers (e.g. Config Integrity Guard)
 * can resolve identities without importing the registry (which imports the
 * checkers — a cycle).
 */

/** The audit output prints slugged law names — same transform as law-base. */
export function slugifyLawName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * A URL path segment for `/laws/:slug`.
 *
 * `slugifyLawName` only replaces whitespace, so "No Explicit Any / Non-Null
 * Assertion" prints as `no-explicit-any-/-non-null-assertion` — a slash, which a
 * router reads as a nested path, so that law is unreachable by construction (17
 * of 173 slugs carry a "/" or "()"; a downstream consumer, verified against v7.10.0).
 *
 * This is NOT `configKeySlug` even though the transform matches today: the URL and
 * the config key are different contracts. `configKeys` is what the user pastes
 * into `ruleofcode.config.json` and must be exactly what the engine accepts —
 * parentheses and all. The site routes by THIS and shows `configKeys` verbatim;
 * merging them would ship config keys the gate rejects. Kept separate on purpose.
 *
 * Guarantee: matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`, and is unique across the
 * registry — a regression test fails the build if a new law name breaks either,
 * because a URL that silently collides or 404s is worse than a build that stops.
 *
 * A URL and a config key are DIFFERENT contracts that must be free to diverge, so
 * this does not delegate to `configKeySlug`: coupling eternal URLs to the
 * config-key spelling would silently move URLs when the config key changed. Both
 * build on the shared `dashToken` primitive; this one adds URL-only hardening.
 */
export function urlSlugForLawName(name: string): string {
  // Never emit a double dash in a path segment, whatever `dashToken` does now or
  // later — a URL that must be eternal cannot depend on that primitive's details.
  return dashToken(name).replace(/-{2,}/g, '-');
}

/** Lowercase, non-alphanumeric runs to single dash, trimmed. */
function dashToken(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * The `ignores.byRule` key form (see ModularLawsRegistry.createModularCheckFunction):
 * every non-alphanumeric run collapses to a dash. It differs from the printed
 * slug for names carrying punctuation — "CI/CD Constitutional Tribunal" prints
 * as `ci/cd-…` but keys as `ci-cd-…`. Both are public spellings, so both must
 * resolve; anything else is a two-dialect identity contract, which is how a
 * config key silently gates nothing.
 */
export function configKeySlug(name: string): string {
  return dashToken(name);
}

/**
 * Every public spelling of a law's identity: canonical name, the name with a
 * trailing decorative parenthetical stripped ("Zero Tolerance Doctrine
 * (SACRED LAW)" → "Zero Tolerance Doctrine"), BOTH slug forms of each (the
 * printed slug and the byRule config-key slug), the law id, and the legacyId.
 * Config keys (laws.enabled / laws.severity / laws.notApplicable) must resolve
 * identically through ALL of them.
 */
export function lawIdentityKeys(law: {
  name?: string;
  id?: string;
  legacyId?: number | string;
}): string[] {
  const keys: string[] = [];
  if (law.id) keys.push(law.id);
  if (law.legacyId !== undefined) keys.push(String(law.legacyId));
  if (law.name) {
    const stripped = law.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    for (const n of new Set([law.name, stripped])) {
      keys.push(n, slugifyLawName(n), configKeySlug(n));
    }
  }
  return [...new Set(keys)];
}

/**
 * Which project types each stack scope is meaningful for. A law with no stack
 * is universal (applies to every project type).
 */
export const STACK_PROJECT_TYPES: Record<string, string[]> = {
  frontend: ['angular', 'react', 'vue', 'ionic'],
  typescript: ['angular', 'react', 'vue', 'ionic', 'node', 'library', 'generic'],
  python: ['python'],
};

/**
 * Whether a law applies to a project type given its stack scope. Universal laws
 * (no stack) always apply; an unknown project type is treated permissively
 * (everything applies) so detection gaps never silently drop coverage.
 */
export function lawAppliesToProjectType(
  stack: string | undefined,
  projectType: string | undefined
): boolean {
  if (!stack) return true; // universal
  if (!projectType) return true; // unknown type → don't drop coverage
  const types = STACK_PROJECT_TYPES[stack];
  return types ? types.includes(projectType) : true;
}

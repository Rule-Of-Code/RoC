/**
 * Selecting laws by category: what a `categories` value matches, which values
 * match nothing, and narrowing a selection. Moved out of ModularLawsRegistry
 * unchanged (#559); the registry's static methods delegate here and pass the
 * registry's laws where one is needed.
 */

/** A law as category selection reads it. */
interface CategorizedLaw {
  id: string;
  category: string;
}

/** A law of one of `categories` (by its category, or a category word in its id). */
export function matchesCategories(
  law: CategorizedLaw,
  categories: readonly string[]
): boolean {
  return categories.some(
    category => law.category === category || law.id.includes(category)
  );
}

/** What `categories` can match: each law's tier, and the word before `_` in each law id. */
export function categoryVocabulary(laws: readonly CategorizedLaw[]): {
  tiers: string[];
  idWords: string[];
} {
  const sorted = (values: string[]): string[] =>
    [...new Set(values)].sort((a, b) => a.localeCompare(b));
  return {
    tiers: sorted(laws.map(law => law.category)),
    idWords: sorted(
      laws.map(law => law.id.split('_')[0] ?? '').filter(Boolean)
    ),
  };
}

/** The `categories` values that match no law at all. */
export function unknownCategories(
  laws: readonly CategorizedLaw[],
  categories: readonly string[]
): string[] {
  return categories.filter(
    category => !laws.some(law => matchesCategories(law, [category]))
  );
}

/**
 * Narrow a selection to `categories` (none: unchanged). The always-on
 * meta-gates stay whatever their category: a narrowing must not remove
 * the gates that judge it (#370).
 */
export function inCategories<
  T extends CategorizedLaw & { alwaysEnabled?: boolean | undefined },
>(laws: T[], categories: readonly string[]): T[] {
  if (categories.length === 0) return laws;
  return laws.filter(
    law => law.alwaysEnabled === true || matchesCategories(law, categories)
  );
}

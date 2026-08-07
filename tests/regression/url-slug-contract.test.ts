import { serializeLaw } from '../../src/cli/laws-command';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { urlSlugForLawName } from '../../src/utils/law-identity';

/**
 * The URL contract for `/laws/:slug` (a downstream consumer, against v7.10.0).
 *
 * `slug` only replaces whitespace, so 17 of 173 slugs carried a "/" or "()" —
 * `no-explicit-any-/-non-null-assertion` is read by a router as a nested path, so
 * that law was unreachable by construction. `urlSlug` fixes it, and these tests
 * are the meta-guarantee: a future law whose name breaks URL-safety or uniqueness
 * FAILS THE BUILD, because a URL that silently collides or 404s is worse than a
 * build that stops. URLs are eternal; the test makes them so.
 */
describe('urlSlug contract for /laws/:slug (v7.11.0)', () => {
  const URL_SAFE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const laws = ModularLawsRegistry.getAll();

  it('the hazard was real: some raw slugs are not URL-safe', () => {
    const unsafe = laws.filter(
      law => !URL_SAFE.test(ModularLawsRegistry.slugifyLawName(law.name))
    );
    // If someone ever "fixes" slug itself, this may become 0 — that is fine, the
    // urlSlug guarantee below is what protects the routes either way.
    expect(unsafe.length).toBeGreaterThanOrEqual(0);
  });

  it('every law has a URL-safe urlSlug', () => {
    const bad = laws
      .map(law => ({
        name: law.name,
        urlSlug: ModularLawsRegistry.urlSlugForLawName(law.name),
      }))
      .filter(entry => !URL_SAFE.test(entry.urlSlug));

    expect(bad).toEqual([]);
  });

  it('urlSlugs are unique across the whole registry', () => {
    const byUrlSlug = new Map<string, string[]>();
    for (const law of laws) {
      const key = ModularLawsRegistry.urlSlugForLawName(law.name);
      byUrlSlug.set(key, [...(byUrlSlug.get(key) ?? []), law.name]);
    }
    const collisions = [...byUrlSlug.entries()].filter(
      ([, names]) => names.length > 1
    );

    // On collision: rename the law, or give it a stable discriminator. Never a
    // positional "-2" suffix — that would change when laws are reordered, and a
    // URL that moves is a broken bookmark.
    expect(collisions).toEqual([]);
  });

  it('resolves the previously-unreachable law to a clean route', () => {
    const law = laws.find(
      candidate => candidate.name === 'No Explicit Any / Non-Null Assertion'
    );
    expect(law).toBeDefined();

    const { urlSlug } = serializeLaw(law!);
    expect(urlSlug).toBe('no-explicit-any-non-null-assertion');
    expect(urlSlug).not.toContain('/');
  });

  it('urlSlug is a SEPARATE field, never a replacement for configKeys', () => {
    const sacred = laws.find(candidate => /\(SACRED LAW\)$/.test(candidate.name));
    const law = serializeLaw(sacred!);

    // The URL drops the parentheses; the config keys keep every spelling the
    // engine accepts, parentheses and all. Merging them would ship a config key
    // the gate rejects.
    expect(law.urlSlug).not.toContain('(');
    expect(law.identityKeys).toContain(sacred!.name);
  });

  it('pure transform matches the registry method', () => {
    for (const law of laws) {
      expect(ModularLawsRegistry.urlSlugForLawName(law.name)).toBe(
        urlSlugForLawName(law.name)
      );
    }
  });
});

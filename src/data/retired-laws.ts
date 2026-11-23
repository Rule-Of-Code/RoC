/**
 * Laws removed from the registry, kept by name so a config that still names
 * one is told what happened instead of "unknown law" (#558). A key here is
 * still refused by Config Integrity Guard, as every key that gates nothing
 * is; the message says the law was removed and what to do.
 *
 * `removed` is written relative to a release that exists ("after 8.0.1"),
 * so it stays true whatever the next version is called.
 */
export interface RetiredLaw {
  /** The law's canonical name, as configs wrote it. */
  title: string;
  /** Its slug, the other form configs used. */
  slug: string;
  /** When it left the registry. */
  removed: string;
  /** The issue that removed it. */
  issue: string;
}

export const RETIRED_LAWS: readonly RetiredLaw[] = [
  {
    title: 'No Risk Literals',
    slug: 'no-risk-literals',
    removed: 'after 8.0.1',
    issue: '#558',
  },
];

/** The retired law a config key names (its title or its slug), if any. */
export function retiredLaw(key: string): RetiredLaw | undefined {
  return RETIRED_LAWS.find(law => law.title === key || law.slug === key);
}

/**
 * The one wording for a key that names a removed law, used by Config
 * Integrity Guard and by the engine's stderr: `<where>: '<key>' is no longer
 * a law (removed after 8.0.1, #558): delete this key`. Undefined for any other
 * key, which keeps its own "unknown law" message.
 */
export function retiredLawNotice(
  where: string,
  key: string
): string | undefined {
  const retired = retiredLaw(key);
  return retired
    ? `${where}: '${key}' is no longer a law (removed ${retired.removed}, ${retired.issue}): delete this key`
    : undefined;
}

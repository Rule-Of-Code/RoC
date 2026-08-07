import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';

/**
 * Detection Limits — the visible-debt ratchet (downstream consumers).
 *
 * Every law should declare what it does NOT catch. That is the "Detection Limits"
 * section of the Law Card, and it exists because false confidence is the enemy
 * this whole tool is built to kill — a law that silently misses a case while
 * looking like it covers it is the `unauthorized_401` metric that fed nothing.
 *
 * Authoring all 173 is a large content effort, so this is not error-on-day-one:
 * it is a FLOOR that ratchets up. The count may never drop below DECLARED_FLOOR,
 * and when you author more limits you raise the floor in the same PR. The number
 * is published on /dogfood and is meant to shrink the gap in public. A silently
 * regressing count would be exactly the disarmed gate this project refuses.
 */
describe('detection-limits ratchet', () => {
  // Raise this when you author more limits. It must never go DOWN.
  const DECLARED_FLOOR = 173;

  const declared = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
    law => Array.isArray(law.detectionLimits) && law.detectionLimits.length > 0
  );

  it(`at least ${DECLARED_FLOOR} laws declare their detection limits (ratchet, never regress)`, () => {
    expect(declared.length).toBeGreaterThanOrEqual(DECLARED_FLOOR);
  });

  it('the floor matches reality — bump DECLARED_FLOOR when you exceed it', () => {
    // Not a lie in either direction: if this fails high, you authored limits
    // without raising the floor; the ratchet only protects a floor you declare.
    expect(declared.length).toBe(DECLARED_FLOOR);
  });

  it('every declared limit is a non-empty, human sentence (no placeholder debt)', () => {
    const bad = declared.flatMap(law =>
      (law.detectionLimits ?? [])
        .filter(limit => limit.trim().length < 20)
        .map(limit => `${law.title}: "${limit}"`)
    );
    expect(bad).toEqual([]);
  });

  it('a declared law never ships an empty limits array (that reads as "no limits")', () => {
    const emptyArray = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
      law => Array.isArray(law.detectionLimits) && law.detectionLimits.length === 0
    );
    // null means "not declared yet" (honest debt); [] would falsely read as
    // "this law has no limits". Never ship the empty array.
    expect(emptyArray.map(law => law.title)).toEqual([]);
  });
});

/**
 * The same ratchet, for the other two authored Law-Card fields (downstream consumers).
 * rationale = why the law exists; satisfiedBy = how you pass it, per stack. Each
 * has its own floor that may never regress and is meant to grow in public.
 */
describe('rationale & satisfiedBy ratchet', () => {
  const RATIONALE_FLOOR = 173;
  const SATISFIED_FLOOR = 172;

  const withRationale = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
    law => typeof law.rationale === 'string' && law.rationale.trim().length > 0
  );
  const withSatisfied = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
    law =>
      law.satisfiedBy !== undefined &&
      Object.keys(law.satisfiedBy).length > 0
  );

  it(`at least ${RATIONALE_FLOOR} laws declare a rationale (ratchet)`, () => {
    expect(withRationale.length).toBe(RATIONALE_FLOOR);
  });

  it(`at least ${SATISFIED_FLOOR} laws declare satisfiedBy (ratchet)`, () => {
    expect(withSatisfied.length).toBe(SATISFIED_FLOOR);
  });

  it('a rationale explains WHY, not what — it is a real sentence', () => {
    const tooShort = withRationale
      .filter(law => (law.rationale ?? '').trim().length < 40)
      .map(law => law.title);
    expect(tooShort).toEqual([]);
  });

  it('every satisfiedBy value names a real stack and is non-empty', () => {
    const stacks = new Set(['typescript', 'angular', 'python']);
    const bad = withSatisfied.flatMap(law =>
      Object.entries(law.satisfiedBy ?? {})
        .filter(
          ([stack, hint]) =>
            !stacks.has(stack) || typeof hint !== 'string' || hint.trim().length < 15
        )
        .map(([stack]) => `${law.title}.${stack}`)
    );
    expect(bad).toEqual([]);
  });
});

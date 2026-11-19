/**
 * #392 — a waiver for an opt-in law that is not enabled was dropped without a
 * word.
 *
 * `laws.notApplicable` naming a law that does not run here anyway (opt-in,
 * `defaultEnabled: false`, and neither `laws.severity` nor `laws.enabled`
 * turns it on) waives nothing. It was correctly left out of
 * `scope.waivedLaws`, but nothing said so: a config listing N waivers showed
 * N − 1 waived, and the entry that hid a reason went unnamed. The engine
 * already names waivers of stack- and requirement-gated laws as redundant;
 * an opt-in law that is not enabled gets the same kind of line.
 *
 * Through the CLI action, as the audit is run.
 */
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { auditFixture, stubLawChecks } from './waivers-named-verdict.harness';

const ALL = ModularLawsRegistry.getAll();

/** An opt-in law that a TypeScript fixture would otherwise run: no requirement, no other stack. */
const OPT_IN = ALL.find(
  l =>
    l.defaultEnabled === false &&
    !l.alwaysEnabled &&
    !l.requires &&
    (!l.stack || l.stack === 'typescript')
);
/** Universal laws that run by default, to stand for the waivers that are real. */
const REAL = ALL.filter(
  l => !l.alwaysEnabled && !l.stack && !l.requires && l.defaultEnabled !== false
).slice(0, 3);

const REDUNDANT_LINE = (name: string): string =>
  `ℹ️  laws.notApplicable: '${name}' is opt-in and not enabled in this config`;

function waivers(): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const law of REAL) entries[law.name] = 'does not apply to this project';
  entries[OPT_IN?.name ?? ''] = 'kept from when the law ran by default';
  return entries;
}

const waivedNames = (run: { json: Record<string, any> }): string[] =>
  (run.json.scope?.waivedLaws ?? []).map((w: { law: string }) => w.law);

describe('#392 a waiver for an opt-in law that is not enabled is named as redundant', () => {
  stubLawChecks();

  it('the fixture has an opt-in law and three default laws to waive', () => {
    expect(OPT_IN).toBeDefined();
    expect(REAL).toHaveLength(3);
  });

  it('opt-in law not enabled: N entries → N − 1 waived, and the one left out is named', async () => {
    const run = await auditFixture({
      mode: 'full',
      laws: { notApplicable: waivers() },
    });
    const name = OPT_IN?.name ?? '';
    expect(waivedNames(run).sort()).toEqual(REAL.map(l => l.name).sort());
    expect(waivedNames(run)).not.toContain(name);
    expect(run.text).toContain(REDUNDANT_LINE(name));
    expect(run.text).toContain('the waiver is redundant here');
  });

  it('opt-in law turned on by laws.severity: the waiver is honoured, no redundant line', async () => {
    const name = OPT_IN?.name ?? '';
    const run = await auditFixture({
      mode: 'full',
      laws: { notApplicable: waivers(), severity: { [name]: 'warning' } },
    });
    expect(waivedNames(run)).toContain(name);
    expect(run.text).not.toContain(REDUNDANT_LINE(name));
  });

  it('opt-in law named in laws.enabled: no redundant line', async () => {
    const name = OPT_IN?.name ?? '';
    const enabled: Record<string, boolean> = { [name]: true };
    for (const law of REAL) enabled[law.name] = true;
    const run = await auditFixture({
      mode: 'full',
      laws: { notApplicable: waivers(), enabled },
    });
    expect(run.text).not.toContain(REDUNDANT_LINE(name));
  });

  it('a project with no waivers prints no redundant line', async () => {
    const run = await auditFixture({ mode: 'full', laws: {} });
    expect(run.text).not.toContain('the waiver is redundant here');
  });
});

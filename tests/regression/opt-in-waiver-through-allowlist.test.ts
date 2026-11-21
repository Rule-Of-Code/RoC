/**
 * #399 — a waiver for an opt-in law that `laws.enabled` turns on changed the
 * result and was reported nowhere.
 *
 * `scope.waivedLaws` was the difference of the OPEN selection (no allowlist)
 * before and after the waivers. An opt-in law enabled only through
 * `laws.enabled` is not in the open selection, so its waiver removed it from
 * the run, turned a failing run into an exit-0 partial one, and appeared
 * neither in `scope.waivedLaws` nor in the console. A waiver that removes a
 * law from THIS run's selection is now listed too, so the JSON and the console
 * say the same thing; `applicableBeforeWaivers` stays M + W.
 *
 * Through the CLI action, as the audit is run.
 */
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { slugifyLawName } from '../../src/utils/law-identity';
import {
  auditFixture,
  setFailingLaw,
  stubLawChecks,
  type AuditRun,
} from './waivers-named-verdict.harness';

const ALL = ModularLawsRegistry.getAll();

/**
 * An opt-in law a TypeScript fixture would otherwise run: no requirement, no
 * other stack, and `error` by default, so its failure decides the exit code.
 */
const OPT_IN = ALL.find(
  l =>
    l.defaultEnabled === false &&
    l.severity === 'error' &&
    !l.alwaysEnabled &&
    !l.requires &&
    (!l.stack || l.stack === 'typescript')
);
/** A universal law that runs by default. */
const ORDINARY = ALL.find(
  l =>
    !l.alwaysEnabled &&
    !l.stack &&
    !l.requires &&
    l.defaultEnabled !== false &&
    l.name !== OPT_IN?.name
);
const OPT_NAME = OPT_IN?.name ?? '';
const OPT_KEY = slugifyLawName(OPT_NAME);
const ORD_NAME = ORDINARY?.name ?? '';
const REASON = 'waived';

const WAIVED_BLOCK = 'law(s) waived by laws.notApplicable';

const waived = (run: AuditRun): Array<{ law: string; reason: string }> =>
  run.json.scope.waivedLaws;

/** The #350 invariant: M₀ = M + W. */
function expectInvariant(run: AuditRun): void {
  const { applicableLaws, applicableBeforeWaivers, waivedLaws } =
    run.json.scope;
  expect(applicableBeforeWaivers).toBe(applicableLaws + waivedLaws.length);
}

describe('#399 a waiver of an opt-in law enabled through laws.enabled is reported', () => {
  stubLawChecks();

  it('the fixture has an opt-in law and an ordinary one', () => {
    expect(OPT_IN).toBeDefined();
    expect(ORDINARY).toBeDefined();
  });

  it('Config A (allowlist names the opt-in law, no waiver): it runs and fails — unchanged', async () => {
    setFailingLaw(OPT_NAME);
    const run = await auditFixture({
      mode: 'full',
      laws: { enabled: { [OPT_NAME]: true, [ORD_NAME]: true } },
    });
    expect(run.exitCode).toBe(1);
    expect(run.json.verdict).toBe('failed');
    expect(run.json.scope.executedLaws).toBe(2);
    expect(waived(run)).toEqual([]);
    expect(run.text).not.toContain(WAIVED_BLOCK);
    expectInvariant(run);
  });

  it('Config B (A + a waiver of the opt-in law): exit and verdict as before, the waiver is named in the JSON and the console', async () => {
    setFailingLaw(OPT_NAME);
    const run = await auditFixture({
      mode: 'full',
      laws: {
        enabled: { [OPT_NAME]: true, [ORD_NAME]: true },
        notApplicable: { [OPT_KEY]: REASON },
      },
    });
    expect(run.exitCode).toBe(0);
    expect(run.json.verdict).toBe('partial');
    expect(run.json.scope.executedLaws).toBe(1);
    expect(waived(run)).toEqual([
      { law: OPT_NAME, lawId: OPT_IN?.id, reason: REASON },
    ]);
    expect(run.text).toContain(`1 ${WAIVED_BLOCK}`);
    expect(run.text).toContain(OPT_NAME);
    expect(run.text).toContain('1 waived');
    expect(run.text).not.toContain('the waiver is redundant here');
    expectInvariant(run);
  });

  it('the severity-enabled variant lists the law once, as before', async () => {
    const run = await auditFixture({
      mode: 'full',
      laws: {
        severity: { [OPT_NAME]: 'warning' },
        notApplicable: { [OPT_KEY]: REASON },
      },
    });
    expect(waived(run).map(w => w.law)).toEqual([OPT_NAME]);
    expectInvariant(run);
  });

  it('enabled both ways (allowlist and severity) with a waiver: listed once', async () => {
    const run = await auditFixture({
      mode: 'full',
      laws: {
        enabled: { [OPT_NAME]: true, [ORD_NAME]: true },
        severity: { [OPT_NAME]: 'warning' },
        notApplicable: { [OPT_KEY]: REASON },
      },
    });
    expect(waived(run).map(w => w.law)).toEqual([OPT_NAME]);
    expectInvariant(run);
  });

  it('an ordinary law in the allowlist with a waiver: listed once, as before', async () => {
    const run = await auditFixture({
      mode: 'full',
      laws: {
        enabled: { [OPT_NAME]: true, [ORD_NAME]: true },
        notApplicable: { [ORD_NAME]: REASON },
      },
    });
    expect(waived(run).map(w => w.law)).toEqual([ORD_NAME]);
    expectInvariant(run);
  });

  it('an opt-in law the allowlist does not name, with a waiver: not waived (it would not run), and named redundant (#392)', async () => {
    const run = await auditFixture({
      mode: 'full',
      laws: {
        enabled: { [ORD_NAME]: true },
        notApplicable: { [OPT_KEY]: REASON },
      },
    });
    expect(waived(run)).toEqual([]);
    expect(run.text).toContain('the waiver is redundant here');
    expectInvariant(run);
  });
});

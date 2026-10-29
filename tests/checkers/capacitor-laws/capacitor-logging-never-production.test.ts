/**
 * CapacitorLoggingNeverProduction (#153): reads the config resolved by the
 * project's own CLI, and fails — never passes — when it cannot resolve it.
 */
import { CapacitorLoggingNeverProductionLaw } from '../../../src/checkers/capacitor-laws/capacitor-logging-never-production';
import { ctx, removeProjects } from '../toolkit-fixture';
import { capacitorProject } from './capacitor-fixture';

afterAll(removeProjects);

const check = (
  law: { check: typeof CapacitorLoggingNeverProductionLaw.check },
  extConfig: Record<string, unknown> | null
) => law.check(ctx(capacitorProject({}, extConfig)));

describe('CapacitorLoggingNeverProductionLaw without a runnable CLI', () => {
  const law = CapacitorLoggingNeverProductionLaw;

  it('fails and says it could not resolve the config — never passes on a guess', () => {
    const result = check(law, null);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/capacitor\.config\.ts: could not resolve the Capacitor config — @capacitor\/cli is not installed/),
    ]);
  });
});

describe('CapacitorLoggingNeverProductionLaw (#153)', () => {
  it.each([
    [{ loggingBehavior: 'production' }, 'loggingBehavior'],
    [{ android: { loggingBehavior: 'Production' } }, 'android.loggingBehavior'],
    [{ ios: { loggingBehavior: 'PRODUCTION' } }, 'ios.loggingBehavior'],
  ])('red: %j', (config, key) => {
    const result = check(CapacitorLoggingNeverProductionLaw, config);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining(`${key} is '`)]);
  });

  it.each([[{}], [{ loggingBehavior: 'debug' }], [{ loggingBehavior: 'none', android: { loggingBehavior: 'debug' } }]])(
    'green: %j',
    config => {
      expect(check(CapacitorLoggingNeverProductionLaw, config).violations).toEqual([]);
    }
  );
});

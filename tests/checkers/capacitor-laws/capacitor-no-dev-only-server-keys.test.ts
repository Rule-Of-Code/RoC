/**
 * CapacitorNoDevOnlyServerKeys (#155): reads the config resolved by the
 * project's own CLI, and fails — never passes — when it cannot resolve it.
 */
import { CapacitorNoDevOnlyServerKeysLaw } from '../../../src/checkers/capacitor-laws/capacitor-no-dev-only-server-keys';
import { ctx, removeProjects } from '../toolkit-fixture';
import { capacitorProject } from './capacitor-fixture';

afterAll(removeProjects);

const check = (
  law: { check: typeof CapacitorNoDevOnlyServerKeysLaw.check },
  extConfig: Record<string, unknown> | null
) => law.check(ctx(capacitorProject({}, extConfig)));

describe('CapacitorNoDevOnlyServerKeysLaw without a runnable CLI', () => {
  const law = CapacitorNoDevOnlyServerKeysLaw;

  it('fails and says it could not resolve the config — never passes on a guess', () => {
    const result = check(law, null);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/capacitor\.config\.ts: could not resolve the Capacitor config — @capacitor\/cli is not installed/),
    ]);
  });
});

describe('CapacitorNoDevOnlyServerKeysLaw (#155)', () => {
  it('red: a live-reload url with cleartext', () => {
    const result = check(CapacitorNoDevOnlyServerKeysLaw, {
      server: { url: 'http://192.168.1.20:4200', cleartext: true },
    });
    expect(result.violations).toEqual([
      expect.stringContaining('server.url is set'),
      expect.stringContaining('server.cleartext is set'),
    ]);
  });

  it.each([
    [{ server: { allowNavigation: ['*.example.com'] } }, 'server.allowNavigation'],
    [{ android: { allowMixedContent: true } }, 'android.allowMixedContent'],
    [{ android: { webContentsDebuggingEnabled: true } }, 'android.webContentsDebuggingEnabled'],
    [{ ios: { webContentsDebuggingEnabled: true } }, 'ios.webContentsDebuggingEnabled'],
  ])('red: %j', (config, key) => {
    expect(check(CapacitorNoDevOnlyServerKeysLaw, config).violations).toEqual([
      expect.stringContaining(`${key} is set`),
    ]);
  });

  it('green: none of them, or their safe values', () => {
    const result = check(CapacitorNoDevOnlyServerKeysLaw, {
      server: { hostname: 'app.example', cleartext: false, allowNavigation: [], url: '' },
      android: { webContentsDebuggingEnabled: false },
    });
    expect(result.violations).toEqual([]);
  });
});

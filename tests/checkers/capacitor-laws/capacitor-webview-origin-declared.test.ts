/**
 * CapacitorWebviewOriginDeclared (#154): reads the config resolved by the
 * project's own CLI, and fails — never passes — when it cannot resolve it.
 */
import { CapacitorWebviewOriginDeclaredLaw } from '../../../src/checkers/capacitor-laws/capacitor-webview-origin-declared';
import { ctx, removeProjects } from '../toolkit-fixture';
import { capacitorProject } from './capacitor-fixture';

afterAll(removeProjects);

const check = (
  law: { check: typeof CapacitorWebviewOriginDeclaredLaw.check },
  extConfig: Record<string, unknown> | null
) => law.check(ctx(capacitorProject({}, extConfig)));

describe('CapacitorWebviewOriginDeclaredLaw without a runnable CLI', () => {
  const law = CapacitorWebviewOriginDeclaredLaw;

  it('fails and says it could not resolve the config — never passes on a guess', () => {
    const result = check(law, null);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/capacitor\.config\.ts: could not resolve the Capacitor config — @capacitor\/cli is not installed/),
    ]);
  });
});

describe('CapacitorWebviewOriginDeclaredLaw (#154)', () => {
  it('red: nothing stated — the defaults differ per platform', () => {
    const result = check(CapacitorWebviewOriginDeclaredLaw, { appId: 'x' });
    expect(result.violations).toEqual([
      expect.stringMatching(/server\.hostname, server\.androidScheme, server\.iosScheme not stated — .*orphans that storage/),
    ]);
  });

  it('red: a hostname without both schemes', () => {
    const result = check(CapacitorWebviewOriginDeclaredLaw, {
      server: { hostname: 'app.example', androidScheme: 'https' },
    });
    expect(result.violations).toEqual([expect.stringContaining('server.iosScheme not stated')]);
  });

  it('green: all three stated, even as the defaults', () => {
    const result = check(CapacitorWebviewOriginDeclaredLaw, {
      server: { hostname: 'localhost', androidScheme: 'https', iosScheme: 'capacitor' },
    });
    expect(result.violations).toEqual([]);
  });
});

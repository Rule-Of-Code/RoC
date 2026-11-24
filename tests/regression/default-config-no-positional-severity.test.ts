/**
 * #585 — the default config built `laws.severity` as a positional map,
 * `law-1` … `law-N`, one key per registry entry by index. No law is named
 * `law-N`, so the engine and Config Integrity Guard skipped the keys and they
 * changed nothing; they still travelled in the config section of every
 * result and shifted with every registry change.
 *
 * The map is gone: each law's authored defaultSeverity is the source of
 * truth. A user's old config that still carries `law-N` keys keeps working.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ConfigLoader } from '../../src/config/loader';
import {
  ANGULAR_CONFIG,
  DEFAULT_CONFIG,
  REACT_CONFIG,
} from '../../src/config/types';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import {
  isNonLawConfigKey,
  lawIdentityKeys,
} from '../../src/utils/law-identity';
import { auditFixture, stubLawChecks } from './waivers-named-verdict.harness';

const POSITIONAL = /^law-\d+$/;
const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

describe('#585 the default config writes no positional severity map', () => {
  it.each([
    ['DEFAULT_CONFIG', DEFAULT_CONFIG.laws.severity],
    ['ANGULAR_CONFIG', ANGULAR_CONFIG.laws?.severity],
    ['REACT_CONFIG', REACT_CONFIG.laws?.severity],
  ])('%s has an empty laws.severity', (_name, severity) => {
    expect(severity).toEqual({});
  });

  it('a project with no config file loads no law-N key', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-585-'));
    roots.push(root);
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'p', version: '1.0.0' })
    );
    const severity = ConfigLoader.load(root).laws.severity ?? {};
    expect(Object.keys(severity).filter(k => POSITIONAL.test(k))).toEqual([]);
  });
});

describe('#585 the config section of a result carries no law-N key', () => {
  stubLawChecks();

  it('the JSON result of an audit echoes no positional severity entry', async () => {
    const run = await auditFixture({ mode: 'fast', laws: {} });
    roots.push(run.root);
    const configs = (run.json.results as Array<{ config?: unknown }>)
      .map(r => r.config)
      .filter(Boolean);
    expect(configs.length).toBeGreaterThan(0);
    for (const config of configs) {
      const severity =
        (config as { laws?: { severity?: Record<string, unknown> } }).laws
          ?.severity ?? {};
      expect(Object.keys(severity).filter(k => POSITIONAL.test(k))).toEqual([]);
    }
  }, 60000);
});

describe('#585 every law keeps its severity', () => {
  it('no law has an identity of the law-N shape, so the old map gated nothing', () => {
    const shaped = ModularLawsRegistry.getAll().flatMap(law =>
      lawIdentityKeys(law).filter(key => POSITIONAL.test(key))
    );
    expect(shaped).toEqual([]);
  });

  it('a law-N key in an old user config is still accepted as a non-law key', () => {
    expect(isNonLawConfigKey('law-12')).toBe(true);
    expect(isNonLawConfigKey('Zero Tolerance Doctrine')).toBe(false);
  });
});

/**
 * Recommended-config delivery: the postinstall hook and the `recommend` command
 * share one generator (scripts/recommend-config.js, plain CJS so it also runs
 * during an install without a build).
 *
 * The templates are validated against the live registry: a severity key that
 * matches no law would silently gate nothing — the exact failure mode the
 * Config Integrity Guard (227) exists to prevent. Shipping such a key in OUR
 * OWN recommendation would be inexcusable.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { lawIdentityKeys } from '../../src/utils/law-identity';

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  generateRecommendedConfig,
  detectStack,
  APPLICABLE_LAWS,
  OUTPUT_FILE,
} = require('../../scripts/recommend-config') as {
  generateRecommendedConfig: (
    root: string,
    options?: { now?: string }
  ) => { written: boolean; fileName?: string; stack?: string; applicableLaws?: number };
  detectStack: (root: string) => { stack: string; projectType: string } | null;
  APPLICABLE_LAWS: Record<string, number>;
  OUTPUT_FILE: string;
};

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-rec-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}
afterAll(() => {
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

const PY = { 'pyproject.toml': "[project]\nname='svc'\n" };
const NG = {
  'package.json': JSON.stringify({
    name: 'ui',
    dependencies: { '@angular/core': '^17.0.0' },
  }),
  'angular.json': '{}',
};

describe('stack detection', () => {
  it.each([
    ['python', PY, 'python'],
    ['angular', NG, 'frontend'],
  ])('detects a %s project', (_label, files, expected) => {
    expect(detectStack(fixture(files))?.stack).toBe(expected);
  });

  it('never recommends to RoC itself', () => {
    const dir = fixture({
      'package.json': JSON.stringify({ name: '@ruleofcode/core' }),
    });
    expect(detectStack(dir)).toBeNull();
  });

  it('writes nothing for an unknown stack', () => {
    const dir = fixture({ 'package.json': JSON.stringify({ name: 'plain' }) });
    expect(generateRecommendedConfig(dir).written).toBe(false);
    expect(fs.existsSync(path.join(dir, OUTPUT_FILE))).toBe(false);
  });
});

describe('generation', () => {
  it.each([
    ['python', PY],
    ['frontend', NG],
  ])('writes a valid, placeholder-free config for %s', (stack, files) => {
    const dir = fixture(files);
    const result = generateRecommendedConfig(dir, { now: '2026-01-01' });

    expect(result.written).toBe(true);
    expect(result.stack).toBe(stack);

    const raw = fs.readFileSync(path.join(dir, OUTPUT_FILE), 'utf8');
    expect(raw).not.toMatch(/\{\{/); // every placeholder substituted

    const config = JSON.parse(raw);
    expect(config.includes).toBeUndefined(); // no whitelist — the whole point
    expect(config.laws.paretoMode).toBe(false);
    expect(config.performance.cache).toBe(false);
    expect(typeof config.laws.minLawsChecked).toBe('number');
    expect(config.laws.minLawsChecked).toBeGreaterThan(0);
  });

  it('never touches the project’s active config', () => {
    const dir = fixture({ ...PY, 'ruleofcode.config.json': '{"mine":true}' });
    generateRecommendedConfig(dir);
    expect(
      JSON.parse(fs.readFileSync(path.join(dir, 'ruleofcode.config.json'), 'utf8'))
    ).toEqual({ mine: true });
  });

  it('is idempotent — an unchanged version rewrites nothing', () => {
    const dir = fixture(PY);
    expect(generateRecommendedConfig(dir, { now: '2026-01-01' }).written).toBe(true);
    expect(generateRecommendedConfig(dir, { now: '2026-01-01' }).written).toBe(false);
  });
});

describe('templates are honest about the registry', () => {
  const knownKeys = new Set<string>();
  for (const law of ModularLawsRegistry.getAll()) {
    for (const key of lawIdentityKeys(law)) knownKeys.add(key);
  }

  it.each([['python', PY], ['frontend', NG]])(
    'every %s severity key resolves to a real law',
    (_stack, files) => {
      const dir = fixture(files);
      generateRecommendedConfig(dir);
      const config = JSON.parse(
        fs.readFileSync(path.join(dir, OUTPUT_FILE), 'utf8')
      );

      const unknown = Object.keys(config.laws.severity).filter(
        k => !knownKeys.has(k)
      );
      expect(unknown).toEqual([]);
    }
  );

  it.each([
    ['python', 'python'],
    ['frontend', 'angular'],
  ])(
    'the advertised applicable-law count for %s matches the registry',
    (stack, projectType) => {
      const actual = ModularLawsRegistry.getAll().filter(l =>
        ModularLawsRegistry.lawAppliesToProjectType(l.stack, projectType)
      ).length;
      expect(APPLICABLE_LAWS[stack]).toBe(actual);
    }
  );
});

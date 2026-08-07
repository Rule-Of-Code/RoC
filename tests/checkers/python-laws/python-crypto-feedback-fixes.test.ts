/**
 * Regression for the 4 RoC bugs found during BE crypto's real adopt of the
 * v7.3.0 Python domain (roc-feedback-python-domain-from-crypto-be):
 *   Bug 1 — Python checkers honour config.ignores.global
 *   Bug 2 — Public Docstrings robust to a trailing comment (# pragma) on the
 *           class/def line (incl. unbalanced brackets in the comment)
 *   Bug 4 — TS-only laws (SACRED tsconfig/eslint checks, naming, unit-test,
 *           api-security) are scoped to the typescript stack, so they skip Python
 *   Bug 3 — audit results expose canonical lawId/legacyId; notApplicable honours
 *           legacyId
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PublicDocstringsLaw } from '../../../src/checkers/python-laws/public-docstrings';
import { SettingsViaBaseSettingsLaw } from '../../../src/checkers/python-laws/settings-via-base-settings';
import { ModularLawsRegistry } from '../../../src/registry/modular-laws-registry';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cbfix-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const p = path.join(dir, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
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
const ctx = (root: string, extra?: Partial<RuleOfCodeConfig>): LawCheckContext => {
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.type = 'python';
  if (extra) Object.assign(config, extra);
  return { projectRoot: root, config } as never;
};

describe('Bug 1 — Python checkers honour config.ignores.global', () => {
  const dir = (): string =>
    fixture({
      'pyproject.toml': "[project]\nname='x'\n",
      'legacy/old.py': 'import os\n\nTOKEN = os.getenv("T")\n',
      'src/app.py': 'from app.settings import S\n',
    });
  it('flags the legacy violation when not ignored', () => {
    expect(SettingsViaBaseSettingsLaw.check(ctx(dir())).passed).toBe(false);
  });
  it('skips it when legacy/ is in ignores.global', () => {
    const c = ctx(dir(), { ignores: { global: ['**/legacy/**'] } } as never);
    expect(SettingsViaBaseSettingsLaw.check(c).passed).toBe(true);
  });
});

describe('Bug 2 — Public Docstrings robust to trailing comment on class line', () => {
  it('passes a documented class with a # pragma (and unbalanced bracket) comment', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\n",
      'src/c.py': 'class KmsEnvelopeCipher:  # pragma: no cover (see ticket\n    """KMS envelope cipher."""\n    pass\n',
    });
    expect(PublicDocstringsLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('still flags an undocumented class that carries a pragma', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\n",
      'src/c.py': 'class Bare:  # pragma: no cover\n    pass\n',
    });
    expect(PublicDocstringsLaw.check(ctx(dir)).passed).toBe(false);
  });
});

describe('Bug 4 — TS-only laws are scoped typescript (skip Python, run Angular)', () => {
  const all = ModularLawsRegistry.getAll();
  const law = (name: string): { stack?: string } | undefined =>
    all.find(l => l.name === name);
  const TS_ONLY = [
    'Zero Tolerance Doctrine (SACRED LAW)',
    'Investment-Grade Quality (SACRED LAW)',
    'Professional Excellence Mandate',
    'Naming Convention Enforcement',
    'Unit Test Quality Standards',
    'API Security Standards',
  ];
  it.each(TS_ONLY)('%s is typescript-scoped', name => {
    expect(law(name)?.stack).toBe('typescript');
    expect(
      ModularLawsRegistry.lawAppliesToProjectType('typescript', 'python')
    ).toBe(false);
    expect(
      ModularLawsRegistry.lawAppliesToProjectType('typescript', 'angular')
    ).toBe(true);
  });
});

describe('Bug 3 — canonical identifiers exposed + notApplicable honours legacyId', () => {
  it('getAll exposes legacyId on laws that declare one', () => {
    const withLegacy = ModularLawsRegistry.getAll().filter(
      l => typeof l.legacyId === 'number'
    );
    expect(withLegacy.length).toBeGreaterThan(0);
  });
  it('getEnabled drops a law keyed in notApplicable by its legacyId', () => {
    const sample = ModularLawsRegistry.getAll().find(
      l => typeof l.legacyId === 'number'
    );
    expect(sample).toBeDefined();
    const legacyId = String(sample!.legacyId);
    const config = FileUtils.getMinimalDefaultConfig();
    (config.laws as Record<string, unknown>).notApplicable = {
      [legacyId]: 'n/a for this project',
    };
    const enabled = ModularLawsRegistry.getEnabled(config);
    expect(enabled.some(l => l.id === sample!.id)).toBe(false);
  });
});

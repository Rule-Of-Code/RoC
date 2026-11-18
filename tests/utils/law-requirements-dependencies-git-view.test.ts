/**
 * #381 — the dependency conditions of `requires` (`anyDependency`,
 * `allDependencies`, `anyPythonDependency`) read what git publishes, as
 * `anyFileContaining` does since 7.27.0: a tracked manifest (from the index
 * when the working copy differs) or an untracked one that is not ignored. A
 * git-ignored manifest — generated, vendored, a scratch copy — selects no
 * law. Outside a git work tree the disk is read, as before.
 *
 * The selector, the liveness floor and the config-key validators all ask
 * `lawRequirementsMet`, so they read one set; the last block shows it
 * through the engine.
 */
import fs from 'fs';
import path from 'path';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { lawRequirementsMet } from '../../src/utils/law-requirements';
import { livenessFloorOf } from '../../src/utils/liveness-floor';
import { project, removeProjects } from '../checkers/toolkit-fixture';
import { repo } from './git-fixture';

afterAll(removeProjects);

const ANY = { anyDependency: ['left-pad-neutral'] };
const ALL = { allDependencies: ['left-pad-neutral', 'right-pad-neutral'] };
const PY = { anyPythonDependency: ['neutral-orm'] };
const ROOT_PKG = JSON.stringify({ name: 'neutral-fixture', version: '1.0.0' });
const SCRATCH_PKG = JSON.stringify({
  name: 'scratch',
  version: '0.0.0',
  dependencies: { 'left-pad-neutral': '1.0.0', 'right-pad-neutral': '1.0.0' },
});

describe('anyDependency / allDependencies read the package.json manifests git publishes', () => {
  it('a dependency declared only in a git-ignored manifest does not select', () => {
    const root = repo(
      { '.gitignore': 'packages/scratch/\n', 'package.json': ROOT_PKG, 'packages/scratch/package.json': SCRATCH_PKG },
      ['.gitignore', 'package.json']
    );
    expect(lawRequirementsMet(ANY, root)).toBe(false);
    expect(lawRequirementsMet(ALL, root)).toBe(false);
  });

  it('a tracked manifest selects', () => {
    const root = repo({ 'package.json': ROOT_PKG, 'packages/scratch/package.json': SCRATCH_PKG }, [
      'package.json',
      'packages/scratch/package.json',
    ]);
    expect(lawRequirementsMet(ANY, root)).toBe(true);
    expect(lawRequirementsMet(ALL, root)).toBe(true);
  });

  it('an untracked manifest that is not ignored selects (git add -A publishes it)', () => {
    const root = repo({ 'package.json': ROOT_PKG, 'packages/scratch/package.json': SCRATCH_PKG }, ['package.json']);
    expect(lawRequirementsMet(ANY, root)).toBe(true);
  });

  it('a tracked manifest is read from the index, not from a draft on disk', () => {
    const draft = repo({ 'package.json': ROOT_PKG }, ['package.json']);
    fs.writeFileSync(path.join(draft, 'package.json'), SCRATCH_PKG);
    expect(lawRequirementsMet(ANY, draft)).toBe(false);
    const staged = repo({ 'package.json': SCRATCH_PKG }, ['package.json']);
    fs.writeFileSync(path.join(staged, 'package.json'), ROOT_PKG);
    expect(lawRequirementsMet(ANY, staged)).toBe(true);
  });

  it('outside a git work tree the disk is read, as before', () => {
    const root = project({ 'package.json': ROOT_PKG, 'packages/scratch/package.json': SCRATCH_PKG });
    expect(lawRequirementsMet(ANY, root)).toBe(true);
    expect(lawRequirementsMet(ALL, root)).toBe(true);
  });
});

describe('anyPythonDependency reads the Python manifests git publishes', () => {
  const PYPROJECT = '[project]\nname = "neutral-service"\nversion = "1.0.0"\ndependencies = []\n';

  it('a dependency declared only in a git-ignored requirements file does not select', () => {
    const root = repo(
      { '.gitignore': 'requirements-local.txt\n', 'pyproject.toml': PYPROJECT, 'requirements-local.txt': 'neutral-orm==1.0\n' },
      ['.gitignore', 'pyproject.toml']
    );
    expect(lawRequirementsMet(PY, root)).toBe(false);
  });

  it('a tracked requirements file selects; an untracked unignored one too', () => {
    const tracked = repo({ 'pyproject.toml': PYPROJECT, 'requirements.txt': 'neutral-orm==1.0\n' }, ['pyproject.toml', 'requirements.txt']);
    expect(lawRequirementsMet(PY, tracked)).toBe(true);
    const untracked = repo({ 'pyproject.toml': PYPROJECT, 'requirements.txt': 'neutral-orm==1.0\n' }, ['pyproject.toml']);
    expect(lawRequirementsMet(PY, untracked)).toBe(true);
  });

  it('inside anyOf too (the shape the request-path and measurement laws use)', () => {
    const root = repo(
      { '.gitignore': 'requirements-local.txt\n', 'pyproject.toml': PYPROJECT, 'requirements-local.txt': 'neutral-orm==1.0\n' },
      ['.gitignore', 'pyproject.toml']
    );
    expect(lawRequirementsMet({ anyOf: [PY, ANY] }, root)).toBe(false);
  });

  it('outside a git work tree the disk is read, as before', () => {
    const root = project({ 'pyproject.toml': PYPROJECT, 'requirements-local.txt': 'neutral-orm==1.0\n' });
    expect(lawRequirementsMet(PY, root)).toBe(true);
  });
});

describe('the selector, the liveness floor and the validators read one set', () => {
  // A law gated by a single package, chosen by property.
  const gated = ModularLawsRegistry.getAll().find(
    l => l.stack === 'frontend' && l.defaultEnabled !== false && l.requires && Object.keys(l.requires).join() === 'anyDependency'
  );
  const pkg = gated?.requires?.anyDependency?.[0] as string;
  const files = (extra: Record<string, string>): Record<string, string> => ({
    'package.json': JSON.stringify({ name: 'neutral-fixture', version: '1.0.0', dependencies: { react: '18.3.1' } }),
    'src/index.tsx': 'export const App = (): null => null;\n',
    'ruleofcode.config.json': JSON.stringify({
      project: { type: 'react' },
      laws: { severity: { [gated?.name ?? '']: 'error' }, minLawsChecked: 9999 },
    }),
    ...extra,
  });
  const scratch = JSON.stringify({ name: 'scratch', version: '0.0.0', dependencies: { [pkg]: '1.0.0' } });

  async function selection(root: string): Promise<{ selected: boolean; warned: boolean; floorL: number }> {
    const warnings: string[] = [];
    const spies = [
      jest.spyOn(console, 'log').mockImplementation(),
      jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => void warnings.push(a.join(' '))),
      jest.spyOn(process.stdout, 'write').mockImplementation(() => true),
      jest.spyOn(process.stderr, 'write').mockImplementation(() => true),
    ];
    try {
      const auditor = new RuleOfCodeAuditor({}, root, false, 'full');
      // The engine refuses (minLawsChecked 9999) before any law runs: the
      // selection and the validator warnings are what is read here.
      await auditor.audit();
      const config = JSON.parse(fs.readFileSync(path.join(root, 'ruleofcode.config.json'), 'utf8'));
      return {
        selected: (auditor as unknown as { getLawsToAudit(): Array<{ name: string }> }).getLawsToAudit().some(l => l.name === gated?.name),
        warned: warnings.some(w => w.includes(`'${gated?.name}' exists but this project does not declare`)),
        floorL: livenessFloorOf({ ...config, laws: {} }, root).applicableLaws,
      };
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  }

  it('a git-ignored manifest: not selected, not counted in L, and the validator says requirement-gated', async () => {
    expect(gated).toBeDefined();
    const ignored = repo(files({ '.gitignore': 'packages/\n', 'packages/scratch/package.json': scratch }), ['.gitignore', 'package.json']);
    const tracked = repo(files({ 'packages/scratch/package.json': scratch }), ['package.json', 'packages/scratch/package.json']);
    const off = await selection(ignored);
    const on = await selection(tracked);
    expect(off).toMatchObject({ selected: false, warned: true });
    expect(on).toMatchObject({ selected: true, warned: false });
    expect(on.floorL).toBeGreaterThan(off.floorL);
  }, 60000);
});

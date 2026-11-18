/**
 * #387 — `ConfigLoader.loadConfig` dropped the configured project type that
 * `ConfigLoader.load` keeps, and the auditor's constructor falls back to
 * `loadConfig` when it is given no config object.
 *
 * Cause: `loadConfig` read the file through `FileUtils.findConfig`, which
 * accepts a config only when it has an `ignores`, `includes` or `laws`
 * section. A file that declares only `project` was treated as no config at
 * all, so the minimal defaults (`type: 'generic'`) came back. The merger was
 * not involved. `loadConfig` now delegates to `load`: one way to read a
 * project's config, with the detected type as the base.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigLoader } from '../../src/config/loader';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';

const made: string[] = [];
afterAll(() => {
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-387-'));
  made.push(root);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  return root;
}

const PYTHON = { 'pyproject.toml': '[project]\nname = "neutral-service"\nversion = "1.0.0"\n', 'app/main.py': 'x = 1\n' };
const TYPESCRIPT = {
  'package.json': JSON.stringify({ name: 'neutral-fixture', version: '1.0.0', devDependencies: { typescript: '5.6.3' } }),
  'tsconfig.json': '{}',
  'src/index.ts': 'export const a = 1;\n',
};

describe('#387 load and loadConfig read the same project type', () => {
  it.each([
    ['only a project section', { project: { type: 'python' } }],
    ['a project and a laws section', { project: { type: 'python' }, laws: {} }],
  ])('python config with %s → python from both', (_name, config) => {
    const root = fixture({ ...PYTHON, 'ruleofcode.config.json': JSON.stringify(config) });
    expect(ConfigLoader.load(root).project.type).toBe('python');
    expect(ConfigLoader.loadConfig(root).project.type).toBe('python');
  });

  it('no config file → the detected type from both', () => {
    const root = fixture(PYTHON);
    expect(ConfigLoader.load(root).project.type).toBe('python');
    expect(ConfigLoader.loadConfig(root).project.type).toBe('python');
  });

  it('the constructor without a config object selects for the configured type, not for what is detected', () => {
    // A configured non-generic type wins in the engine; the detector would say typescript.
    const root = fixture({ ...TYPESCRIPT, 'ruleofcode.config.json': JSON.stringify({ project: { type: 'node' } }) });
    const auditor = new RuleOfCodeAuditor({}, root, false, 'full');
    expect((auditor as unknown as { detectProjectType(): string | undefined }).detectProjectType()).toBe('node');
    expect(ConfigLoader.loadConfig(root).project.root).toBe(root);
  });
});

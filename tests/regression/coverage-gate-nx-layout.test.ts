import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AutomatedCodeQualityGatesLaw } from '../../src/laws/deployment/automated-code-quality-gates';
import { FileUtils } from '../../src/utils';

/**
 * In an Nx workspace the ROOT jest config cannot hold a coverage threshold. It
 * is an aggregator — `projects: await getJestProjectsAsync()` — and Jest
 * resolves thresholds per project when `projects` is used. The threshold lives
 * in `apps/<name>/jest.config.ts`, which is where Jest expects it.
 *
 * This law read the root and nowhere else, so a project gating on 100%
 * branches was reported as having no coverage gate. The only way to satisfy the
 * check would have been to duplicate the threshold at the root, where it gates
 * nothing — a decoration added to be seen, which is the box-ticking this tool
 * exists to refuse.
 */
describe('coverage gates are found where Jest keeps them', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const reportsMissingGate = async (): Promise<boolean> => {
    const result = await AutomatedCodeQualityGatesLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    });
    return (result.violations ?? []).some(v =>
      /Missing test coverage quality gates/.test(v)
    );
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-gate-'));
    write('package.json', '{"name":"w","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('finds the threshold in a per-project jest config', async () => {
    write('nx.json', '{}');
    write(
      'jest.config.ts',
      'export default async () => ({ projects: await getJestProjectsAsync() });'
    );
    write(
      'apps/web/jest.config.ts',
      [
        'export default {',
        '  coverageThreshold: {',
        '    global: { branches: 100, functions: 100, lines: 100, statements: 100 },',
        '  },',
        '};',
      ].join('\n')
    );

    expect(await reportsMissingGate()).toBe(false);
  });

  it('still finds a threshold in a single-project root config', async () => {
    write(
      'jest.config.js',
      'module.exports = { coverageThreshold: { global: { lines: 80 } } };'
    );

    expect(await reportsMissingGate()).toBe(false);
  });

  // The red control: no threshold anywhere is still reported.
  it('still reports a workspace with no threshold at all', async () => {
    write('nx.json', '{}');
    write(
      'jest.config.ts',
      'export default async () => ({ projects: await getJestProjectsAsync() });'
    );
    write('apps/web/jest.config.ts', 'export default { preset: "../../jest.preset.js" };');

    expect(await reportsMissingGate()).toBe(true);
  });
});

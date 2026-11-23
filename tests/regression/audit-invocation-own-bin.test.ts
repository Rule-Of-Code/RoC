/**
 * #434, the point still open — a package that runs the audit through its own
 * bin (`node dist/cli.js audit`) is not recognised as running it.
 *
 * The shared probe (auditInvocations) reads package scripts, committed hooks
 * and CI steps, and matches a command with RUNS_AUDIT, which needs the word
 * `ruleofcode` or `roc` in the command. The package that IS the tool, or a
 * fork of it, runs its own build: `"constitutional-check": "node
 * dist/cli.js audit"`. The file is what its package.json `bin` maps the
 * `ruleofcode` / `roc` command to, so the command runs the audit, and
 * Constitutional Supremacy says no enforcement script exists.
 *
 * The evidence is the manifest's own `bin` map, not the package name: a
 * script that runs the file a `ruleofcode` or `roc` bin entry points at, with
 * `audit`, runs the audit. A package whose bin of the same path is called
 * something else is not this tool, and its `node dist/cli.js audit` is not
 * counted.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ConstitutionalSupremacyLaw } from '../../src/checkers/sacred-laws/constitutional-supremacy';
import type { LawCheckContext } from '../../src/types/law.types';
import { FileUtils } from '../../src/utils';
import { auditInvocations } from '../../src/utils/audit-invocation';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-434-bin-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const manifest = (
  bin: Record<string, string>,
  scripts: Record<string, string>
): Record<string, string> => ({
  'package.json': JSON.stringify({
    name: 'some-audit-tool',
    version: '1.0.0',
    bin,
    scripts: { test: 'jest', build: 'tsc', ...scripts },
  }),
  'src/cli.ts': 'export const run = 1;\n',
});

const ctx = (projectRoot: string): LawCheckContext => ({
  projectRoot,
  config: FileUtils.getMinimalDefaultConfig(),
});
const SUPREMACY = 'No constitutional law enforcement scripts';

describe('#434 the audit run through the package’s own bin is evidence', () => {
  const OWN_BIN = { ruleofcode: 'dist/cli.js', roc: 'dist/cli.js' };

  it.each([
    ['node dist/cli.js audit', 'node dist/cli.js audit'],
    [
      'node ./dist/cli.js audit --mode=full',
      'node ./dist/cli.js audit --mode=full',
    ],
    ['a chain', 'npm run build && node dist/cli.js audit'],
  ])('a script running %s', (_label, command) => {
    const root = project(
      manifest(OWN_BIN, { 'constitutional-check': command })
    );
    expect(auditInvocations(root)).toContain('script "constitutional-check"');
  });

  it('Constitutional Supremacy finds the enforcement script', async () => {
    const root = project(
      manifest(OWN_BIN, { 'constitutional-check': 'node dist/cli.js audit' })
    );
    const result = await ConstitutionalSupremacyLaw.check(ctx(root));
    expect((result.violations ?? []).join('\n')).not.toContain(SUPREMACY);
  });

  it('a CI step that runs the own bin counts too', () => {
    const root = project({
      ...manifest(OWN_BIN, {}),
      '.github/workflows/ci.yml':
        'on: push\njobs:\n  audit:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run build\n      - run: node dist/cli.js audit --mode=full\n',
    });
    expect(auditInvocations(root)).toContain('.github/workflows/ci.yml');
  });

  describe('red control: the same command in a package that is not this tool', () => {
    it.each([
      ['a bin of another name', { 'other-tool': 'dist/cli.js' }],
      ['no bin at all', {}],
    ])('%s: not counted', (_label, bin) => {
      const root = project(
        manifest(bin as Record<string, string>, {
          'constitutional-check': 'node dist/cli.js audit',
        })
      );
      expect(auditInvocations(root)).toEqual([]);
    });

    it('the own bin without `audit` is not counted', () => {
      const root = project(
        manifest(OWN_BIN, { laws: 'node dist/cli.js laws --json' })
      );
      expect(auditInvocations(root)).toEqual([]);
    });
  });
});

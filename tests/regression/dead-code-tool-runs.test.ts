/**
 * #439 (Dead Code Elimination) — the law promised to find unused imports,
 * functions and variables and never looked for them; a dead-code tool counted
 * only as a devDependency, run or not. Decision (option D): the card says what
 * the law reads, and a dead-code tool the project RUNS — knip, ts-prune,
 * ts-unused-exports or unimported, from a package script, a committed git hook
 * or a CI step — proves the "unused" part. Declared and run nowhere, it proves
 * nothing.
 */
import { DeadCodeEliminationLaw } from '../../src/checkers/code-quality-laws/dead-code-elimination';
import { CODE_QUALITY_LAWS } from '../../src/data/code-quality-laws';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const NO_RULES = 'ESLint dead code detection rules not configured';

const manifest = (extra: Record<string, unknown> = {}): string =>
  JSON.stringify({
    name: 'app',
    devDependencies: { eslint: '^9.0.0', knip: '^5.0.0' },
    ...extra,
  });

const judge = (
  files: Record<string, string>
): { violations: string[]; suggestions: string[] } => {
  const result = DeadCodeEliminationLaw.check({
    projectRoot: project({ 'src/index.ts': 'export const x = 1;\n', ...files }),
    config: FileUtils.getMinimalDefaultConfig(),
  });
  return {
    violations: (result.violations ?? []).map(String),
    suggestions: (result.suggestions ?? []).map(String),
  };
};

describe('#439 Dead Code Elimination: a dead-code tool that runs proves the unused part', () => {
  afterEach(removeProjects);

  it('recognises knip run in a CI workflow step', () => {
    const found = judge({
      'package.json': manifest(),
      '.github/workflows/ci.yml': [
        'name: ci',
        'on: [push]',
        'jobs:',
        '  lint:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - run: npm ci',
        '      - run: npx knip',
      ].join('\n'),
    });
    expect(found.violations).not.toContain(NO_RULES);
    expect(found.suggestions).toEqual([]);
  });

  it('recognises ts-prune in a package script and unimported in a git hook', () => {
    expect(
      judge({
        'package.json': manifest({ scripts: { 'lint:dead': 'ts-prune -e' } }),
      }).violations
    ).not.toContain(NO_RULES);
    expect(
      judge({
        'package.json': manifest(),
        '.husky/pre-push': 'npx unimported\n',
      }).violations
    ).not.toContain(NO_RULES);
  });

  it('does not count knip that is only a devDependency, and says so', () => {
    const found = judge({ 'package.json': manifest() });
    expect(found.violations).toContain(NO_RULES);
    expect(found.suggestions).toContain(
      'knip is a devDependency, but no script, git hook or CI step runs it'
    );
  });

  it('does not count a CI step that installs knip, names it or mentions it in a comment', () => {
    const found = judge({
      'package.json': manifest(),
      '.github/workflows/ci.yml': [
        'jobs:',
        '  lint:',
        '    steps:',
        '      - name: knip',
        '        run: npm i -D knip # then knip',
        '      - run: echo "knip runs nightly"',
      ].join('\n'),
    });
    expect(found.violations).toContain(NO_RULES);
  });

  it('without any tool reports as before', () => {
    const found = judge({
      'package.json': JSON.stringify({
        name: 'app',
        devDependencies: { eslint: '^9.0.0' },
      }),
    });
    expect(found.violations).toContain(NO_RULES);
    expect(found.suggestions).toContain(
      'Run a dead-code tool (knip, ts-prune, ts-unused-exports or unimported) from a script, a git hook or CI'
    );
  });
});

describe('#439 the Dead Code Elimination card says what the law reads', () => {
  const card = CODE_QUALITY_LAWS.find(
    law => law.title === 'Dead Code Elimination'
  );

  it('no longer promises to remove unused imports, functions and variables', () => {
    const text = [card?.description, card?.remediation, card?.violationMessage]
      .map(String)
      .join(' ');
    expect(text).not.toMatch(/remove all unused/i);
    expect(card?.description).toMatch(/debugger/);
  });

  it('names what proves the unused part, and what does not', () => {
    const limits = (card?.detectionLimits ?? []).join(' ');
    expect(limits).toMatch(/NOT detected by this law/);
    expect(limits).toMatch(/knip, ts-prune, ts-unused-exports or unimported/);
    expect(limits).toMatch(/only a devDependency, run nowhere, does not count/);
  });
});

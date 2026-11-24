/**
 * Documentation Standards on real project fixtures: the law looks for README,
 * CONTRIBUTING, LICENSE and CHANGELOG at the root, reads the README for its
 * length and sections, and looks for a docs/ folder.
 */
import { DocumentationStandardsLaw } from '../../../src/checkers/documentation-laws/documentation-standards';
import { ctx, project } from '../toolkit-fixture';

const README = [
  '# Widget',
  '',
  'Widget renders a chart of the numbers you give it.',
  '',
  '## Installation',
  '',
  'npm install widget',
  '',
  '## Usage',
  '',
  "import { widget } from 'widget';",
  '',
].join('\n');

const COMPLETE = {
  'README.md': README,
  'CONTRIBUTING.md': '# Contributing\n',
  LICENSE: 'MIT\n',
  'CHANGELOG.md': '# Changelog\n',
  'docs/guide.md': '# Guide\n',
};

const run = (
  files: Record<string, string>,
  standards: Record<string, number> = {}
) =>
  DocumentationStandardsLaw.check(
    ctx(project(files), { thresholds: { documentation: { standards } } })
  );

describe('DocumentationStandardsLaw', () => {
  it('passes a project with every document, a full README and docs/', () => {
    const result = run(COMPLETE);

    expect(result).toMatchObject({
      passed: true,
      score: 100,
      message: 'Documentation standards met',
      violations: [],
      suggestions: [],
    });
  });

  it('names each missing document with its purpose, and suggests docs/', () => {
    const result = run({ 'src/index.ts': 'export {};\n' });

    expect(result.violations).toEqual([
      'Missing README.md',
      'Missing CONTRIBUTING.md',
      'Missing LICENSE',
      'Missing CHANGELOG.md',
    ]);
    expect(result.suggestions).toEqual([
      'Create README.md: Project overview and setup instructions',
      'Create CONTRIBUTING.md: Contribution guidelines',
      'Create LICENSE: Project license',
      'Create CHANGELOG.md: Version history',
      'Consider creating docs/ directory for detailed documentation',
    ]);
    expect(result.score).toBe(40);
    expect(result.message).toBe('4 documentation violations found');
  });

  it('reports a README shorter than the minimum and the sections it lacks', () => {
    const result = run({ ...COMPLETE, 'README.md': 'Widget.\n' });

    expect(result.violations).toEqual(['README.md is too short']);
    expect(result.suggestions).toEqual([
      'Expand README with proper project description',
      'Add Title section to README',
      'Add Installation instructions section to README',
      'Add Usage examples section to README',
    ]);
    expect(result.score).toBe(85);
  });

  it('reads the minimum README length and the deduction from thresholds', () => {
    const result = run(
      { ...COMPLETE, 'README.md': README },
      { minReadmeLength: 10000, perViolationDeduction: 40 }
    );

    expect(result.violations).toEqual(['README.md is too short']);
    expect(result.score).toBe(60);
  });

  it('matches the README sections in any case', () => {
    const result = run({
      ...COMPLETE,
      'README.md': README.replace('## Installation', '## INSTALLATION').replace(
        '## Usage',
        '## USAGE'
      ),
    });

    expect(result.suggestions).toEqual([]);
  });

  it('lists violations and suggestions in details', () => {
    const { LICENSE: _license, ...withoutLicense } = COMPLETE;
    const result = run(withoutLicense);

    expect(result.violations).toEqual(['Missing LICENSE']);
    expect(result.details).toEqual([
      ...(result.violations ?? []),
      ...(result.suggestions ?? []),
    ]);
  });
});

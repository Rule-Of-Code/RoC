/**
 * #570 — the descriptive-title rule of #557 reported an empty title, a
 * placeholder (`test 1`, `works`) or only the unit name, but a one-letter
 * title (`it('x')`, `it('y')`) passed: it is the placeholder the rule exists
 * to catch. A title with no word of two or more letters says nothing.
 */
import { AngularTestingExcellenceLaw } from '../../src/checkers/angular-laws/angular-testing-excellence';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const titleFindings = (title: string): string[] => {
  const root = project({
    'angular.json': JSON.stringify({ version: 1 }),
    'package.json': JSON.stringify({
      name: 'angular-app',
      dependencies: { '@angular/core': '18.0.0' },
    }),
    'src/app/sum.service.spec.ts': [
      "describe('SumService behaviour', () => {",
      `  it('${title}', () => { expect(1).toBe(1); });`,
      '});',
    ].join('\n'),
  });
  const result = AngularTestingExcellenceLaw.check({
    projectRoot: root,
    config: FileUtils.getMinimalDefaultConfig(),
  });
  return (result.violations ?? []).filter(v =>
    v.startsWith('Test title does not describe behaviour')
  );
};

describe('#570 a title with no word of two or more letters says nothing', () => {
  afterEach(removeProjects);

  it.each([['x'], ['y'], ['a1'], ['1'], ['x.'], ['- 2 -']])(
    'reports "%s"',
    title => {
      expect(titleFindings(title)).toHaveLength(1);
    }
  );

  /** The controls: a sentence, numbers included, describes behaviour. */
  it.each([
    ['adds two numbers'],
    ['returns 401 without a token'],
    ['ok on retry'],
  ])('does not report "%s"', title => {
    expect(titleFindings(title)).toEqual([]);
  });
});

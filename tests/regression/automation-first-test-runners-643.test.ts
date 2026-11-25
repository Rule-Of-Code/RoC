/**
 * #643: Automation First Principle knew five test framework names, so a
 * project testing with vitest, @playwright/test, karma + jasmine-core,
 * @jest/core or ava got "No test framework detected".
 */
import { AutomationFirstLaw } from '../../src/checkers/sacred-laws/automation-first';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const NO_FRAMEWORK = 'No test framework detected';

const run = (devDependencies: Record<string, string>) =>
  AutomationFirstLaw.check(
    ctx(
      project({
        '.github/workflows/ci.yml': 'on: push\n',
        'package.json': JSON.stringify({
          name: 'x',
          version: '1.0.0',
          scripts: { test: 'x', lint: 'x', build: 'x' },
          devDependencies,
        }),
      })
    )
  );

describe('#643 Automation First recognises the common test runners', () => {
  it.each([
    [{ vitest: '2.0.0' }],
    [{ '@playwright/test': '1.0.0' }],
    [{ karma: '6.0.0', 'jasmine-core': '5.0.0' }],
    [{ '@jest/core': '29.0.0' }],
    [{ ava: '6.0.0' }],
  ])('%j is a test framework', devDependencies => {
    expect(run(devDependencies).violations).not.toContain(NO_FRAMEWORK);
  });

  it('control: jest is still a test framework', () => {
    expect(run({ jest: '29.0.0' }).violations).not.toContain(NO_FRAMEWORK);
  });

  it('control: a project without a runner is still reported', () => {
    expect(run({ lodash: '4.0.0' }).violations).toContain(NO_FRAMEWORK);
  });
});

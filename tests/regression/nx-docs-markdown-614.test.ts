/**
 * #614 — NX Commands Only Policy looks for direct `ng` commands in the
 * documentation, but listed `docs/` by ts/js/json and then kept only `.md`
 * paths, so nothing under `docs/` was ever read. Only the root README.md was.
 *
 * Runs the law on a real temporary Nx workspace (nx.json, package.json).
 */
import { NxCommandsOnlyLaw } from '../../src/checkers/angular-laws/nx-commands-only';
import { ctx, project } from '../checkers/toolkit-fixture';

const workspace = (files: Record<string, string>) =>
  NxCommandsOnlyLaw.check(
    ctx(
      project({
        'nx.json': '{}',
        'package.json': '{"name":"x"}',
        ...files,
      })
    )
  );

describe('#614: NX Commands Only reads Markdown under docs/', () => {
  it('an ng command in docs/setup.md is reported', () => {
    const result = workspace({ 'docs/setup.md': '# Setup\n\nRun ng serve\n' });
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^Direct ng command in documentation docs[\\/]setup\.md:3: Run ng serve$/
      ),
    ]);
  });

  it('an ng command in a nested docs/**/*.mdx is reported', () => {
    const result = workspace({
      'docs/guide/start.mdx': '# Start\n\n```sh\nng build --prod\n```\n',
    });
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^Direct ng command in documentation docs[\\/]guide[\\/]start\.mdx:4: ng build --prod$/
      ),
    ]);
  });

  it('control: docs/*.md without ng commands gives no finding', () => {
    const result = workspace({
      'docs/setup.md': '# Setup\n\nRun `nx serve web`, then planning starts.\n',
    });
    expect(result.violations).toEqual([]);
  });

  it('control: the root README.md is still read, once', () => {
    const result = workspace({ 'README.md': '# Acme\n\nRun ng test\n' });
    expect(result.violations).toEqual([
      'Direct ng command in documentation README.md:3: Run ng test',
    ]);
  });

  it('control: Markdown outside docs/ and the root README.md is not read', () => {
    const result = workspace({
      'CHANGELOG.md': '- ng update @angular/core\n',
      'src/app/notes.md': 'Run ng serve\n',
    });
    expect(result.violations).toEqual([]);
  });
});

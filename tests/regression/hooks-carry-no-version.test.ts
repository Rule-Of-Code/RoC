/**
 * The repository's own git hooks name no RuleOfCode version.
 *
 * `.husky/commit-msg` printed "RuleOfCode v7.22.0" through 7.28.0: a version
 * written by hand into a hook drifts with every release and is wrong in every
 * message after the next one. The hooks run the installed CLI, which knows its
 * version; the hook text does not need one.
 */
import * as fs from 'fs';
import * as path from 'path';

const HUSKY = path.resolve(__dirname, '..', '..', '.husky');
const HOOKS = ['pre-commit', 'pre-push', 'commit-msg'];

describe('hooks carry no hand-written version', () => {
  it.each(HOOKS)('.husky/%s names no vX.Y.Z', hook => {
    const text = fs.readFileSync(path.join(HUSKY, hook), 'utf8');
    expect(text).not.toMatch(/\bv\d+\.\d+\.\d+\b/);
  });
});

/**
 * #379: RoC's own hooks must be active in every clone.
 *
 * `prepare` was only `npm run build`, so `npm ci` never ran husky: the hooks
 * under .husky/ were committed but `core.hooksPath` stayed unset, and every
 * commit went in without them. `prepare` now runs husky first.
 *
 * What this does not break, checked by hand with npm 11.13 and husky 9.1.7:
 * - installing a packed tarball never runs the package's `prepare`;
 * - husky 9 exits 0 without `.git` (an install from a git archive, a CI step
 *   without history) and with HUSKY=0, so the build still runs.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
) as {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe('#379 prepare installs the hooks', () => {
  it('runs husky, then the build', () => {
    expect(manifest.scripts.prepare).toMatch(/^husky\s*&&\s*npm run build$/);
  });

  it('has husky available where prepare runs (a devDependency)', () => {
    expect(manifest.devDependencies.husky).toBeDefined();
  });

  it.each(['pre-commit', 'commit-msg', 'pre-push'])(
    'commits the %s script husky hands over to',
    hook => {
      expect(fs.existsSync(path.join(ROOT, '.husky', hook))).toBe(true);
    }
  );
});

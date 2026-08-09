import * as fs from 'fs';

import { GitHooksInstaller } from '../../src/hooks/installer';
import { PathOperations } from '../../src/utils/path-operations';

const REPO_ROOT = PathOperations.resolve(__dirname, '..', '..');

const packageVersion = (): string =>
  (
    JSON.parse(
      fs.readFileSync(PathOperations.join(REPO_ROOT, 'package.json'), 'utf8')
    ) as { version: string }
  ).version;

/**
 * The hook installer stamps a version into every hook it writes. That version
 * used to be a literal somebody had to remember to bump at release time, and it
 * had drifted: the hooks committed here announced a version the package had
 * already moved past, and the lockfile was two releases behind on top of that.
 *
 * A tool that exists to check whether claims match reality must not ship a
 * version claim it maintains by hand.
 */
describe('the version stamped into hooks is the package version', () => {
  it('reads the stamp from package.json rather than a literal', () => {
    const stamp = (
      GitHooksInstaller as unknown as { VERSION: string }
    ).VERSION;

    expect(stamp).toBe(packageVersion());
  });

  it('leaves no hardcoded version literal in the installer', () => {
    const source = fs.readFileSync(
      PathOperations.join(REPO_ROOT, 'src', 'hooks', 'installer.ts'),
      'utf8'
    );

    expect(source).not.toMatch(/VERSION\s*=\s*['"]\d+\.\d+\.\d+['"]/);
  });

  it('keeps package-lock.json on the same version as package.json', () => {
    const lock = JSON.parse(
      fs.readFileSync(
        PathOperations.join(REPO_ROOT, 'package-lock.json'),
        'utf8'
      )
    ) as { version?: string; packages?: Record<string, { version?: string }> };

    expect(lock.version).toBe(packageVersion());
    expect(lock.packages?.['']?.version).toBe(packageVersion());
  });
});
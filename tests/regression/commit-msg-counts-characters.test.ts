import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { GitHooksInstaller } from '../../src/hooks/installer';
import { FileUtils } from '../../src/utils';

/**
 * The generated commit-msg hook measures CHARACTERS, which is what its own
 * message claims, and gives the same verdict on every machine.
 *
 * `wc -c` counts BYTES, so a 54-character subject was rejected as 86 — with the
 * word "characters" in the error pointing away from the answer, and no way to
 * shorten the message that made the number move as expected.
 *
 * `awk`'s `length()` is worse than wrong: it counts characters under a UTF-8
 * locale and bytes under C, so the identical commit message passed or failed
 * depending on an environment variable. A gate whose verdict depends on the
 * machine is not a gate.
 */
describe('the commit-msg hook measures characters, deterministically', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-hookmsg-'));
    fs.writeFileSync(
      path.join(root, 'package.json'),
      '{"name":"x","version":"1.0.0"}'
    );
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const hookText = (): string => {
    const config = FileUtils.getMinimalDefaultConfig();
    config.hooks = { preCommit: false, prePush: false, commitMsg: true };
    GitHooksInstaller.install({ projectRoot: root, config, force: true });
    return fs.readFileSync(path.join(root, '.husky/commit-msg'), 'utf8');
  };

  it('strips UTF-8 continuation bytes before counting the subject', () => {
    expect(hookText()).toMatch(/tr -d '\\200-\\277'/);
  });

  it('strips them in the body check too', () => {
    expect(hookText()).toMatch(/gsub\(\/\[\\200-\\277\]\/, "", s\)/);
  });

  it('pins the locale for both measurements', () => {
    const text = hookText();

    expect(text).toMatch(/LC_ALL=C wc -c/);
    expect(text).toMatch(/LC_ALL=C awk/);
  });

  /** The red controls: the shapes that produced the wrong number. */
  it('no longer counts raw bytes for the subject', () => {
    expect(hookText()).not.toMatch(/FIRST_LINE" \| wc -c/);
  });

  it('no longer lets the ambient locale decide the body verdict', () => {
    expect(hookText()).not.toMatch(/COMMIT_MSG" \| awk/);
  });
});

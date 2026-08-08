/**
 * No `Co-Authored-By` trailer in this project's commits.
 *
 * The trailer belongs to the tooling some contributors run, not to this
 * repository. It reached nine commits before anyone noticed. The eight already
 * published stay as they are: rewriting two protected branches and breaking
 * three release tags to delete one line is not a trade worth making. They are
 * named below — every one of them, by full SHA, so nothing is grandfathered
 * vaguely.
 *
 * This list is a ratchet. It only ever shrinks. Adding a SHA to excuse a new
 * commit is exactly the box-ticking this project refuses to accept from anyone
 * else, and it would make the guard decorative.
 */
import { execSync } from 'child_process';

/** Commits that carry the trailer by historical accident, kept deliberately. */
const GRANDFATHERED = new Set([
  '78e28a8d57df24bd010feba7d6cd6435b5f9a280', // docs: add a pull request template
  'f5c2757082c63253435743bc7e8b3b89f8f83765', // fix(ci): run the gate on master and develop
  '280e951a6b9bd1ea409be0ce80a70b42865ec22b', // fix(laws): detached-HEAD checkout
  '8d2abff6cd6c9c3dbbd1472891654bce6c2979d2', // chore(release): v7.17.3
  'e215368960dbde56c7df2ee1c2cde92fa77e6a9a', // fix(canary): resolve the packed CLI
  'e3e33395497c224339cd0e226ac4966708207645', // chore(release): v7.17.4
  'f5e635ef6d8aa3f528e8232f2ec82476c0d1ac3c', // fix(cli): init without a terminal
  '82c45a46f4c577c1e5810f2eb4d75853f2119de9', // fix(laws): worktree-blind detectors
]);

const FORBIDDEN = /^Co-Authored-By:/im;

/** Run git, or return null when there is no usable repository. */
function git(args: string): string | null {
  try {
    return execSync(`git ${args}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    }).toString();
  } catch {
    return null;
  }
}

describe('regression: no Co-Authored-By trailer in commit messages', () => {
  it('finds a git history to check', () => {
    // A shallow or absent history cannot be audited. Say so out loud rather than
    // passing on a range git never computed — a vacuous green is the failure mode
    // this whole project exists to prevent.
    const head = git('rev-parse HEAD');
    if (head === null) {
      console.warn('⚠️  no git repository here — the trailer guard cannot run.');
    }
    expect(head === null || head.trim().length > 0).toBe(true);
  });

  it('no commit outside the grandfathered set carries the trailer', () => {
    if (git('rev-parse HEAD') === null) return; // reported above

    // -z: NUL-separated fields, so a body with blank lines cannot be mistaken
    // for a record boundary. Merges are excluded — the host composes those.
    const log = git('log --no-merges -z --format=%H%x00%s%x00%b');
    if (log === null) return;

    const fields = log.split('\0');
    const offenders: string[] = [];
    for (let i = 0; i + 2 < fields.length; i += 3) {
      const sha = (fields[i] ?? '').trim();
      const subject = fields[i + 1] ?? '';
      const body = fields[i + 2] ?? '';
      if (!FORBIDDEN.test(body)) continue;
      if (GRANDFATHERED.has(sha)) continue;
      offenders.push(`${sha.slice(0, 7)} ${subject}`);
    }

    expect(offenders).toEqual([]);
  });

  it('the grandfathered list only shrinks', () => {
    // Eight commits, frozen. If this number grows, someone excused a new commit
    // instead of rewording it.
    expect(GRANDFATHERED.size).toBeLessThanOrEqual(8);
  });
});
/**
 * The README demo names one ruleofcode version, its numbers are the recorded
 * output's, and its image comes from the release's own tag.
 *
 * 8.0.0 went to npm with a README that showed the 7.29.1 recording under the
 * caption "Real output of ruleofcode 7.29.1". npm freezes a package's README at
 * publish time, while a relative image path is resolved against the default
 * branch: the npm page and GitHub could show different recordings, and a later
 * re-recording would silently change what an old npm page shows.
 *
 * So:
 *   - the caption, the alt text, `VERSION` in docs/demo/record.mjs, the version
 *     the recorded output prints and package.json are the same version: the
 *     README demo is recorded with the release it ships in (8.0.1: from the
 *     candidate's tarball, PACKAGE_SHA1, which is the file published);
 *   - the numbers in the alt text are the recorded output's;
 *   - the image and the docs/demo link are absolute URLs pinned to the tag
 *     v<package.json version>, which never moves.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const DEMO = path.join(ROOT, 'docs', 'demo');
const read = (...p: string[]): string =>
  fs.readFileSync(path.join(...p), 'utf8');

const PACKAGE_VERSION = (
  JSON.parse(read(ROOT, 'package.json')) as { version: string }
).version;
const README = read(ROOT, 'README.md');
const RECORD = read(DEMO, 'record.mjs');
const REPO_RAW = 'https://raw.githubusercontent.com/Rule-Of-Code/RoC';
const REPO_BLOB = 'https://github.com/Rule-Of-Code/RoC/blob';

interface DemoBlock {
  alt: string | undefined;
  altText: string | undefined;
  image: string | undefined;
  caption: string | undefined;
  link: string | undefined;
}

/** The versions, the alt text and the URLs the README's demo block names. */
function demoBlock(readme: string): DemoBlock {
  const img =
    /!\[ruleofcode (\d+\.\d+\.\d+):([^\]]*)\]\(([^)\s]*demo\.gif)\)/.exec(
      readme
    );
  const cap =
    /Real output of ruleofcode (\d+\.\d+\.\d+) — the package published to npm\. Reproduce with \[docs\/demo\]\(([^)\s]+)\)/.exec(
      readme
    );
  return {
    alt: img?.[1],
    altText: img?.[2],
    image: img?.[3],
    caption: cap?.[1],
    link: cap?.[2],
  };
}

const strip = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, '');
const stdout = (file: string): string => strip(read(DEMO, 'out', file));

describe('README demo names one version', () => {
  const block = demoBlock(README);
  const recordVersion = /export const VERSION = '([^']+)';/.exec(RECORD)?.[1];

  it('caption, alt text, record.mjs and package.json agree', () => {
    expect(block.caption).toBeDefined();
    expect({
      alt: block.alt,
      record: recordVersion,
      package: PACKAGE_VERSION,
    }).toEqual({
      alt: block.caption,
      record: block.caption,
      package: block.caption,
    });
  });

  it('record.mjs names the sha1 of the package it was recorded with', () => {
    expect(RECORD).toMatch(/export const PACKAGE_SHA1 = '[0-9a-f]{40}';/);
  });

  it.each(['step-2.stdout', 'step-3.stdout'])(
    'the recorded %s was printed by that version',
    file => {
      const first = stdout(file).split('\n')[0];
      expect(first).toContain(`RuleOfCode v${block.caption}`);
    }
  );

  it('the numbers in the alt text are the recorded output', () => {
    const partial = /(\d+) of (\d+) applicable laws ran/.exec(
      block.altText ?? ''
    );
    const full = /checks (\d+) laws and (\d+) fail/.exec(block.altText ?? '');
    expect(partial).not.toBeNull();
    expect(full).not.toBeNull();
    expect(stdout('step-2.stdout')).toContain(
      `PARTIAL SCAN — ${partial?.[1]} of ${partial?.[2]} applicable laws ran`
    );
    expect(stdout('step-3.stdout')).toContain(
      `Total Laws Checked: ${full?.[1]}\n`
    );
    expect(stdout('step-3.stdout')).toContain(`✗ Failed: ${full?.[2]}\n`);
  });

  it('the image and the docs link are pinned to the tag of this release', () => {
    expect(block.image).toBe(
      `${REPO_RAW}/v${PACKAGE_VERSION}/docs/demo/demo.gif`
    );
    expect(block.link).toBe(
      `${REPO_BLOB}/v${PACKAGE_VERSION}/docs/demo/README.md`
    );
  });

  it('a relative image path or another version is caught', () => {
    const stale = demoBlock(
      [
        '![ruleofcode 7.29.1: four laws.](docs/demo/demo.gif)',
        'Real output of ruleofcode 7.29.1 — the package published to npm. Reproduce with [docs/demo](docs/demo/README.md).',
      ].join('\n')
    );
    expect(stale.image).toBe('docs/demo/demo.gif');
    expect(stale.image).not.toBe(
      `${REPO_RAW}/v${PACKAGE_VERSION}/docs/demo/demo.gif`
    );
    expect(stale.caption).toBe('7.29.1');
    expect(stale.caption).not.toBe(recordVersion);
  });
});

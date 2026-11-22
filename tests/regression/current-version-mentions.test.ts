/**
 * #560 — every place that names the CURRENT version names package.json's.
 *
 * When a release is cut, the README, the demo docs, the demo recording and the
 * git hooks must name the released version. Places that name a version as
 * history ("renamed in 7.28.0", "since 8.0.0", the CHANGELOG) and the pass
 * demo, which is a recording of 7.29.1 on purpose, stay as they are.
 *
 * Two narrow tests held part of this (`readme-demo-names-one-version`,
 * `hooks-carry-no-version`); the `laws --json` example in README.md and the
 * prose and commands of docs/demo/README.md were held by nobody.
 *
 * The list below is explicit: each entry is a file, a pattern whose first
 * group is a version, and how many times it must match. So
 *   - a new current-version mention must be added here to be checked, and a
 *     historical one never trips the test (it matches no pattern);
 *   - a marked place that was reworded or deleted fails (the count), instead
 *     of passing because nothing matched;
 *   - a failure names the file, the line and both versions.
 * The release procedure's version-sweep step ends with this test.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (rel: string): string =>
  fs.readFileSync(path.join(ROOT, rel), 'utf8');

const PACKAGE_VERSION = (
  JSON.parse(read('package.json')) as { version: string }
).version;

const V = String.raw`(\d+\.\d+\.\d+)`;

/** [file, pattern (group 1 = the version), how many times it must match] */
const CURRENT_VERSION_MENTIONS: ReadonlyArray<[string, RegExp, number]> = [
  // the README demo: alt text, caption, image and docs link pinned to the tag
  ['README.md', new RegExp(String.raw`!\[ruleofcode ${V}:`, 'g'), 1],
  [
    'README.md',
    new RegExp(String.raw`Real output of ruleofcode ${V} —`, 'g'),
    1,
  ],
  ['README.md', new RegExp(String.raw`/RoC/v${V}/docs/demo/demo\.gif`, 'g'), 1],
  [
    'README.md',
    new RegExp(String.raw`/RoC/blob/v${V}/docs/demo/README\.md`, 'g'),
    1,
  ],
  // the `roc laws --json` example
  ['README.md', new RegExp(String.raw`^\s*"version": "${V}",`, 'gm'), 1],
  // the refusal demo: prose and the reproduce commands
  [
    'docs/demo/README.md',
    new RegExp(String.raw`main README shows: ruleofcode ${V},`, 'g'),
    1,
  ],
  [
    'docs/demo/README.md',
    new RegExp(String.raw`honest refusal \(${V}\)`, 'g'),
    1,
  ],
  [
    'docs/demo/README.md',
    new RegExp(String.raw`\`ruleofcode\` is ruleofcode ${V} installed`, 'g'),
    1,
  ],
  [
    'docs/demo/README.md',
    new RegExp(String.raw`each run prints \`RuleOfCode v${V}\``, 'g'),
    1,
  ],
  [
    'docs/demo/README.md',
    new RegExp(String.raw`\`npx ruleofcode@${V}\``, 'g'),
    1,
  ],
  ['docs/demo/README.md', new RegExp(String.raw`ruleofcode-${V}\.tgz`, 'g'), 2],
  [
    'docs/demo/README.md',
    new RegExp(String.raw`installs ruleofcode ${V} from npm`, 'g'),
    1,
  ],
  // the refusal demo: the recorder and what it recorded
  [
    'docs/demo/record.mjs',
    new RegExp(String.raw`export const VERSION = '${V}';`, 'g'),
    1,
  ],
  [
    'docs/demo/out/step-2.stdout',
    new RegExp(String.raw`RuleOfCode v${V}`, 'g'),
    1,
  ],
  [
    'docs/demo/out/step-3.stdout',
    new RegExp(String.raw`RuleOfCode v${V}`, 'g'),
    1,
  ],
  ['docs/demo/demo.cast', new RegExp(String.raw`RuleOfCode v${V}`, 'g'), 2],
  // the hook markers `validateHooks` reads (written by reinstall-hooks)
  ['.husky/pre-commit', new RegExp(String.raw`RuleOfCode v${V}`, 'g'), 2],
  ['.husky/pre-push', new RegExp(String.raw`RuleOfCode v${V}`, 'g'), 2],
  ['.husky/commit-msg', new RegExp(String.raw`RuleOfCode v${V}`, 'g'), 3],
];

interface Mention {
  file: string;
  line: number;
  version: string;
}

/** Every match of one entry, with its line number. */
function mentionsIn(file: string, text: string, pattern: RegExp): Mention[] {
  const found: Mention[] = [];
  for (const match of text.matchAll(pattern)) {
    const line = text.slice(0, match.index).split('\n').length;
    found.push({ file, line, version: match[1] ?? '' });
  }
  return found;
}

/** What is wrong with one entry: a missing mention, or another version. */
function problemsOf(
  file: string,
  text: string,
  pattern: RegExp,
  count: number,
  version: string
): string[] {
  const found = mentionsIn(file, text, pattern);
  const problems: string[] = [];
  if (found.length !== count)
    problems.push(
      `${file}: ${pattern} matched ${found.length} time(s), expected ${count} — the marked place was reworded or removed; update the list`
    );
  for (const m of found)
    if (m.version !== version)
      problems.push(
        `${m.file}:${m.line} names ${m.version}, package.json is ${version}`
      );
  return problems;
}

describe('#560 every current-version mention names package.json.version', () => {
  it.each(
    CURRENT_VERSION_MENTIONS.map(([file, pattern, count]) => [
      file,
      pattern,
      count,
    ])
  )('%s %s', (file, pattern, count) => {
    expect(
      problemsOf(
        file as string,
        read(file as string),
        pattern as RegExp,
        count as number,
        PACKAGE_VERSION
      )
    ).toEqual([]);
  });

  describe('the check itself', () => {
    const json = new RegExp(String.raw`^\s*"version": "${V}",`, 'gm');

    it('another version is named with its file and line', () => {
      const text =
        '```jsonc\n{\n  "schemaVersion": 2,\n  "version": "8.0.0",\n}\n';
      expect(problemsOf('README.md', text, json, 1, '8.0.1')).toEqual([
        'README.md:4 names 8.0.0, package.json is 8.0.1',
      ]);
    });

    it('a marked place that is gone fails, it does not pass by matching nothing', () => {
      expect(
        problemsOf('README.md', '{ "schemaVersion": 2 }\n', json, 1, '8.0.1')
      ).toHaveLength(1);
    });

    it('a historical mention matches no pattern', () => {
      const history =
        'TypeScript laws (8.0.0 and later) report the files as not read.\n- `pass.gif`: ruleofcode 7.29.1 from npm.\nnpm ci                     # pins ruleofcode 7.29.1\n';
      for (const [, pattern] of CURRENT_VERSION_MENTIONS)
        expect(mentionsIn('x.md', history, new RegExp(pattern))).toEqual([]);
    });
  });
});

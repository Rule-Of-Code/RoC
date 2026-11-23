/**
 * Every place in the repository that names the CURRENT version (#560).
 *
 * One table, two readers:
 *   - tests/regression/current-version-mentions.test.ts checks that each
 *     entry names package.json's version, as many times as `count` says;
 *   - scripts/version-sweep.js rewrites the entries marked `sweep: true` to
 *     the version being released, and nothing else.
 *
 * Each pattern's first group is the version. A place that names a version as
 * history ("renamed in 7.28.0", "8.0.0 and later", the CHANGELOG) or the pass
 * demo, which is a recording of 7.29.1 on purpose, matches no pattern here.
 * A new current-version mention is added to this table, or nothing checks it.
 *
 * `sweep: false` entries are written by a tool, not by hand: the recording
 * by docs/demo/record.mjs, the hook stamps by `reinstall-hooks`. The sweep
 * names them and leaves them; the test still checks them.
 */
const V = String.raw`(\d+\.\d+\.\d+)`;

const mention = (file, source, flags, count, producedBy) => ({
  file,
  pattern: new RegExp(source, flags),
  count,
  sweep: !producedBy,
  producedBy: producedBy || null,
});

const RECORDED = 'node docs/demo/record.mjs (re-record the demo)';
const HOOKS =
  'npx ruleofcode reinstall-hooks (it keeps the --no-stash opt-in, #480)';

/** @type {ReadonlyArray<ReturnType<typeof mention>>} */
const CURRENT_VERSION_MENTIONS = [
  // the README demo: alt text, caption, image and docs link pinned to the tag
  mention('README.md', String.raw`!\[ruleofcode ${V}:`, 'g', 1),
  mention('README.md', String.raw`Real output of ruleofcode ${V} —`, 'g', 1),
  mention('README.md', String.raw`/RoC/v${V}/docs/demo/demo\.gif`, 'g', 1),
  mention(
    'README.md',
    String.raw`/RoC/blob/v${V}/docs/demo/README\.md`,
    'g',
    1
  ),
  // the `roc laws --json` example
  mention('README.md', String.raw`^\s*"version": "${V}",`, 'gm', 1),
  // the refusal demo: prose and the reproduce commands
  mention(
    'docs/demo/README.md',
    String.raw`main README shows: ruleofcode ${V},`,
    'g',
    1
  ),
  mention('docs/demo/README.md', String.raw`honest refusal \(${V}\)`, 'g', 1),
  mention(
    'docs/demo/README.md',
    String.raw`\`ruleofcode\` is ruleofcode ${V} installed`,
    'g',
    1
  ),
  mention(
    'docs/demo/README.md',
    String.raw`each run prints \`RuleOfCode v${V}\``,
    'g',
    1
  ),
  mention('docs/demo/README.md', String.raw`\`npx ruleofcode@${V}\``, 'g', 1),
  mention('docs/demo/README.md', String.raw`ruleofcode-${V}\.tgz`, 'g', 2),
  mention(
    'docs/demo/README.md',
    String.raw`installs ruleofcode ${V} from npm`,
    'g',
    1
  ),
  // the refusal demo: the recorder, and what it recorded
  mention(
    'docs/demo/record.mjs',
    String.raw`export const VERSION = '${V}';`,
    'g',
    1
  ),
  mention(
    'docs/demo/out/step-2.stdout',
    String.raw`RuleOfCode v${V}`,
    'g',
    1,
    RECORDED
  ),
  mention(
    'docs/demo/out/step-3.stdout',
    String.raw`RuleOfCode v${V}`,
    'g',
    1,
    RECORDED
  ),
  mention(
    'docs/demo/demo.cast',
    String.raw`RuleOfCode v${V}`,
    'g',
    2,
    RECORDED
  ),
  // the hook stamps `validateHooks` reads
  mention('.husky/pre-commit', String.raw`RuleOfCode v${V}`, 'g', 2, HOOKS),
  mention('.husky/pre-push', String.raw`RuleOfCode v${V}`, 'g', 2, HOOKS),
  mention('.husky/commit-msg', String.raw`RuleOfCode v${V}`, 'g', 3, HOOKS),
];

/** Every match of one entry in `text`: its line and the version it names. */
function mentionsIn(text, pattern) {
  const found = [];
  const re = new RegExp(
    pattern.source,
    pattern.flags.includes('d') ? pattern.flags : `${pattern.flags}d`
  );
  for (const match of text.matchAll(re)) {
    const [start, end] = match.indices[1];
    found.push({
      line: text.slice(0, start).split('\n').length,
      version: match[1],
      start,
      end,
    });
  }
  return found;
}

/** What is wrong with one entry: a reworded or removed place, or another version. */
function problemsOf(entry, text, version) {
  const found = mentionsIn(text, entry.pattern);
  const problems = [];
  if (found.length !== entry.count)
    problems.push(
      `${entry.file}: ${entry.pattern} matched ${found.length} time(s), expected ${entry.count} — the marked place was reworded or removed; update scripts/current-version-mentions.js`
    );
  for (const m of found)
    if (m.version !== version)
      problems.push(
        `${entry.file}:${m.line} names ${m.version}, package.json is ${version}`
      );
  return problems;
}

module.exports = { CURRENT_VERSION_MENTIONS, mentionsIn, problemsOf };

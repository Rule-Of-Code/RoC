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
 * The list is explicit, in scripts/current-version-mentions.js, which the
 * sweep (scripts/version-sweep.js) reads too: each entry is a file, a pattern
 * whose first group is a version, and how many times it must match. So
 *   - a new current-version mention must be added there to be checked, and a
 *     historical one never trips the test (it matches no pattern);
 *   - a marked place that was reworded or deleted fails (the count), instead
 *     of passing because nothing matched;
 *   - a failure names the file, the line and both versions;
 *   - the sweep rewrites exactly the hand-written entries and nothing else.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (rel: string): string =>
  fs.readFileSync(path.join(ROOT, rel), 'utf8');

interface Entry {
  file: string;
  pattern: RegExp;
  count: number;
  sweep: boolean;
  producedBy: string | null;
}
interface Mention {
  line: number;
  version: string;
}
const { CURRENT_VERSION_MENTIONS, mentionsIn, problemsOf } =
  require('../../scripts/current-version-mentions') as {
    CURRENT_VERSION_MENTIONS: Entry[];
    mentionsIn: (text: string, pattern: RegExp) => Mention[];
    problemsOf: (entry: Entry, text: string, version: string) => string[];
  };
const { plan } = require('../../scripts/version-sweep') as {
  plan: (
    to: string,
    read: (file: string) => string
  ) => {
    files: Map<string, string>;
    changes: Array<{ file: string; line: number; from: string; to: string }>;
    errors: string[];
  };
};

const PACKAGE_VERSION = (
  JSON.parse(read('package.json')) as { version: string }
).version;

describe('#560 every current-version mention names package.json.version', () => {
  it.each(CURRENT_VERSION_MENTIONS.map(entry => [entry.file, entry]))(
    '%s',
    (_file, entry) => {
      expect(
        problemsOf(entry as Entry, read((entry as Entry).file), PACKAGE_VERSION)
      ).toEqual([]);
    }
  );

  describe('the check itself', () => {
    const json = CURRENT_VERSION_MENTIONS.find(e =>
      e.pattern.source.includes('"version"')
    ) as Entry;

    it('another version is named with its file and line', () => {
      const text =
        '```jsonc\n{\n  "schemaVersion": 2,\n  "version": "8.0.0",\n}\n';
      expect(problemsOf(json, text, '8.0.1')).toEqual([
        'README.md:4 names 8.0.0, package.json is 8.0.1',
      ]);
    });

    it('a marked place that is gone fails, it does not pass by matching nothing', () => {
      expect(
        problemsOf(json, '{ "schemaVersion": 2 }\n', '8.0.1')
      ).toHaveLength(1);
    });

    it('a historical mention matches no pattern', () => {
      const history =
        'TypeScript laws (8.0.0 and later) report the files as not read.\n- `pass.gif`: ruleofcode 7.29.1 from npm.\nnpm ci                     # pins ruleofcode 7.29.1\n';
      for (const { pattern } of CURRENT_VERSION_MENTIONS)
        expect(mentionsIn(history, pattern)).toEqual([]);
    });
  });

  describe('the sweep (scripts/version-sweep.js)', () => {
    const swept = plan('99.0.0', read);

    it('rewrites every hand-written mention, and each to the new version', () => {
      expect(swept.errors).toEqual([]);
      const expected = CURRENT_VERSION_MENTIONS.filter(e => e.sweep).reduce(
        (n, e) => n + e.count,
        0
      );
      expect(swept.changes).toHaveLength(expected);
      expect(swept.changes.every(c => c.to === '99.0.0')).toBe(true);
    });

    it('touches only the files of the hand-written entries', () => {
      const allowed = new Set(
        CURRENT_VERSION_MENTIONS.filter(e => e.sweep).map(e => e.file)
      );
      expect([...swept.files.keys()].every(f => allowed.has(f))).toBe(true);
    });

    it('after it, every swept entry names the new version and nothing else moved', () => {
      for (const [file, text] of swept.files) {
        const before = read(file);
        // only the version strings differ
        expect(text.split(PACKAGE_VERSION).length).toBeLessThanOrEqual(
          before.split(PACKAGE_VERSION).length
        );
        expect(text.replace(/99\.0\.0/g, PACKAGE_VERSION)).toBe(before);
        for (const entry of CURRENT_VERSION_MENTIONS.filter(
          e => e.sweep && e.file === file
        ))
          expect(problemsOf(entry, text, '99.0.0')).toEqual([]);
      }
    });

    it('a marked place that is gone stops the sweep', () => {
      const result = plan('99.0.0', file =>
        file === 'README.md'
          ? read(file).replace(/"version": "\d+\.\d+\.\d+",/, '')
          : read(file)
      );
      expect(result.errors).toHaveLength(1);
    });
  });
});

/**
 * DrizzleMigrationJournalIntegrity (#195): the five checks, each red and
 * green, read from the files git tracks; an unreadable or untracked journal
 * fails, never passes.
 */
import { DrizzleMigrationJournalIntegrityLaw as Law } from '../../../src/checkers/integrity-laws/drizzle-migration-journal-integrity';
import { duplicateJsonKeys } from '../../../src/utils/integrity/json-duplicate-keys';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';
import { card, gitProject } from './integrity-fixture';

afterAll(removeProjects);

interface Entry {
  idx: number;
  when: number;
  tag: string;
}

const ORIGIN = '00000000-0000-0000-0000-000000000000';
const DEPS = manifest({ 'drizzle-orm': '0.45.3' });

/** A drizzle-kit migrations folder: journal, one .sql and one chained snapshot per entry. */
function folder(entries: Entry[], out = 'drizzle'): Record<string, string> {
  const files: Record<string, string> = {
    [`${out}/meta/_journal.json`]: JSON.stringify(
      { version: '7', dialect: 'postgresql', entries: entries.map(e => ({ ...e, version: '7', breakpoints: true })) },
      null,
      2
    ),
  };
  entries.forEach((entry, i) => {
    files[`${out}/${entry.tag}.sql`] = `CREATE TABLE "t${i}" ("id" serial PRIMARY KEY);`;
    files[`${out}/meta/${entry.tag.split('_')[0]}_snapshot.json`] = JSON.stringify(
      { id: `id-${i}`, prevId: i === 0 ? ORIGIN : `id-${i - 1}`, version: '7', tables: {} },
      null,
      2
    );
  });
  return files;
}

const ENTRIES: Entry[] = [
  { idx: 0, when: 1000, tag: '0000_first' },
  { idx: 1, when: 2000, tag: '0001_second' },
  { idx: 2, when: 3000, tag: '0002_third' },
];

const run = (files: Record<string, string>, untracked: Record<string, string> = {}) =>
  Law.check(ctx(gitProject({ 'package.json': DEPS, ...files }, untracked)));

describe('DrizzleMigrationJournalIntegrityLaw (#195)', () => {
  it('green: an ordered, complete, chained journal', () => {
    expect(run(folder(ENTRIES)).violations).toEqual([]);
  });

  it('control: finds a journal under a custom out folder in a workspace package', () => {
    const bad = [ENTRIES[0], { ...ENTRIES[1], when: 1000 }] as Entry[];
    const result = run(folder(bad, 'packages/db/src/migrations'));
    expect(result.violations).toEqual([
      expect.stringMatching(/^packages\/db\/src\/migrations\/meta\/_journal\.json: entry "0001_second" has when 1000, not above "0000_first"/),
    ]);
  });

  it.each([
    ['equal', 1000],
    ['lower', 500],
  ])('check 1 red: a %s `when` is skipped by the migrator', (_label, when) => {
    const entries = [ENTRIES[0], { ...ENTRIES[1], when }, { ...ENTRIES[2] }] as Entry[];
    const result = run(folder(entries));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringContaining(`entry "0001_second" has when ${when}, not above "0000_first" (1000)`),
    ]);
  });

  it('check 2 red: idx with a gap', () => {
    const entries = [ENTRIES[0], { ...ENTRIES[2], idx: 2 }] as Entry[];
    expect(run(folder(entries)).violations).toEqual([
      expect.stringContaining('entry "0002_third" has idx 2 at position 1'),
    ]);
  });

  it('check 3 red: a tag with no .sql', () => {
    const files = folder(ENTRIES);
    delete files['drizzle/0001_second.sql'];
    expect(run(files).violations).toEqual([expect.stringContaining('entry "0001_second" has no tracked 0001_second.sql')]);
  });

  it('check 3 red: a .sql no entry names', () => {
    const files = { ...folder(ENTRIES), 'drizzle/0003_orphan.sql': 'SELECT 1;' };
    expect(run(files).violations).toEqual([
      expect.stringMatching(/^drizzle\/0003_orphan\.sql: no journal entry names "0003_orphan"/),
    ]);
  });

  it('check 3: a .sql only on disk is not part of the chain', () => {
    const files = folder(ENTRIES);
    const sql = files['drizzle/0001_second.sql'] ?? '';
    delete files['drizzle/0001_second.sql'];
    expect(run(files, { 'drizzle/0001_second.sql': sql }).violations).toEqual([
      expect.stringContaining('has no tracked 0001_second.sql'),
    ]);
  });

  it('check 4 red: a prevId that is not the previous id (two branches from one parent)', () => {
    const files = folder(ENTRIES);
    files['drizzle/meta/0002_snapshot.json'] = JSON.stringify({ id: 'id-2', prevId: 'id-0', tables: {} });
    expect(run(files).violations).toEqual([
      expect.stringMatching(/^drizzle\/meta\/0002_snapshot\.json: prevId id-0 is not the id of the previous snapshot \("0001_second", id-1\)/),
    ]);
  });

  it('check 4: a missing snapshot is reported, never skipped', () => {
    const files = folder(ENTRIES);
    delete files['drizzle/meta/0001_snapshot.json'];
    expect(run(files).violations).toEqual([
      expect.stringContaining('the snapshot of "0001_second" is not tracked'),
    ]);
  });

  it('check 5 red: a duplicate key read from the text, though JSON.parse accepts it', () => {
    const files = folder(ENTRIES);
    const duplicated = '{\n  "id": "id-1",\n  "prevId": "id-0",\n  "tables": {\n    "public.users": {},\n    "public.users": {}\n  }\n}';
    expect(() => JSON.parse(duplicated)).not.toThrow();
    files['drizzle/meta/0001_snapshot.json'] = duplicated;
    expect(run(files).violations).toEqual([
      'drizzle/meta/0001_snapshot.json:6: duplicate key "public.users" in tables — JSON.parse keeps the last one and hides the first, which is what a text merge leaves behind',
    ]);
  });

  it('cannot read: a journal with a merge conflict left in it fails', () => {
    const files = folder(ENTRIES);
    files['drizzle/meta/_journal.json'] = '{\n<<<<<<< HEAD\n  "entries": []\n=======\n  "entries": []\n>>>>>>> branch\n}';
    expect(run(files).violations).toEqual([expect.stringMatching(/^drizzle\/meta\/_journal\.json: cannot read — not valid JSON/)]);
  });

  it('cannot read: an entry without a numeric when fails', () => {
    const files = folder(ENTRIES);
    files['drizzle/meta/_journal.json'] = JSON.stringify({ entries: [{ idx: 0, when: '1000', tag: '0000_first' }] });
    expect(run(files).violations).toEqual([expect.stringContaining('cannot read — entry at position 0 lacks')]);
  });

  it('fails when the journal is on disk but git does not track it', () => {
    const result = run({}, folder(ENTRIES));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('no tracked meta/_journal.json — drizzle/meta/_journal.json exists on disk')]);
  });

  it('fails when git cannot be asked (not a repository)', () => {
    const result = Law.check(ctx(project({ 'package.json': DEPS, ...folder(ENTRIES) })));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('could not list the files git tracks')]);
  });
});

describe('Drizzle Migration Journal Integrity selection (requires)', () => {
  const requires = card('Drizzle Migration Journal Integrity').requires;

  it('is selected with drizzle-orm and a journal under any out folder', () => {
    expect(lawRequirementsMet(requires, project({ 'package.json': DEPS, ...folder(ENTRIES, 'src/db/migrations') }))).toBe(true);
  });

  it('is not selected with drizzle-orm alone (push, no migrations)', () => {
    expect(lawRequirementsMet(requires, project({ 'package.json': DEPS }))).toBe(false);
  });

  it('is not selected with a journal but no drizzle-orm', () => {
    expect(lawRequirementsMet(requires, project({ 'package.json': manifest({}), ...folder(ENTRIES) }))).toBe(false);
  });
});

describe('duplicateJsonKeys', () => {
  it('finds a duplicate in a nested object, with its path and line', () => {
    expect(duplicateJsonKeys('{"a":{"b":1,\n"b":2}}')).toEqual([{ key: 'b', path: 'a', line: 2 }]);
  });

  it('decodes escapes: "\\u0061" and "a" are the same key', () => {
    expect(duplicateJsonKeys('{"a":1,"\\u0061":2}')).toEqual([{ key: 'a', path: '', line: 1 }]);
  });

  it('green: the same key in sibling objects, and strings that look like keys', () => {
    expect(duplicateJsonKeys('{"x":{"k":1},"y":{"k":"\\"k\\":"},"z":["k","k"]}')).toEqual([]);
  });
});

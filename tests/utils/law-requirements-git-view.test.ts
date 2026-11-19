/**
 * `requires.anyFileContaining` reads what git publishes: tracked files (from
 * the index) and untracked files that are not ignored. A git-ignored file —
 * generated output, a local note — never selects a law: the project cannot
 * act on it. Outside a git work tree the disk is walked.
 */
import fs from 'fs';
import path from 'path';
import {
  lawRequirementsMet,
  readFilesContaining,
} from '../../src/utils/law-requirements';
import { project, removeProjects } from '../checkers/toolkit-fixture';
import { repo } from './git-fixture';

afterAll(removeProjects);

const DEPLOYS = {
  anyFileContaining: [
    { files: ['**/*.{json,sh}'], pattern: String.raw`gcloud\s+run\s+deploy\b` },
  ],
};
const TEXT = '{"text":"gcloud run deploy my-svc"}';

describe('anyFileContaining reads the files git publishes', () => {
  it('a git-ignored file with the text does not select', () => {
    const root = repo(
      {
        '.gitignore': 'data/\n',
        'data/law.json': TEXT,
        'index.ts': 'export {};\n',
      },
      ['.gitignore', 'index.ts']
    );
    expect(lawRequirementsMet(DEPLOYS, root)).toBe(false);
  });

  it('a tracked file with it selects', () => {
    const root = repo({ 'data/law.json': TEXT }, ['data/law.json']);
    expect(lawRequirementsMet(DEPLOYS, root)).toBe(true);
  });

  it('an untracked file that is not ignored selects (git add -A publishes it)', () => {
    const root = repo({ 'scripts/deploy.sh': 'gcloud run deploy api\n' });
    expect(lawRequirementsMet(DEPLOYS, root)).toBe(true);
  });

  it('a tracked file is read from the index, not from a draft on disk', () => {
    const staged = repo({ 'scripts/deploy.sh': 'gcloud run deploy api\n' }, [
      'scripts/deploy.sh',
    ]);
    fs.writeFileSync(path.join(staged, 'scripts/deploy.sh'), 'echo nothing\n');
    expect(lawRequirementsMet(DEPLOYS, staged)).toBe(true);
    const draft = repo({ 'scripts/deploy.sh': 'echo nothing\n' }, [
      'scripts/deploy.sh',
    ]);
    fs.writeFileSync(
      path.join(draft, 'scripts/deploy.sh'),
      'gcloud run deploy api\n'
    );
    expect(lawRequirementsMet(DEPLOYS, draft)).toBe(false);
  });

  it('readFilesContaining returns the same set, with the content it matched', () => {
    const root = repo(
      {
        '.gitignore': 'out/\n',
        'out/x.sh': 'gcloud run deploy x\n',
        'a.sh': 'gcloud run deploy a\n',
        'b.sh': 'echo b\n',
      },
      ['.gitignore', 'a.sh']
    );
    expect(
      readFilesContaining(root, DEPLOYS.anyFileContaining[0]!).map(file => [
        file.rel,
        file.content,
      ])
    ).toEqual([['a.sh', 'gcloud run deploy a\n']]);
  });

  it('an entry exclude leaves those files out of both', () => {
    const root = repo({ 'tests/fixtures/deploy.sh': 'gcloud run deploy x\n' });
    const entry = {
      ...DEPLOYS.anyFileContaining[0]!,
      exclude: ['**/tests/**'],
    };
    expect(lawRequirementsMet({ anyFileContaining: [entry] }, root)).toBe(
      false
    );
    expect(readFilesContaining(root, entry)).toEqual([]);
  });

  it('outside a git work tree the disk is walked', () => {
    const root = project({ 'data/law.json': TEXT });
    expect(lawRequirementsMet(DEPLOYS, root)).toBe(true);
  });
});

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { DatabaseQueryOptimizationLaw } from '../../src/laws/performance/database-query-optimization';
import { FileUtils } from '../../src/utils';

/**
 * #555. The law's own source check is proved by use (an import of a database
 * module), but it also asked PythonSatisfaction.hasDatabaseLayer, which tests
 * the raw text of the manifests (package.json, pyproject.toml, Makefile …)
 * for a word list that includes `firestore`. A client whose only dependency
 * is a Firestore plugin, reading one document by id, was judged for
 * composite indexes, batching and pagination.
 */
describe('Database Query Optimization is selected by a database in the code, not by a word in the manifest', () => {
  const roots: string[] = [];
  afterAll(() =>
    roots.forEach(r => fs.rmSync(r, { recursive: true, force: true }))
  );

  const project = (files: Record<string, string>): string => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-555-'));
    roots.push(root);
    for (const [rel, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), text);
    }
    return root;
  };

  const check = (root: string) =>
    DatabaseQueryOptimizationLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    });

  it('a dependency whose name contains firestore, with no database call in the code, is not applicable', async () => {
    const root = project({
      'package.json': JSON.stringify({
        name: 'client',
        version: '1.0.0',
        dependencies: { 'some-firestore-plugin': '^6.0.0' },
      }),
      'src/app/profile.ts':
        "import { Plugin } from 'some-firestore-plugin';\n\nexport async function loadProfile(id: string): Promise<unknown> {\n  return Plugin.getDocument({ reference: `users/${id}` });\n}\n",
    });

    const result = await check(root);
    expect(result.violations).toEqual([]);
    expect(result.message).toContain('Not applicable');
  });

  it('a script name in package.json is not a database either', async () => {
    const root = project({
      'package.json': JSON.stringify({
        name: 'client',
        version: '1.0.0',
        scripts: { 'deploy:rules': 'firebase deploy --only firestore' },
      }),
      'src/app/a.ts': 'export const a = 1;\n',
    });

    const result = await check(root);
    expect(result.violations).toEqual([]);
    expect(result.message).toContain('Not applicable');
  });

  it('a client that opens Firestore is still judged', async () => {
    const root = project({
      'package.json': JSON.stringify({
        name: 'client',
        version: '1.0.0',
        dependencies: { firebase: '^10.0.0' },
      }),
      'src/app/db.ts':
        "import { getFirestore } from 'firebase/firestore';\n\nexport const db = getFirestore();\n",
    });

    const result = await check(root);
    expect(result.message).not.toContain('Not applicable');
  });

  it('a Python service that queries through SQLAlchemy is still recognised as having a database', async () => {
    const root = project({
      'pyproject.toml':
        '[project]\nname = "svc"\nversion = "1.0.0"\ndependencies = ["sqlalchemy"]\n',
      'svc/repo.py':
        'def users(session):\n    return session.query(User).all()\n',
    });

    const result = await check(root);
    // Python-only: the N+1 check is the one that can read it; the result is
    // not the "no database layer" N/A.
    expect(result.message).not.toContain('no database layer');
  });
});

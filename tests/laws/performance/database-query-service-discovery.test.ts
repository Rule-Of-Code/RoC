/**
 * #368: service-file discovery must find service files.
 *
 * The SERVICE_FILE_PATTERNS match a full file name (`roles.service.ts`), and
 * discovery tested them against a basename WITHOUT its extension
 * (`roles.service`), so it returned nothing for every project: the batching,
 * pagination and caching checks always said "not implemented", and the N+1
 * check always said "addressed". The existing tests called `isServiceFile`
 * with a full name, so the step that fed it a stripped name was never run.
 */
import { DatabaseQueryOptimizationLaw } from '../../../src/laws/performance/database-query-optimization';
import { DatabaseQueryOptimizationFileDiscoveryService } from '../../../src/laws/performance/database-query-optimization/services/file-discovery.service';
import { QueryBatchingAnalyzerService } from '../../../src/laws/performance/database-query-optimization/services/query-batching.analyzer';
import { ctx, project, removeProjects } from '../../checkers/toolkit-fixture';

afterAll(removeProjects);

const LOOP_READ_SERVICE = [
  "import { getFirestore } from 'firebase-admin/firestore';",
  'const db = getFirestore();',
  'export async function loadRoles(ids: string[]) {',
  '  const out = [];',
  '  for(const id of ids) {',
  "    const snap = await db.collection('roles').doc(id).get();",
  '    out.push(snap.data());',
  '  }',
  '  return out;',
  '}',
  '',
].join('\n');

describe('database-query-optimization service discovery (#368)', () => {
  it('finds a *.service.ts file under src/ (the #368 reproduction)', () => {
    const root = project({
      'package.json':
        '{ "name": "repro", "version": "1.0.0", "private": true }',
      'src/roles.service.ts': LOOP_READ_SERVICE,
    });
    const found =
      DatabaseQueryOptimizationFileDiscoveryService.findServiceFiles(
        root,
        ctx(root).config
      );
    expect(found.map(f => f.replace(/\\/g, '/'))).toEqual([
      expect.stringMatching(/src\/roles\.service\.ts$/),
    ]);
  });

  it('finds every service-file shape the patterns name, and nothing else', () => {
    const root = project({
      'package.json': '{ "name": "repro" }',
      'src/a.service.ts': 'export const a = 1;\n',
      'src/firestore.ts': 'export const b = 1;\n',
      'libs/data/database.js': 'module.exports = 1;\n',
      'apps/api/user.repository.ts': 'export const c = 1;\n',
      'src/plain.ts': 'export const d = 1;\n',
    });
    const names =
      DatabaseQueryOptimizationFileDiscoveryService.findServiceFiles(
        root,
        ctx(root).config
      )
        .map(f => f.replace(/\\/g, '/').split('/').pop())
        .sort();
    expect(names).toEqual([
      'a.service.ts',
      'database.js',
      'firestore.ts',
      'user.repository.ts',
    ]);
  });

  it('a service that batches is seen: batching is reported implemented', () => {
    const root = project({
      'package.json': '{ "name": "repro" }',
      'src/orders.service.ts': [
        "import { getFirestore } from 'firebase-admin/firestore';",
        'const db = getFirestore();',
        'export async function save(items: { id: string }[]) {',
        '  const batch = db.batch();',
        "  for (const item of items) batch.set(db.collection('orders').doc(item.id), item);",
        '  await batch.commit();',
        '}',
        '',
      ].join('\n'),
    });
    expect(
      QueryBatchingAnalyzerService.analyze(root, ctx(root).config)
    ).toEqual({ implemented: true });
  });

  it('the law no longer reports "Query batching not implemented" for a project that batches', async () => {
    const root = project({
      'package.json': '{ "name": "repro" }',
      'src/orders.service.ts': [
        "import { getFirestore } from 'firebase-admin/firestore';",
        'const db = getFirestore();',
        'export async function save(rows: { id: string }[]) {',
        '  const batch = db.batch();',
        "  rows.forEach(row => batch.set(db.collection('orders').doc(row.id), row));",
        '  await batch.commit();',
        '}',
        '',
      ].join('\n'),
    });
    const result = await DatabaseQueryOptimizationLaw.check(ctx(root));
    expect(result.violations).not.toContain('Query batching not implemented');
  });
});

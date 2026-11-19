/**
 * The pass of Document Read Once Per Request and Count With An Aggregation
 * carries its counter all the way to `--json`: a consumer reading
 * `results[]` sees how many files were read and how many sites compared,
 * not a bare `passed: true`.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigLoader } from '../../../src/config/loader';
import { RuleOfCodeAuditor } from '../../../src/core/auditing/audit-engine';
import { AuditResultProcessor } from '../../../src/core/auditing/result-processor';

const dirs: string[] = [];
afterAll(() =>
  dirs.forEach(dir => fs.rmSync(dir, { recursive: true, force: true }))
);

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-request-path-json-'));
  dirs.push(root);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  return root;
}

async function auditJson(root: string): Promise<{
  results: Array<{ message?: string; passed?: boolean; metrics?: unknown }>;
}> {
  const quiet = (): boolean => true;
  const spies = [
    jest.spyOn(console, 'log').mockImplementation(() => undefined),
    jest.spyOn(console, 'warn').mockImplementation(() => undefined),
    jest.spyOn(process.stdout, 'write').mockImplementation(quiet),
    jest.spyOn(process.stderr, 'write').mockImplementation(quiet),
  ];
  try {
    const auditor = await RuleOfCodeAuditor.create({
      projectRoot: root,
      config: ConfigLoader.load(root),
      mode: 'full',
    });
    return JSON.parse(
      AuditResultProcessor.exportResults(await auditor.audit(), 'json')
    );
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
}

it('a clean read puts the counter in results[] of --json (message, details and metrics)', async () => {
  const root = fixture({
    'pyproject.toml':
      '[project]\nname = "svc"\ndependencies = ["google-cloud-firestore"]\n',
    'app/repo.py':
      'async def load(db, coll, uid):\n    return await db.collection(coll).document(uid).get()\n',
    'ruleofcode.config.json': JSON.stringify({
      project: { type: 'python' },
      laws: {
        enabled: {
          'Document Read Once Per Request': true,
          'Count With An Aggregation': true,
        },
      },
    }),
  });
  const json = await auditJson(root);
  const dup = json.results.find(r =>
    r.message?.startsWith('Document Read Once Per Request:')
  );
  const count = json.results.find(r =>
    r.message?.startsWith('Count With An Aggregation:')
  );
  expect(dup).toMatchObject({
    passed: true,
    metrics: { filesRead: 1, pythonFiles: 1, typescriptFiles: 0, compared: 0 },
  });
  expect(dup?.message).toContain(
    '1 source file(s) read (1 Python, 0 TS/JS), 0 document reads keyed by a literal collection — nothing to compare; not compared: '
  );
  // A document get is one read, not a result set: nothing to count.
  expect(count).toMatchObject({
    passed: true,
    metrics: { filesRead: 1, pythonFiles: 1, typescriptFiles: 0, compared: 0 },
  });
  expect(count?.message).toContain(
    '1 source file(s) read (1 Python, 0 TS/JS), no whole-result fetch counted — nothing to check; not checked: '
  );
});

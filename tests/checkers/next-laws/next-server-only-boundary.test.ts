/**
 * NextServerOnlyBoundary (#218): no server module reaches a 'use client'
 * module graph (rule 1); a server-graph module that imports one carries
 * `import 'server-only'` (rule 2, configurable).
 */
import fs from 'fs';
import path from 'path';
import { NEXT_SERVER_LAWS } from '../../../src/data/next-server-laws';
import { NextServerOnlyBoundaryLaw as Law } from '../../../src/checkers/next-laws/next-server-only-boundary';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { manifest, project, removeProjects } from '../toolkit-fixture';
import { INSTALLED, nextApp, nextCtx, withoutTypeScript } from './next-server-fixture';

afterAll(removeProjects);

const run = (files: Record<string, string>, next?: Record<string, unknown>) => Law.check(nextCtx(nextApp(files), next));
const PAGE = 'src/app/page.tsx';
const SERVER_PAGE = "import { list } from '@/lib/posts';\nexport default async function Page() { return <ul>{await list()}</ul>; }\n";

describe('NextServerOnlyBoundaryLaw — rule 1: the client graph', () => {
  it('red: a client component reaches pg through an alias and a relative import', () => {
    const result = run({
      'src/components/List.tsx': "'use client';\nimport { format } from '@/lib/format';\nexport function List() { return <p>{format()}</p>; }\n",
      'src/lib/format.ts': "import { query } from './db';\nexport const format = () => String(query);\n",
      'src/lib/db.ts': "import 'server-only';\nimport { Pool } from 'pg';\nexport const query = new Pool();\n",
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      "src/lib/db.ts:2: imports 'pg', and is bundled for the browser through src/components/List.tsx → src/lib/format.ts → src/lib/db.ts — move the server code behind a Server Component, a route handler or a 'use server' action",
    ]);
  });

  it('red: node:fs and a configured extra module; the built-in list covers subpaths', () => {
    const result = run(
      {
        'src/components/A.tsx': "'use client';\nimport { readFile } from 'node:fs/promises';\nimport { secret } from '@acme/vault/client';\nexport const A = () => <p>{String(readFile)}{secret}</p>;\n",
        'node_modules/@acme/vault/package.json': JSON.stringify({ name: '@acme/vault', exports: { './client': './client.js' } }),
        'node_modules/@acme/vault/client.js': 'exports.secret = 1;',
      },
      { serverModules: ['@acme/vault'] }
    );
    expect(result.violations).toEqual([
      expect.stringContaining("imports 'node:fs/promises'"),
      expect.stringContaining("imports '@acme/vault/client'"),
    ]);
  });

  it("green: a client component importing a 'use server' action does not bundle it", () => {
    const result = run({
      'src/components/Form.tsx': "'use client';\nimport { save } from '@/app/actions';\nexport const Form = () => <form action={save} />;\n",
      'src/app/actions.ts': "'use server';\nimport { Pool } from 'pg';\nexport async function save() { new Pool(); }\n",
    });
    expect(result.violations).toEqual([]);
  });

  it('green: import type pulls nothing in', () => {
    const result = run({
      'src/components/A.tsx': "'use client';\nimport type { Pool } from 'pg';\nimport { type Client } from 'pg';\nexport const A = (p: { pool?: Pool; c?: Client }) => <p>{String(p)}</p>;\n",
    });
    expect(result.violations).toEqual([]);
  });

  it('red: follows a workspace package linked into node_modules into its source', () => {
    const root = project({
      'package.json': JSON.stringify({ name: 'ws', private: true, workspaces: ['apps/*', 'packages/*'] }),
      'apps/web/package.json': manifest({ next: '16.4.6', react: '19.3.0', '@acme/db': '*' }),
      'apps/web/src/app/page.tsx': 'export default function Page() { return null; }\n',
      'apps/web/src/components/A.tsx': "'use client';\nimport { rows } from '@acme/db';\nexport const A = () => <p>{rows}</p>;\n",
      'packages/db/package.json': JSON.stringify({ name: '@acme/db', main: 'src/index.ts' }),
      'packages/db/src/index.ts': "import { readFileSync } from 'fs';\nexport const rows = readFileSync('x', 'utf8');\n",
    });
    fs.mkdirSync(path.join(root, 'node_modules', '@acme'), { recursive: true });
    fs.symlinkSync(path.join(root, 'packages', 'db'), path.join(root, 'node_modules', '@acme', 'db'), 'junction');
    const result = Law.check(nextCtx(root));
    expect(result.violations).toEqual([
      expect.stringMatching(/^packages\/db\/src\/index\.ts:1: imports 'fs', and is bundled for the browser through apps\/web\/src\/components\/A\.tsx → packages\/db\/src\/index\.ts/),
    ]);
  });

  it('fails closed: an import the resolver cannot follow is reported, not passed', () => {
    const result = run({ 'src/components/A.tsx': "'use client';\nimport { x } from './missing';\nexport const A = () => <p>{x}</p>;\n" });
    expect(result.violations).toEqual([
      "src/components/A.tsx:2: import './missing' could not be resolved — the modules behind it were NOT read",
    ]);
  });
});

describe("NextServerOnlyBoundaryLaw — rule 2: import 'server-only'", () => {
  it('red: a data module a page imports, importing pg without the marker', () => {
    const result = run({ [PAGE]: SERVER_PAGE, 'src/lib/posts.ts': "import { Pool } from 'pg';\nexport const list = async () => new Pool();\n" });
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/lib\/posts\.ts:1: imports 'pg' without import 'server-only' .*reached through src\/app\/page\.tsx → src\/lib\/posts\.ts/),
    ]);
  });

  it('green: the same module with the marker; the page itself and a route handler are entries, exempt', () => {
    const result = run({
      [PAGE]: SERVER_PAGE,
      'src/lib/posts.ts': "import 'server-only';\nimport { Pool } from 'pg';\nexport const list = async () => new Pool();\n",
      'src/app/api/route.ts': "import { Pool } from 'pg';\nexport async function GET() { new Pool(); return new Response(null); }\n",
    });
    expect(result.violations).toEqual([]);
  });

  it('green: requireServerOnlyMarker: false turns rule 2 off; a non-boolean is reported', () => {
    const files = { [PAGE]: SERVER_PAGE, 'src/lib/posts.ts': "import { Pool } from 'pg';\nexport const list = async () => new Pool();\n" };
    expect(run(files, { requireServerOnlyMarker: false }).violations).toEqual([]);
    expect(run(files, { requireServerOnlyMarker: 'no' }).violations).toEqual([
      'thresholds.next.requireServerOnlyMarker must be true or false',
      expect.stringContaining("imports 'pg' without import 'server-only'"),
    ]);
  });

  it('control: a script no Next entry imports is not judged', () => {
    const result = run({ 'tools/migrate.ts': "import { Pool } from 'pg';\nnew Pool();\n" });
    expect(result.violations).toEqual([]);
  });
});

describe('NextServerOnlyBoundaryLaw — cannot read', () => {
  it('fails when the parser cannot be loaded', () => {
    const root = nextApp({ 'src/components/A.tsx': "'use client';\nexport const A = () => <p />;\n" });
    const result = withoutTypeScript(() => Law.check(nextCtx(root)));
    expect(result.passed).toBe(false);
    expect(result.violations?.[0]).toMatch(/file\(s\): could not load the 'typescript' package/);
  });
});

describe('NextServerOnlyBoundaryLaw selection', () => {
  const card = NEXT_SERVER_LAWS.find(law => law.checkFunction === 'NextServerOnlyBoundaryLaw.check');
  it('is selected with next, not with react alone', () => {
    expect(card?.defaultSeverity).toBe('error');
    expect(lawRequirementsMet(card?.requires, nextApp({}))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ react: '19.0.0' }), ...INSTALLED }))).toBe(false);
  });
});

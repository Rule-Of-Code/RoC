/**
 * Three defects QA found in the 7.26.1 tarball before it was published.
 *
 * 1. `defaultEnabled: false` was read by nothing that selects laws. The
 *    CHANGELOG and the cards called No Risk Literals, Retention Registry and
 *    Next Route JS Budget opt-in; a project with no config ran all three, and
 *    the budget law — which needs a build's stats — failed "not measured".
 * 2. An import used only as a type (`import { Row } from '../lib/db'` with no
 *    `type` keyword) counted as a runtime edge in the Next module graph. The
 *    compiler erases it, so the server-only and client-env laws reported
 *    server modules "bundled for the browser" that never reach it.
 * 3. Test Documentation Requirements read `it(` inside `split(` and cut titles
 *    at an inner quote: of 157 "unclear" titles on a real consumer, one was.
 */
import { ConfigLoader } from '../../src/config/loader';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { AuditLivenessLaw } from '../../src/checkers/meta-gate-laws/audit-liveness';
import { runsWithoutAllowlist } from '../../src/utils/law-identity';
import { NextServerOnlyBoundaryLaw } from '../../src/checkers/next-laws/next-server-only-boundary';
import { UnitTestDocumentationConstants as Docs } from '../../src/laws/testing/unit-test-documentation/constants/documentation';
import type { RuleOfCodeConfig } from '../../src/config/types';
import { TestDocumentationRequirementsLaw } from '../../src/laws/testing/test-documentation-requirements';
import { FileUtils } from '../../src/utils/file-utils';
import { NextHeavyLibInClientGraphLaw } from '../../src/checkers/next-laws/next-heavy-lib-in-client-graph';
import { NextClientEnvPublicOnlyLaw } from '../../src/checkers/next-laws/next-client-env-public-only';
import { NoTestOnlyLeakageLaw } from '../../src/checkers/testing-laws/no-test-only-leakage';
import { ctx, manifest, project, removeProjects, writeFiles } from '../checkers/toolkit-fixture';
import { INSTALLED, nextApp, nextCtx } from '../checkers/next-laws/next-server-fixture';

afterAll(removeProjects);

const OPT_IN = ['No Risk Literals', 'Retention Registry Covers Schema', 'Next Route JS Budget'];

describe('opt-in laws (defaultEnabled: false) are not run by default', () => {
  it('exactly the three documented opt-in laws are opt-in', () => {
    const optIn = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(l => l.defaultEnabled === false).map(l => l.title);
    expect(optIn.sort()).toEqual([...OPT_IN].sort());
  });

  it('a Next app with no config does not select them', () => {
    const root = project({ 'package.json': manifest({ next: '16.4.6', react: '19.3.0', 'react-dom': '19.3.0' }) });
    const auditor = new RuleOfCodeAuditor(ConfigLoader.load(root), root) as unknown as {
      getSelectedLaws(): Array<{ name: string }>;
    };
    const names = auditor.getSelectedLaws().map(l => l.name);
    for (const title of OPT_IN) expect(names).not.toContain(title);
    expect(names).toContain('Next Server Only Boundary');
  });

  it('laws.enabled turns one on', () => {
    const config = { laws: { enabled: { 'Next Route JS Budget': true } } } as unknown as RuleOfCodeConfig;
    expect(ModularLawsRegistry.getEnabled(config).map(l => l.name)).toContain('Next Route JS Budget');
  });

  it('a severity turns an opt-in law on without an allowlist; a non-severity value does not', () => {
    const names = (severity: Record<string, string>) =>
      ModularLawsRegistry.getEnabled({ laws: { severity } } as unknown as RuleOfCodeConfig).map(l => l.name);
    expect(names({ 'No Risk Literals': 'warning' })).toContain('No Risk Literals');
    expect(names({ 'no-risk-literals': 'error' })).toContain('No Risk Literals');
    expect(names({ 'No Risk Literals': 'notApplicable' })).not.toContain('No Risk Literals');
    // Every other law is still selected: a severity is not an allowlist.
    expect(names({ 'No Risk Literals': 'warning' })).toContain('Professional Component Testing Policy');
  });

  it('a Next app whose config gives Next Route JS Budget a severity runs it', () => {
    const root = project({
      'package.json': manifest({ next: '16.4.6', react: '19.3.0', 'react-dom': '19.3.0' }),
      'ruleofcode.config.json': JSON.stringify({ laws: { severity: { 'Next Route JS Budget': 'error' } } }),
    });
    const auditor = new RuleOfCodeAuditor(ConfigLoader.load(root), root) as unknown as {
      getSelectedLaws(): Array<{ name: string }>;
    };
    expect(auditor.getSelectedLaws().map(l => l.name)).toContain('Next Route JS Budget');
  });

  it('no law identity has the `law-N` shape the default config uses for every law', () => {
    // The default config writes `law-1`…`law-N` severities for all laws; if an
    // identity ever took that shape, every opt-in law would turn on silently.
    for (const law of ModularLawsRegistry.getAll()) {
      for (const key of ModularLawsRegistry.lawIdentityKeys(law)) expect(key).not.toMatch(/^law-\d+$/);
    }
  });

  it('the liveness floor counts an opt-in law exactly when its severity turns it on', () => {
    // The floor is 25% of what the selector runs — with and without the
    // severities that turn the opt-in laws on.
    for (const severity of [
      {},
      { 'Next Route JS Budget': 'error', 'No Risk Literals': 'warning', 'Retention Registry Covers Schema': 'info' },
    ]) {
      const root = project({
        'package.json': manifest({ next: '16.4.6', react: '19.3.0', 'react-dom': '19.3.0' }),
        'ruleofcode.config.json': JSON.stringify({ laws: { severity } }),
      });
      const config = ConfigLoader.load(root);
      const selected = (
        new RuleOfCodeAuditor(config, root) as unknown as { getSelectedLaws(): unknown[] }
      ).getSelectedLaws().length;
      const result = AuditLivenessLaw.check({
        projectRoot: root,
        config: { ...config, laws: { ...config.laws, __plannedLawCount: 1 } },
      } as never);
      const floor = Number(/liveness floor of (\d+)/.exec((result.violations ?? []).join(' '))?.[1]);
      expect(floor).toBe(Math.max(1, Math.ceil(0.25 * selected)));
    }
  });

  it('runsWithoutAllowlist: a severity turns an opt-in law on; a legacyId or `law-N` key does not', () => {
    const law = { name: 'Next Route JS Budget', id: 'next-route-js-budget', defaultEnabled: false };
    expect(runsWithoutAllowlist(law, undefined)).toBe(false);
    expect(runsWithoutAllowlist(law, { 'Next Route JS Budget': 'error' })).toBe(true);
    expect(runsWithoutAllowlist(law, { 'next-route-js-budget': 'info' })).toBe(true);
    expect(runsWithoutAllowlist(law, { 'Next Route JS Budget': 'off' })).toBe(false);
    expect(runsWithoutAllowlist(law, { 'law-200': 'error' })).toBe(false);
    expect(runsWithoutAllowlist({ ...law, defaultEnabled: true }, undefined)).toBe(true);
  });

  it('a law that is not opt-in is still selected by default', () => {
    const config = { laws: {} } as unknown as RuleOfCodeConfig;
    const names = ModularLawsRegistry.getEnabled(config).map(l => l.name);
    expect(names).toContain('Professional Component Testing Policy');
    for (const title of OPT_IN) expect(names).not.toContain(title);
  });
});

describe('an import used only as a type is no edge in the Next module graph', () => {
  const DB = "import 'server-only';\nimport { Pool } from 'pg';\nexport interface Row { id: number }\nexport const pool = new Pool();\n";

  it('green: a client component that only annotates with an imported type', () => {
    const result = NextServerOnlyBoundaryLaw.check(
      nextCtx(
        nextApp({
          'src/components/List.tsx':
            "'use client';\nimport { Row } from '@/lib/db';\nexport function List(p: { rows: Row[] }) { return <p>{(p.rows as Row[]).length}</p>; }\n",
          'src/lib/db.ts': DB,
        })
      )
    );
    expect(result.violations).toEqual([]);
  });

  it('red: the same import used as a value is still an edge', () => {
    const result = NextServerOnlyBoundaryLaw.check(
      nextCtx(
        nextApp({
          'src/components/List.tsx':
            "'use client';\nimport { Row, pool } from '@/lib/db';\nexport function List(p: { rows: Row[] }) { return <p>{String(pool)}</p>; }\n",
          'src/lib/db.ts': DB,
        })
      )
    );
    expect(result.violations).toEqual([expect.stringContaining("src/lib/db.ts:2: imports 'pg'")]);
  });

  it('red: under verbatimModuleSyntax the compiler keeps the import, so the edge stays', () => {
    const result = NextServerOnlyBoundaryLaw.check(
      nextCtx(
        nextApp({
          'tsconfig.json': JSON.stringify({
            compilerOptions: { verbatimModuleSyntax: true, baseUrl: '.', paths: { '@/*': ['./src/*'] } },
          }),
          'src/components/List.tsx':
            "'use client';\nimport { Row } from '@/lib/db';\nexport function List(p: { rows: Row[] }) { return <p>{p.rows.length}</p>; }\n",
          'src/lib/db.ts': DB,
        })
      )
    );
    expect(result.violations).toEqual([expect.stringContaining("src/lib/db.ts:2: imports 'pg'")]);
  });

  it('red: `class X extends Imported` uses the import as a value', () => {
    const result = NextServerOnlyBoundaryLaw.check(
      nextCtx(
        nextApp({
          'src/components/List.tsx':
            "'use client';\nimport { Base } from '@/lib/base';\nclass Store extends Base {}\nexport const List = () => <p>{String(new Store())}</p>;\n",
          'src/lib/base.ts': "import { Pool } from 'pg';\nexport class Base { pool = new Pool(); }\n",
        })
      )
    );
    expect(result.violations).toEqual([expect.stringContaining("src/lib/base.ts:1: imports 'pg'")]);
  });
});

/**
 * #316: the #293 rule reached one of three import graphs. The client/server
 * module graph (Next Heavy Lib In Client Graph) and the test-only graph (No
 * Test-Only Leakage) still counted an import used only as a type as a
 * runtime edge. All three now ask one helper (CompiledImports).
 */
describe('#316: every import graph drops an import used only as a type', () => {
  const MANIFEST = manifest({ next: '16.4.6', react: '19.3.0', 'react-dom': '19.3.0', moment: '2.30.1', typescript: '5.9.3' });
  const TSCONFIG = { jsx: 'preserve', module: 'esnext', moduleResolution: 'bundler' };
  // The `typeonly2` shape from the issue, verbatim.
  const typeOnly2 = (list: string, compilerOptions: Record<string, unknown> = TSCONFIG): string =>
    project({
      'package.json': MANIFEST,
      ...INSTALLED,
      'node_modules/moment/package.json': JSON.stringify({ name: 'moment', version: '2.30.1', main: 'index.js' }),
      'node_modules/moment/index.js': 'module.exports = {};',
      'tsconfig.json': JSON.stringify({ compilerOptions }),
      'app/layout.tsx': 'export default function L({ children }) { return <html lang="en"><body>{children}</body></html>; }\n',
      'app/page.tsx': "import { List } from './List';\nexport default function P() { return <List />; }\n",
      'app/List.tsx': list,
      'mocks/user.fixture.ts': 'export type FakeUser = { id: string };\nexport const fakeUser: FakeUser = { id: "1" };\n',
    });
  const TYPE_ONLY = [
    "'use client';",
    "import { useState } from 'react';",
    "import { Moment } from 'moment';",
    "import { FakeUser } from '../mocks/user.fixture';",
    'export function List({ at, u }: { at?: Moment; u?: FakeUser }) {',
    '  const [n] = useState(0);',
    '  return <p>{n}</p>;',
    '}',
    '',
  ].join('\n');
  const VALUE_USE = [
    "'use client';",
    "import moment, { Moment } from 'moment';",
    "import { FakeUser, fakeUser } from '../mocks/user.fixture';",
    'export function List({ at, u }: { at?: Moment; u?: FakeUser }) {',
    '  return <p>{moment().format()}{fakeUser.id}</p>;',
    '}',
    '',
  ].join('\n');
  const heavy = (root: string) => NextHeavyLibInClientGraphLaw.check(ctx(root)).violations ?? [];
  const leakage = (root: string) => NoTestOnlyLeakageLaw.check(ctx(root)).violations ?? [];

  it('green (Heavy Lib): `import { Moment } from "moment"` used only as a type', () => {
    expect(heavy(typeOnly2(TYPE_ONLY))).toEqual([]);
  });

  it('green (No Test-Only Leakage): a type imported from a fixture file', () => {
    expect(leakage(typeOnly2(TYPE_ONLY))).toEqual([]);
  });

  it('green (Server Only Boundary, Client Env): the same shape, the graph #293 fixed', () => {
    const root = typeOnly2(TYPE_ONLY);
    expect(NextServerOnlyBoundaryLaw.check(ctx(root)).violations).toEqual([]);
    expect(NextClientEnvPublicOnlyLaw.check(ctx(root)).violations).toEqual([]);
  });

  it('red (Heavy Lib, control): a value use of the same import is still an edge', () => {
    expect(heavy(typeOnly2(VALUE_USE))).toEqual([expect.stringContaining("app/List.tsx:2: imports 'moment' statically")]);
  });

  it('red (No Test-Only Leakage, control): a value use of the fixture is still an edge', () => {
    expect(leakage(typeOnly2(VALUE_USE))).toEqual([
      expect.stringContaining('mocks/user.fixture.ts is test-only and is reachable from app/List.tsx → mocks/user.fixture.ts'),
    ]);
  });

  it('red (Heavy Lib and No Test-Only Leakage): under verbatimModuleSyntax the import stays, so the edge stays', () => {
    const root = typeOnly2(TYPE_ONLY, { ...TSCONFIG, verbatimModuleSyntax: true });
    expect(heavy(root)).toEqual([expect.stringContaining("app/List.tsx:3: imports 'moment' statically")]);
    expect(leakage(root)).toEqual([expect.stringContaining('mocks/user.fixture.ts is test-only')]);
  });

  it('red (all three graphs): preserveValueImports keeps the edge as well', () => {
    const files = {
      'src/components/List.tsx':
        "'use client';\nimport { Row } from '@/lib/db';\nexport function List(p: { rows: Row[] }) { return <p>{p.rows.length}</p>; }\n",
      'src/lib/db.ts': "import 'server-only';\nimport { Pool } from 'pg';\nexport interface Row { id: number }\nexport const pool = new Pool();\n",
      'tsconfig.json': JSON.stringify({
        compilerOptions: { preserveValueImports: true, isolatedModules: true, baseUrl: '.', paths: { '@/*': ['./src/*'] } },
      }),
    };
    expect(NextServerOnlyBoundaryLaw.check(nextCtx(nextApp(files))).violations).toEqual([
      expect.stringContaining("src/lib/db.ts:2: imports 'pg'"),
    ]);
    const root = typeOnly2(TYPE_ONLY, { ...TSCONFIG, preserveValueImports: true, isolatedModules: true });
    expect(heavy(root)).toEqual([expect.stringContaining("app/List.tsx:3: imports 'moment' statically")]);
    expect(leakage(root)).toEqual([expect.stringContaining('mocks/user.fixture.ts is test-only')]);
  });

  it('red (all three graphs): `import { type X }` under verbatimModuleSyntax still loads the module', () => {
    // TypeScript rewrites it to `import {} from '…'`, which runs the module.
    const list = TYPE_ONLY.replace('{ Moment }', '{ type Moment }').replace('{ FakeUser }', '{ type FakeUser }');
    const root = typeOnly2(list, { ...TSCONFIG, verbatimModuleSyntax: true });
    expect(heavy(root)).toEqual([expect.stringContaining("app/List.tsx:3: imports 'moment' statically")]);
    expect(leakage(root)).toEqual([expect.stringContaining('mocks/user.fixture.ts is test-only')]);
    const server = nextApp({
      'tsconfig.json': JSON.stringify({ compilerOptions: { verbatimModuleSyntax: true, baseUrl: '.', paths: { '@/*': ['./src/*'] } } }),
      'src/components/List.tsx':
        "'use client';\nimport { type Row } from '@/lib/db';\nexport function List(p: { rows: Row[] }) { return <p>{p.rows.length}</p>; }\n",
      'src/lib/db.ts': "import 'server-only';\nimport { Pool } from 'pg';\nexport interface Row { id: number }\nexport const pool = new Pool();\n",
    });
    expect(NextServerOnlyBoundaryLaw.check(nextCtx(server)).violations).toEqual([
      expect.stringContaining("src/lib/db.ts:2: imports 'pg'"),
    ]);
  });

  it('green (No Test-Only Leakage): `export type { X } from` a fixture loads nothing', () => {
    const list = TYPE_ONLY.replace("import { FakeUser } from '../mocks/user.fixture';", "export type { FakeUser } from '../mocks/user.fixture';\nimport type { FakeUser } from '../mocks/user.fixture';");
    expect(leakage(typeOnly2(list))).toEqual([]);
  });

  it('green (No Test-Only Leakage): a `type` binding written outside the gate does not ungate the import', () => {
    const layout = [
      "import { MockProvider, type MockProps } from '../mocks/provider';",
      'export type P = MockProps;',
      "export default function L({ children }) { return process.env.E2E === 'true' ? <MockProvider>{children}</MockProvider> : children; }",
      '',
    ].join('\n');
    const root = project({
      'package.json': MANIFEST,
      'tsconfig.json': JSON.stringify({ compilerOptions: TSCONFIG }),
      'app/layout.tsx': layout,
      'mocks/provider.tsx': 'export type MockProps = { a: 1 };\nexport const MockProvider = ({ children }) => children;\n',
    });
    expect(leakage(root)).toEqual([]);
  });

  it('red (fail closed): a tsconfig that cannot be parsed keeps the edge — whether the compiler keeps it is unknown', () => {
    const root = typeOnly2(TYPE_ONLY);
    writeFiles(root, { 'tsconfig.json': '{ "compilerOptions": { "jsx": "preserve", ' });
    // Heavy Lib's resolver names the broken config on the kept edge; it never passes.
    expect(heavy(root)).toEqual(expect.arrayContaining([expect.stringContaining('app/List.tsx:3: tsconfig.json: could not be parsed')]));
    expect(leakage(root)).toEqual([expect.stringContaining('mocks/user.fixture.ts is test-only')]);
    const server = nextApp({
      'tsconfig.json': '{ "compilerOptions": { "verbatimModuleSyntax": true, ',
      'src/components/List.tsx':
        "'use client';\nimport { Row } from '../lib/db';\nexport function List(p: { rows: Row[] }) { return <p>{p.rows.length}</p>; }\n",
      'src/lib/db.ts': "import 'server-only';\nimport { Pool } from 'pg';\nexport interface Row { id: number }\nexport const pool = new Pool();\n",
    });
    expect(NextServerOnlyBoundaryLaw.check(nextCtx(server)).violations).toEqual([
      expect.stringContaining("src/lib/db.ts:2: imports 'pg'"),
    ]);
  });
});

describe('test titles are read from it()/test() calls, whole', () => {
  it("`.split('\\n')` is not a test", () => {
    expect(Docs.extractTestCases("const lines = text.split('\\n');\nsubmit('x');\n")).toEqual([]);
  });

  it('a title with the other quote inside is not cut', () => {
    expect(Docs.extractTestCases(`it("keeps the user's cart", () => {});`)).toEqual(["keeps the user's cart"]);
    expect(Docs.extractTestCases(`it('keeps the user\\'s cart', () => {});`)).toEqual(["keeps the user's cart"]);
  });

  it('read through the parser: a comment or a string that says `it (` is not a call', () => {
    const root = project({ 'package.json': manifest({}) });
    const content = [
      '/** the WebView gets round to it (`toBlob`). */',
      "const parts = 'a;b'.split(';');",
      'it("doesn\'t lose the cart on reload", () => {});',
      "it('„Сега\" stays on screen while offline', () => {});",
      'it(`tmpl title with ${parts.length} parts`, () => {});',
    ].join('\n');
    const titles = Docs.extractTestCases(content, 'a.spec.ts', root);
    expect(titles).toEqual([
      "doesn't lose the cart on reload",
      '„Сега" stays on screen while offline',
      'tmpl title with ${parts.length} parts',
    ]);
    expect(titles.filter(t => Docs.hasPoorDescription(t))).toEqual([]);
  });

  it('a test file that cannot be read is a finding, not skipped', () => {
    const root = project({
      'src/a.spec.ts': "it('reads the cart back after a reload', () => {});\n",
      'src/b.spec.ts': "it('keeps the cart after a reload', () => {});\n",
    });
    const read = FileUtils.readFile.bind(FileUtils);
    const spy = jest.spyOn(FileUtils, 'readFile').mockImplementation(((file: string, options?: never) => {
      if (String(file).endsWith('b.spec.ts')) throw new Error('EACCES');
      return read(file, options);
    }) as typeof FileUtils.readFile);
    try {
      const result = TestDocumentationRequirementsLaw.check({
        projectRoot: root,
        config: { ignores: { global: [], tests: [], build: [], design: [] }, thresholds: {} },
      } as never);
      expect(result.violations).toEqual(
        expect.arrayContaining([expect.stringMatching(/1 test files could not be read: src\/b\.spec\.ts/)])
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('Playwright test.describe / test.step are not tests; test.fixme is', () => {
    const root = project({ 'package.json': manifest({}) });
    const content =
      "test.describe('the mocks', () => {\n  test.fixme('waits for the network to settle', async () => {\n    await test.step('open', async () => {});\n  });\n});\n";
    expect(Docs.extractTestCases(content, 'a.e2e.spec.ts', root)).toEqual(['waits for the network to settle']);
  });

  it('"should … never the network" is not "should … work"', () => {
    expect(Docs.hasPoorDescription('should name the real refusal on a 403, never the network')).toBe(false);
    expect(Docs.hasPoorDescription('should work')).toBe(true);
  });

  it('xit/fit, .only/.skip and template-literal titles count', () => {
    expect(
      Docs.extractTestCases(
        "xit('skipped behaviour', f);\nfit('focused behaviour', f);\nit.only('only this one', f);\ntest.skip(`template title`, f);\n"
      )
    ).toEqual(['skipped behaviour', 'focused behaviour', 'only this one', 'template title']);
  });
});

/**
 * #287: the Next laws walk ONE module graph. Each case is one resolution or
 * entry shape, judged by the client-graph laws (Heavy Lib, Client Env, Server
 * Only rule 1) and the server-graph laws (Client Props, Server Only rule 2)
 * on the same fixture. The rule: see the code as Next and its bundler see it;
 * what cannot be read is reported as not read, never passed in silence.
 *
 * The standard fixture has two chains that go only through the shape under
 * test:
 *   client: components/widget.tsx ('use client') → <shape> → lib/helper.ts
 *           (imports lodash and fs, reads process.env.API_SECRET)
 *   server: app/page.tsx → <shape> → lib/panel.tsx
 *           (imports fs without 'server-only', passes a function to a client component)
 */
import fs from 'fs';
import path from 'path';
import { NextClientEnvPublicOnlyLaw as Env } from '../../../src/checkers/next-laws/next-client-env-public-only';
import { NextClientPropsSerializableLaw as Props } from '../../../src/checkers/next-laws/next-client-props-serializable';
import { NextHeavyLibInClientGraphLaw as Heavy } from '../../../src/checkers/next-laws/next-heavy-lib-in-client-graph';
import { NextServerOnlyBoundaryLaw as ServerOnly } from '../../../src/checkers/next-laws/next-server-only-boundary';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';
import { INSTALLED, NEXT_DEPENDENCIES } from './next-server-fixture';

afterAll(removeProjects);

const LODASH = {
  'node_modules/lodash/package.json': JSON.stringify({
    name: 'lodash',
    version: '4.17.21',
    main: 'index.js',
  }),
  'node_modules/lodash/index.js': 'module.exports = function chunk() {};',
};

const tsconfig = (options: Record<string, unknown> = {}): string =>
  JSON.stringify({
    compilerOptions: {
      jsx: 'preserve',
      moduleResolution: 'bundler',
      paths: { '@/*': ['./*'] },
      ...options,
    },
  });

const HELPER =
  "import chunk from 'lodash';\nimport { readFileSync } from 'fs';\n\nexport function pick(): string {\n  return String(chunk) + String(readFileSync) + String(process.env.API_SECRET);\n}\n";
const HELPER_JS = HELPER.replace('(): string', '()');
const COUNTER =
  "'use client';\n\nexport function Counter({ onPick }: { onPick: () => number }) {\n  return <button>{onPick()}</button>;\n}\n";
const panel = (counter = '../components/counter'): string =>
  `import { readFileSync } from 'fs';\nimport { Counter } from '${counter}';\n\nexport function Panel() {\n  return <div>{String(readFileSync)}<Counter onPick={() => 1} /></div>;\n}\n`;
const widget = (spec: string): string =>
  `'use client';\n\nimport { pick } from '${spec}';\n\nexport function Widget() {\n  return <span>{pick()}</span>;\n}\n`;
const page = (spec: string): string =>
  `import { Panel } from '${spec}';\n\nexport default function Home() {\n  return <main><Panel /></main>;\n}\n`;

/** A Next app at the project root with both chains going through `client` and `server` specifiers. */
function app(
  client: string,
  server: string,
  files: Record<string, string | null> = {}
): string {
  const all: Record<string, string | null> = {
    'package.json': manifest(NEXT_DEPENDENCIES),
    'tsconfig.json': tsconfig(),
    ...INSTALLED,
    ...LODASH,
    'app/layout.tsx':
      'export default function L({ children }) { return <html lang="en"><body>{children}</body></html>; }\n',
    'app/page.tsx': page(server),
    'components/counter.tsx': COUNTER,
    'components/widget.tsx': widget(client),
    'lib/helper.ts': HELPER,
    'lib/panel.tsx': panel(),
    ...files,
  };
  return project(
    Object.fromEntries(
      Object.entries(all).filter((e): e is [string, string] => e[1] !== null)
    )
  );
}

interface Verdicts {
  heavy: string[];
  env: string[];
  props: string[];
  serverOnly: string[];
}

function judge(root: string): Verdicts {
  const context = ctx(root);
  return {
    heavy: Heavy.check(context).violations ?? [],
    env: Env.check(context).violations ?? [],
    props: Props.check(context).violations ?? [],
    serverOnly: ServerOnly.check(context).violations ?? [],
  };
}

const has = (messages: string[], pattern: RegExp): boolean =>
  messages.some(message => pattern.test(message));

/** What each law concluded about the module behind the shape. */
function conclusions(v: Verdicts, helper: string, panelFile: string) {
  const h = helper.replace(/[.]/g, '\\.');
  const p = panelFile.replace(/[.]/g, '\\.');
  return {
    heavyReadsHelper: has(v.heavy, new RegExp(`^${h}:\\d+: imports 'lodash'`)),
    envReadsHelper: has(
      v.env,
      new RegExp(`^${h}:\\d+: process\\.env\\.API_SECRET`)
    ),
    serverOnlyReadsHelper: has(
      v.serverOnly,
      new RegExp(`^${h}:\\d+: imports 'fs', and is bundled`)
    ),
    propsReadsPanel: has(v.props, new RegExp(`^${p}:\\d+: <Counter onPick=`)),
    serverOnlyReadsPanel: has(
      v.serverOnly,
      new RegExp(`^${p}:\\d+: imports 'fs' without`)
    ),
  };
}

const NOT_READ = /not read|NOT read/;

describe('#287 one module graph: what each shape resolves to, for every graph law', () => {
  it('b: a workspace package linked into node_modules is first-party code, walked by every law', () => {
    const root = app('@acme/ui/helper', '@acme/ui/panel', {
      'package.json': JSON.stringify({
        name: 'web',
        private: true,
        workspaces: ['packages/*'],
        dependencies: { ...NEXT_DEPENDENCIES, '@acme/ui': '*' },
      }),
      'packages/ui/package.json': JSON.stringify({
        name: '@acme/ui',
        exports: {
          './helper': './src/helper.ts',
          './panel': './src/panel.tsx',
        },
      }),
      'packages/ui/src/helper.ts': HELPER,
      'packages/ui/src/panel.tsx': panel('../../../components/counter'),
    });
    fs.mkdirSync(path.join(root, 'node_modules', '@acme'), { recursive: true });
    fs.symlinkSync(
      path.join(root, 'packages', 'ui'),
      path.join(root, 'node_modules', '@acme', 'ui'),
      'junction'
    );
    expect(
      conclusions(
        judge(root),
        'packages/ui/src/helper.ts',
        'packages/ui/src/panel.tsx'
      )
    ).toEqual({
      heavyReadsHelper: true,
      envReadsHelper: true,
      serverOnlyReadsHelper: true,
      propsReadsPanel: true,
      serverOnlyReadsPanel: true,
    });
  });

  it('c: jsconfig.json paths are read when there is no tsconfig.json', () => {
    const root = app('@/lib/helper', '@/lib/panel', {
      'tsconfig.json': null,
      'jsconfig.json': JSON.stringify({
        compilerOptions: { paths: { '@/*': ['./*'] } },
      }),
    });
    const v = judge(root);
    expect(conclusions(v, 'lib/helper.ts', 'lib/panel.tsx')).toEqual({
      heavyReadsHelper: true,
      envReadsHelper: true,
      serverOnlyReadsHelper: true,
      propsReadsPanel: true,
      serverOnlyReadsPanel: true,
    });
  });

  it('d: a package that is not installed is not read — and a heavy one is still named', () => {
    const root = app('@/lib/helper', '@/lib/panel', {
      'lib/helper.ts':
        "import moment from 'moment';\nimport { absent } from '@acme/absent';\nexport const used = [moment, absent];\n",
    });
    const v = judge(root);
    expect(v.heavy).toEqual(
      expect.arrayContaining([
        "lib/helper.ts:1: 'moment' did not resolve to a file — the modules below it were not read",
        "lib/helper.ts:2: '@acme/absent' did not resolve to a file — the modules below it were not read",
        expect.stringMatching(
          /^lib\/helper\.ts:1: imports 'moment' statically/
        ),
      ])
    );
    expect(v.env).toEqual(
      expect.arrayContaining([
        "lib/helper.ts:2: import '@acme/absent' could not be resolved — the modules behind it were NOT read",
      ])
    );
  });

  it('e: a first-party .d.ts is read through the .js beside it; with none, it is not read', () => {
    const pair = app('@/lib/legacy', '@/lib/old-panel', {
      'lib/legacy.js': HELPER_JS,
      'lib/legacy.d.ts': 'export declare function pick(): string;\n',
      'lib/old-panel.jsx': panel(),
      'lib/old-panel.d.ts': 'export declare function Panel(): unknown;\n',
    });
    expect(
      conclusions(judge(pair), 'lib/legacy.js', 'lib/old-panel.jsx')
    ).toEqual({
      heavyReadsHelper: true,
      envReadsHelper: true,
      serverOnlyReadsHelper: true,
      propsReadsPanel: true,
      serverOnlyReadsPanel: true,
    });
    const only = judge(
      app('@/lib/ambient', '@/lib/ambient-panel', {
        'lib/ambient.d.ts': 'export declare function pick(): string;\n',
        'lib/ambient-panel.d.ts': 'export declare function Panel(): unknown;\n',
      })
    );
    for (const messages of [only.heavy, only.env, only.props, only.serverOnly])
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/resolves only to a type declaration/),
        ])
      );
  });

  it('g: a tsconfig.json that cannot be read is named by every graph law', () => {
    const root = app('../lib/helper', '../lib/panel', {
      'tsconfig.json': JSON.stringify({
        extends: './tsconfig.missing.json',
        compilerOptions: { jsx: 'preserve', paths: { '@/*': ['./*'] } },
      }),
    });
    const v = judge(root);
    for (const messages of [v.heavy, v.env, v.props, v.serverOnly])
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /^tsconfig\.json: .*its path aliases were not resolved$/
          ),
        ])
      );
    // What resolves without the config is still read.
    expect(conclusions(v, 'lib/helper.ts', 'lib/panel.tsx')).toEqual({
      heavyReadsHelper: true,
      envReadsHelper: true,
      serverOnlyReadsHelper: true,
      propsReadsPanel: true,
      serverOnlyReadsPanel: true,
    });
  });

  it('zh: a relative import that leaves the audited root is not read', () => {
    const outer = project({
      'outside/helper.ts': HELPER,
      'outside/panel.tsx': panel('../web/components/counter'),
      ...Object.fromEntries(
        Object.entries({
          'package.json': manifest(NEXT_DEPENDENCIES),
          'tsconfig.json': tsconfig(),
          ...INSTALLED,
          ...LODASH,
          'app/page.tsx': page('../../outside/panel'),
          'components/counter.tsx': COUNTER,
          'components/widget.tsx': widget('../../outside/helper'),
        }).map(([file, text]) => [`web/${file}`, text])
      ),
    });
    const v = judge(path.join(outer, 'web'));
    expect(v.heavy).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^components\/widget\.tsx:3: import '\.\.\/\.\.\/outside\/helper' resolves outside the workspace/
        ),
      ])
    );
    expect(v.props).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^app\/page\.tsx:1: import '\.\.\/\.\.\/outside\/panel' resolves outside the workspace/
        ),
      ])
    );
    expect(has(v.heavy, /imports 'lodash'/)).toBe(false);
    expect(has(v.props, /<Counter onPick=/)).toBe(false);
  });

  it("8: package.json `imports` ('#x') resolve as Next resolves them", () => {
    const root = app('#client/helper', '#server/panel', {
      'package.json': JSON.stringify({
        name: 'web',
        private: true,
        dependencies: NEXT_DEPENDENCIES,
        imports: { '#client/*': './lib/*.ts', '#server/*': './lib/*.tsx' },
      }),
    });
    const v = judge(root);
    expect(conclusions(v, 'lib/helper.ts', 'lib/panel.tsx')).toEqual({
      heavyReadsHelper: true,
      envReadsHelper: true,
      serverOnlyReadsHelper: true,
      propsReadsPanel: true,
      serverOnlyReadsPanel: true,
    });
    for (const messages of [v.heavy, v.env, v.props, v.serverOnly])
      expect(has(messages, NOT_READ)).toBe(false);
  });

  it("10: a tsconfig `moduleResolution: node` does not hide a package's exports map", () => {
    const root = app('@/lib/helper', '@/lib/panel', {
      'tsconfig.json': tsconfig({ moduleResolution: 'node' }),
      'lib/helper.ts': `import { widgets } from 'kit/widgets';\n${HELPER}export const used = widgets;\n`,
      'node_modules/kit/package.json': JSON.stringify({
        name: 'kit',
        exports: {
          './widgets': {
            types: './dist/widgets.d.ts',
            default: './dist/widgets.js',
          },
        },
      }),
      'node_modules/kit/dist/widgets.js': 'export const widgets = 2;\n',
      'node_modules/kit/dist/widgets.d.ts':
        'export declare const widgets: number;\n',
    });
    const v = judge(root);
    for (const messages of [v.heavy, v.env, v.serverOnly])
      expect(has(messages, /kit\/widgets/)).toBe(false);
    expect(
      conclusions(v, 'lib/helper.ts', 'lib/panel.tsx').envReadsHelper
    ).toBe(true);
  });

  it.each([
    ['an alias no paths entry maps', '~/lib/helper', '~/lib/panel', {}],
    [
      'a baseUrl path to a file that does not exist',
      'lib/missing-helper',
      'lib/missing-panel',
      { 'tsconfig.json': tsconfig({ paths: undefined, baseUrl: '.' }) },
    ],
  ])(
    '13: %s is not read, never taken for a package',
    (_name, client, server, files) => {
      const v = judge(app(client, server, files));
      expect(v.heavy).toEqual(
        expect.arrayContaining([
          `components/widget.tsx:3: '${client}' did not resolve to a file — the modules below it were not read`,
        ])
      );
      expect(v.props).toEqual(
        expect.arrayContaining([
          `app/page.tsx:1: '${server}' did not resolve to a file — the modules below it were not read`,
        ])
      );
      expect(v.env).toEqual(
        expect.arrayContaining([
          `components/widget.tsx:3: import '${client}' could not be resolved — the modules behind it were NOT read`,
        ])
      );
    }
  );
});

describe('#287 one module graph: entries as Next has them', () => {
  it('11: a Pages Router page is a client entry for every client law; its data functions are not client code', () => {
    const root = app('@/lib/helper', '@/lib/panel', {
      'pages/legacy.tsx':
        "import { pick } from '@/lib/helper';\n\nexport default function Legacy() {\n  return <p>{pick()}</p>;\n}\n",
      'pages/ssr.tsx':
        "import { Pool } from 'pg';\n\nexport default function Ssr({ n }: { n: number }) {\n  return <p>{n}</p>;\n}\n\nexport async function getServerSideProps() {\n  const db = require('pg');\n  return { props: { n: String(new Pool()) + String(db) + process.env.DB_URL } };\n}\n",
      'components/widget.tsx': null,
    });
    const v = judge(root);
    expect(
      has(
        v.heavy,
        /^lib\/helper\.ts:1: imports 'lodash' statically.*pages\/legacy\.tsx → lib\/helper\.ts/
      )
    ).toBe(true);
    expect(
      has(
        v.env,
        /^lib\/helper\.ts:\d+: process\.env\.API_SECRET is read in browser code \(through pages\/legacy\.tsx → lib\/helper\.ts\)/
      )
    ).toBe(true);
    expect(
      has(
        v.serverOnly,
        /^lib\/helper\.ts:2: imports 'fs', and is bundled for the browser through pages\/legacy\.tsx/
      )
    ).toBe(true);
    // What only getServerSideProps uses is stripped from the client bundle.
    expect(has(v.env, /DB_URL/)).toBe(false);
    expect(has(v.serverOnly, /pages\/ssr\.tsx/)).toBe(false);
  });

  it('11: instrumentation-client is a client entry for every client law', () => {
    const v = judge(
      app('@/lib/helper', '@/lib/panel', {
        'instrumentation-client.ts':
          "import { pick } from './lib/helper';\n\npick();\n",
        'components/widget.tsx': null,
      })
    );
    expect(
      has(
        v.heavy,
        /^lib\/helper\.ts:1: imports 'lodash' statically.*instrumentation-client\.ts → lib\/helper\.ts/
      )
    ).toBe(true);
    expect(
      has(
        v.env,
        /^lib\/helper\.ts:\d+: process\.env\.API_SECRET is read in browser code/
      )
    ).toBe(true);
  });

  it('12: with app/ and src/app/ both present, Next renders app/ only — so does every server law', () => {
    const v = judge(
      app('@/lib/helper', '@/lib/panel', {
        'app/page.tsx':
          'export default function Home() {\n  return <main />;\n}\n',
        'src/app/page.tsx': page('@/lib/panel'),
      })
    );
    expect(has(v.props, /lib\/panel\.tsx/)).toBe(false);
    expect(has(v.serverOnly, /lib\/panel\.tsx/)).toBe(false);
  });
});

describe('#287 contract: one import, one conclusion for the client and the server laws', () => {
  const shapes: Array<[string, () => string, string, string]> = [
    [
      'tsconfig paths alias',
      () => app('@/lib/helper', '@/lib/panel'),
      'lib/helper.ts',
      'lib/panel.tsx',
    ],
    [
      'relative import',
      () => app('../lib/helper', '../lib/panel'),
      'lib/helper.ts',
      'lib/panel.tsx',
    ],
    [
      'alias to a missing file',
      () => app('@/lib/gone', '@/lib/gone-panel'),
      'lib/gone.ts',
      'lib/gone-panel.tsx',
    ],
    [
      'unmapped alias',
      () => app('~/lib/helper', '~/lib/panel'),
      'lib/helper.ts',
      'lib/panel.tsx',
    ],
    [
      'jsconfig alias',
      () =>
        app('@/lib/helper', '@/lib/panel', {
          'tsconfig.json': null,
          'jsconfig.json': JSON.stringify({
            compilerOptions: { paths: { '@/*': ['./*'] } },
          }),
        }),
      'lib/helper.ts',
      'lib/panel.tsx',
    ],
    [
      'type declaration with the JS beside it',
      () =>
        app('@/lib/legacy', '@/lib/old-panel', {
          'lib/legacy.js': HELPER_JS,
          'lib/legacy.d.ts': 'export declare function pick(): string;\n',
          'lib/old-panel.jsx': panel(),
          'lib/old-panel.d.ts': 'export declare function Panel(): unknown;\n',
        }),
      'lib/legacy.js',
      'lib/old-panel.jsx',
    ],
    [
      "package.json imports '#x'",
      () =>
        app('#client/helper', '#server/panel', {
          'package.json': JSON.stringify({
            name: 'web',
            private: true,
            dependencies: NEXT_DEPENDENCIES,
            imports: { '#client/*': './lib/*.ts', '#server/*': './lib/*.tsx' },
          }),
        }),
      'lib/helper.ts',
      'lib/panel.tsx',
    ],
  ];

  it.each(shapes)('%s', (_name, build, helper, panelFile) => {
    const v = judge(build());
    const c = conclusions(v, helper, panelFile);
    // Read: the module behind the import was inspected by both sides …
    expect(c.heavyReadsHelper).toBe(c.envReadsHelper);
    expect(c.envReadsHelper).toBe(c.serverOnlyReadsHelper);
    expect(c.propsReadsPanel).toBe(c.serverOnlyReadsPanel);
    // … or not read: both sides say so, neither passes in silence.
    expect(has(v.heavy, NOT_READ)).toBe(has(v.env, NOT_READ));
    expect(has(v.props, NOT_READ)).toBe(has(v.serverOnly, NOT_READ));
  });
});

describe('#287 parameters of the one graph: each law keeps its choice', () => {
  it("a: import() and require() are edges for the laws that read the code, not for Heavy Lib's first-load weight", () => {
    const v = judge(
      app('@/lib/helper', '@/lib/panel', {
        'components/widget.tsx':
          "'use client';\n\nexport async function load() {\n  const { pick } = await import('@/lib/helper');\n  return pick();\n}\n",
      })
    );
    expect(has(v.heavy, /lib\/helper\.ts/)).toBe(false);
    expect(has(v.env, /^lib\/helper\.ts:\d+: process\.env\.API_SECRET/)).toBe(
      true
    );
    expect(
      has(v.serverOnly, /^lib\/helper\.ts:2: imports 'fs', and is bundled/)
    ).toBe(true);
  });

  it("stop: a client walk stops at a 'use server' module, a server walk at a 'use client' one", () => {
    const v = judge(
      app('@/lib/actions', '@/lib/panel', {
        'lib/actions.ts': `'use server';\n\n${HELPER}`,
      })
    );
    expect(has(v.heavy, /lib\/actions\.ts/)).toBe(false);
    expect(has(v.env, /lib\/actions\.ts/)).toBe(false);
    expect(
      has(v.serverOnly, /lib\/actions\.ts:\d+: imports 'fs', and is bundled/)
    ).toBe(false);
    // The server walk reaches the client component and stops there: its
    // props are judged, its own imports are not walked.
    expect(has(v.props, /^lib\/panel\.tsx:\d+: <Counter onPick=/)).toBe(true);
  });
});

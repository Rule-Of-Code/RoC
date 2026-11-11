/**
 * NextErrorBoundariesDeclared (#222): the root app/ holds not-found, error and
 * global-error; error and global-error are Client Components; global-error
 * renders <html> and <body>.
 */
import { NEXT_SERVER_LAWS } from '../../../src/data/next-server-laws';
import { NextErrorBoundariesDeclaredLaw as Law } from '../../../src/checkers/next-laws/next-error-boundaries-declared';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { manifest, project, removeProjects } from '../toolkit-fixture';
import { nextApp, nextCtx, withoutTypeScript } from './next-server-fixture';

afterAll(removeProjects);

const COMPLETE = {
  'src/app/layout.tsx': 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n',
  'src/app/not-found.tsx': 'export default function NotFound() { return <p>Not found</p>; }\n',
  'src/app/error.tsx': "'use client';\nexport default function Error() { return <p>Error</p>; }\n",
  'src/app/global-error.tsx': "'use client';\nexport default function GlobalError() {\n  return (\n    <html>\n      <body><p>Error</p></body>\n    </html>\n  );\n}\n",
};
const run = (files: Record<string, string>) => Law.check(nextCtx(nextApp(files)));

describe('NextErrorBoundariesDeclaredLaw', () => {
  it('green: all three, as Next documents them', () => {
    expect(run(COMPLETE).violations).toEqual([]);
  });

  it('red: each missing file is named', () => {
    const result = run({ 'src/app/layout.tsx': COMPLETE['src/app/layout.tsx'] });
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app: no not-found\.tsx/),
      expect.stringMatching(/^src\/app: no error\.tsx/),
      expect.stringMatching(/^src\/app: no global-error\.tsx/),
    ]);
  });

  it("red: error without 'use client'; global-error without <html>/<body>", () => {
    const result = run({
      ...COMPLETE,
      'src/app/error.tsx': 'export default function Error() { return <p>Error</p>; }\n',
      'src/app/global-error.tsx': "'use client';\nexport default function GlobalError() { return <div>Error</div>; }\n",
    });
    expect(result.violations).toEqual([
      "src/app/error.tsx: does not open with 'use client' — error boundaries must be Client Components",
      'src/app/global-error.tsx: renders no <html> or <body> — global-error replaces the root layout and must define its own document',
    ]);
  });

  it('control: a .js global-error in app/ is found', () => {
    const files = Object.fromEntries(Object.entries(COMPLETE).map(([k, v]) => [k.replace('src/app/', 'app/').replace('global-error.tsx', 'global-error.js'), v]));
    expect(run(files).violations).toEqual([]);
  });

  it('fails closed when selected but no App Router directory is found', () => {
    const result = run({ 'src/pages/index.tsx': 'export default function Home() { return null; }\n' });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('no App Router directory')]);
  });

  it('fails when the parser cannot be loaded', () => {
    const root = nextApp(COMPLETE);
    const result = withoutTypeScript(() => Law.check(nextCtx(root)));
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app\/error\.tsx: could not load/),
      expect.stringMatching(/^src\/app\/global-error\.tsx: could not load/),
    ]);
  });

  it('is selected with next AND an app directory — not for a Pages-only app', () => {
    const card = NEXT_SERVER_LAWS.find(law => law.checkFunction === 'NextErrorBoundariesDeclaredLaw.check');
    expect(card?.defaultSeverity).toBe('warning');
    expect(lawRequirementsMet(card?.requires, nextApp(COMPLETE))).toBe(true);
    expect(lawRequirementsMet(card?.requires, nextApp({ 'pages/index.tsx': 'export default () => null;\n' }))).toBe(false);
    const monorepo = project({
      'package.json': JSON.stringify({ name: 'ws', workspaces: ['apps/*'] }),
      'apps/web/package.json': manifest({ next: '16.4.6' }),
      'apps/web/src/app/layout.tsx': COMPLETE['src/app/layout.tsx'],
    });
    expect(lawRequirementsMet(card?.requires, monorepo)).toBe(true);
  });
});

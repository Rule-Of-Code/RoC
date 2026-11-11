/**
 * Fixtures for the Next.js client laws: a throwaway Next app (package.json
 * declaring next + react, a tsconfig with the `@/*` alias create-next-app
 * writes) with the given files. TypeScript comes from RoC's own copy, the
 * fallback loadTypeScript uses when the project has none.
 */
import type { LawCheckContext, LawResult } from '../../../src/types';
import { ctx, manifest, project } from '../toolkit-fixture';

export const NEXT_MANIFEST = manifest({ next: '16.4.6', react: '19.3.0', 'react-dom': '19.3.0' });

export const TSCONFIG = JSON.stringify({
  compilerOptions: { jsx: 'react-jsx', moduleResolution: 'bundler', paths: { '@/*': ['./src/*'] } },
});

export const ROOT_LAYOUT = [
  "export const metadata = { title: 'App' };",
  'export default function RootLayout({ children }) {',
  '  return <html lang="en"><body>{children}</body></html>;',
  '}',
].join('\n');

export const PAGE = 'export default function Page() { return <main>hi</main>; }';

/** A Next app with a root layout under src/app and the given files on top. */
export function nextApp(files: Record<string, string>, base: Record<string, string> = {}): string {
  return project({
    'package.json': NEXT_MANIFEST,
    'tsconfig.json': TSCONFIG,
    'src/app/layout.tsx': ROOT_LAYOUT,
    ...base,
    ...files,
  });
}

export const nextCtx = (
  files: Record<string, string>,
  thresholds: Record<string, unknown> = {}
): LawCheckContext => ctx(nextApp(files), { thresholds: { next: thresholds } });

export interface Law {
  check(context: LawCheckContext): LawResult;
}

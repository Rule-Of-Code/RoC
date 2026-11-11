/**
 * Fixtures for the Next server laws: a throwaway Next app (package.json
 * declaring next, a tsconfig with the `@/*` alias create-next-app writes) and
 * stand-in packages under node_modules so imports of `next/*` and `react`
 * resolve the way they do in an installed project.
 */
import * as tsxSource from '../../../src/utils/react/tsx-source';
import type { LawCheckContext } from '../../../src/types';
import { ctx, manifest, project } from '../toolkit-fixture';

export const NEXT_DEPENDENCIES = { next: '16.4.6', react: '19.3.0', 'react-dom': '19.3.0' };

const TSCONFIG = JSON.stringify({
  compilerOptions: {
    target: 'ES2017',
    module: 'esnext',
    moduleResolution: 'bundler',
    jsx: 'react-jsx',
    allowJs: true,
    strict: true,
    paths: { '@/*': ['./src/*'] },
  },
});

/** Packages an installed Next app resolves: next/*, react, and the server-only marker. */
export const INSTALLED: Record<string, string> = {
  'node_modules/next/package.json': JSON.stringify({ name: 'next', version: '16.4.6' }),
  'node_modules/next/link.js': 'module.exports = {};',
  'node_modules/next/link.d.ts': 'declare const Link: unknown; export default Link;',
  'node_modules/next/server.js': 'module.exports = {};',
  'node_modules/next/server.d.ts': 'export declare const NextResponse: unknown;',
  'node_modules/react/package.json': JSON.stringify({ name: 'react', version: '19.3.0', main: 'index.js' }),
  'node_modules/react/index.js': 'module.exports = {};',
  'node_modules/pg/package.json': JSON.stringify({ name: 'pg', version: '8.0.0', main: 'index.js' }),
  'node_modules/pg/index.js': 'module.exports = {};',
};

/** A single-package Next app with the given files (paths relative to the app root). */
export function nextApp(files: Record<string, string>, dependencies: Record<string, string> = NEXT_DEPENDENCIES): string {
  return project({ 'package.json': manifest(dependencies), 'tsconfig.json': TSCONFIG, ...INSTALLED, ...files });
}

/** A context whose config carries `thresholds.next` / `thresholds.clientIp`. */
export function nextCtx(
  root: string,
  next?: Record<string, unknown>,
  clientIp?: Record<string, unknown>
): LawCheckContext {
  return ctx(root, { thresholds: { ...(next ? { next } : {}), ...(clientIp ? { clientIp } : {}) } });
}

/** Run `body` with the project's TypeScript unavailable, as in a project that has none. */
export function withoutTypeScript<T>(body: () => T): T {
  const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
  try {
    return body();
  } finally {
    spy.mockRestore();
  }
}

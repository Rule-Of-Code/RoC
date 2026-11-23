/**
 * #427 (QA fixture p478-tsstrict-extends) — without `typescript`, TypeScript
 * Strict Mode read tsconfig.json alone: a project whose strict flags live in
 * the base config (`extends`) got 14 "must be enabled" findings, all false,
 * and no note. The chain is now read as JSONC without the compiler —
 * relative paths and packages in node_modules, an `extends` array, later
 * entries over earlier — and a link that cannot be read is named, with the
 * flags it may set not judged.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { TypeScriptStrictLaw } from '../../src/checkers/sacred-laws/typescript-strict';
import { ConfigLoader } from '../../src/config/loader';
import * as tsxSource from '../../src/utils/react/tsx-source';

jest.mock('../../src/utils/react/tsx-source', () => {
  const actual = jest.requireActual('../../src/utils/react/tsx-source');
  return { ...actual, loadTypeScript: jest.fn(actual.loadTypeScript) };
});
const loadTypeScript = tsxSource.loadTypeScript as jest.MockedFunction<
  typeof tsxSource.loadTypeScript
>;
beforeEach(() => loadTypeScript.mockReturnValue(null));

const dirs: string[] = [];
afterAll(() =>
  dirs.forEach(d => fs.rmSync(d, { recursive: true, force: true }))
);
const project = (files: Record<string, unknown>): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-tsextends-'));
  dirs.push(dir);
  for (const [rel, value] of Object.entries({
    'package.json': { name: 'lib', version: '1.0.0' },
    ...files,
  })) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(
      path.join(dir, rel),
      typeof value === 'string' ? value : JSON.stringify(value)
    );
  }
  return dir;
};
const findings = (dir: string): string[] =>
  (
    TypeScriptStrictLaw.check({
      projectRoot: dir,
      config: ConfigLoader.load(dir),
    } as never) as { violations?: string[] }
  ).violations ?? [];
/** What the law says it could not read (#453: no longer among the findings). */
const notRead = (dir: string): string[] =>
  (
    TypeScriptStrictLaw.check({
      projectRoot: dir,
      config: ConfigLoader.load(dir),
    } as never) as { notRead?: string[] }
  ).notRead ?? [];

/** Everything this law asks for — set in a base config. */
const FULL = {
  strict: true,
  noImplicitReturns: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  exactOptionalPropertyTypes: true,
  noImplicitOverride: true,
  noPropertyAccessFromIndexSignature: true,
  noUncheckedIndexedAccess: true,
  target: 'ES2022',
  moduleResolution: 'bundler',
  sourceMap: true,
};

describe('TypeScript Strict without typescript reads the extends chain', () => {
  it('the flags in a relative base config (QA p478-tsstrict-extends): no finding', () => {
    const dir = project({
      'tsconfig.base.json': { compilerOptions: FULL },
      'tsconfig.json': { extends: './tsconfig.base.json' },
    });
    expect(findings(dir)).toEqual([]);
  });

  it('a base with comments and trailing commas (JSONC): read', () => {
    const dir = project({
      'tsconfig.base.json': `{\n  // the base\n  "compilerOptions": ${JSON.stringify(FULL).replace(/}$/, ',}')},\n}\n`,
      'tsconfig.json': { extends: './tsconfig.base' },
    });
    expect(findings(dir)).toEqual([]);
  });

  it('a package in node_modules (@tsconfig/strictest-like): read', () => {
    const dir = project({
      'node_modules/@acme/tsconfig/tsconfig.json': { compilerOptions: FULL },
      'tsconfig.json': { extends: '@acme/tsconfig' },
    });
    expect(findings(dir)).toEqual([]);
  });

  it('an extends array: later entries override earlier ones', () => {
    const dir = project({
      'a.json': { compilerOptions: { ...FULL, noUnusedLocals: false } },
      'b.json': { compilerOptions: { noUnusedLocals: true } },
      'tsconfig.json': { extends: ['./a.json', './b.json'] },
    });
    expect(findings(dir)).toEqual([]);
  });

  it('the file overrides its base: an explicit false is still a finding', () => {
    const dir = project({
      'tsconfig.base.json': { compilerOptions: FULL },
      'tsconfig.json': {
        extends: './tsconfig.base.json',
        compilerOptions: { noUnusedLocals: false },
      },
    });
    expect(findings(dir)).toEqual(['TypeScript noUnusedLocals must be true']);
  });

  it('a link that cannot be read: named, and no "must be enabled" for flags it may set', () => {
    const dir = project({
      'tsconfig.json': {
        extends: '@missing/tsconfig',
        compilerOptions: { noUnusedLocals: false },
      },
    });
    const out = findings(dir);
    expect(notRead(dir).join('\n')).toContain(
      'tsconfig.json extends "@missing/tsconfig", which could not be read — the inherited compiler options were NOT read'
    );
    expect(out).not.toContain('TypeScript strict mode must be enabled');
    // set to false in the file that was read: still judged
    expect(out).toContain('TypeScript noUnusedLocals must be true');
  });

  it('a cycle (a extends b extends a): read once, no hang', () => {
    const dir = project({
      'a.json': { extends: './b.json', compilerOptions: FULL },
      'b.json': { extends: './a.json' },
      'tsconfig.json': { extends: './a.json' },
    });
    expect(findings(dir)).toEqual([]);
  });

  it('no extends: judged from tsconfig.json, as before', () => {
    const dir = project({ 'tsconfig.json': { compilerOptions: {} } });
    expect(findings(dir)).toContain('TypeScript strict mode must be enabled');
  });
});

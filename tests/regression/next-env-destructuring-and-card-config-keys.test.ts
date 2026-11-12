/**
 * Two defects from the 7.26.1 pre-publish review.
 *
 * #309 Next Client Env Public Only saw `process.env.X` and `process.env['X']`
 *      but not `const { X } = process.env` — the same read, destructured, in
 *      a 'use client' file passed, and the card did not say so.
 * #313 Cards omitted config that changes the verdict: React Dangerous HTML
 *      Guarded reads thresholds.react.jsonSerializers and its card never named
 *      it; Tsconfig Exclude Leaves Code Untyped does not honour ignores and its
 *      card did not say that.
 */
import * as fs from 'fs';
import * as path from 'path';
import { NextClientEnvPublicOnlyLaw } from '../../src/checkers/next-laws/next-client-env-public-only';
import { NextPublicEnvIsBuildTimeLaw } from '../../src/checkers/next-laws/next-public-env-is-build-time';
import { TsconfigExcludeLeavesCodeUntypedLaw } from '../../src/checkers/integrity-laws/tsconfig-exclude-leaves-code-untyped';
import { INTEGRITY_LAWS } from '../../src/data/integrity-laws';
import { NEXT_CLIENT_LAWS } from '../../src/data/next-client-laws';
import { NEXT_SERVER_LAWS } from '../../src/data/next-server-laws';
import { REACT_LAWS } from '../../src/data/react-laws';
import { REACT_SECURITY_LAWS } from '../../src/data/react-security-laws';
import { TEST_INTEGRITY_LAWS } from '../../src/data/test-integrity-laws';
import type { EnhancedConstitutionalLaw } from '../../src/types/enhanced-law.types';
import { ctx, removeProjects } from '../checkers/toolkit-fixture';
import { gitProject } from '../checkers/integrity-laws/integrity-fixture';
import { nextApp, nextCtx } from '../checkers/next-laws/next-server-fixture';

afterAll(removeProjects);

const clientEnv = (files: Record<string, string>) => NextClientEnvPublicOnlyLaw.check(nextCtx(nextApp(files))).violations ?? [];
const buildTime = (files: Record<string, string>) =>
  NextPublicEnvIsBuildTimeLaw.check(nextCtx(nextApp(files), { publicEnvBuildSource: 'the hosting dashboard' })).violations ?? [];

describe('#309: a name destructured from process.env is a read', () => {
  it('red: the issue repro — C (destructured) is reported like D (member access)', () => {
    const violations = clientEnv({
      'app/C.tsx': "'use client';\nconst { SECRET_KEY } = process.env;\nexport function C() {\n  return <p>{SECRET_KEY}</p>;\n}\n",
      'app/D.tsx': "'use client';\nexport function D() {\n  return <p>{process.env.SECRET_KEY}</p>;\n}\n",
    });
    expect(violations).toEqual([
      expect.stringMatching(
        /^app\/C\.tsx:2: SECRET_KEY \(destructured from process\.env\) is read in browser code \(through app\/C\.tsx\) — Next does not inline a destructured read, so it is undefined there\./
      ),
      expect.stringMatching(/^app\/D\.tsx:3: process\.env\.SECRET_KEY is read in browser code \(through app\/D\.tsx\) — Next replaces it with an empty string there\./),
    ]);
  });

  it('red: a renamed binding, a default, the assignment form and an `as` cast, in a module the client imports', () => {
    const violations = clientEnv({
      'app/C.tsx': "'use client';\nimport { conf } from '../lib/conf';\nexport const C = () => <p>{String(conf())}</p>;\n",
      'lib/conf.ts': [
        "const { API_URL: url, 'TOKEN': token = '' } = process.env as Record<string, string>;",
        'let flag: string | undefined;',
        '({ FLAG: flag } = process.env);',
        'export const conf = () => [url, token, flag];',
        '',
      ].join('\n'),
    });
    expect(violations).toEqual([
      expect.stringContaining('lib/conf.ts:1: API_URL (destructured from process.env) is read in browser code (through app/C.tsx → lib/conf.ts)'),
      expect.stringContaining('lib/conf.ts:1: TOKEN (destructured from process.env) is read in browser code'),
      expect.stringContaining('lib/conf.ts:3: FLAG (destructured from process.env) is read in browser code'),
    ]);
  });

  it('control: destructured NEXT_PUBLIC_*, NODE_ENV and a rest element are not this law (no secret name)', () => {
    const violations = clientEnv({
      'app/C.tsx': "'use client';\nconst { NEXT_PUBLIC_A, NODE_ENV, ...others } = process.env;\nexport const C = () => <p>{NEXT_PUBLIC_A}{NODE_ENV}{String(others)}</p>;\n",
    });
    expect(violations).toEqual([]);
  });

  it('control: a Server Component may destructure any variable', () => {
    expect(clientEnv({ 'app/page.tsx': 'const { DATABASE_URL } = process.env;\nexport default function P() { return <p>{DATABASE_URL}</p>; }\n' })).toEqual([]);
  });

  it('Next Public Env Is Build Time rule 2 names each destructured name and the rest element (never inlined)', () => {
    const violations = buildTime({
      'app/C.tsx': "'use client';\nconst { NEXT_PUBLIC_A, ...others } = process.env;\nexport const C = () => <p>{NEXT_PUBLIC_A}{String(others)}</p>;\n",
    });
    expect(violations).toEqual([
      expect.stringMatching(/^app\/C\.tsx:2: NEXT_PUBLIC_A \(destructured from process\.env\) — computed, destructured or whole-object process\.env in browser code is never inlined/),
      expect.stringMatching(/^app\/C\.tsx:2: \.\.\.others \(destructured from process\.env\) — computed, destructured or whole-object/),
    ]);
  });

  it('control: a destructured NEXT_PUBLIC_ name is not one the build must declare (it is never inlined)', () => {
    const violations = NextPublicEnvIsBuildTimeLaw.check(
      nextCtx(nextApp({ 'app/page.tsx': 'const { NEXT_PUBLIC_Z } = process.env;\nexport default function P() { return <p>{NEXT_PUBLIC_Z}</p>; }\n' }))
    ).violations;
    expect(violations).toEqual([]);
  });

  it('the card says what is seen and what is not', () => {
    const card = NEXT_SERVER_LAWS.find(law => law.title === 'Next Client Env Public Only') as EnhancedConstitutionalLaw;
    expect(card.detectionLimits?.join(' ')).toMatch(/destructured from process\.env/);
    expect(card.detectionLimits?.join(' ')).toMatch(/const env = process\.env; const \{ X \} = env\), is not seen/);
  });
});

/** Every `thresholds.<block>.<key>` a checker names, in code or in its own messages. */
function thresholdKeys(source: string): string[] {
  const keys = new Set<string>();
  for (const match of source.matchAll(/thresholds\??\.(\w+)\??\.(\w+)/g)) keys.add(`thresholds.${match[1]}.${match[2]}`);
  for (const match of source.matchAll(/nextThresholds\(context\)\.(\w+)/g)) keys.add(`thresholds.next.${match[1]}`);
  return [...keys];
}

function checkerSource(checkFunction: string): string {
  const className = checkFunction.replace(/\.check$/, '');
  const roots = ['src/checkers'];
  while (roots.length > 0) {
    const dir = roots.pop() as string;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) roots.push(full);
      else if (entry.name.endsWith('.ts')) {
        const text = fs.readFileSync(full, 'utf8');
        if (new RegExp(`export class ${className}\\b`).test(text)) return text;
      }
    }
  }
  throw new Error(`no checker declares ${className}`);
}

describe('#313: a card names every config key that changes its verdict', () => {
  const cards = [
    ...NEXT_CLIENT_LAWS,
    ...NEXT_SERVER_LAWS,
    ...REACT_LAWS,
    ...REACT_SECURITY_LAWS,
    ...TEST_INTEGRITY_LAWS.filter(card => card.title === 'No Test-Only Leakage'),
  ];

  it('red before #313: React Dangerous HTML Guarded names thresholds.react.jsonSerializers', () => {
    const card = REACT_SECURITY_LAWS.find(law => law.title === 'React Dangerous HTML Guarded') as EnhancedConstitutionalLaw;
    expect(JSON.stringify(card)).toContain('thresholds.react.jsonSerializers');
  });

  it.each(cards.map(card => [card.title, card] as const))('%s: every thresholds key its checker reads is on the card', (_title, card) => {
    const keys = thresholdKeys(checkerSource(card.checkFunction as string));
    const text = JSON.stringify(card);
    expect(keys.filter(key => !text.includes(key))).toEqual([]);
  });

  it('the sweep is not vacuous: it finds the keys of the laws that read config', () => {
    const read = cards.flatMap(card => thresholdKeys(checkerSource(card.checkFunction as string)));
    expect(read).toEqual(expect.arrayContaining(['thresholds.react.jsonSerializers', 'thresholds.next.heavyClientLibraries', 'thresholds.testing.testOnlyPaths']));
  });

  it('Tsconfig Exclude Leaves Code Untyped: the card says ignores do not apply and how to waive it', () => {
    const card = INTEGRITY_LAWS.find(law => law.title === 'Tsconfig Exclude Leaves Code Untyped') as EnhancedConstitutionalLaw;
    const limits = card.detectionLimits?.join(' ') ?? '';
    expect(limits).toMatch(/ignores\.global and ignores\.byRule do not apply/);
    expect(limits).toMatch(/laws\.notApplicable/);
  });

  it('…and that is what the law does: an ignored jest.config.cts excluded by a tsconfig is still reported', () => {
    const root = gitProject({
      'tsconfig.json': JSON.stringify({ include: ['src/**/*.ts'], exclude: ['jest.config.cts'] }),
      'src/a.ts': 'export const a = 1;\n',
      'jest.config.cts': 'module.exports = {};\n',
    });
    const ignores = { global: ['**/jest.config.cts'], byRule: { 'tsconfig-exclude-leaves-code-untyped': ['**/jest.config.cts'] } };
    const result = TsconfigExcludeLeavesCodeUntypedLaw.check(ctx(root, { ignores } as never));
    expect(result.violations).toEqual([expect.stringContaining('exclude "jest.config.cts" leaves 1 TypeScript file(s) in no tsconfig (jest.config.cts)')]);
  });
});

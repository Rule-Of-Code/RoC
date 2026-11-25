/**
 * #640: TypeScript Strict Mode and Zero Tolerance Doctrine judged the root
 * tsconfig.json alone; `references` was read nowhere.
 *
 * (a) A solution-style root — `files: []` and `references`, no compiler
 *     options (the shape Vite templates use) — compiles nothing, so every
 *     strict flag was reported while the strict referenced projects were never
 *     read. It is followed, not judged.
 * (b) A strict root passed although a project it references, which `tsc -b`
 *     builds, is not strict. Every referenced project is judged now, through
 *     nested references, each file once. A config for tests is judged with the
 *     same flags and its findings say "(test config)".
 *
 * A reference that is missing or does not parse is in notRead.
 */
import { TypeScriptStrictLaw } from '../../src/checkers/sacred-laws/typescript-strict';
import { ZeroToleranceLaw } from '../../src/checkers/sacred-laws/zero-tolerance';
import type { LawResult } from '../../src/types/law.types';
import { json, useTempProject } from './foreign-json-486.helpers';

const project = useTempProject();
const { write } = project;

/** Every flag TypeScript Strict Mode asks for. */
const STRICT = {
  strict: true,
  noImplicitAny: true,
  noImplicitReturns: true,
  noImplicitThis: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  exactOptionalPropertyTypes: true,
  noImplicitOverride: true,
  noUncheckedIndexedAccess: true,
  target: 'ES2022',
  moduleResolution: 'bundler',
};
const LOOSE = { ...STRICT, strict: false, noImplicitAny: false };

const SOLUTION = json({
  files: [],
  references: [{ path: './tsconfig.app.json' }],
});

const strictLaw = (): LawResult => TypeScriptStrictLaw.check(project.context());
const zeroLaw = (): LawResult => ZeroToleranceLaw.check(project.context());

beforeEach(() => {
  write('.eslintrc.json', json({ rules: {} }));
});

describe('#640 (a): a solution-style root is judged by its referenced projects', () => {
  it('control: a strict tsconfig.json without references passes both laws', () => {
    write('tsconfig.json', json({ compilerOptions: STRICT }));
    expect(strictLaw().violations).toEqual([]);
    expect(strictLaw().passed).toBe(true);
    expect(zeroLaw().violations).toEqual([]);
    expect(zeroLaw().passed).toBe(true);
  });

  it('files: [] + references to a strict project: both laws pass', () => {
    write('tsconfig.json', SOLUTION);
    write('tsconfig.app.json', json({ compilerOptions: STRICT }));
    expect(strictLaw().violations).toEqual([]);
    expect(strictLaw().passed).toBe(true);
    expect(zeroLaw().violations).toEqual([]);
    expect(zeroLaw().passed).toBe(true);
  });

  it('files: [] + references to a strict: false project: findings name that file', () => {
    write('tsconfig.json', SOLUTION);
    write('tsconfig.app.json', json({ compilerOptions: LOOSE }));
    expect(strictLaw().violations).toEqual([
      'tsconfig.app.json: TypeScript strict mode must be enabled',
      'tsconfig.app.json: TypeScript noImplicitAny must be true',
    ]);
    expect(zeroLaw().violations).toEqual([
      'tsconfig.app.json: TypeScript strict mode not enabled',
      'tsconfig.app.json: TypeScript noImplicitAny not enabled',
    ]);
    expect(zeroLaw().suggestions).toContain('Enable TypeScript strict mode');
  });

  it('every referenced project is judged, a directory reference through its tsconfig.json', () => {
    write(
      'tsconfig.json',
      json({
        files: [],
        references: [{ path: './tsconfig.app.json' }, { path: './tools' }],
      })
    );
    write('tsconfig.app.json', json({ compilerOptions: STRICT }));
    write('tools/tsconfig.json', json({ compilerOptions: LOOSE }));
    expect(zeroLaw().violations).toEqual([
      'tools/tsconfig.json: TypeScript strict mode not enabled',
      'tools/tsconfig.json: TypeScript noImplicitAny not enabled',
    ]);
  });

  it('a referenced solution-style tsconfig is followed to its own references', () => {
    write(
      'tsconfig.json',
      json({ files: [], references: [{ path: './packages/web' }] })
    );
    write(
      'packages/web/tsconfig.json',
      json({ files: [], references: [{ path: './tsconfig.app.json' }] })
    );
    write('packages/web/tsconfig.app.json', json({ compilerOptions: STRICT }));
    expect(strictLaw().violations).toEqual([]);
    expect(zeroLaw().violations).toEqual([]);
    expect(zeroLaw().passed).toBe(true);
  });

  it('a reference that is missing or does not parse is NOT read: notRead, no finding, no pass', () => {
    write(
      'tsconfig.json',
      json({
        files: [],
        references: [
          { path: './tsconfig.app.json' },
          { path: './tsconfig.node.json' },
        ],
      })
    );
    write('tsconfig.app.json', '{ "compilerOptions": { ');
    for (const result of [strictLaw(), zeroLaw()]) {
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(false);
      expect(result.notRead).toEqual([
        expect.stringMatching(
          /^tsconfig\.app\.json \(referenced by tsconfig\.json\) .* its compiler options were NOT read$/
        ),
        'tsconfig.json references "./tsconfig.node.json", which was not found — its compiler options were NOT read',
      ]);
    }
  });

  it('a root that extends a strict base is judged by what it inherits, and its references too', () => {
    write('tsconfig.base.json', json({ compilerOptions: STRICT }));
    write(
      'tsconfig.json',
      json({
        extends: './tsconfig.base.json',
        files: [],
        references: [{ path: './tsconfig.app.json' }],
      })
    );
    write('tsconfig.app.json', json({ compilerOptions: LOOSE }));
    expect(zeroLaw().violations).toEqual([
      'tsconfig.app.json: TypeScript strict mode not enabled',
      'tsconfig.app.json: TypeScript noImplicitAny not enabled',
    ]);
  });
});

describe('#640 (b): projects a root with options references are judged too', () => {
  it('a strict root with references to a strict: false project: the referenced project is reported', () => {
    write(
      'tsconfig.json',
      json({
        compilerOptions: STRICT,
        references: [{ path: './tsconfig.app.json' }],
      })
    );
    write('tsconfig.app.json', json({ compilerOptions: LOOSE }));
    expect(strictLaw().violations).toEqual([
      'tsconfig.app.json: TypeScript strict mode must be enabled',
      'tsconfig.app.json: TypeScript noImplicitAny must be true',
    ]);
    expect(zeroLaw().violations).toEqual([
      'tsconfig.app.json: TypeScript strict mode not enabled',
      'tsconfig.app.json: TypeScript noImplicitAny not enabled',
    ]);
  });

  it('a loose root and a loose referenced project: each finding names the file that set the flag', () => {
    write(
      'tsconfig.json',
      json({
        compilerOptions: LOOSE,
        references: [{ path: './tsconfig.app.json' }],
      })
    );
    write('tsconfig.app.json', json({ compilerOptions: LOOSE }));
    expect(zeroLaw().violations).toEqual([
      'tsconfig.json: TypeScript strict mode not enabled',
      'tsconfig.json: TypeScript noImplicitAny not enabled',
      'tsconfig.app.json: TypeScript strict mode not enabled',
      'tsconfig.app.json: TypeScript noImplicitAny not enabled',
    ]);
  });

  it('a config for tests is judged and marked, by its name or by an include of tests only', () => {
    write(
      'tsconfig.json',
      json({
        files: [],
        references: [
          { path: './tsconfig.app.json' },
          { path: './tsconfig.spec.json' },
          { path: './tsconfig.unit.json' },
        ],
      })
    );
    write('tsconfig.app.json', json({ compilerOptions: STRICT }));
    write('tsconfig.spec.json', json({ compilerOptions: LOOSE }));
    write(
      'tsconfig.unit.json',
      json({
        compilerOptions: LOOSE,
        include: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      })
    );
    expect(zeroLaw().violations).toEqual([
      'tsconfig.spec.json (test config): TypeScript strict mode not enabled',
      'tsconfig.spec.json (test config): TypeScript noImplicitAny not enabled',
      'tsconfig.unit.json (test config): TypeScript strict mode not enabled',
      'tsconfig.unit.json (test config): TypeScript noImplicitAny not enabled',
    ]);
    expect(zeroLaw().suggestions).toContain('Enable TypeScript strict mode');
    expect(strictLaw().violations).toEqual([
      'tsconfig.spec.json (test config): TypeScript strict mode must be enabled',
      'tsconfig.spec.json (test config): TypeScript noImplicitAny must be true',
      'tsconfig.unit.json (test config): TypeScript strict mode must be enabled',
      'tsconfig.unit.json (test config): TypeScript noImplicitAny must be true',
    ]);
  });

  it('control: a config that includes sources and tests is a production config', () => {
    write(
      'tsconfig.json',
      json({ files: [], references: [{ path: './tsconfig.app.json' }] })
    );
    write(
      'tsconfig.app.json',
      json({
        compilerOptions: LOOSE,
        include: ['src/**/*.ts', 'src/**/*.spec.ts'],
      })
    );
    expect(zeroLaw().violations).toEqual([
      'tsconfig.app.json: TypeScript strict mode not enabled',
      'tsconfig.app.json: TypeScript noImplicitAny not enabled',
    ]);
  });

  it('a cycle of references ends: each file is judged once', () => {
    write(
      'tsconfig.json',
      json({
        compilerOptions: STRICT,
        references: [{ path: './packages/a' }],
      })
    );
    write(
      'packages/a/tsconfig.json',
      json({
        compilerOptions: LOOSE,
        references: [{ path: '../b' }],
      })
    );
    write(
      'packages/b/tsconfig.json',
      json({
        compilerOptions: STRICT,
        references: [{ path: '../a' }, { path: '../..' }],
      })
    );
    expect(zeroLaw().violations).toEqual([
      'packages/a/tsconfig.json: TypeScript strict mode not enabled',
      'packages/a/tsconfig.json: TypeScript noImplicitAny not enabled',
    ]);
  });
});

describe('#640 a flag inherited from a base is one finding, on the base (QA on #658)', () => {
  /** An Nx workspace: a base, a root that compiles nothing, three projects. */
  const nx = (base: Record<string, unknown>): void => {
    write('tsconfig.base.json', json({ compilerOptions: base }));
    write(
      'tsconfig.json',
      json({
        extends: './tsconfig.base.json',
        compileOnSave: false,
        files: [],
        include: [],
        references: [
          { path: './apps/shop' },
          { path: './libs/ui' },
          { path: './apps/shop-e2e' },
        ],
      })
    );
    for (const dir of ['apps/shop', 'libs/ui']) {
      write(
        `${dir}/tsconfig.json`,
        json({
          extends: '../../tsconfig.base.json',
          files: [],
          include: [],
          references: [
            { path: './tsconfig.app.json' },
            { path: './tsconfig.spec.json' },
          ],
        })
      );
      write(
        `${dir}/tsconfig.app.json`,
        json({ extends: './tsconfig.json', include: ['src/**/*.ts'] })
      );
      write(
        `${dir}/tsconfig.spec.json`,
        json({
          extends: './tsconfig.json',
          include: ['src/**/*.spec.ts'],
        })
      );
    }
    write(
      'apps/shop-e2e/tsconfig.json',
      json({
        extends: '../../tsconfig.base.json',
        include: ['**/*.ts', 'src/**/*.spec.ts'],
      })
    );
  };

  it('a flag missing from the base: one finding per flag, on tsconfig.base.json', () => {
    nx({ ...STRICT, strict: undefined, noImplicitAny: undefined });
    expect(zeroLaw().violations).toEqual([
      'tsconfig.base.json: TypeScript strict mode not enabled',
      'tsconfig.base.json: TypeScript noImplicitAny not enabled',
    ]);
    expect(strictLaw().violations).toEqual([
      'tsconfig.base.json: TypeScript strict mode must be enabled',
      'tsconfig.base.json: TypeScript noImplicitAny must be true',
    ]);
  });

  it('files: [] + include: [] that extends a loose base is followed, not judged', () => {
    // The root compiles nothing; the project it references is strict and
    // does not extend the loose base. Judged, the root gave findings.
    write('tsconfig.base.json', json({ compilerOptions: LOOSE }));
    write(
      'tsconfig.json',
      json({
        extends: './tsconfig.base.json',
        files: [],
        include: [],
        references: [{ path: './tsconfig.app.json' }],
      })
    );
    write('tsconfig.app.json', json({ compilerOptions: STRICT }));
    expect(strictLaw().violations).toEqual([]);
    expect(zeroLaw().violations).toEqual([]);
  });

  it("a test config's own weaker value is its own finding, marked", () => {
    nx(STRICT);
    write(
      'libs/ui/tsconfig.spec.json',
      json({
        extends: './tsconfig.json',
        include: ['src/**/*.spec.ts'],
        compilerOptions: { strict: false, noImplicitAny: false },
      })
    );
    expect(zeroLaw().violations).toEqual([
      'libs/ui/tsconfig.spec.json (test config): TypeScript strict mode not enabled',
      'libs/ui/tsconfig.spec.json (test config): TypeScript noImplicitAny not enabled',
    ]);
  });

  it('an e2e project directory (`<app>-e2e`) is a test config', () => {
    nx(STRICT);
    write(
      'apps/shop-e2e/tsconfig.json',
      json({
        extends: '../../tsconfig.base.json',
        include: ['**/*.ts', 'src/**/*.spec.ts'],
        compilerOptions: { strict: false, noImplicitAny: false },
      })
    );
    expect(zeroLaw().violations).toEqual([
      'apps/shop-e2e/tsconfig.json (test config): TypeScript strict mode not enabled',
      'apps/shop-e2e/tsconfig.json (test config): TypeScript noImplicitAny not enabled',
    ]);
  });
});

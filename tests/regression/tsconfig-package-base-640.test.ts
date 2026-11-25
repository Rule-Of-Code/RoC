/**
 * #640, QA on vite-vue-ts — `tsconfig.app.json` extends a base from a package
 * (`@vue/tsconfig/tsconfig.dom.json`). A finding about a flag the chain left
 * out, or one the package set too weak, named the file in node_modules —
 * a file the project cannot edit. It goes to the last file of the chain
 * outside node_modules, where the fix belongs; a value the package set is
 * named: "(inherited from @vue/tsconfig: false)".
 */
import { TypeScriptStrictLaw } from '../../src/checkers/sacred-laws/typescript-strict';
import { ZeroToleranceLaw } from '../../src/checkers/sacred-laws/zero-tolerance';
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

/** A Vite vue-ts app whose app config extends a package base. */
function viteVue(packageBase: Record<string, unknown>): void {
  write('.eslintrc.json', json({ rules: {} }));
  write(
    'tsconfig.json',
    json({ files: [], references: [{ path: './tsconfig.app.json' }] })
  );
  write(
    'tsconfig.app.json',
    json({
      extends: '@vue/tsconfig/tsconfig.dom.json',
      include: ['src/**/*.ts', 'src/**/*.vue'],
    })
  );
  write(
    'node_modules/@vue/tsconfig/tsconfig.dom.json',
    json({ extends: './tsconfig.json', compilerOptions: { lib: ['DOM'] } })
  );
  write(
    'node_modules/@vue/tsconfig/tsconfig.json',
    json({ compilerOptions: packageBase })
  );
}

describe('#640 a package base: the finding goes where the project can fix it', () => {
  it('a flag the whole chain leaves out: on tsconfig.app.json, not in node_modules', () => {
    const { noImplicitReturns: _left, ...rest } = STRICT;
    viteVue(rest);
    expect(TypeScriptStrictLaw.check(project.context()).violations).toEqual([
      'tsconfig.app.json: TypeScript noImplicitReturns must be true',
    ]);
  });

  it('a flag the package sets too weak: on tsconfig.app.json, naming the package value', () => {
    viteVue({ ...STRICT, strict: false });
    expect(ZeroToleranceLaw.check(project.context()).violations).toEqual([
      'tsconfig.app.json (inherited from @vue/tsconfig: false): TypeScript strict mode not enabled',
    ]);
  });

  it('control: the app config overrides the package — judged on its own value, no package named', () => {
    viteVue({ ...STRICT, strict: false });
    write(
      'tsconfig.app.json',
      json({
        extends: '@vue/tsconfig/tsconfig.dom.json',
        include: ['src/**/*.ts'],
        compilerOptions: { strict: true },
      })
    );
    expect(ZeroToleranceLaw.check(project.context()).violations).toEqual([]);
  });

  it('control: an own base between the app and the package takes the finding', () => {
    viteVue({ ...STRICT, strict: false });
    write(
      'tsconfig.base.json',
      json({ extends: '@vue/tsconfig/tsconfig.dom.json' })
    );
    write(
      'tsconfig.app.json',
      json({ extends: './tsconfig.base.json', include: ['src/**/*.ts'] })
    );
    expect(ZeroToleranceLaw.check(project.context()).violations).toEqual([
      'tsconfig.base.json (inherited from @vue/tsconfig: false): TypeScript strict mode not enabled',
    ]);
  });
});

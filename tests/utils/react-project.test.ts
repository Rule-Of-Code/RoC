/**
 * The shared React/Next reading: TSX parsed by the compiler (not a regex), the
 * parser resolved from the project and reported — never silently skipped —
 * when absent, test files in every spelling kept out of source, and Next apps
 * found by the manifest that declares `next`.
 */
import { REQUIRES_NEXT, REQUIRES_REACT } from '../../src/utils/framework-requirements';
import { lawRequirementsMet } from '../../src/utils/law-requirements';
import { ReactProject, REACT_TEST_FILE } from '../../src/utils/react/react-project';
import {
  jsxAttribute,
  loadTypeScript,
  parserUnavailable,
  TsxSource,
} from '../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const ts = loadTypeScript(process.cwd());

function only<T>(items: readonly T[]): T {
  expect(items).toHaveLength(1);
  return items[0] as T;
}

const parse = (text: string, file = 'x.tsx'): TsxSource => {
  if (!ts) throw new Error('typescript must resolve in the RoC repository');
  return TsxSource.parse(ts, file, text);
};

describe('loadTypeScript', () => {
  it('resolves a compiler in this repository', () => {
    expect(ts).not.toBeNull();
    expect(typeof ts?.createSourceFile).toBe('function');
  });

  it('names the project and the fix when it cannot', () => {
    expect(parserUnavailable('/p')).toMatch(/could not load the 'typescript' package from \/p — the \.tsx\/\.jsx files were NOT read/);
  });
});

describe('TsxSource.jsxElements', () => {
  it('reads a multi-line element with every attribute kind', () => {
    const source = parse(
      [
        'export const A = () => (',
        '  <button',
        '    type="submit"',
        '    disabled',
        "    onClick={() => go('x')}",
        "    aria-label={'Save'}",
        '  >Save</button>',
        ');',
      ].join('\n')
    );
    const button = only(source.jsxElements());
    expect(button.tag).toBe('button');
    expect(button.line).toBe(2);
    expect(button.selfClosing).toBe(false);
    expect(jsxAttribute(button, 'type')).toEqual({ name: 'type', kind: 'string', value: 'submit' });
    expect(jsxAttribute(button, 'disabled')).toEqual({ name: 'disabled', kind: 'bare', value: '' });
    expect(jsxAttribute(button, 'onClick')).toEqual({
      name: 'onClick',
      kind: 'expression',
      value: "() => go('x')",
    });
    expect(jsxAttribute(button, 'aria-label')?.kind).toBe('string');
  });

  it('marks a spread: what it sets cannot be read from this file', () => {
    const img = only(parse('const I = (p) => <img {...p} alt="" />;').jsxElements());
    expect(img.hasSpread).toBe(true);
    expect(img.selfClosing).toBe(true);
  });

  it('keeps member and dashed tags as written', () => {
    const tags = parse('const X = () => <><motion.div /><ion-input label="a" /></>;')
      .jsxElements()
      .map(element => element.tag);
    expect(tags).toEqual(['motion.div', 'ion-input']);
  });

  it('does not take JSX-looking text in a string or comment for an element', () => {
    const source = parse("// <button>\nconst s = '<img src=x>';\nexport const n = 1;");
    expect(source.jsxElements()).toEqual([]);
  });
});

describe('TsxSource.directives', () => {
  it("reads 'use client' in the prologue", () => {
    expect(parse("'use client';\nimport a from 'a';").directives()).toEqual(['use client']);
  });

  it('ignores a directive-looking string after the first statement', () => {
    expect(parse("import a from 'a';\n'use client';").directives()).toEqual([]);
  });
});

describe('TsxSource.imports', () => {
  it('reads default, named (with aliases), namespace and type-only imports', () => {
    const imports = parse(
      [
        "import React, { useState as useS, type FC } from 'react';",
        "import * as fs from 'fs';",
        "import type { Metadata } from 'next';",
      ].join('\n')
    ).imports();
    expect(imports[0]).toMatchObject({
      module: 'react',
      defaultName: 'React',
      named: [{ imported: 'useState', local: 'useS' }],
      typeOnly: false,
    });
    expect(imports[1]).toMatchObject({ module: 'fs', namespaceName: 'fs' });
    expect(imports[2]).toMatchObject({ module: 'next', typeOnly: true });
  });
});

describe('REACT_TEST_FILE', () => {
  it.each(['a.test.tsx', 'a.spec.jsx', 'a.test.ts', 'a.cy.ts', 'a.e2e.mjs'])('%s is a test', name => {
    expect(REACT_TEST_FILE.test(name)).toBe(true);
  });

  it.each(['Button.tsx', 'testing.tsx', 'contest.ts'])('%s is source', name => {
    expect(REACT_TEST_FILE.test(name)).toBe(false);
  });
});

describe('ReactProject', () => {
  it('scans source and leaves .test.tsx out of it', () => {
    const root = project({
      'package.json': manifest({ react: '19.0.0' }),
      'src/Button.tsx': 'export const B = () => <button type="button" />;',
      'src/Button.test.tsx': 'test("b", () => {});',
    });
    const files = ReactProject.sourceFiles(ctx(root)).map(file => file.replace(/\\/g, '/'));
    expect(files.some(file => file.endsWith('src/Button.tsx'))).toBe(true);
    expect(files.some(file => file.endsWith('Button.test.tsx'))).toBe(false);
  });

  it('parses the files it is given', () => {
    const root = project({ 'src/A.tsx': 'export const A = () => <a href="/x" />;' });
    const context = ctx(root);
    const { sources, unread } = ReactProject.parse(context, ReactProject.sourceFiles(context));
    expect(unread).toEqual([]);
    expect(only(only(sources).jsxElements()).tag).toBe('a');
  });

  it('reports an unopenable file as unread instead of skipping it', () => {
    const root = project({});
    const { sources, unread } = ReactProject.parse(ctx(root), [`${root}/missing.tsx`]);
    expect(sources).toEqual([]);
    expect(unread).toEqual(['missing.tsx: could not be read']);
  });

  it('finds Next apps by the manifest that declares next, with their routers', () => {
    const root = project({
      'package.json': JSON.stringify({ name: 'ws', workspaces: ['apps/*'] }),
      'apps/web/package.json': manifest({ next: '16.0.0', react: '19.0.0' }),
      'apps/web/src/app/page.tsx': 'export default function P() { return null; }',
      'apps/docs/package.json': manifest({ next: '16.0.0' }),
      'apps/docs/pages/index.tsx': 'export default function P() { return null; }',
      'apps/api/package.json': manifest({ express: '5' }),
    });
    const apps = ReactProject.nextApps(root)
      .map(app => ({
        root: app.root.replace(/\\/g, '/').split('/').slice(-2).join('/'),
        app: app.appDirs.length,
        pages: app.pagesDirs.length,
      }))
      .sort((a, b) => a.root.localeCompare(b.root));
    expect(apps).toEqual([
      { root: 'apps/docs', app: 0, pages: 1 },
      { root: 'apps/web', app: 1, pages: 0 },
    ]);
  });
});

describe('framework requirements', () => {
  it('REACT and NEXT are met from an app manifest in a workspace', () => {
    const root = project({
      'package.json': JSON.stringify({ name: 'ws' }),
      'apps/web/package.json': manifest({ next: '16.0.0', react: '19.0.0' }),
    });
    expect(lawRequirementsMet(REQUIRES_REACT, root)).toBe(true);
    expect(lawRequirementsMet(REQUIRES_NEXT, root)).toBe(true);
  });

  it('a Vite React app meets REACT and not NEXT', () => {
    const root = project({ 'package.json': manifest({ react: '19.0.0', vite: '7' }) });
    expect(lawRequirementsMet(REQUIRES_REACT, root)).toBe(true);
    expect(lawRequirementsMet(REQUIRES_NEXT, root)).toBe(false);
  });
});

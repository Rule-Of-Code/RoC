/**
 * internalArray reads the TypeScript node fields the typings do not declare
 * (`parseDiagnostics`, the pre-4.8 `decorators`) with a run-time check instead
 * of an `as unknown as` cast. These tests pin both sides: a real parse error is
 * still reported, and a missing or malformed field reads as none.
 */
import * as ts from 'typescript';
import { parseErrors } from '../../../src/checkers/accessibility-laws/jsx-sources';
import { internalArray, TsxSource } from '../../../src/utils/react/tsx-source';

describe('internalArray', () => {
  it('returns the array a node carries under the name', () => {
    const node = { decorators: ['a', 'b'] };
    expect(internalArray<string>(node, 'decorators')).toEqual(['a', 'b']);
  });

  it('returns none when the field is missing', () => {
    expect(internalArray<string>({}, 'decorators')).toEqual([]);
  });

  it('returns none when the field is not an array', () => {
    expect(internalArray<string>({ decorators: 'x' }, 'decorators')).toEqual(
      []
    );
    expect(
      internalArray<string>({ parseDiagnostics: null }, 'parseDiagnostics')
    ).toEqual([]);
  });
});

describe('parse errors read through internalArray', () => {
  const broken = 'export const a = ;\n';
  const valid = 'export const a = 1;\n';

  it('TsxSource reports the syntax error of a broken file', () => {
    const errors = TsxSource.parse(ts, 'broken.ts', broken).parseErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^line 1: /);
  });

  it('TsxSource reports none for a valid file', () => {
    expect(TsxSource.parse(ts, 'valid.ts', valid).parseErrors()).toEqual([]);
  });

  it('jsx-sources parseErrors reports the syntax error of a broken file', () => {
    const sourceFile = ts.createSourceFile(
      'broken.tsx',
      broken,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    const errors = parseErrors(ts, sourceFile);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^line 1: /);
  });
});

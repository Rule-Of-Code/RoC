/**
 * #530 — NgRx Selectors Memoization Mandate reported a raw selector (one that
 * reads state with no createSelector) only when its parameter had no type:
 * `\(?\s*\w+\s*\)?` left no room for `: AppState`. A typed parameter is the
 * normal way to write a selector in TypeScript, so the law missed most of
 * the selectors it exists to catch. Read from the syntax tree now.
 */
import { NgRxMemoizationConfiguration } from '../../src/utils/angular/ngrx-memoization/ngrx-memoization-configuration';

const raw = (lines: string[]): boolean =>
  NgRxMemoizationConfiguration.analyzeSelectorMemoizationPatterns(
    lines.join('\n')
  ).hasDirectStateAccess;

describe('#530 a raw selector is read whatever its parameter type', () => {
  it.each([
    [
      'export const selectOpen = (state: AppState) => state.items.filter(i => i.open);',
      'typed',
    ],
    [
      'export const selectOpen = (state) => state.items;',
      'untyped, parenthesised',
    ],
    ['export const selectOpen = state => state.items;', 'untyped, bare'],
    [
      'export const selectFirst = (s: AppState) => s["items"][0];',
      'typed, element access',
    ],
    [
      'export const selectOpen = (state: AppState): Item[] => {\n  return state.items.filter(i => i.open);\n};',
      'typed, with a return type and a block body',
    ],
  ])('reports %s (%s)', source => {
    expect(raw([source])).toBe(true);
  });

  it.each([
    [
      "import { createSelector } from '@ngrx/store';\nexport const selectOpen = createSelector(selectFeature, (f: Feature) => f.items);",
      'a createSelector with a typed projector',
    ],
    [
      "export const selectFeature = createFeatureSelector<Feature>('feature');",
      'a createFeatureSelector',
    ],
    [
      'const local = (state: AppState) => state.items;',
      'a selector that is not exported',
    ],
    [
      'export const add = (a: number, b: number) => a + b;',
      'a two-parameter function',
    ],
    [
      "export const label = (x: string) => 'x';",
      'an arrow that reads nothing of its parameter',
    ],
  ])('does not report %s (%s)', source => {
    expect(raw([source])).toBe(false);
  });
});

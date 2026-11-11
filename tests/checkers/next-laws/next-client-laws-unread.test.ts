/**
 * The "cannot read" path of every Next.js client law: with no parser the law
 * FAILS and names what it did not read. It never passes on files it did not
 * inspect. The parser module is replaced for this file only, so the laws run
 * their real code up to the point where `loadTypeScript` answers null.
 */
import * as laws from '../../../src/checkers/next-laws';
import { NEXT_CLIENT_LAWS } from '../../../src/data/next-client-laws';
import { loadTypeScript } from '../../../src/utils/react/tsx-source';
import { ctx, removeProjects } from '../toolkit-fixture';
import { type Law, nextApp, PAGE } from './next-fixture';

jest.mock('../../../src/utils/react/tsx-source', () => {
  const actual = jest.requireActual('../../../src/utils/react/tsx-source');
  return { ...actual, loadTypeScript: jest.fn(actual.loadTypeScript) };
});

afterAll(removeProjects);

const lawOf = (checkFunction: string): Law =>
  (laws as unknown as Record<string, Law>)[checkFunction.replace('.check', '')] as Law;

describe('without a parser every Next client law fails and says what it did not read', () => {
  beforeAll(() => (loadTypeScript as jest.Mock).mockReturnValue(null));

  it.each(NEXT_CLIENT_LAWS.map(card => [card.title, card] as const))('%s', (_title, card) => {
    const root = nextApp({ 'src/app/page.tsx': PAGE });
    const result = lawOf(card.checkFunction as string).check(
      ctx(root, { thresholds: { next: { routeJsBudgetKb: 10_000 } } })
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([expect.stringContaining("could not load the 'typescript' package")])
    );
  });
});

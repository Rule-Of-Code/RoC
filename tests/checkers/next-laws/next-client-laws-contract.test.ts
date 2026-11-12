/**
 * What every Next.js client law shares (#226–#243): it is selected where a
 * workspace package declares `next` and not elsewhere (through the card's
 * real `requires`), and it is wired to its checker. The "cannot read" path
 * is next-client-laws-unread.test.ts (it replaces the parser module).
 */
import * as laws from '../../../src/checkers/next-laws';
import { NEXT_CLIENT_LAWS } from '../../../src/data/next-client-laws';
import { ModularLawsRegistry } from '../../../src/registry/modular-laws-registry';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { manifest, project, removeProjects } from '../toolkit-fixture';
import { type Law, nextApp, PAGE } from './next-fixture';

afterAll(removeProjects);

const lawOf = (checkFunction: string): Law =>
  (laws as unknown as Record<string, Law>)[checkFunction.replace('.check', '')] as Law;

describe('Next client law cards', () => {
  it('are eleven, numbered 551–561 and 24.1–24.11', () => {
    expect(NEXT_CLIENT_LAWS.map(card => card.legacyId)).toEqual([551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 561]);
    expect(NEXT_CLIENT_LAWS.map(card => card.subsection)).toEqual(
      Array.from({ length: 11 }, (_, index) => `24.${index + 1}`)
    );
  });

  it.each(NEXT_CLIENT_LAWS.map(card => [card.title, card] as const))('%s is wired to its checker', (_title, card) => {
    expect(card.checkFunction).toBeDefined();
    expect(lawOf(card.checkFunction as string)).toBeDefined();
    expect(Object.keys(ModularLawsRegistry.LAW_CLASS_MAPPING)).toContain(card.checkFunction);
    expect(card.satisfiedBy?.react).toBeTruthy();
    expect(card.detectionLimits?.length).toBeGreaterThan(0);
  });
});

describe('selection through the real requires', () => {
  const nextRoot = nextApp({ 'src/app/page.tsx': PAGE });
  const reactOnly = project({ 'package.json': manifest({ react: '19.3.0', vite: '7.0.0' }), 'src/main.tsx': PAGE });
  const python = project({ 'pyproject.toml': '[project]\nname = "api"\n', 'app/main.py': 'app = 1\n' });
  const monorepo = project({
    'package.json': JSON.stringify({ name: 'root', private: true, workspaces: ['apps/*'] }),
    'apps/web/package.json': manifest({ next: '16.4.6', react: '19.3.0' }),
    'apps/web/app/page.tsx': PAGE,
  });

  it.each(NEXT_CLIENT_LAWS.map(card => [card.title, card] as const))('%s', (_title, card) => {
    expect(lawRequirementsMet(card.requires, nextRoot)).toBe(true);
    expect(lawRequirementsMet(card.requires, monorepo)).toBe(true);
    expect(lawRequirementsMet(card.requires, reactOnly)).toBe(false);
    expect(lawRequirementsMet(card.requires, python)).toBe(false);
  });
});

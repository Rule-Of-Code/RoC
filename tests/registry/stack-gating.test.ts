/**
 * Stack gating (P9): laws declare a stack scope (frontend / typescript / python),
 * and the audit only runs a law when its scope matches the detected project type.
 * Universal laws (no stack) run everywhere. This keeps frontend/TS laws off a
 * Python backend and the Python laws off an Angular frontend.
 */
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';

const law = (title: string): { stack?: string } | undefined =>
  ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === title);

describe('lawAppliesToProjectType', () => {
  const applies = (stack: string | undefined, pt: string | undefined): boolean =>
    ModularLawsRegistry.lawAppliesToProjectType(stack, pt);

  it('universal laws (no stack) apply to every project type', () => {
    for (const pt of ['python', 'angular', 'node', 'generic']) {
      expect(applies(undefined, pt)).toBe(true);
    }
  });

  it('python laws apply only to python projects', () => {
    expect(applies('python', 'python')).toBe(true);
    expect(applies('python', 'angular')).toBe(false);
    expect(applies('python', 'node')).toBe(false);
  });

  it('frontend laws apply only to FE frameworks', () => {
    expect(applies('frontend', 'angular')).toBe(true);
    expect(applies('frontend', 'react')).toBe(true);
    expect(applies('frontend', 'python')).toBe(false);
    expect(applies('frontend', 'node')).toBe(false);
  });

  it('typescript laws apply to TS stacks but not python', () => {
    expect(applies('typescript', 'angular')).toBe(true);
    expect(applies('typescript', 'node')).toBe(true);
    expect(applies('typescript', 'python')).toBe(false);
  });

  it('an unknown project type never silently drops coverage', () => {
    expect(applies('frontend', undefined)).toBe(true);
    expect(applies('python', undefined)).toBe(true);
  });
});

describe('law stack tagging', () => {
  it('every PYTHON-category law is scoped to the python stack', () => {
    const py = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
      l => l.category === 'PYTHON'
    );
    expect(py.length).toBeGreaterThanOrEqual(25);
    for (const l of py) expect(l.stack).toBe('python');
  });

  it('representative frontend-only laws are scoped to the frontend stack', () => {
    for (const title of [
      'Core Web Vitals Compliance',
      'Bundle Size Optimization',
      'Performance Budget Compliance',
      'NgRx Store Pattern Mandate (SACRED LAW)',
      'Component Selector Prefix Compliance',
      'Accessibility Linting Enforcement',
      'Angular Security XSS Prevention Policy',
      'Performance Standards',
    ]) {
      expect(law(title)?.stack).toBe('frontend');
    }
  });

  it('representative TypeScript-language laws are scoped to the typescript stack', () => {
    for (const title of [
      'No Explicit Any / Non-Null Assertion',
      'No Double Cast',
      'Prefer Union Over Enum',
      'TypeScript Strict Mode (SACRED LAW)',
    ]) {
      expect(law(title)?.stack).toBe('typescript');
    }
  });

  it('cross-cutting laws stay universal (no stack)', () => {
    for (const title of [
      'Commit Message Standards',
      'Branch Governance Standards',
      'Database Query Optimization',
    ]) {
      expect(law(title)?.stack).toBeUndefined();
    }
  });
});

describe('applicability matrix (enabled laws filtered by project type)', () => {
  const enabled = ModularLawsRegistry.getAll();
  const countFor = (pt: string): number =>
    enabled.filter(l =>
      ModularLawsRegistry.lawAppliesToProjectType(l.stack, pt)
    ).length;

  it('a python project excludes all frontend and typescript laws', () => {
    const keptStacks = enabled
      .filter(l => ModularLawsRegistry.lawAppliesToProjectType(l.stack, 'python'))
      .map(l => l.stack);
    expect(keptStacks).not.toContain('frontend');
    expect(keptStacks).not.toContain('typescript');
    expect(keptStacks).toContain('python');
  });

  it('an angular project excludes all python laws', () => {
    const keptStacks = enabled
      .filter(l =>
        ModularLawsRegistry.lawAppliesToProjectType(l.stack, 'angular')
      )
      .map(l => l.stack);
    expect(keptStacks).not.toContain('python');
    expect(keptStacks).toContain('frontend');
  });

  it('a python project runs fewer laws than an angular project', () => {
    expect(countFor('python')).toBeLessThan(countFor('angular'));
  });
});

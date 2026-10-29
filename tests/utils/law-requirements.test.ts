/**
 * The `requires` gate: a law about a toolkit is selected only where the
 * project declares that toolkit. Each condition is tested in both directions,
 * and the monorepo shapes (dependency in an app's manifest, config in an app's
 * directory) are tested because a root-only reading would drop the law there.
 */
import {
  declaredDependencies,
  describeRequirement,
  lawRequirementsMet,
} from '../../src/utils/law-requirements';
import { manifest, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const IONIC = { anyDependency: ['@ionic/angular', '@ionic/react'] };
const CAPACITOR = {
  anyDependency: ['@capacitor/core'],
  anyFile: ['capacitor.config.ts', 'capacitor.config.json'],
};

describe('lawRequirementsMet', () => {
  it('no requirement is always met', () => {
    expect(lawRequirementsMet(undefined, project({}))).toBe(true);
  });

  it('a dependency in the root manifest meets anyDependency', () => {
    const root = project({ 'package.json': manifest({ '@ionic/angular': '8.8.17' }) });
    expect(lawRequirementsMet(IONIC, root)).toBe(true);
  });

  it('a devDependency counts as declared', () => {
    const root = project({
      'package.json': JSON.stringify({ devDependencies: { '@ionic/react': '8.0.0' } }),
    });
    expect(lawRequirementsMet(IONIC, root)).toBe(true);
  });

  it('a project without the dependency does not meet it', () => {
    const root = project({ 'package.json': manifest({ '@angular/core': '20.0.0' }) });
    expect(lawRequirementsMet(IONIC, root)).toBe(false);
  });

  it('no package.json at all does not meet it', () => {
    expect(lawRequirementsMet(IONIC, project({ 'main.py': '' }))).toBe(false);
  });

  it('an unreadable manifest declares nothing rather than throwing', () => {
    const root = project({ 'package.json': '{ not json' });
    expect(lawRequirementsMet(IONIC, root)).toBe(false);
  });

  it('a dependency declared only by a workspace app meets it (monorepo)', () => {
    const root = project({
      'package.json': manifest({ nx: '21.0.0' }),
      'apps/mobile/package.json': manifest({ '@capacitor/core': '8.5.1' }),
      'apps/mobile/capacitor.config.ts': 'export default {};',
    });
    expect(lawRequirementsMet(CAPACITOR, root)).toBe(true);
  });

  it('anyFile and anyDependency must BOTH hold', () => {
    const depOnly = project({ 'package.json': manifest({ '@capacitor/core': '8.5.1' }) });
    const fileOnly = project({
      'package.json': manifest({}),
      'capacitor.config.json': '{}',
    });
    expect(lawRequirementsMet(CAPACITOR, depOnly)).toBe(false);
    expect(lawRequirementsMet(CAPACITOR, fileOnly)).toBe(false);
  });

  it('any one of the listed files is enough', () => {
    const root = project({
      'package.json': manifest({ '@capacitor/core': '8.5.1' }),
      'capacitor.config.json': '{}',
    });
    expect(lawRequirementsMet(CAPACITOR, root)).toBe(true);
  });
});

describe('declaredDependencies', () => {
  it('unions every workspace manifest', () => {
    const root = project({
      'package.json': manifest({ a: '1' }),
      'apps/web/package.json': manifest({ b: '1' }),
      'libs/ui/core/package.json': JSON.stringify({ devDependencies: { c: '1' } }),
    });
    expect([...declaredDependencies(root)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('does not read node_modules manifests', () => {
    const root = project({
      'package.json': manifest({ a: '1' }),
      'node_modules/x/package.json': manifest({ '@ionic/angular': '8' }),
    });
    expect(declaredDependencies(root).has('@ionic/angular')).toBe(false);
  });
});

describe('describeRequirement', () => {
  it('names both halves in words', () => {
    expect(describeRequirement(CAPACITOR)).toBe(
      'a dependency on @capacitor/core, and capacitor.config.ts or capacitor.config.json'
    );
  });
});

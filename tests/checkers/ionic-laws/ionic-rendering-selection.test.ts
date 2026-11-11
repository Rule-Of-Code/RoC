/**
 * Selection of the Ionic rendering laws through the engine's own gate
 * (lawRequirementsMet) with each card's real `requires`: selected where the
 * Ionic binding the law can read is declared, not selected where it is not.
 */
import { IONIC_RENDERING_LAWS } from '../../../src/data/ionic-rendering-laws';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../../src/data/enhanced-laws';
import { ModularLawsRegistry } from '../../../src/registry/modular-laws-registry';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const angularIonic = () => project({ 'package.json': manifest({ '@angular/core': '20.0.0', '@ionic/angular': '8.8.17' }) });
const reactIonic = () => project({ 'package.json': manifest({ react: '19.0.0', '@ionic/react': '8.8.17' }) });
const plainAngular = () => project({ 'package.json': manifest({ '@angular/core': '20.0.0' }) });
const python = () => project({ 'pyproject.toml': '[project]\nname = "api"\n' });

/** Template- and TS-reading laws are Angular-only; the index.html law reads any binding. */
const ANY_BINDING = new Set(['IonicViewportFitCoverLaw.check']);

describe('Ionic rendering laws — selection', () => {
  it('eight cards, legacyId 411-418, subsections 4.80-4.87, wired into the registry and the law list', () => {
    expect(IONIC_RENDERING_LAWS.map(law => law.legacyId)).toEqual([411, 412, 413, 414, 415, 416, 417, 418]);
    expect(IONIC_RENDERING_LAWS.map(law => law.subsection)).toEqual(['4.80', '4.81', '4.82', '4.83', '4.84', '4.85', '4.86', '4.87']);
    for (const law of IONIC_RENDERING_LAWS) {
      expect(ALL_ENHANCED_CONSTITUTIONAL_LAWS).toContain(law);
      const mapping = ModularLawsRegistry.LAW_CLASS_MAPPING as Record<string, unknown>;
      expect(mapping[law.checkFunction ?? '']).toBeDefined();
      expect(law.detectionLimits?.length).toBeGreaterThan(0);
      expect(law.satisfiedBy?.ionic).toBeTruthy();
    }
  });

  it.each(IONIC_RENDERING_LAWS.map(law => [law.title, law] as const))('%s: selected in an Ionic Angular app', (_title, law) => {
    expect(lawRequirementsMet(law.requires, angularIonic())).toBe(true);
  });

  it.each(IONIC_RENDERING_LAWS.map(law => [law.title, law] as const))(
    '%s: not selected in plain Angular or Python',
    (_title, law) => {
      expect(lawRequirementsMet(law.requires, plainAngular())).toBe(false);
      expect(lawRequirementsMet(law.requires, python())).toBe(false);
    }
  );

  it.each(IONIC_RENDERING_LAWS.map(law => [law.title, law] as const))(
    '%s: in an Ionic React app, selected only if it can read that app',
    (_title, law) => {
      expect(lawRequirementsMet(law.requires, reactIonic())).toBe(ANY_BINDING.has(law.checkFunction ?? ''));
    }
  );
});

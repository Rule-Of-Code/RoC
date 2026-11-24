/**
 * The frameworks a law is about, from its `requires` and its description, in
 * the `applicableFrameworks` vocabulary. Moved out of ModularLawsRegistry
 * unchanged (#559); the registry delegates getApplicableFrameworks here.
 */

import type {
  EnhancedConstitutionalLaw,
  LawRequirement,
} from '../types/enhanced-law.types';

/**
 * The frameworks a law is about. `requires` is the authority: a law gated
 * on `@ionic/angular` is an Ionic law whatever words its description uses
 * (a card about `ion-router-outlet` never says "Ionic", and was rendered as
 * universal). The description's words still add a framework, so a card
 * without `requires` keeps the tag it had.
 */
export function applicableFrameworks(law: EnhancedConstitutionalLaw): string[] {
  const frameworks = new Set<string>();
  if (law.description.includes('Angular')) frameworks.add('angular');
  if (law.description.includes('React')) frameworks.add('react');
  if (law.description.includes('Vue')) frameworks.add('vue');
  if (law.description.includes('Node')) frameworks.add('node');
  if (law.description.includes('TypeScript')) frameworks.add('typescript');
  if (law.description.includes('Ionic')) frameworks.add('ionic');
  if (law.description.includes('Capacitor')) frameworks.add('capacitor');
  for (const framework of requiredFrameworks(law.requires))
    frameworks.add(framework);
  return frameworks.size > 0 ? [...frameworks] : ['*'];
}

/**
 * Frameworks `requires` implies. Every package of `allDependencies` is
 * required, so each one's framework counts. `anyDependency` is satisfied
 * by any one of its packages, so it names a framework only when EVERY
 * package in it maps to one: `["next", "express"]` is not a React law.
 */
export function requiredFrameworks(
  requires: LawRequirement | undefined
): string[] {
  if (!requires) return [];
  const found = new Set<string>();
  for (const name of requires.allDependencies ?? []) {
    const framework = frameworkOfPackage(name);
    if (framework) found.add(framework);
  }
  const any = (requires.anyDependency ?? []).map(frameworkOfPackage);
  if (any.length > 0 && any.every(Boolean))
    any.forEach(framework => found.add(framework as string));
  return [...found];
}

/** The framework a package belongs to, in the `applicableFrameworks` vocabulary; null for none. */
export function frameworkOfPackage(name: string): string | null {
  if (name.startsWith('@ionic/')) return 'ionic';
  if (name.startsWith('@capacitor/') || name.startsWith('@capacitor-firebase/'))
    return 'capacitor';
  if (name.startsWith('@angular/') || name.startsWith('@ngrx/'))
    return 'angular';
  if (['react', 'react-dom', 'next', '@testing-library/react'].includes(name))
    return 'react';
  if (['vue', 'nuxt'].includes(name)) return 'vue';
  if (name === 'typescript') return 'typescript';
  return null;
}

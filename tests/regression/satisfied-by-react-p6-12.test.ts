/**
 * #12, P6 — Capacitor Listener Handles Released judges Angular classes only
 * (@Component / @Directive / @Pipe, pages, non-root @Injectable). On a React
 * or Vue Capacitor app it read nothing it judges and passed: a listener a
 * React effect registers and never removes was a pass. It now requires
 * @angular/core beside Capacitor, so it is not selected where it cannot see.
 */
import { CapacitorListenerHandlesReleasedLaw } from '../../src/checkers/capacitor-laws/capacitor-listener-handles-released';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { lawRequirementsMet } from '../../src/utils/law-requirements';
import { json, useTempProject } from './foreign-json-486.helpers';

const TITLE = 'Capacitor Listener Handles Released';
const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === TITLE);

const project = useTempProject();
const { write } = project;

/** A Capacitor app on `framework`'s dependencies. */
const capacitorApp = (framework: Record<string, string>): void => {
  write(
    'package.json',
    json({
      name: 'app',
      version: '1.0.0',
      dependencies: {
        ...framework,
        '@capacitor/core': '^7.0.0',
        '@capacitor/app': '^7.0.0',
      },
    })
  );
  write(
    'capacitor.config.ts',
    "export default { appId: 'a.b', appName: 'a', webDir: 'dist' };\n"
  );
};

const leakingEffect = [
  "import { App } from '@capacitor/app';",
  "import { useEffect } from 'react';",
  'export function useBack(): void {',
  '  useEffect(() => {',
  "    App.addListener('backButton', () => history.back());",
  '  }, []);',
  '}',
  '',
].join('\n');

describe('#12 P6 Capacitor Listener Handles Released — Angular only', () => {
  it('the law exists and carries Angular guidance only', () => {
    expect(law).toBeDefined();
    expect(law?.satisfiedBy?.react).toBeUndefined();
    expect(law?.satisfiedBy?.angular).toMatch(/DestroyRef\.onDestroy/);
  });

  it('RED before #12: on a React Capacitor app it passed a leaking effect', () => {
    capacitorApp({ react: '^19.0.0', 'react-dom': '^19.0.0' });
    write('src/useBack.ts', leakingEffect);
    const result = CapacitorListenerHandlesReleasedLaw.check(project.context());
    expect(result.violations ?? []).toEqual([]);
  });

  it('is not selected for a React Capacitor app', () => {
    capacitorApp({ react: '^19.0.0', 'react-dom': '^19.0.0' });
    expect(lawRequirementsMet(law?.requires, project.root)).toBe(false);
  });

  it('is not selected for a Vue Capacitor app', () => {
    capacitorApp({ vue: '^3.5.0' });
    expect(lawRequirementsMet(law?.requires, project.root)).toBe(false);
  });

  it('is selected for an Angular Capacitor app', () => {
    capacitorApp({ '@angular/core': '^20.0.0' });
    expect(lawRequirementsMet(law?.requires, project.root)).toBe(true);
  });

  /** A workspace whose apps declare their own dependencies. */
  const workspace = (apps: Record<string, Record<string, string>>): void => {
    write(
      'package.json',
      json({ name: 'ws', version: '1.0.0', workspaces: ['apps/*'] })
    );
    for (const [name, dependencies] of Object.entries(apps)) {
      write(
        `apps/${name}/package.json`,
        json({ name, version: '1.0.0', dependencies })
      );
      write(
        `apps/${name}/capacitor.config.ts`,
        "export default { appId: 'a.b', appName: 'a', webDir: 'dist' };\n"
      );
    }
  };

  it('monorepo: selected when an app manifest declares Angular and Capacitor', () => {
    workspace({
      mobile: { '@angular/core': '^20.0.0', '@capacitor/core': '^7.0.0' },
    });
    expect(lawRequirementsMet(law?.requires, project.root)).toBe(true);
  });

  it('monorepo: not selected when no app declares Angular', () => {
    workspace({ mobile: { react: '^19.0.0', '@capacitor/core': '^7.0.0' } });
    expect(lawRequirementsMet(law?.requires, project.root)).toBe(false);
  });

  it('monorepo limit: an Angular app beside a React Capacitor app selects it for both', () => {
    workspace({
      admin: { '@angular/core': '^20.0.0' },
      mobile: { react: '^19.0.0', '@capacitor/core': '^7.0.0' },
    });
    expect(lawRequirementsMet(law?.requires, project.root)).toBe(true);
  });

  it('its detection limits say a React or Vue Capacitor app is not judged', () => {
    expect((law?.detectionLimits ?? []).join('\n')).toMatch(
      /Selected only where @angular\/core is declared beside Capacitor/
    );
  });
});

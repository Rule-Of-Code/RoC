/**
 * Capacitor Plugin Config Declared (#156): a plugin that augments
 * PluginsConfig silently takes its own defaults when its block is absent.
 */
import { CapacitorPluginConfigDeclaredLaw as Law } from '../../../src/checkers/capacitor-laws/capacitor-plugin-config-declared';
import { ctx, removeProjects } from '../toolkit-fixture';
import { capacitorProject, installPackage } from './capacitor-fixture';

afterAll(removeProjects);

/** The shape a real plugin ships (abridged from an authentication plugin's definitions.d.ts). */
const AUTH_DEFINITIONS = [
  "import type { PluginListenerHandle } from '@capacitor/core';",
  "declare module '@capacitor/cli' {",
  '  interface PluginsConfig {',
  '    FirebaseAuthentication?: {',
  '      /**',
  '       * Configure which providers you want to use.',
  '       * @default []',
  '       */',
  '      providers?: string[];',
  '      /**',
  '       * Skip native authentication.',
  '       * @default true',
  '       */',
  '      skipNativeAuth?: boolean;',
  '    };',
  '  }',
  '}',
  'export interface FirebaseAuthenticationPlugin { signInWithGoogle(): Promise<void>; }',
].join('\n');

const withAuthPlugin = (extConfig: Record<string, unknown>) => {
  const root = capacitorProject({}, extConfig, { '@example/firebase-auth': '8.4.0' });
  installPackage(root, '@example/firebase-auth', { 'dist/esm/definitions.d.ts': AUTH_DEFINITIONS });
  return root;
};

describe('CapacitorPluginConfigDeclaredLaw', () => {
  it('red: an installed plugin augments PluginsConfig and the config has no block', () => {
    const result = Law.check(ctx(withAuthPlugin({ plugins: { PushNotifications: {} } })));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /@example\/firebase-auth reads plugins\.FirebaseAuthentication and the config has none .*providers @default \[\]; skipNativeAuth @default true/
      ),
    ]);
  });

  it('green: the block is stated', () => {
    const result = Law.check(
      ctx(withAuthPlugin({ plugins: { FirebaseAuthentication: { providers: ['google.com'] } } }))
    );
    expect(result.violations).toEqual([]);
  });

  it('green: an empty block states that the defaults are deliberate', () => {
    expect(Law.check(ctx(withAuthPlugin({ plugins: { FirebaseAuthentication: {} } }))).violations).toEqual([]);
  });

  it('a plugin that declares no PluginsConfig is not asked for one', () => {
    const root = capacitorProject({}, {}, { '@example/share': '1.0.0' });
    installPackage(root, '@example/share', {
      'dist/esm/definitions.d.ts': 'export interface SharePlugin { share(): Promise<void>; }',
    });
    expect(Law.check(ctx(root)).violations).toEqual([]);
  });

  it('a commented-out augmentation is not a declaration', () => {
    const root = capacitorProject({}, {}, { '@example/x': '1.0.0' });
    installPackage(root, '@example/x', {
      'dist/esm/definitions.d.ts': "/* declare module '@capacitor/cli' { interface PluginsConfig { X?: {} } } */",
    });
    expect(Law.check(ctx(root)).violations).toEqual([]);
  });

  it('fails when node_modules is not installed — it could not look', () => {
    const root = capacitorProject({}, {});
    require('fs').rmSync(require('path').join(root, 'node_modules', '@capacitor', 'core'), {
      recursive: true,
      force: true,
    });
    const result = Law.check(ctx(root));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('node_modules is not installed')]);
  });

  it('parses the real push-notifications shape (one key, options without @default)', () => {
    const declared = Law.parseDeclarations(
      '@capacitor/push-notifications',
      [
        "declare module '@capacitor/cli' {",
        '    interface PluginsConfig {',
        '        /** You can configure the way the push notifications are displayed. */',
        '        PushNotifications?: {',
        '            /** @since 1.0.0 @example ["badge"] */',
        '            presentationOptions: PresentationOption[];',
        '        };',
        '    }',
        '}',
      ].join('\n')
    );
    expect(declared).toEqual([
      { plugin: '@capacitor/push-notifications', key: 'PushNotifications', options: ['presentationOptions'] },
    ]);
  });
});

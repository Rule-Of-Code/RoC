/**
 * Capacitor Single Platform Boundary (#157): @capacitor/* imports and
 * platform calls live in one boundary — stated as data, or inferred when
 * exactly one project directory uses them.
 */
import { CapacitorSinglePlatformBoundaryLaw as Law } from '../../../src/checkers/capacitor-laws/capacitor-single-platform-boundary';
import { ctx, removeProjects } from '../toolkit-fixture';
import { capacitorProject } from './capacitor-fixture';

afterAll(removeProjects);

const BOUNDARY_FILE = [
  "import { Capacitor } from '@capacitor/core';",
  "import { Share } from '@capacitor/share';",
  'export const nativeShareSheet = () => (Capacitor.isNativePlatform() ? Share : null);',
].join('\n');
const LEAK = [
  "import { Share } from '@capacitor/share';",
  'if (Capacitor.isNativePlatform()) { await Share.share({ url }); }',
].join('\n');
const libs = {
  'libs/shared/util/project.json': '{}',
  'libs/shared/util/src/native-share.ts': BOUNDARY_FILE,
  'libs/events/feature/project.json': '{}',
};

describe('CapacitorSinglePlatformBoundaryLaw', () => {
  it('red: an import outside the configured boundary', () => {
    const root = capacitorProject({ ...libs, 'libs/events/feature/src/share-button.ts': LEAK });
    const result = Law.check(
      ctx(root, { thresholds: { capacitor: { boundary: ['libs/shared/util/**'] } } })
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^libs\/events\/feature\/src\/share-button\.ts: uses @capacitor\/share, Capacitor\.isNativePlatform\(\) outside thresholds\.capacitor\.boundary/
      ),
    ]);
  });

  it('green: everything inside the configured boundary', () => {
    const root = capacitorProject(libs);
    const result = Law.check(
      ctx(root, { thresholds: { capacitor: { boundary: ['libs/shared/util/**'] } } })
    );
    expect(result.violations).toEqual([]);
  });

  it('unconfigured, one importing project directory is green without ceremony', () => {
    expect(Law.check(ctx(capacitorProject(libs))).violations).toEqual([]);
  });

  it('unconfigured, two importing directories are named', () => {
    const root = capacitorProject({ ...libs, 'libs/events/feature/src/share-button.ts': LEAK });
    expect(Law.check(ctx(root)).violations).toEqual([
      expect.stringMatching(
        /from 2 project directories: libs\/events\/feature \(1 file\), libs\/shared\/util \(1 file\)/
      ),
    ]);
  });

  it('a root ESLint rule restricting @capacitor imports states the boundary', () => {
    const root = capacitorProject({
      ...libs,
      'libs/events/feature/src/share-button.ts': LEAK,
      'eslint.config.mjs':
        "export default [{ rules: { 'no-restricted-imports': ['error', { patterns: ['@capacitor/*'] }] } }];",
    });
    expect(Law.check(ctx(root)).violations).toEqual([]);
  });

  it('type-only imports, the config file and comments are not platform use', () => {
    expect(
      Law.uses(
        [
          "import type { PluginListenerHandle } from '@capacitor/core';",
          "// import { Share } from '@capacitor/share';",
        ].join('\n')
      )
    ).toEqual([]);
    const root = capacitorProject({
      ...libs,
      'capacitor.config.ts': "import type { CapacitorConfig } from '@capacitor/cli';\nexport default {};",
      'apps/web/project.json': '{}',
      'apps/web/src/main.ts': "import { CapacitorConfig } from '@capacitor/cli';",
    });
    expect(Law.check(ctx(root)).violations).toEqual([]);
  });

  it('a dynamic import counts', () => {
    expect(Law.uses("const { Share } = await import('@capacitor/share');")).toEqual(['@capacitor/share']);
  });
});

/**
 * Semantic Versioning Standards, Capacitor extension (#162): the version a
 * Capacitor project ships is declared three times, and the stores read the
 * two native ones. A literal that differs from package.json is drift; a value
 * injected at build time is not compared, and the law says so.
 */
import { SemVerComplianceLaw as Law } from '../../../src/checkers/git-laws/semver-compliance';
import { CapacitorProjects } from '../../../src/utils/capacitor/capacitor-project';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);
beforeEach(() => CapacitorProjects.clearCache());

const GRADLE = 'android/app/build.gradle';
const PBX = 'ios/App/App.xcodeproj/project.pbxproj';
const app = (files: Record<string, string>, version = '0.9.0') =>
  project({
    'package.json': JSON.stringify({ name: 'app', version, dependencies: { '@capacitor/core': '8.5.1' } }),
    'capacitor.config.json': '{}',
    ...files,
  });
const gradle = (versionName: string) =>
  `android {\n  defaultConfig {\n    versionCode 7\n    versionName ${versionName}\n  }\n}\n`;
const pbx = (marketing: string) =>
  `/* Debug */ MARKETING_VERSION = ${marketing};\nCURRENT_PROJECT_VERSION = 1;\n/* Release */ MARKETING_VERSION = ${marketing};\n`;

describe('SemVerComplianceLaw — Capacitor native versions', () => {
  it('red: a literal versionName that differs from package.json', () => {
    const result = Law.check(ctx(app({ [GRADLE]: gradle('"0.8.0"') })));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      'android/app/build.gradle: versionName 0.8.0 ≠ package.json 0.9.0 — the store is told a different version than the one the project declares',
    ]);
  });

  it('red: the Xcode template values never updated (the measured state)', () => {
    const result = Law.check(ctx(app({ [PBX]: pbx('1.0') })));
    expect(result.violations).toEqual([
      expect.stringMatching(/^ios\/App\/App\.xcodeproj\/project\.pbxproj: MARKETING_VERSION 1\.0 ≠ package\.json 0\.9\.0/),
    ]);
  });

  it('green: literals equal to package.json ("1.0" is 1.0.0)', () => {
    const result = Law.check(
      ctx(app({ [GRADLE]: gradle('"1.0.0"'), [PBX]: pbx('1.0') }, '1.0.0'))
    );
    expect(result.violations).toEqual([]);
  });

  it('green, and said: a property-driven versionName is not compared', () => {
    const result = Law.check(
      ctx(
        app({
          [GRADLE]: gradle("project.hasProperty('appVersionName') ? project.appVersionName : '0.0.0-local'"),
          [PBX]: pbx('"$(APP_VERSION)"'),
        })
      )
    );
    expect(result.violations).toEqual([]);
    expect(result.message).toContain('versionName is injected at build time');
    expect(result.message).toContain('MARKETING_VERSION is injected at build time');
    expect(result.message).toContain('versionCode 7 (reported, not compared)');
    expect(result.message).toContain('CURRENT_PROJECT_VERSION 1 (reported, not compared)');
  });

  it('versionNameSuffix is not a versionName; a commented literal is not one either', () => {
    const result = Law.check(
      ctx(
        app({
          [GRADLE]: 'defaultConfig {\n  // versionName "0.1.0"\n  versionName "0.9.0"\n  versionNameSuffix "-beta"\n}\n',
        })
      )
    );
    expect(result.violations).toEqual([]);
  });

  it('an .xcconfig literal is read too', () => {
    const result = Law.check(
      ctx(app({ [PBX]: pbx('"$(MARKETING_VERSION)"'), 'ios/App/Config/Release.xcconfig': 'MARKETING_VERSION = 0.7.0\n' }))
    );
    expect(result.violations).toEqual([expect.stringMatching(/^ios\/App\/Config\/Release\.xcconfig: MARKETING_VERSION 0\.7\.0 ≠/)]);
  });

  it('a project without Capacitor reads no native file', () => {
    const root = project({
      'package.json': JSON.stringify({ name: 'web', version: '0.9.0' }),
      [GRADLE]: gradle('"0.1.0"'),
    });
    expect(Law.check(ctx(root)).violations).toEqual([]);
  });
});

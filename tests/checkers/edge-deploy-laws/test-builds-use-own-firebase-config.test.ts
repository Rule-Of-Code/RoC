/**
 * #365 — a debug / benchmark / test build that bundles the production
 * Firebase config with Messaging auto-init on writes into production.
 */
import { TestBuildsUseOwnFirebaseConfigLaw } from '../../../src/checkers/edge-deploy-laws/test-builds-use-own-firebase-config';
import { EDGE_DEPLOY_SECURITY_LAWS } from '../../../src/data/edge-deploy-security-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { repo } from '../../utils/git-fixture';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const LAW = EDGE_DEPLOY_SECURITY_LAWS.find(law => law.checkFunction === 'TestBuildsUseOwnFirebaseConfigLaw.check');
const check = (files: Record<string, string>) => TestBuildsUseOwnFirebaseConfigLaw.check(ctx(project(files)));

const services = (projectId: string): string => JSON.stringify({ project_info: { project_number: '1', project_id: projectId }, client: [] }, null, 2);

const GRADLE = [
  "apply plugin: 'com.android.application'",
  'android {',
  '    buildTypes {',
  '        release { minifyEnabled true }',
  '        benchmark {',
  "            initWith release",
  '            manifestPlaceholders = [fcmAutoInit: "false"]',
  '        }',
  '    }',
  '}',
  "apply plugin: 'com.google.gms.google-services'",
  '',
].join('\n');

const AUTO_INIT_OFF = '<manifest><application><meta-data android:name="firebase_messaging_auto_init_enabled" android:value="false" /></application></manifest>';

describe('#365 Test Builds Use Own Firebase Config — Android acceptance', () => {
  it('red: one production google-services.json + a benchmark build type → a finding naming benchmark and debug', () => {
    const result = check({ 'android/app/build.gradle': GRADLE, 'android/app/google-services.json': services('shop-prod') });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/google-services\.json:4: non-release build variant\(s\) benchmark, debug \(android\/app\/build\.gradle\) use this config/),
    ]);
    expect(result.metrics).toMatchObject({ judged: 2, androidConfigs: 1 });
  });

  it('green: per-variant files from another project', () => {
    const result = check({
      'android/app/build.gradle': GRADLE,
      'android/app/google-services.json': services('shop-prod'),
      'android/app/src/debug/google-services.json': services('shop-dev'),
      'android/app/src/benchmark/google-services.json': services('shop-dev'),
    });
    expect(result.passed).toBe(true);
    expect(result.message).toMatch(/2 non-release build variant\(s\) \/ configuration\(s\) judged in 3 file\(s\)/);
  });

  it('green: auto-init disabled for the non-release build types', () => {
    const result = check({
      'android/app/build.gradle': GRADLE,
      'android/app/google-services.json': services('shop-prod'),
      'android/app/src/debug/AndroidManifest.xml': AUTO_INIT_OFF,
      'android/app/src/benchmark/AndroidManifest.xml': AUTO_INIT_OFF,
    });
    expect(result.passed).toBe(true);
  });

  it('a placeholder in main: false in the benchmark block passes it; debug, which does not set it, is a finding', () => {
    const main = '<manifest><application><meta-data android:name="firebase_messaging_auto_init_enabled" android:value="${fcmAutoInit}" /></application></manifest>';
    const files = { 'android/app/build.gradle': GRADLE, 'android/app/google-services.json': services('p'), 'android/app/src/main/AndroidManifest.xml': main };
    const result = check(files);
    expect(result.violations).toEqual([expect.stringContaining('non-release build variant(s) debug (')]);
  });

  it('a release build with its own config makes the root one non-production', () => {
    const result = check({
      'android/app/build.gradle': GRADLE,
      'android/app/google-services.json': services('shop-dev'),
      'android/app/src/release/google-services.json': services('shop-prod'),
    });
    expect(result.passed).toBe(true);
  });

  it('Kotlin DSL build types and flavours are read', () => {
    const kts = [
      'android {',
      '  flavorDimensions += "env"',
      '  productFlavors { create("free") { dimension = "env" }; create("paid") { dimension = "env" } }',
      '  buildTypes { getByName("release") { } ; create("benchmark") { } }',
      '}',
    ].join('\n');
    const result = check({ 'app/build.gradle.kts': kts, 'app/google-services.json': services('p'), 'app/src/freeDebug/google-services.json': services('dev') });
    expect(result.violations).toEqual([expect.stringMatching(/^app\/google-services\.json:4: non-release build variant\(s\) free\/benchmark, paid\/benchmark, paid\/debug/)]);
  });

  it('a module without a published Gradle script is not judged', () => {
    const result = check({ 'android/app/google-services.json': services('p') });
    expect(result.judgedNothing).toBe(true);
  });
});

describe('#365 — iOS', () => {
  const pbxproj = (names: string[], settings = ''): string =>
    names.map(name => `\t\tA /* ${name} */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {\n\t\t\t\tPRODUCT_NAME = App;${settings}\n\t\t\t};\n\t\t\tname = ${name};\n\t\t};`).join('\n');
  const PLIST = '<plist><dict><key>PROJECT_ID</key><string>p</string></dict></plist>';

  it('red: one GoogleService-Info.plist used by Debug and Release', () => {
    const result = check({ 'ios/App/App.xcodeproj/project.pbxproj': pbxproj(['Debug', 'Release']), 'ios/App/App/GoogleService-Info.plist': PLIST });
    expect(result.violations).toEqual([expect.stringMatching(/^ios\/App\/App\/GoogleService-Info\.plist:1: Xcode configuration\(s\) Debug bundle this one GoogleService-Info\.plist/)]);
  });

  it('green: FirebaseMessagingAutoInitEnabled set to NO through a per-configuration variable', () => {
    const info = '<plist><dict><key>FirebaseMessagingAutoInitEnabled</key><string>$(FCM_AUTO_INIT)</string></dict></plist>';
    const project = `${pbxproj(['Debug'], '\n\t\t\t\tFCM_AUTO_INIT = NO;')}\n${pbxproj(['Release'], '\n\t\t\t\tFCM_AUTO_INIT = YES;')}`;
    const result = check({ 'ios/App/App.xcodeproj/project.pbxproj': project, 'ios/App/App/GoogleService-Info.plist': PLIST, 'ios/App/App/Info.plist': info });
    expect(result.passed).toBe(true);
  });

  it('green: one plist per configuration', () => {
    const result = check({
      'ios/App/App.xcodeproj/project.pbxproj': pbxproj(['Debug', 'Release']),
      'ios/App/Firebase/Debug/GoogleService-Info.plist': PLIST,
      'ios/App/Firebase/Release/GoogleService-Info.plist': PLIST,
    });
    expect(result.passed).toBe(true);
  });
});

describe('#365 — selection is the subject', () => {
  it('a project without a published Firebase app config does not select the law', () => {
    expect(lawRequirementsMet(LAW?.requires, project({ 'android/app/build.gradle': GRADLE }))).toBe(false);
  });

  it('an untracked config selects and is judged; a git-ignored one selects nothing', () => {
    const files = { 'android/app/build.gradle': GRADLE, 'android/app/google-services.json': services('p') };
    const untracked = repo(files, ['android/app/build.gradle']);
    expect(lawRequirementsMet(LAW?.requires, untracked)).toBe(true);
    expect(TestBuildsUseOwnFirebaseConfigLaw.check(ctx(untracked)).violations).toHaveLength(1);
    const ignored = repo({ ...files, '.gitignore': 'google-services.json\n' }, ['android/app/build.gradle', '.gitignore']);
    expect(lawRequirementsMet(LAW?.requires, ignored)).toBe(false);
  });

  it('ignores.global leaves the config out of the gate', () => {
    expect(lawRequirementsMet(LAW?.requires, project({ 'legacy/app/google-services.json': services('p') }), ['legacy/**'])).toBe(false);
  });

  it('no file read → judged nothing', () => {
    expect(check({ 'README.md': '#\n' }).judgedNothing).toBe(true);
  });
});

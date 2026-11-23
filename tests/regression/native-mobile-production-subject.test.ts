/**
 * #577 — the production-subject gate saw a mobile app only through a JS
 * dependency (react-native, expo, @capacitor/core, @nativescript/core). A
 * native Android, iOS or Flutter app declares none of them, so API Security
 * Standards and Environment Parity Standards were not selected for an app a
 * store ships to users' devices.
 *
 * The gate now reads what the build declares: a Gradle module applying
 * `com.android.application`, an Xcode project with an application target, a
 * Flutter `pubspec.yaml` with an entry point. A library module, and an
 * example app inside a library, are not the repository's app.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { lawRequirementsMet } from '../../src/utils/law-requirements';

const API = 'API Security Standards';
const ENV = 'Environment Parity Standards';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-577-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const law = (title: string) => {
  const found = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === title);
  if (!found) throw new Error(`law not in the registry: ${title}`);
  return found;
};
const selected = (title: string, root: string): boolean =>
  lawRequirementsMet(law(title).requires, root, []);

const MANIFEST =
  '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:label="App" /></manifest>\n';
/** The application target of an Xcode project, as Xcode writes it. */
const PBXPROJ_APP = [
  '// !$*UTF8*$!',
  '{',
  '  objects = {',
  '    1A2B3C /* App */ = {',
  '      isa = PBXNativeTarget;',
  '      name = App;',
  '      productType = "com.apple.product-type.application";',
  '    };',
  '  };',
  '}',
  '',
].join('\n');
const PBXPROJ_FRAMEWORK = PBXPROJ_APP.replace(
  'com.apple.product-type.application',
  'com.apple.product-type.framework'
);
const PUBSPEC_APP = [
  'name: shop',
  "publish_to: 'none'",
  'dependencies:',
  '  flutter:',
  '    sdk: flutter',
  '',
].join('\n');

const NATIVE_ANDROID = {
  'settings.gradle': "include ':app'\n",
  'app/build.gradle': "plugins {\n  id 'com.android.application'\n}\n",
  'app/src/main/AndroidManifest.xml': MANIFEST,
};
const NATIVE_ANDROID_KTS_CATALOG = {
  'settings.gradle.kts': 'include(":app")\n',
  'app/build.gradle.kts':
    'plugins {\n  alias(libs.plugins.android.application)\n}\n',
};
const NATIVE_IOS = {
  Podfile: "platform :ios, '15.0'\ntarget 'App' do\nend\n",
  'App.xcodeproj/project.pbxproj': PBXPROJ_APP,
};
const FLUTTER_APP = {
  'pubspec.yaml': PUBSPEC_APP,
  'lib/main.dart': 'void main() {}\n',
  'android/app/build.gradle': "apply plugin: 'com.android.application'\n",
  'ios/Runner.xcodeproj/project.pbxproj': PBXPROJ_APP,
};

describe('#577 a native mobile app is a production subject', () => {
  it.each([API, ENV])(
    'an Android app (com.android.application) selects %s',
    title => {
      expect(selected(title, project(NATIVE_ANDROID))).toBe(true);
    }
  );

  it.each([API, ENV])(
    'an Android app on a version-catalog alias selects %s',
    title => {
      expect(selected(title, project(NATIVE_ANDROID_KTS_CATALOG))).toBe(true);
    }
  );

  it.each([API, ENV])(
    'an iOS app (Xcode application target) selects %s',
    title => {
      expect(selected(title, project(NATIVE_IOS))).toBe(true);
    }
  );

  it.each([API, ENV])('a Flutter app selects %s', title => {
    expect(selected(title, project(FLUTTER_APP))).toBe(true);
  });

  it.each([API, ENV])(
    'a Flutter app whose platform folders are not committed selects %s',
    title => {
      expect(
        selected(
          title,
          project({
            'pubspec.yaml': PUBSPEC_APP,
            'lib/main.dart': 'void main() {}\n',
          })
        )
      ).toBe(true);
    }
  );
});

describe('#577 a library, or an example app inside one, is not an app', () => {
  it.each([API, ENV])(
    'an Android library (com.android.library only) does not select %s',
    title => {
      const root = project({
        'library/build.gradle': "plugins {\n  id 'com.android.library'\n}\n",
        'library/src/main/AndroidManifest.xml': '<manifest />\n',
      });
      expect(selected(title, root)).toBe(false);
    }
  );

  it.each([API, ENV])('an iOS framework project does not select %s', title => {
    const root = project({
      'Kit.xcodeproj/project.pbxproj': PBXPROJ_FRAMEWORK,
    });
    expect(selected(title, root)).toBe(false);
  });

  it.each([API, ENV])(
    'a JS library with an example app under example/android does not select %s',
    title => {
      const root = project({
        'package.json': JSON.stringify({
          name: 'rn-widget',
          version: '1.0.0',
          peerDependencies: { 'react-native': '*' },
        }),
        'src/index.ts': 'export const widget = 1;\n',
        'example/android/app/build.gradle':
          "apply plugin: 'com.android.application'\n",
        'example/ios/Example.xcodeproj/project.pbxproj': PBXPROJ_APP,
      });
      expect(selected(title, root)).toBe(false);
    }
  );

  it.each([API, ENV])(
    'a Flutter package (no lib/main.dart) with an example app does not select %s',
    title => {
      const root = project({
        'pubspec.yaml': PUBSPEC_APP.replace("publish_to: 'none'\n", ''),
        'lib/widgets.dart': 'class Widget {}\n',
        'example/pubspec.yaml': PUBSPEC_APP,
        'example/lib/main.dart': 'void main() {}\n',
      });
      expect(selected(title, root)).toBe(false);
    }
  );
});

describe('#577 controls: JS shells behave as today', () => {
  it.each([API, ENV])('a Capacitor app selects %s', title => {
    const root = project({
      'package.json': JSON.stringify({
        name: 'cap',
        version: '1.0.0',
        dependencies: { '@capacitor/core': '7.0.0' },
      }),
    });
    expect(selected(title, root)).toBe(true);
  });

  it.each([API, ENV])('a React Native app selects %s', title => {
    const root = project({
      'package.json': JSON.stringify({
        name: 'rn',
        version: '1.0.0',
        dependencies: { 'react-native': '0.76.0' },
      }),
    });
    expect(selected(title, root)).toBe(true);
  });
});

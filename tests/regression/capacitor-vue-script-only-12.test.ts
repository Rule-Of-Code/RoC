/**
 * The three Capacitor laws that read platform code read a Vue single-file
 * component's <script>, not the whole file (#12, #607).
 *
 * Capacitor Single Platform Boundary, Capacitor Deep Link Contract and
 * Capacitor Plugin Platform Declarations scan `.vue` (CAPACITOR_SOURCE_EXTENSIONS)
 * and masked the WHOLE file as TypeScript. A `.vue` file is markup first: a
 * `/*` in template text ("src/*") opened a comment that ran to the end of the
 * file and hid the script below it, and template text that spelled a call
 * ("Capacitor.getPlatform()") was read as code.
 */
import { CapacitorDeepLinkContractLaw } from '../../src/checkers/capacitor-laws/capacitor-deep-link-contract';
import { CapacitorPluginPlatformDeclarationsLaw } from '../../src/checkers/capacitor-laws/capacitor-plugin-platform-declarations';
import { CapacitorSinglePlatformBoundaryLaw } from '../../src/checkers/capacitor-laws/capacitor-single-platform-boundary';
import { ctx, removeProjects } from '../checkers/toolkit-fixture';
import {
  IGNORING_SHELLS,
  MANIFEST,
  androidManifest,
  capacitorProject,
} from '../checkers/capacitor-laws/capacitor-fixture';

afterAll(removeProjects);

/** Template text with a `/*` that no `*\/` closes. */
const GLOB_TEMPLATE = [
  '<template>',
  '  <p>Files under src/* are shown here.</p>',
  '</template>',
].join('\n');

const sfc = (template: string, script: string): string =>
  [template, '', '<script setup lang="ts">', script, '</script>', ''].join(
    '\n'
  );

describe('Capacitor Single Platform Boundary reads the script of a .vue file (#12)', () => {
  const NATIVE = [
    "import { Capacitor } from '@capacitor/core';",
    'export const platform = () => Capacitor.getPlatform();',
  ].join('\n');
  const run = (featureSfc: string) =>
    CapacitorSinglePlatformBoundaryLaw.check(
      ctx(
        capacitorProject({
          'src/native/platform.ts': NATIVE,
          'src/features/Feature.vue': featureSfc,
        }),
        { thresholds: { capacitor: { boundary: ['src/native/**'] } } }
      )
    );

  it('a script below template text with "/*" is read: the platform use outside the boundary is reported', () => {
    const result = run(
      sfc(
        GLOB_TEMPLATE,
        [
          "import { Capacitor } from '@capacitor/core';",
          "const isIos = Capacitor.getPlatform() === 'ios';",
        ].join('\n')
      )
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      'src/features/Feature.vue: uses @capacitor/core, Capacitor.getPlatform() outside thresholds.capacitor.boundary — feature code that knows its platform grows a branch per target. Move it behind a port in the boundary',
    ]);
  });

  it('template text that spells a platform call is not code: nothing is reported', () => {
    const result = run(
      sfc(
        [
          '<template>',
          '  <p>Call Capacitor.getPlatform() in src/native only.</p>',
          '</template>',
        ].join('\n'),
        "const title = 'Settings';"
      )
    );
    expect(result.violations).toEqual([]);
  });
});

describe('Capacitor Deep Link Contract reads the script of a .vue file (#12)', () => {
  const FILTER = [
    '<intent-filter android:autoVerify="true">',
    '  <action android:name="android.intent.action.VIEW" />',
    '  <category android:name="android.intent.category.DEFAULT" />',
    '  <category android:name="android.intent.category.BROWSABLE" />',
    '  <data android:scheme="https" android:host="app.example" android:pathPrefix="/i/" />',
    '</intent-filter>',
  ].join('\n');
  const LISTENER =
    "App.addListener('appUrlOpen', ({ url }) => router.push(new URL(url).pathname));";
  const run = (appSfc: string) =>
    CapacitorDeepLinkContractLaw.check(
      ctx(
        capacitorProject({
          [MANIFEST]: androidManifest(FILTER),
          'src/App.vue': appSfc,
        }),
        IGNORING_SHELLS
      )
    );

  it('a listener below template text with "/*" is seen: the filter has its listener', () => {
    expect(run(sfc(GLOB_TEMPLATE, LISTENER)).violations).toEqual([]);
  });

  it('a listener spelled in template text is not one: the filter is reported', () => {
    expect(
      run(
        sfc(
          ['<template>', `  <pre>${LISTENER}</pre>`, '</template>'].join('\n'),
          "const title = 'Links';"
        )
      ).violations
    ).toEqual([expect.stringMatching(/no App\.addListener\('appUrlOpen'\)/)]);
  });
});

describe('Capacitor Plugin Platform Declarations reads the script of a .vue file (#12)', () => {
  const PUSH = { '@capacitor/push-notifications': '8.1.3' };
  const MANIFEST_WITH_DECLARATIONS = androidManifest(
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
    '<meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="alerts" />'
  );
  const CREATE_CHANNEL =
    "await PushNotifications.createChannel({ id: 'alerts', name: 'Alerts', importance: 5 });";
  const run = (pushSfc: string) =>
    CapacitorPluginPlatformDeclarationsLaw.check(
      ctx(
        capacitorProject(
          {
            [MANIFEST]: MANIFEST_WITH_DECLARATIONS,
            'src/Push.vue': pushSfc,
          },
          {},
          PUSH
        ),
        IGNORING_SHELLS
      )
    );

  it('createChannel below template text with "/*" is seen', () => {
    expect(run(sfc(GLOB_TEMPLATE, CREATE_CHANNEL)).violations).toEqual([]);
  });

  it('control: without createChannel the channel is reported', () => {
    expect(
      run(sfc(GLOB_TEMPLATE, "const title = 'Push';")).violations
    ).not.toEqual([]);
  });
});

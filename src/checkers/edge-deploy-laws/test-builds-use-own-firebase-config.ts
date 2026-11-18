/**
 * Test Builds Use Own Firebase Config
 *
 * A debug, benchmark or test build that bundles the production Firebase
 * config registers an installation and an FCM token in the production
 * project on every cold start — even when it talks to a mock API — and a
 * measurement run writes into production. The variant → config resolution
 * and the auto-init reading are in utils/edge-deploy/firebase-android-variants
 * and firebase-ios-configs.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  autoInitDisabled,
  autoInitValues,
  type ConfigFile,
  locate,
  moduleVariants,
  projectIdOf,
  resolveConfig,
  type Variant,
} from '../../utils/edge-deploy/firebase-android-variants';
import { iosAutoInitDisabled, projectDirectory, xcodeConfigurations } from '../../utils/edge-deploy/firebase-ios-configs';
import { dirName, filesFor, gateFiles, TEST_TREES } from '../../utils/edge-deploy/gate-files';
import { REQUIRES_FIREBASE_APP_CONFIG } from '../../utils/edge-deploy/requirements';
import type { ContainingFile } from '../../utils/law-requirements';
import { EdgeDeployLawBase, newTally, type Tally } from './edge-deploy-law-base';

const CONSEQUENCE =
  'each cold start of such a build registers a Firebase installation and an FCM token in the production project, even against a mock API';

const under = (dir: string, rel: string): boolean => dir === '' || rel.startsWith(`${dir}/`);
const variantName = (variant: Variant): string => (variant.flavor ? `${variant.flavor}/${variant.buildType}` : variant.buildType);

/**
 * The accepted fixes, named in every Android finding — a warning that
 * lands on any app with one google-services.json must say how to clear
 * it, or it teaches people to waive it. Each one is a tested green.
 */
function androidFixes(module: string, buildTypes: string[]): string {
  const set = buildTypes.length === 1 ? (buildTypes[0] ?? '') : '<buildType>';
  const src = `${module ? `${module}/` : ''}src/${set}`;
  const each = buildTypes.length === 1 ? '' : ` (for each of ${buildTypes.join(', ')})`;
  return [
    `fix one of${each}: (1) ${src}/google-services.json from a dev Firebase project`,
    `(2) <meta-data android:name="firebase_messaging_auto_init_enabled" android:value="false" /> in ${src}/AndroidManifest.xml`,
    `(3) android:value="\${key}" in the manifest with manifestPlaceholders key = "false" in the ${set} build type`,
  ].join('; ');
}

/** The accepted fixes, named in every iOS finding. */
function iosFixes(configurations: string[]): string {
  const names = configurations.join(', ');
  return `fix one of: (1) a GoogleService-Info.plist per configuration (a dev project's for ${names}, copied in by a build phase); (2) FirebaseMessagingAutoInitEnabled = <false/> in the app's Info.plist, or $(VAR) with VAR = NO in the build settings of ${names}`;
}

export class TestBuildsUseOwnFirebaseConfigLaw extends EdgeDeployLawBase {
  static readonly LAW_NAME = 'Test Builds Use Own Firebase Config';

  static check(context: LawCheckContext): LawResult {
    const tally = newTally();
    const files = gateFiles(context, REQUIRES_FIREBASE_APP_CONFIG);
    const android = files.filter(file => file.rel.endsWith('google-services.json'));
    const ios = files.filter(file => file.rel.endsWith('GoogleService-Info.plist'));
    if (android.length > 0) this.android(context, android, tally);
    if (ios.length > 0) this.ios(context, ios, tally);
    return this.conclude(context, {
      name: this.LAW_NAME,
      category: 'SECURITY',
      tally,
      filesRead: files.length,
      subject: 'a Firebase app config (google-services.json / GoogleService-Info.plist)',
      unit: 'non-release build variant(s) / configuration(s) judged',
      notSeen: 'configs copied in by CI or a build script, variants created in code, which plist a Run Script phase copies',
      recommendations: [
        'Give non-release build types their own config from a dev Firebase project: src/debug/google-services.json, src/benchmark/google-services.json (iOS: a per-configuration GoogleService-Info.plist)',
        'Or turn Messaging auto-init off for them: <meta-data android:name="firebase_messaging_auto_init_enabled" android:value="false" /> in src/<buildType>/AndroidManifest.xml (iOS: FirebaseMessagingAutoInitEnabled = NO)',
      ],
      metrics: { androidConfigs: android.length, iosConfigs: ios.length },
    });
  }

  // ── Android ───────────────────────────────────────────────────────────

  private static android(context: LawCheckContext, configs: ContainingFile[], tally: Tally): void {
    const gradle = filesFor(context, { files: ['**/build.gradle', '**/build.gradle.kts'], pattern: String.raw`\S`, exclude: TEST_TREES });
    const manifests = filesFor(context, { files: ['**/AndroidManifest.xml'], pattern: 'firebase_messaging_auto_init_enabled', exclude: TEST_TREES });
    const modules = new Map<string, ConfigFile[]>();
    for (const config of configs) {
      const { module, sourceSet } = locate(config.rel);
      modules.set(module, [...(modules.get(module) ?? []), { rel: config.rel, sourceSet, ...projectIdOf(config.content) }]);
    }
    for (const [module, files] of modules) {
      const script = gradle.find(file => dirName(file.rel) === module);
      if (!script) {
        tally.notes.push(`${files[0]?.rel}: no build.gradle(.kts) for module ${module || '(root)'} among the published files — not judged`);
        continue;
      }
      const sourceSetManifests = manifests
        .map(file => ({ sourceSet: /^(?:(.*)\/)?src\/([^/]+)\/AndroidManifest\.xml$/.exec(file.rel), text: file.content }))
        .filter(found => (found.sourceSet?.[1] ?? '') === module)
        .map(found => ({ sourceSet: found.sourceSet?.[2] ?? '', text: found.text }));
      this.module(script.rel, script.content, files, autoInitValues(sourceSetManifests), tally);
    }
  }

  private static module(gradleRel: string, gradle: string, files: ConfigFile[], autoInit: Map<string, string>, tally: Tally): void {
    const variants = moduleVariants(gradle);
    if (variants.multiDimension) {
      tally.notes.push(`${gradleRel}: more than one flavour dimension — the combined variants are not followed, not judged`);
      return;
    }
    const exposed = new Map<ConfigFile, Variant[]>();
    for (const flavor of variants.flavors.length > 0 ? variants.flavors.map(block => block.name) : [null]) {
      const release = resolveConfig(files, { flavor, buildType: 'release' });
      if (!release?.projectId) continue;
      for (const buildType of variants.buildTypes.map(block => block.name).filter(name => name !== 'release')) {
        const variant = { flavor, buildType };
        const config = resolveConfig(files, variant);
        if (!config) continue;
        tally.judged++;
        if (config.projectId !== release.projectId || autoInitDisabled(variant, autoInit, variants)) continue;
        exposed.set(config, [...(exposed.get(config) ?? []), variant]);
      }
    }
    for (const [config, list] of exposed) {
      const buildTypes = [...new Set(list.map(variant => variant.buildType))];
      tally.findings.push(
        `${config.rel}:${config.line}: non-release build variant(s) ${list.map(variantName).join(', ')} (${gradleRel}) use this config — the same project_id as the release build — with Firebase Messaging auto-init not disabled; ${CONSEQUENCE} — ${androidFixes(locate(config.rel).module, buildTypes)}`
      );
    }
  }

  // ── iOS ───────────────────────────────────────────────────────────────

  private static ios(context: LawCheckContext, plists: ContainingFile[], tally: Tally): void {
    const projects = filesFor(context, { files: ['**/project.pbxproj'], pattern: 'XCBuildConfiguration', exclude: TEST_TREES });
    const infoPlists = filesFor(context, { files: ['**/Info.plist'], pattern: 'FirebaseMessagingAutoInitEnabled', exclude: TEST_TREES });
    const claimed = new Set<string>();
    for (const project of projects) {
      const dir = projectDirectory(project.rel);
      if (dir === null) continue;
      const own = plists.filter(plist => under(dir, plist.rel));
      own.forEach(plist => claimed.add(plist.rel));
      if (own.length > 0) this.xcodeProject(project.content, own, infoPlists.filter(info => under(dir, info.rel)).map(info => info.content), tally);
    }
    for (const plist of plists.filter(found => !claimed.has(found.rel))) {
      tally.notes.push(`${plist.rel}: no Xcode project (project.pbxproj) holds it among the published files — not judged`);
    }
  }

  private static xcodeProject(pbxproj: string, own: ContainingFile[], infoPlists: string[], tally: Tally): void {
    const nonRelease = xcodeConfigurations(pbxproj).filter(configuration => !/^release$/i.test(configuration.name));
    tally.judged += nonRelease.length;
    const first = own[0];
    if (own.length > 1 || !first) return;
    const exposed = nonRelease.filter(configuration => !iosAutoInitDisabled(configuration, infoPlists)).map(configuration => configuration.name);
    if (exposed.length === 0) return;
    tally.findings.push(
      `${first.rel}:1: Xcode configuration(s) ${exposed.join(', ')} bundle this one GoogleService-Info.plist — the one Release ships — with Firebase Messaging auto-init not disabled (FirebaseMessagingAutoInitEnabled); ${CONSEQUENCE} — ${iosFixes(exposed)}`
    );
  }
}

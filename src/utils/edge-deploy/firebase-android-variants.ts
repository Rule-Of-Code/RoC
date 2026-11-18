/**
 * Which Firebase project each Android build variant is built with, and
 * whether Firebase Messaging auto-init is off for it.
 *
 * The Google Services Gradle plugin (com.google.gms.google-services) picks
 * one google-services.json per variant. Its source (GoogleServicesPlugin
 * getJsonLocations) lists the module root, src/<flavor>/<buildType>,
 * src/<buildType>/<flavor>, src/<flavor>, src/<buildType> and
 * src/<flavor><BuildType>, sorted deepest first, and takes the first file
 * that exists. Android always has the `debug` and `release` build types;
 * a module may declare more (benchmark, staging, …) and product flavours.
 *
 * Auto-init: Firebase documents `<meta-data
 * android:name="firebase_messaging_auto_init_enabled" android:value="false" />`.
 * The manifest of the most specific source set that sets it wins
 * (flavour+build type, build type, flavour, main — the manifest merger's
 * order); a `${key}` value is read from `manifestPlaceholders` in the
 * build type's block, then the flavour's, then `defaultConfig`.
 */

import { blockBody, childBlocks, type GradleBlock, stripGradleComments } from './gradle-blocks';

export interface ConfigFile {
  rel: string;
  /** Path inside the module: '' for the module root, else the part after src/ ("debug", "free/debug"). */
  sourceSet: string;
  projectId: string | null;
  line: number;
}

export interface Variant {
  flavor: string | null;
  buildType: string;
}

export interface ModuleVariants {
  buildTypes: GradleBlock[];
  flavors: GradleBlock[];
  /** The `defaultConfig` block body ('' when absent): placeholders every variant inherits. */
  defaultConfig: string;
  /** More than one flavour dimension: the plugin combines flavours, which is not followed. */
  multiDimension: boolean;
}

const AUTO_INIT = 'firebase_messaging_auto_init_enabled';
const cap = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** Where a google-services.json sits: its module directory and source set. */
export function locate(rel: string): { module: string; sourceSet: string } {
  const inSourceSet = /^(?:(.*)\/)?src\/(.+)\/google-services\.json$/.exec(rel);
  if (inSourceSet) return { module: inSourceSet[1] ?? '', sourceSet: inSourceSet[2] ?? '' };
  return { module: rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '', sourceSet: '' };
}

/** project_info.project_id and its line; null id when the file cannot be parsed. */
export function projectIdOf(text: string): { projectId: string | null; line: number } {
  const at = text.split(/\r?\n/).findIndex(line => /"project_id"\s*:/.test(line));
  try {
    const parsed = JSON.parse(text) as { project_info?: { project_id?: unknown } };
    const id = parsed.project_info?.project_id;
    return { projectId: typeof id === 'string' ? id : null, line: at + 1 || 1 };
  } catch {
    return { projectId: null, line: at + 1 || 1 };
  }
}

/** The build types (debug and release always) and flavours a module's Gradle script declares. */
export function moduleVariants(gradle: string): ModuleVariants {
  const text = stripGradleComments(gradle);
  const declared = childBlocks(blockBody(text, 'buildTypes') ?? '');
  const buildTypes = [...declared];
  for (const implicit of ['debug', 'release']) {
    if (!buildTypes.some(block => block.name === implicit)) buildTypes.push({ name: implicit, body: '' });
  }
  const dimensions = /\bflavorDimensions\s*(?:\(|\+=|=)?\s*([^\n]*)/.exec(text)?.[1] ?? '';
  return {
    buildTypes,
    flavors: childBlocks(blockBody(text, 'productFlavors') ?? ''),
    defaultConfig: blockBody(text, 'defaultConfig') ?? '',
    multiDimension: (dimensions.match(/["'][^"']+["']/g) ?? []).length > 1,
  };
}

/** The source sets the plugin looks in for a variant, deepest first. */
function candidates(variant: Variant): string[] {
  const { flavor, buildType } = variant;
  if (!flavor) return [buildType, ''];
  return [`${flavor}/${buildType}`, `${buildType}/${flavor}`, flavor, buildType, `${flavor}${cap(buildType)}`, ''];
}

/** The config file the plugin would use for a variant, or undefined. */
export function resolveConfig(files: ConfigFile[], variant: Variant): ConfigFile | undefined {
  for (const sourceSet of candidates(variant)) {
    const found = files.find(file => file.sourceSet === sourceSet);
    if (found) return found;
  }
  return undefined;
}

/** The auto-init value each manifest source set declares (`main`, `debug`, `freeDebug`, …). */
export function autoInitValues(manifests: Array<{ sourceSet: string; text: string }>): Map<string, string> {
  const values = new Map<string, string>();
  for (const manifest of manifests) {
    for (const tag of manifest.text.match(/<meta-data\b[^>]*>/g) ?? []) {
      if (!tag.includes(`"${AUTO_INIT}"`)) continue;
      const value = /android:value\s*=\s*"([^"]*)"/.exec(tag)?.[1];
      if (value !== undefined) values.set(manifest.sourceSet, value);
    }
  }
  return values;
}

/** Is auto-init off for the variant? The most specific manifest that sets it decides. */
export function autoInitDisabled(variant: Variant, values: Map<string, string>, variants: ModuleVariants): boolean {
  const { flavor, buildType } = variant;
  const order = flavor ? [`${flavor}${cap(buildType)}`, buildType, flavor, 'main'] : [buildType, 'main'];
  const sourceSet = order.find(name => values.has(name));
  const value = sourceSet ? (values.get(sourceSet) ?? '') : '';
  if (value === 'false') return true;
  const placeholder = /^\$\{(\w+)\}$/.exec(value)?.[1];
  if (!placeholder) return false;
  const blocks = [variants.buildTypes.find(block => block.name === buildType)?.body, variants.flavors.find(block => block.name === flavor)?.body, variants.defaultConfig];
  const assignment = new RegExp(String.raw`["']?\b${placeholder}\b["']?\]?\s*(?::|=|,|\bto\b)\s*["']?(\w+)`);
  const setting = blocks.map(body => (body ? assignment.exec(body)?.[1] : undefined)).find(found => found !== undefined);
  return setting === 'false';
}

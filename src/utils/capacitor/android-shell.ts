/**
 * The Android shell of a Capacitor project, read the way Gradle reads it.
 *
 * Gradle merges `src/main` into EVERY variant; `src/debug`, `src/release`,
 * `src/<flavour>` reach only the variants they are named after. So a question
 * about what ships is a question about WHICH source set holds the answer, and
 * this module lists the source sets instead of reading one fixed manifest.
 *
 * Every file here is opened by its path, independent of `ignores`: most of
 * `android/` is Capacitor's mirror of the web build and a project rightly
 * excludes it from the scan, while the manifests, the resource XML and the
 * build script inside it are source.
 */

import * as fs from 'fs';
import { PathOperations } from '../path-operations';
import { type CapacitorNativePaths, CapacitorProjects } from './capacitor-project';

export interface AndroidSourceSet {
  /** `main`, `debug`, `release`, a flavour or build type name. */
  name: string;
  dir: string;
  /** The source set's AndroidManifest.xml, or null when it has none. */
  manifest: string | null;
}

export interface NativeFile {
  file: string;
  text: string;
}

/** Source sets that reach every variant, or the release variant by name. */
export const SHIPPED_SOURCE_SETS: readonly string[] = ['main', 'release'];

const XML_COMMENT = /<!--[\s\S]*?-->/g;
const ATTRIBUTE = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export class AndroidShell {
  /** android/app — the directory of the app module's build script. */
  static appDir(native: CapacitorNativePaths): string {
    return PathOperations.getDirectory(native.androidAppBuildGradle);
  }

  /** android/app/src — the parent of every source set. */
  static srcDir(native: CapacitorNativePaths): string {
    return PathOperations.getDirectory(PathOperations.getDirectory(native.androidManifest));
  }

  /** Every directory under app/src, with its manifest when it has one. */
  static sourceSets(native: CapacitorNativePaths): AndroidSourceSet[] {
    const src = this.srcDir(native);
    let names: string[];
    try {
      names = fs
        .readdirSync(src, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();
    } catch {
      return [];
    }
    return names.map(name => {
      const dir = PathOperations.join(src, name);
      const manifest = PathOperations.join(dir, 'AndroidManifest.xml');
      return { name, dir, manifest: fs.existsSync(manifest) ? manifest : null };
    });
  }

  /** The app module's build script: build.gradle, else build.gradle.kts; null when neither exists. */
  static buildScript(native: CapacitorNativePaths): NativeFile | null {
    const groovy = native.androidAppBuildGradle;
    for (const file of [groovy, `${groovy}.kts`]) {
      const text = CapacitorProjects.readNative(file);
      if (text !== null) return { file, text };
    }
    return null;
  }

  /** The attributes of the manifest's `<application>` element; null when there is none. */
  static applicationAttributes(manifest: string): Map<string, string> | null {
    const tag = /<application\b([^>]*)>/.exec(manifest.replace(XML_COMMENT, ' '));
    if (!tag) return null;
    return this.attributes(tag[1] ?? '');
  }

  /** Attributes of one XML start tag's attribute text. */
  static attributes(text: string): Map<string, string> {
    const attributes = new Map<string, string>();
    for (const match of text.matchAll(ATTRIBUTE)) {
      if (match[1]) attributes.set(match[1], match[2] ?? match[3] ?? '');
    }
    return attributes;
  }

  /**
   * The XML resource a manifest attribute names (`@xml/name`), resolved the
   * way resources merge: the source set's own `res/xml`, else main's. Null
   * when the reference is not `@xml/…` or no file exists.
   */
  static xmlResource(
    native: CapacitorNativePaths,
    sourceSet: string,
    reference: string
  ): NativeFile | null {
    const name = /^@xml\/([\w.]+)$/.exec(reference.trim())?.[1];
    if (!name) return null;
    const src = this.srcDir(native);
    for (const set of [...new Set([sourceSet, 'main'])]) {
      const file = PathOperations.join(src, set, 'res', 'xml', `${name}.xml`);
      const text = CapacitorProjects.readNative(file);
      if (text !== null) return { file, text };
    }
    return null;
  }

  /** XML with its comments blanked, for a reader that must not see commented-out markup. */
  static withoutComments(xml: string): string {
    return xml.replace(XML_COMMENT, ' ');
  }
}

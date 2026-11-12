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
 * build script inside it are source. And every file is read through a
 * {@link CommittedShell}: where git can answer, what is judged is what the
 * commit holds, not what this disk happens to hold.
 */

import { PathOperations } from '../path-operations';
import { type CapacitorNativePaths } from './capacitor-project';
import { type CommittedRead, CommittedShell } from './committed-shell';

export interface AndroidSourceSet {
  /** `main`, `debug`, `release`, a flavour or build type name. */
  name: string;
  dir: string;
  /** The source set's AndroidManifest.xml path (whether or not it exists). */
  manifest: string;
}

export interface NativeFile {
  file: string;
  text: string;
}

/** A `@bool/name` resource, resolved through every `res/values*` directory that can supply it. */
export interface BoolResource {
  /** Each definition found: the file and its value as written (`true`, `false`, `@bool/other`). */
  values: Array<{ file: string; value: string }>;
}

/** Source sets that reach every variant, or the release variant by name. */
export const SHIPPED_SOURCE_SETS: readonly string[] = ['main', 'release'];

export const ANDROID_MANIFEST_FILE = 'AndroidManifest.xml';
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

  /** The committed view of a project's Android shell. */
  static committed(projectRoot: string, native: CapacitorNativePaths): CommittedShell {
    return CommittedShell.of(projectRoot, [native.androidDir]);
  }

  /** Every directory under app/src that the shell holds, with the path of its manifest. */
  static sourceSets(native: CapacitorNativePaths, shell: CommittedShell): AndroidSourceSet[] {
    const src = this.srcDir(native);
    return shell.childDirs(src).map(name => {
      const dir = PathOperations.join(src, name);
      return { name, dir, manifest: PathOperations.join(dir, ANDROID_MANIFEST_FILE) };
    });
  }

  /**
   * The app module's build script: build.gradle, else build.gradle.kts. When
   * neither is read, the read of build.gradle says why (absent, untracked).
   */
  static buildScript(
    native: CapacitorNativePaths,
    shell: CommittedShell
  ): NativeFile | { file: string; notRead: Exclude<CommittedRead, { state: 'read' }> } {
    const groovy = native.androidAppBuildGradle;
    let first: { file: string; notRead: Exclude<CommittedRead, { state: 'read' }> } | null = null;
    for (const file of [groovy, `${groovy}.kts`]) {
      const read = shell.read(file);
      if (read.state === 'read') return { file, text: read.text };
      // Report the more telling reason: a script on disk but not committed over one that is absent.
      if (!first || (first.notRead.state === 'absent' && read.state !== 'absent')) first = { file, notRead: read };
    }
    return first ?? { file: groovy, notRead: { state: 'absent' } };
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
    shell: CommittedShell,
    sourceSet: string,
    reference: string
  ): NativeFile | null {
    const name = /^@xml\/([\w.]+)$/.exec(reference.trim())?.[1];
    if (!name) return null;
    const src = this.srcDir(native);
    for (const set of [...new Set([sourceSet, 'main'])]) {
      const file = PathOperations.join(src, set, 'res', 'xml', `${name}.xml`);
      const text = shell.text(file);
      if (text !== null) return { file, text };
    }
    return null;
  }

  /**
   * The `<bool name="…">` definitions a manifest attribute (`@bool/name`)
   * can resolve to: every `res/values*` directory (`values`, `values-v28`, …)
   * of the source set and of main, because a qualified directory decides the
   * value on the devices it matches. Null when the reference is not
   * `@bool/…` or no definition exists.
   */
  static boolResource(
    native: CapacitorNativePaths,
    shell: CommittedShell,
    sourceSet: string,
    reference: string
  ): BoolResource | null {
    const name = /^@bool\/([\w.]+)$/.exec(reference.trim())?.[1];
    if (!name) return null;
    const src = this.srcDir(native);
    const definition = new RegExp(`<bool\\b[^>]*\\bname\\s*=\\s*["']${name.replace(/\./g, '\\.')}["'][^>]*>([^<]*)</bool>`, 'g');
    const files = [...new Set([sourceSet, 'main'])].flatMap(set => {
      const res = PathOperations.join(src, set, 'res');
      return shell
        .childDirs(res)
        .filter(child => child === 'values' || child.startsWith('values-'))
        .flatMap(dir => shell.filesUnder(PathOperations.join(res, dir), ['.xml']));
    });
    const values = files.flatMap(file =>
      [...this.withoutComments(shell.text(file) ?? '').matchAll(definition)].map(match => ({
        file,
        value: (match[1] ?? '').trim(),
      }))
    );
    return values.length > 0 ? { values } : null;
  }

  /** XML with its comments blanked, for a reader that must not see commented-out markup. */
  static withoutComments(xml: string): string {
    return xml.replace(XML_COMMENT, ' ');
  }
}

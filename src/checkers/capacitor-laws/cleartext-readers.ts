/**
 * The readers of Capacitor Android Cleartext Debug Only: the cleartext
 * openings of a network security config, and the manifests a build script
 * points a shipped source set at.
 */

import {
  AndroidShell,
  SHIPPED_SOURCE_SETS,
} from '../../utils/capacitor/android-shell';
import { GradleText } from '../../utils/capacitor/gradle-text';
import { PathOperations } from '../../utils/path-operations';

export const PERMITTED = 'cleartextTrafficPermitted';
export const BASE_CONFIG = 'base-config' as const;
/** At a `manifest.srcFile`: `'x'`, `("x")`, `file('x')`, `= file("x")` — a literal target this law can follow. */
const SRC_FILE_AT =
  /^manifest\.srcFile\s*(?:=\s*)?\(?\s*(?:(?:project\s*\.\s*)?file\s*\(\s*)?["']([^"'\n]+)["']/;
/** The dotted set prefix just before a `manifest.srcFile` on the same line. */
const DOTTED_SET_BEFORE =
  /\bsourceSets\s*(?:\.\s*(\w+)|\.\s*getByName\s*\(\s*["'](\w+)["']\s*\)|\[\s*["'](\w+)["']\s*\])\s*\.\s*$/;
const ANY_SRC_FILE = /\bmanifest\.srcFile\b/g;

export interface CleartextOpening {
  /** `base-config` opens every host; `domain-config` the hosts it names. */
  kind: 'base-config' | 'domain-config';
  domains: string[];
}

/** A shipped source set whose manifest the build script points elsewhere. */
export interface ManifestRedirect {
  set: string;
  /** The target manifest, resolved against the app module directory. */
  file: string;
}

export interface RedirectReading {
  redirects: ManifestRedirect[];
  /** `manifest.srcFile` calls whose set or target this law cannot follow (a variable, a computed path). */
  unread: Array<{ line: number; set?: string | undefined }>;
}

/**
 * Every cleartext opening of a network security config. A nested
 * domain-config without its own cleartextTrafficPermitted takes its
 * parent's, as Android documents for the element.
 */
export function openings(xml: string): CleartextOpening[] {
  const reader = new NetworkSecurityConfigReader();
  const token =
    /<(\/?)(base-config|domain-config|domain)\b([^>]*?)(\/?)>|([^<]+)/g;
  for (const [
    ,
    closing,
    tag,
    attributeText,
    selfClosing,
    text,
  ] of AndroidShell.withoutComments(xml).matchAll(token)) {
    if (text !== undefined) reader.text(text);
    else
      reader.tag(
        tag ?? '',
        Boolean(closing),
        Boolean(selfClosing),
        attributeText ?? ''
      );
  }
  return reader.openings;
}

/**
 * The manifests the build script points a shipped set at
 * (`sourceSets.release.manifest.srcFile '…'`, the same through
 * `getByName("release")` / `["release"]`, or inside a
 * `sourceSets { release { … } }` block), each resolved against the app
 * module directory as Gradle resolves `file(…)` — wherever it points.
 */
export function manifestRedirects(
  buildGradle: string,
  script: string | undefined
): RedirectReading {
  const reading: RedirectReading = { redirects: [], unread: [] };
  if (!script) return reading;
  const gradle = new GradleText(script);
  const appDir = PathOperations.getDirectory(buildGradle);
  for (const match of gradle.code.matchAll(ANY_SRC_FILE)) {
    const offset = match.index ?? 0;
    const set = redirectedSet(gradle, offset);
    // A debug or flavour set's redirect does not decide what ships.
    if (set !== undefined && !SHIPPED_SOURCE_SETS.includes(set)) continue;
    const file = SRC_FILE_AT.exec(gradle.plain.slice(offset))?.[1];
    if (set === undefined || file === undefined) {
      reading.unread.push({ line: gradle.lineOf(offset), set });
      continue;
    }
    const target = PathOperations.isAbsolute(file)
      ? PathOperations.normalize(file)
      : PathOperations.join(appDir, file);
    reading.redirects.push({ set, file: target });
  }
  return reading;
}

/**
 * The source set a `manifest.srcFile` at `offset` belongs to: the dotted
 * prefix on its own line (`sourceSets.release.`, `sourceSets.getByName("release").`,
 * `sourceSets["release"].`), else the innermost block that is a child of
 * `sourceSets { … }` or is headed `sourceSets.release { … }`. Undefined
 * when neither says.
 */
function redirectedSet(gradle: GradleText, offset: number): string | undefined {
  const lineStart = gradle.plain.lastIndexOf('\n', offset - 1) + 1;
  const dotted = DOTTED_SET_BEFORE.exec(gradle.plain.slice(lineStart, offset));
  if (dotted) return dotted[1] ?? dotted[2] ?? dotted[3];
  const enclosing = gradle.enclosing(offset);
  const block = enclosing[enclosing.length - 1];
  if (!block?.name) return undefined;
  return block.parent?.name === 'sourceSets' ||
    /\bsourceSets\s*[.[]/.test(block.header)
    ? block.name
    : undefined;
}

/** Walks the tags of a network security config, keeping the domain-config nesting. */
class NetworkSecurityConfigReader {
  readonly openings: CleartextOpening[] = [];
  private readonly stack: Array<{ permitted: boolean; domains: string[] }> = [];
  private inDomain = false;

  text(text: string): void {
    if (this.inDomain)
      this.stack[this.stack.length - 1]?.domains.push(text.trim());
  }

  tag(
    tag: string,
    closing: boolean,
    selfClosing: boolean,
    attributeText: string
  ): void {
    const permitted = AndroidShell.attributes(attributeText).get(PERMITTED);
    if (tag === 'domain') {
      this.inDomain = !closing && !selfClosing;
    } else if (tag === BASE_CONFIG) {
      if (!closing && permitted === 'true')
        this.openings.push({ kind: BASE_CONFIG, domains: [] });
    } else if (closing) {
      this.closeDomainConfig();
    } else if (!selfClosing) {
      // A self-closing domain-config names no domain and opens nothing.
      const inherited = this.stack[this.stack.length - 1]?.permitted ?? false;
      this.stack.push({
        permitted: permitted === undefined ? inherited : permitted === 'true',
        domains: [],
      });
    }
  }

  private closeDomainConfig(): void {
    const frame = this.stack.pop();
    if (frame?.permitted)
      this.openings.push({
        kind: 'domain-config',
        domains: frame.domains.filter(Boolean),
      });
  }
}

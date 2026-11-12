/**
 * Capacitor Android Cleartext Debug Only
 *
 * `server.cleartext` is not the only way to open cleartext in a Capacitor
 * app. The Android shell has two more — `android:usesCleartextTraffic` on
 * `<application>`, and a network security config that permits cleartext —
 * and Gradle merges `src/main` into EVERY variant. An opening placed there to
 * let a debug build reach http://localhost ships in the release APK.
 *
 * So the law reads every source set's manifest and the XML it references:
 * - in a shipped set (`main`, `release`, or a manifest the build script
 *   routes one of them to) any opening is red;
 * - in any other set an opening is green only as a `domain-config` naming the
 *   loopback hosts a debug build uses: localhost, 127.0.0.1, 10.0.2.2.
 *
 * A value the build fills in (`${placeholder}`), a resource reference that
 * does not resolve, a referenced file that is not there, a main manifest
 * that is missing or not committed, or a `manifest.srcFile` whose target
 * cannot be read is reported as not judged — never passed.
 *
 * The manifests are read as the commit holds them (CommittedShell): a
 * manifest on this disk that git does not track is not in a clean checkout.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AndroidShell, SHIPPED_SOURCE_SETS } from '../../utils/capacitor/android-shell';
import {
  type PlatformProject,
  projectsWithPlatform,
  relative,
} from '../../utils/capacitor/capacitor-law-support';
import { type CapacitorNativePaths } from '../../utils/capacitor/capacitor-project';
import { type CommittedShell, notReadReason } from '../../utils/capacitor/committed-shell';
import { GradleText } from '../../utils/capacitor/gradle-text';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

/** The hosts a debug build reaches over cleartext: the device itself and the emulator's host. */
export const LOOPBACK_HOSTS: readonly string[] = ['localhost', '127.0.0.1', '10.0.2.2'];

const USES_CLEARTEXT = 'android:usesCleartextTraffic';
const NETWORK_SECURITY_CONFIG = 'android:networkSecurityConfig';
const NOT_JUDGED = 'not judged — this law does not pass a value it cannot read';
const SCOPE_IT = `scope it to ${LOOPBACK_HOSTS.join(' / ')} in a domain-config`;
const MOVE_IT = 'move it to src/debug';
const PERMITTED = 'cleartextTrafficPermitted';
const BASE_CONFIG = 'base-config' as const;
/** At a `manifest.srcFile`: `'x'`, `("x")`, `file('x')`, `= file("x")` — a literal target this law can follow. */
const SRC_FILE_AT = /^manifest\.srcFile\s*(?:=\s*)?\(?\s*(?:(?:project\s*\.\s*)?file\s*\(\s*)?["']([^"'\n]+)["']/;
/** The dotted set prefix just before a `manifest.srcFile` on the same line. */
const DOTTED_SET_BEFORE = /\bsourceSets\s*(?:\.\s*(\w+)|\.\s*getByName\s*\(\s*["'](\w+)["']\s*\)|\[\s*["'](\w+)["']\s*\])\s*\.\s*$/;
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
  unread: Array<{ line: number; set?: string }>;
}

interface Judged {
  /** The manifest, relative to the workspace root. */
  where: string;
  set: string;
  shipped: boolean;
  /** How the build script routes this manifest into a shipped variant, when it does. */
  shippedBy?: string;
}

interface Planned {
  file: string;
  set: string;
  shippedBy?: string;
  /** A shipped manifest the build needs: not reading it is a finding, not a skip. */
  required: boolean;
}

export class CapacitorAndroidCleartextDebugOnlyLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Android Cleartext Debug Only';

  static check(context: LawCheckContext): LawResult {
    const { projects, notRead } = projectsWithPlatform(context, 'android');
    const violations = [...notRead, ...projects.flatMap(project => this.checkProject(context, project))];
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        `Keep android/app/src/main free of cleartext; put a network security config naming only ${LOOPBACK_HOSTS.join(', ')} in src/debug (or a dev build type) and reference it from that source set's own AndroidManifest.xml`,
      ],
      context
    );
  }

  private static checkProject(context: LawCheckContext, { native }: PlatformProject): string[] {
    const shell = AndroidShell.committed(context.projectRoot, native);
    const { redirects, violations } = this.readRedirects(context, native, shell);
    for (const planned of this.plan(native, shell, redirects)) {
      const where = relative(context, planned.file);
      const read = shell.read(planned.file);
      if (read.state !== 'read') {
        if (planned.required) {
          violations.push(
            `${where}: ${notReadReason(read)} — ${planned.shippedBy ? `the build script ships it (${planned.shippedBy})` : 'it is the main manifest every variant merges'}, so cleartext is ${NOT_JUDGED}`
          );
        }
        continue;
      }
      const judged: Judged = {
        where,
        set: planned.set,
        shipped: SHIPPED_SOURCE_SETS.includes(planned.set),
        shippedBy: planned.shippedBy,
      };
      // Only the main manifest must carry <application>. Another source set's
      // manifest — redirected or not — is an overlay the merger folds into
      // main, and an overlay that only removes a permission has none.
      const needsApplication = planned.required && planned.set === 'main';
      violations.push(...this.checkManifest(context, native, shell, read.text, judged, needsApplication));
    }
    return violations;
  }

  /** The build script's manifest redirects, and a finding for each it could not follow. */
  private static readRedirects(
    context: LawCheckContext,
    native: CapacitorNativePaths,
    shell: CommittedShell
  ): { redirects: ManifestRedirect[]; violations: string[] } {
    const script = AndroidShell.buildScript(native, shell);
    const where = relative(context, script.file);
    const violations: string[] = [];
    // An absent script leaves Gradle's default layout; one that exists but is not read may redirect the manifest.
    if ('notRead' in script && script.notRead.state !== 'absent') {
      violations.push(
        `${where}: ${notReadReason(script.notRead)} — a manifest.srcFile in it would decide which manifest ships, so the redirects are ${NOT_JUDGED}`
      );
    }
    const reading = this.manifestRedirects(native.androidAppBuildGradle, 'text' in script ? script.text : undefined);
    for (const unread of reading.unread) {
      const why = unread.set
        ? `manifest.srcFile of ${unread.set} names its target with something other than a string literal`
        : 'manifest.srcFile is not inside a sourceSets.<name> this law can attribute to a source set';
      violations.push(`${where}:${unread.line}: ${why} — the manifest that ships is ${NOT_JUDGED}`);
    }
    return { redirects: reading.redirects, violations };
  }

  /**
   * The manifests Gradle merges, and which set each belongs to. A shipped set
   * redirected by `manifest.srcFile` contributes its target — wherever it
   * points, inside app/src or not — and not the file at its default path.
   * The main manifest (default or redirected) is required.
   */
  private static plan(native: CapacitorNativePaths, shell: CommittedShell, redirects: ManifestRedirect[]): Planned[] {
    const planned = new Map<string, Planned>();
    const redirectedSets = new Set<string>();
    for (const { set, file } of redirects) {
      redirectedSets.add(set);
      const key = PathOperations.normalize(file);
      if (!planned.has(key)) planned.set(key, { file, set, shippedBy: `sourceSets.${set}.manifest.srcFile`, required: true });
    }
    if (!redirectedSets.has('main')) {
      planned.set(PathOperations.normalize(native.androidManifest), { file: native.androidManifest, set: 'main', required: true });
    }
    for (const set of AndroidShell.sourceSets(native, shell)) {
      // A redirected set's default manifest is not what Gradle reads for it.
      if (redirectedSets.has(set.name)) continue;
      const key = PathOperations.normalize(set.manifest);
      if (!planned.has(key)) planned.set(key, { file: set.manifest, set: set.name, required: false });
    }
    return [...planned.values()];
  }

  private static checkManifest(
    context: LawCheckContext,
    native: CapacitorNativePaths,
    shell: CommittedShell,
    manifest: string,
    judged: Judged,
    required: boolean
  ): string[] {
    const attributes = AndroidShell.applicationAttributes(manifest);
    if (!attributes) {
      return required
        ? [`${judged.where}: no readable <application> element — this law reads the shipped manifest's cleartext settings and does not pass without it`]
        : [];
    }
    const violations: string[] = [];
    const uses = attributes.get(USES_CLEARTEXT);
    if (uses !== undefined) violations.push(...this.checkUsesCleartext(context, native, shell, judged, uses));
    const reference = attributes.get(NETWORK_SECURITY_CONFIG);
    if (reference !== undefined) violations.push(...this.checkConfig(context, native, shell, judged, reference));
    return violations;
  }

  /** `true`/`false` literally, or a `@bool/…` resource resolved through res/values*; anything else is not judged. */
  private static checkUsesCleartext(
    context: LawCheckContext,
    native: CapacitorNativePaths,
    shell: CommittedShell,
    judged: Judged,
    uses: string
  ): string[] {
    const value = uses.trim().toLowerCase();
    if (value === 'false') return [];
    if (value === 'true') return [this.opensEverything(judged, judged.where, `${USES_CLEARTEXT}="true"`)];
    if (uses.includes('${')) return [`${judged.where}: ${USES_CLEARTEXT}="${uses}" is filled in by the build — ${NOT_JUDGED}`];
    const resource = AndroidShell.boolResource(native, shell, judged.set, uses);
    const values = resource?.values ?? [];
    const unjudged = values.filter(({ value: written }) => !['true', 'false'].includes(written.toLowerCase()));
    if (values.length === 0 || unjudged.length > 0) {
      return [
        `${judged.where}: ${USES_CLEARTEXT}="${uses}" ${values.length === 0 ? `does not resolve to a <bool> in res/values* of ${judged.set === 'main' ? 'main' : `${judged.set} or main`}` : `resolves to ${unjudged.map(({ value: written }) => `"${written}"`).join(', ')}, not true or false`} — ${NOT_JUDGED}`,
      ];
    }
    return values
      .filter(({ value: written }) => written.toLowerCase() === 'true')
      .map(({ file }) => this.opensEverything(judged, judged.where, `${USES_CLEARTEXT}="${uses}" (true in ${relative(context, file)})`));
  }

  private static checkConfig(
    context: LawCheckContext,
    native: CapacitorNativePaths,
    shell: CommittedShell,
    judged: Judged,
    reference: string
  ): string[] {
    const resource = reference.includes('${') ? null : AndroidShell.xmlResource(native, shell, judged.set, reference);
    if (!resource) {
      return [
        `${judged.where}: ${NETWORK_SECURITY_CONFIG}="${reference}" does not resolve to a file in res/xml of ${judged.set === 'main' ? 'main' : `${judged.set} or main`} — ${NOT_JUDGED}`,
      ];
    }
    const where = relative(context, resource.file);
    return this.openings(resource.text).flatMap(opening => {
      const label =
        opening.kind === BASE_CONFIG
          ? `<base-config ${PERMITTED}="true">`
          : `<domain-config ${PERMITTED}="true"> for ${opening.domains.join(', ') || 'no domain'}`;
      if (judged.shipped || opening.kind === BASE_CONFIG) {
        return [this.opensEverything(judged, where, `${label} (referenced from ${judged.where})`)];
      }
      const other = opening.domains.filter(domain => !LOOPBACK_HOSTS.includes(domain.toLowerCase()));
      return other.length === 0
        ? []
        : [`${where}: ${label} opens ${other.join(', ')} for the ${judged.set} builds — ${SCOPE_IT}`];
    });
  }

  /** A shipped opening, or an opening of every host in a non-shipped set. */
  private static opensEverything(judged: Judged, where: string, what: string): string {
    if (!judged.shipped) {
      return `${where}: ${what} opens cleartext to every host for the ${judged.set} builds — ${SCOPE_IT}`;
    }
    if (judged.shippedBy) {
      return `${where}: ${what} — the build script ships this manifest (${judged.shippedBy}), so it is in the release APK; ${MOVE_IT}`;
    }
    return judged.set === 'main'
      ? `${where}: ${what} — src/main is merged into every variant, so it ships in the release APK; ${MOVE_IT}`
      : `${where}: ${what} — the ${judged.set} source set ships, so it is in the release APK; ${MOVE_IT}`;
  }

  /**
   * Every cleartext opening of a network security config. A nested
   * domain-config without its own cleartextTrafficPermitted takes its
   * parent's, as Android documents for the element.
   */
  static openings(xml: string): CleartextOpening[] {
    const reader = new NetworkSecurityConfigReader();
    const token = /<(\/?)(base-config|domain-config|domain)\b([^>]*?)(\/?)>|([^<]+)/g;
    for (const [, closing, tag, attributeText, selfClosing, text] of AndroidShell.withoutComments(xml).matchAll(token)) {
      if (text !== undefined) reader.text(text);
      else reader.tag(tag ?? '', Boolean(closing), Boolean(selfClosing), attributeText ?? '');
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
  static manifestRedirects(buildGradle: string, script: string | undefined): RedirectReading {
    const reading: RedirectReading = { redirects: [], unread: [] };
    if (!script) return reading;
    const gradle = new GradleText(script);
    const appDir = PathOperations.getDirectory(buildGradle);
    for (const match of gradle.code.matchAll(ANY_SRC_FILE)) {
      const offset = match.index ?? 0;
      const set = this.redirectedSet(gradle, offset);
      // A debug or flavour set's redirect does not decide what ships.
      if (set !== undefined && !SHIPPED_SOURCE_SETS.includes(set)) continue;
      const file = SRC_FILE_AT.exec(gradle.plain.slice(offset))?.[1];
      if (set === undefined || file === undefined) {
        reading.unread.push({ line: gradle.lineOf(offset), set });
        continue;
      }
      const target = PathOperations.isAbsolute(file) ? PathOperations.normalize(file) : PathOperations.join(appDir, file);
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
  private static redirectedSet(gradle: GradleText, offset: number): string | undefined {
    const lineStart = gradle.plain.lastIndexOf('\n', offset - 1) + 1;
    const dotted = DOTTED_SET_BEFORE.exec(gradle.plain.slice(lineStart, offset));
    if (dotted) return dotted[1] ?? dotted[2] ?? dotted[3];
    const enclosing = gradle.enclosing(offset);
    const block = enclosing[enclosing.length - 1];
    if (!block?.name) return undefined;
    return block.parent?.name === 'sourceSets' || /\bsourceSets\s*[.[]/.test(block.header) ? block.name : undefined;
  }
}

/** Walks the tags of a network security config, keeping the domain-config nesting. */
class NetworkSecurityConfigReader {
  readonly openings: CleartextOpening[] = [];
  private readonly stack: Array<{ permitted: boolean; domains: string[] }> = [];
  private inDomain = false;

  text(text: string): void {
    if (this.inDomain) this.stack[this.stack.length - 1]?.domains.push(text.trim());
  }

  tag(tag: string, closing: boolean, selfClosing: boolean, attributeText: string): void {
    const permitted = AndroidShell.attributes(attributeText).get(PERMITTED);
    if (tag === 'domain') {
      this.inDomain = !closing && !selfClosing;
    } else if (tag === BASE_CONFIG) {
      if (!closing && permitted === 'true') this.openings.push({ kind: BASE_CONFIG, domains: [] });
    } else if (closing) {
      this.closeDomainConfig();
    } else if (!selfClosing) {
      // A self-closing domain-config names no domain and opens nothing.
      const inherited = this.stack[this.stack.length - 1]?.permitted ?? false;
      this.stack.push({ permitted: permitted === undefined ? inherited : permitted === 'true', domains: [] });
    }
  }

  private closeDomainConfig(): void {
    const frame = this.stack.pop();
    if (frame?.permitted) this.openings.push({ kind: 'domain-config', domains: frame.domains.filter(Boolean) });
  }
}

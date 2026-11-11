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
 * A value the build fills in (`${placeholder}`) or a referenced file that is
 * not there cannot be judged, and is reported as not judged — never passed.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AndroidShell, SHIPPED_SOURCE_SETS } from '../../utils/capacitor/android-shell';
import {
  type PlatformProject,
  projectsWithPlatform,
  relative,
} from '../../utils/capacitor/capacitor-law-support';
import { type CapacitorNativePaths, CapacitorProjects } from '../../utils/capacitor/capacitor-project';
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
const SRC_FILE = /manifest\.srcFile\s*\(?\s*["']([^"'\n]+)["']/;
const DOTTED_SRC_FILE = /sourceSets\.(\w+)\.manifest\.srcFile\s*\(?\s*["']([^"'\n]+)["']/g;

export interface CleartextOpening {
  /** `base-config` opens every host; `domain-config` the hosts it names. */
  kind: 'base-config' | 'domain-config';
  domains: string[];
}

interface Judged {
  /** The manifest, relative to the workspace root. */
  where: string;
  set: string;
  shipped: boolean;
  /** How the build script routes this manifest into a shipped variant, when it does. */
  shippedBy?: string;
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
    const redirected = this.redirectedManifests(native.androidAppBuildGradle, AndroidShell.buildScript(native)?.text);
    return AndroidShell.sourceSets(native).flatMap(set => {
      if (!set.manifest) return [];
      const shippedBy = redirected.get(PathOperations.normalize(set.dir));
      const judged: Judged = {
        where: relative(context, set.manifest),
        set: set.name,
        shipped: SHIPPED_SOURCE_SETS.includes(set.name) || shippedBy !== undefined,
        shippedBy,
      };
      const text = CapacitorProjects.readNative(set.manifest) ?? '';
      return this.checkManifest(context, native, text, judged);
    });
  }

  private static checkManifest(
    context: LawCheckContext,
    native: CapacitorNativePaths,
    manifest: string,
    judged: Judged
  ): string[] {
    const attributes = AndroidShell.applicationAttributes(manifest);
    if (!attributes) return [];
    const violations: string[] = [];
    const uses = attributes.get(USES_CLEARTEXT);
    if (uses?.includes('${')) {
      violations.push(`${judged.where}: ${USES_CLEARTEXT}="${uses}" is filled in by the build — ${NOT_JUDGED}`);
    } else if (uses?.trim().toLowerCase() === 'true') {
      violations.push(this.opensEverything(judged, judged.where, `${USES_CLEARTEXT}="true"`));
    }
    const reference = attributes.get(NETWORK_SECURITY_CONFIG);
    if (reference !== undefined) violations.push(...this.checkConfig(context, native, judged, reference));
    return violations;
  }

  private static checkConfig(
    context: LawCheckContext,
    native: CapacitorNativePaths,
    judged: Judged,
    reference: string
  ): string[] {
    const resource = reference.includes('${') ? null : AndroidShell.xmlResource(native, judged.set, reference);
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
   * Source-set directories the build script points a shipped manifest at
   * (`sourceSets.release.manifest.srcFile '…'`, or the same inside a
   * `sourceSets { release { … } }` block), keyed by normalised directory.
   */
  static redirectedManifests(buildGradle: string, script: string | undefined): Map<string, string> {
    const redirected = new Map<string, string>();
    if (!script) return redirected;
    const gradle = new GradleText(script);
    const appDir = PathOperations.getDirectory(buildGradle);
    const record = (set: string, file: string) => {
      if (!SHIPPED_SOURCE_SETS.includes(set)) return;
      const dir = PathOperations.getDirectory(PathOperations.join(appDir, file));
      redirected.set(PathOperations.normalize(dir), `sourceSets.${set}.manifest.srcFile`);
    };
    for (const match of gradle.plain.matchAll(DOTTED_SRC_FILE)) record(match[1] ?? '', match[2] ?? '');
    for (const container of gradle.named('sourceSets')) {
      for (const set of gradle.children(container)) {
        const file = SRC_FILE.exec(gradle.ownText(set))?.[1];
        if (file) record(set.name, file);
      }
    }
    return redirected;
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

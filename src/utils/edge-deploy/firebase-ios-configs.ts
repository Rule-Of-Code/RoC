/**
 * Which Xcode build configurations ship one GoogleService-Info.plist, and
 * whether Firebase Messaging auto-init is off for them.
 *
 * An Xcode project lists its build configurations as XCBuildConfiguration
 * entries (`name = Debug;`) in project.pbxproj. One GoogleService-Info.plist
 * in the project directory is the config every configuration bundles,
 * Release included — so a Debug or Benchmark build talks to the production
 * project. Firebase documents `FirebaseMessagingAutoInitEnabled = NO` in the
 * app's Info.plist; a `$(VAR)` value is read per configuration from the
 * build settings of that configuration.
 */

export interface XcodeConfiguration {
  name: string;
  settings: string;
}

const CONFIGURATION =
  /isa\s*=\s*XCBuildConfiguration;\s*buildSettings\s*=\s*\{([\s\S]*?)\};\s*name\s*=\s*"?([^";\n]+)"?;/g;
const AUTO_INIT =
  /<key>FirebaseMessagingAutoInitEnabled<\/key>\s*(<false\s*\/>|<true\s*\/>|<string>([^<]*)<\/string>)/;

/** The directory that holds an .xcodeproj, from the path of its project.pbxproj. */
export function projectDirectory(pbxprojRel: string): string | null {
  const match = /^(?:(.*)\/)?[^/]+\.xcodeproj\/project\.pbxproj$/.exec(
    pbxprojRel
  );
  return match ? (match[1] ?? '') : null;
}

/** The build configurations of a project.pbxproj (one entry per name). */
export function xcodeConfigurations(pbxproj: string): XcodeConfiguration[] {
  const byName = new Map<string, XcodeConfiguration>();
  for (const match of pbxproj.matchAll(CONFIGURATION)) {
    const name = (match[2] ?? '').trim();
    const settings = `${byName.get(name)?.settings ?? ''}\n${match[1] ?? ''}`;
    byName.set(name, { name, settings });
  }
  return [...byName.values()];
}

/** Is auto-init off for a configuration, given the app's Info.plist texts? */
export function iosAutoInitDisabled(
  configuration: XcodeConfiguration,
  infoPlists: string[]
): boolean {
  for (const plist of infoPlists) {
    const match = AUTO_INIT.exec(plist);
    if (!match) continue;
    if (/^<false/.test(match[1] ?? '')) return true;
    const variable = /^\$\(([A-Za-z_]\w*)\)$/.exec(
      (match[2] ?? '').trim()
    )?.[1];
    if (!variable) return false;
    const value = new RegExp(String.raw`\b${variable}\s*=\s*"?(\w+)"?;`).exec(
      configuration.settings
    )?.[1];
    return value !== undefined && /^(?:NO|false|0)$/i.test(value);
  }
  return false;
}

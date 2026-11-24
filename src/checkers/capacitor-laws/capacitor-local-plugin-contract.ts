/**
 * Capacitor Local Plugin Contract
 *
 * A plugin that lives inside the app is joined to JavaScript by three names
 * only a human keeps in step: `registerPlugin<T>('Name')` on the web side,
 * `@CapacitorPlugin(name = "Name")` with one `@PluginMethod` per method of
 * `T` on the native side, and `registerPlugin(Class.class)` in the
 * BridgeActivity subclass before `super.onCreate(…)`. Any drift is answered
 * at call time with "not implemented on android" and
 * `Capacitor.isPluginAvailable()` false — which a capability port reads as
 * "this phone cannot", hiding the feature without a word.
 *
 * A `registerPlugin` name is local when no installed Capacitor plugin
 * package declares it in its Android sources. Native sources are opened by
 * fixed path, independent of `ignores`, and read as the commit holds them
 * (CommittedShell): a plugin class on this disk that git does not track is
 * not in a clean checkout, so it does not satisfy the contract.
 */

import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { withNotes } from '../../utils/capacitor/capacitor-law-support';
import { CapacitorProjects } from '../../utils/capacitor/capacitor-project';
import { CommittedShell } from '../../utils/capacitor/committed-shell';
import {
  bridgeSources,
  CAPACITOR_PLUGIN_MODULE,
} from '../../utils/capacitor/capacitor-sources';
import {
  activityRegistration,
  type ActivityRegistration,
  androidPluginClasses,
  filesUnder,
  INHERITED_PLUGIN_METHODS,
  iosPluginClasses,
  type NativePluginClass,
  readText,
} from '../../utils/capacitor/native-plugins';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { declaredDependencies } from '../../utils/law-requirements';
import { PathOperations } from '../../utils/path-operations';
import { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { type WebPlugin, webPlugins } from './local-plugin-web-side';

export type { WebPlugin } from './local-plugin-web-side';

interface NativeSide {
  androidPresent: boolean;
  android: NativePluginClass[];
  activities: ActivityRegistration[];
  ios: NativePluginClass[];
}

const JVM = ['.java', '.kt'];

export class CapacitorLocalPluginContractLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Local Plugin Contract';

  static check(context: LawCheckContext): LawResult {
    const { sources, unread } = bridgeSources(context);
    const violations = unread.map(
      reason =>
        `${reason} — a registerPlugin() in these files would not be compared with the native side, so this law does not pass on them`
    );
    const notes: string[] = [];
    const web = sources.flatMap(source => this.webPlugins(context, source));
    if (web.length > 0) {
      const packaged = this.packagedPluginNames(context.projectRoot);
      const native = this.nativeSide(context);
      for (const plugin of web) {
        const judged = this.judge(plugin, native, packaged);
        violations.push(...judged.violations);
        notes.push(...judged.notes);
      }
    }
    return withNotes(
      this.createResult(
        violations,
        this.LAW_NAME,
        'FRAMEWORK',
        [
          'Keep the plugin name in one TS constant used by registerPlugin, and mirror it in @CapacitorPlugin(name)',
          'Annotate every method of the registerPlugin<T> interface with @PluginMethod',
          'Register the class in MainActivity above super.onCreate(savedInstanceState)',
        ],
        context
      ),
      notes
    );
  }

  // ── web side ────────────────────────────────────────────────────────────

  static webPlugins(context: LawCheckContext, source: TsxSource): WebPlugin[] {
    return webPlugins(context, source);
  }

  // ── native side ─────────────────────────────────────────────────────────

  /** Plugin names the installed Capacitor plugin packages declare in their Android sources. */
  static packagedPluginNames(projectRoot: string): {
    names: Set<string>;
    unreadable: string[];
  } {
    const names = new Set<string>();
    const unreadable: string[] = [];
    for (const dependency of declaredDependencies(projectRoot)) {
      const manifestFile = this.installedManifest(projectRoot, dependency);
      if (!manifestFile) {
        if (CAPACITOR_PLUGIN_MODULE.test(dependency))
          unreadable.push(dependency);
        continue;
      }
      for (const name of this.packageAndroidNames(manifestFile))
        names.add(name);
    }
    return { names, unreadable };
  }

  /** The @CapacitorPlugin names in a package's `capacitor.android.src` tree. */
  private static packageAndroidNames(manifestFile: string): string[] {
    const androidSrc = this.readManifest(manifestFile)?.capacitor?.android?.src;
    if (typeof androidSrc !== 'string') return [];
    const dir = PathOperations.join(
      PathOperations.getDirectory(manifestFile),
      androidSrc
    );
    return filesUnder(dir, JVM).flatMap(file =>
      androidPluginClasses(file, readText(file) ?? '').flatMap(plugin =>
        plugin.name ? [plugin.name] : []
      )
    );
  }

  private static installedManifest(
    projectRoot: string,
    dependency: string
  ): string | null {
    try {
      return require.resolve(`${dependency}/package.json`, {
        paths: [projectRoot],
      });
    } catch {
      const direct = PathOperations.join(
        projectRoot,
        'node_modules',
        dependency,
        'package.json'
      );
      return fs.existsSync(direct) ? direct : null;
    }
  }

  private static readManifest(
    file: string
  ): { capacitor?: { android?: { src?: unknown } } } | null {
    try {
      return FileSystemOperations.readJsonFile(file);
    } catch {
      return null;
    }
  }

  private static nativeSide(context: LawCheckContext): NativeSide {
    const side: NativeSide = {
      androidPresent: false,
      android: [],
      activities: [],
      ios: [],
    };
    for (const project of CapacitorProjects.find(context.projectRoot)) {
      const native = CapacitorProjects.nativePaths(
        project,
        context.projectRoot
      );
      // The native side as the commit holds it: an untracked plugin class or an ignored android/ is not in a clean checkout.
      const shell = CommittedShell.of(context.projectRoot, [
        native.androidDir,
        native.iosTargetDir,
      ]);
      if (shell.hasDir(native.androidDir)) side.androidPresent = true;
      for (const file of CapacitorProjects.nativeSourceFiles(
        native,
        (dir, extensions) => shell.filesUnder(dir, extensions)
      )) {
        const text = shell.text(file) ?? '';
        if (file.endsWith('.swift')) {
          side.ios.push(...iosPluginClasses(file, text));
          continue;
        }
        side.android.push(...androidPluginClasses(file, text));
        const registration = activityRegistration(file, text);
        if (registration) side.activities.push(registration);
      }
    }
    return side;
  }

  // ── the verdict ─────────────────────────────────────────────────────────

  static judge(
    plugin: WebPlugin,
    native: NativeSide,
    packaged: { names: Set<string>; unreadable: string[] }
  ): { violations: string[]; notes: string[] } {
    const violations: string[] = [];
    const notes: string[] = [];
    const { where, name } = plugin;
    if (name === null) {
      return {
        violations: [
          `${where}: registerPlugin() is called with a name that is neither a string literal nor a const string in this file or one import away — the local plugin contract was not judged`,
        ],
        notes,
      };
    }
    const androidClass = native.android.find(
      candidate => candidate.name === name
    );
    const iosClass = native.ios.find(candidate => candidate.name === name);
    if (!androidClass && packaged.names.has(name)) return { violations, notes }; // an npm plugin
    if (plugin.methods === null) {
      notes.push(
        `${where}: the registerPlugin<T> type argument for '${name}' is missing, generic or not followed — its methods were not compared with the native side`
      );
    }
    if (native.androidPresent) {
      violations.push(
        ...this.androidContract(plugin, name, androidClass, native, packaged)
      );
      if (androidClass)
        notes.push(
          ...this.uncalledMethods(where, name, androidClass, plugin.methods)
        );
    }
    if (iosClass)
      violations.push(
        ...this.missingMethods(
          where,
          name,
          iosClass,
          plugin.methods,
          'iOS',
          'pluginMethods'
        )
      );
    if (!native.androidPresent && !iosClass) {
      violations.push(
        `${where}: registerPlugin('${name}') — there is no android/ shell and no Swift CAPBridgedPlugin with jsName "${name}" under the iOS target, so the contract could not be judged on any platform`
      );
    }
    return { violations, notes };
  }

  private static androidContract(
    plugin: WebPlugin,
    name: string,
    androidClass: NativePluginClass | undefined,
    native: NativeSide,
    packaged: { names: Set<string>; unreadable: string[] }
  ): string[] {
    const { where } = plugin;
    if (!androidClass) {
      const unread = packaged.unreadable.length
        ? ` (${packaged.unreadable.join(', ')} declared but not installed, so not read)`
        : '';
      return [
        `${where}: registerPlugin('${name}') — no class under android/app/src/main/java|kotlin has @CapacitorPlugin(name = "${name}") and no installed plugin package declares it${unread}. On Android every call answers "${name}" plugin is not implemented on android, and isPluginAvailable('${name}') is false`,
      ];
    }
    const violations: string[] = [];
    const cls = androidClass.className;
    if (native.activities.length === 0) {
      violations.push(
        `${where}: '${name}' (${cls}) — no BridgeActivity subclass found under android/app/src/main, so its registerPlugin(${cls}.class) cannot be checked; a local plugin reaches the bridge only through it`
      );
    } else if (
      native.activities.some(activity => activity.after.has(cls)) &&
      !native.activities.some(activity => activity.before.has(cls))
    ) {
      violations.push(
        `${where}: '${name}' — registerPlugin(${cls}.class) comes after super.onCreate(…) in the BridgeActivity; the bridge is built inside super.onCreate, so the plugin is never loaded. Move the registration above it`
      );
    } else if (!native.activities.some(activity => activity.before.has(cls))) {
      violations.push(
        `${where}: '${name}' — ${cls} is annotated @CapacitorPlugin but the BridgeActivity never calls registerPlugin(${cls}.class); local plugins are not in capacitor.plugins.json, so the bridge never loads it`
      );
    }
    violations.push(
      ...this.missingMethods(
        where,
        name,
        androidClass,
        plugin.methods,
        'Android',
        '@PluginMethod'
      )
    );
    return violations;
  }

  private static missingMethods(
    where: string,
    name: string,
    nativeClass: NativePluginClass,
    methods: string[] | null,
    platform: string,
    marker: string
  ): string[] {
    if (!methods) return [];
    const declared = new Set(nativeClass.methods);
    const missing = methods.filter(method => !declared.has(method));
    if (missing.length === 0) return [];
    return [
      `${where}: '${name}' on ${platform} — ${missing.map(method => `${method}()`).join(', ')} declared in the TypeScript interface but not exposed as ${marker} in ${nativeClass.className}; a call answers "${name}.${missing[0]}()" is not implemented`,
    ];
  }

  private static uncalledMethods(
    where: string,
    name: string,
    nativeClass: NativePluginClass,
    methods: string[] | null
  ): string[] {
    if (!methods) return [];
    const wanted = new Set(methods);
    const extra = nativeClass.methods.filter(
      method => !wanted.has(method) && !INHERITED_PLUGIN_METHODS.has(method)
    );
    return extra.length
      ? [
          `${where}: '${name}' — @PluginMethod ${extra.join(', ')} in ${nativeClass.className} has no counterpart in the TypeScript interface (JS cannot call it yet)`,
        ]
      : [];
  }
}

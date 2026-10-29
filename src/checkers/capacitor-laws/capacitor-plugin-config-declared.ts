/**
 * Capacitor Plugin Config Declared
 *
 * A plugin that takes configuration declares it by augmenting @capacitor/cli's
 * PluginsConfig interface; its native side reads `plugins.<Name>` at start-up
 * and silently takes its OWN default when the block is absent. The default is
 * the plugin's choice, not the app's: for an authentication plugin an empty
 * provider list rejects every sign-in on the device, while the web build,
 * cap sync, the native build and every unit test stay green.
 *
 * The law reads each installed dependency's `dist/esm/definitions.d.ts` (the
 * plugin template's convention) and asks for a `plugins.<Name>` block — even
 * `{}`, which says "the defaults are my decision".
 */

import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  type ResolvedProject,
  configValue,
  resolvedProjects,
} from '../../utils/capacitor/capacitor-law-support';
import { declaredDependencies } from '../../utils/law-requirements';
import { PathOperations } from '../../utils/path-operations';
import { TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

export interface DeclaredPluginConfig {
  plugin: string;
  /** The key under `plugins`, e.g. `FirebaseAuthentication`. */
  key: string;
  /** Its options, with `@default` where the declaration states one. */
  options: string[];
}

const AUGMENTATION = /declare\s+module\s+['"]@capacitor\/cli['"]\s*\{/;
const PLUGINS_CONFIG = /\binterface\s+PluginsConfig\s*\{/;

export class CapacitorPluginConfigDeclaredLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Plugin Config Declared';

  static check(context: LawCheckContext): LawResult {
    const { resolved, unresolved } = resolvedProjects(context);
    const violations = [...unresolved];
    for (const project of resolved) {
      violations.push(...this.checkProject(context, project));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'For every installed plugin that augments PluginsConfig, write plugins.<Name> in the Capacitor config',
        'Write {} to state that the defaults are deliberate',
      ],
      context
    );
  }

  private static checkProject(context: LawCheckContext, resolved: ResolvedProject): string[] {
    const paths = [resolved.project.root, context.projectRoot];
    if (!this.packageDir('@capacitor/core', paths)) {
      return [
        `${resolved.where}: node_modules is not installed, so the plugins' declared config cannot be read — this law does not pass on a guess (run npm install)`,
      ];
    }
    const violations: string[] = [];
    for (const name of declaredDependencies(context.projectRoot)) {
      const dir = this.packageDir(name, paths);
      if (!dir) continue;
      for (const declared of this.declaredConfig(name, dir)) {
        if (configValue(resolved.config, `plugins.${declared.key}`) !== undefined) continue;
        violations.push(
          `${resolved.where}: ${declared.plugin} reads plugins.${declared.key} and the config has none — it silently takes its own defaults on the device${
            declared.options.length ? ` (${declared.options.join('; ')})` : ''
          }. State the block, or {} if the defaults are deliberate`
        );
      }
    }
    return violations;
  }

  /** The PluginsConfig keys a package declares in its definitions. */
  static declaredConfig(plugin: string, packageDir: string): DeclaredPluginConfig[] {
    const file = PathOperations.join(packageDir, 'dist', 'esm', 'definitions.d.ts');
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      return [];
    }
    return this.parseDeclarations(plugin, content);
  }

  static parseDeclarations(plugin: string, content: string): DeclaredPluginConfig[] {
    const code = TsClasses.mask(content);
    const module = AUGMENTATION.exec(code);
    if (!module) return [];
    const iface = PLUGINS_CONFIG.exec(code.slice(module.index));
    if (!iface) return [];
    const open = module.index + iface.index + iface[0].length - 1;
    return this.members(code, open).map(({ name, open: blockOpen }) => ({
      plugin,
      key: name,
      options: blockOpen === -1 ? [] : this.options(content, code, blockOpen),
    }));
  }

  /** Property names at depth 1 of the block opened at `open`, with their own `{` if any. */
  private static members(code: string, open: number): Array<{ name: string; open: number }> {
    const members: Array<{ name: string; open: number }> = [];
    const close = this.closing(code, open);
    let depth = 0;
    let k = open + 1;
    while (k < close) {
      const property = depth === 0 ? this.propertyAt(code, k) : null;
      if (property) {
        members.push(property.member);
        if (property.member.open !== -1) depth++;
        k = property.next;
        continue;
      }
      if (code[k] === '{') depth++;
      else if (code[k] === '}') depth--;
      k++;
    }
    return members;
  }

  /** A `name?: ` (optionally opening `{`) starting exactly at `k`. */
  private static propertyAt(
    code: string,
    k: number
  ): { member: { name: string; open: number }; next: number } | null {
    if (!/[A-Za-z_$]/.test(code[k] ?? '') || /[\w$]/.test(code[k - 1] ?? '')) return null;
    const property = /([A-Za-z_$][\w$]*)\??\s*:\s*(\{)?/y;
    property.lastIndex = k;
    const match = property.exec(code);
    if (!match) return null;
    const next = k + match[0].length;
    return { member: { name: match[1] ?? '', open: match[2] ? next - 1 : -1 }, next };
  }

  /** "name" or "name (@default value)" for each option of a plugin's block. */
  private static options(content: string, code: string, open: number): string[] {
    let previous = open + 1;
    return this.members(code, open).map(({ name }) => {
      const at = code.indexOf(name, previous);
      const doc = content.slice(previous, at);
      previous = at + name.length;
      const value = /@default\s+([^\n*]+)/.exec(doc)?.[1]?.trim();
      return value ? `${name} @default ${value}` : name;
    });
  }

  private static closing(code: string, open: number): number {
    let depth = 0;
    for (let k = open; k < code.length; k++) {
      if (code[k] === '{') depth++;
      else if (code[k] === '}' && --depth === 0) return k;
    }
    return code.length;
  }

  private static packageDir(name: string, paths: string[]): string | null {
    try {
      return PathOperations.getDirectory(require.resolve(`${name}/package.json`, { paths }));
    } catch {
      return null;
    }
  }
}

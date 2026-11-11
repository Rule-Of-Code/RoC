/**
 * Capacitor plugins as the native shells declare them.
 *
 * Android: a plugin is a class annotated `@CapacitorPlugin(name = "Name")`
 * whose bridge-callable methods carry `@PluginMethod`. npm plugins reach the
 * bridge through `capacitor.plugins.json` (BridgeActivity's PluginManager);
 * a plugin inside the app reaches it only through `registerPlugin(X.class)`
 * in the BridgeActivity subclass, and only when that runs before
 * `super.onCreate(…)` — BridgeActivity.onCreate builds the bridge from the
 * builder's plugin list, and registerPlugin only appends to that list.
 *
 * iOS: a plugin class adopts CAPBridgedPlugin and states `jsName` and
 * `pluginMethods` (CAPBridgedPlugin.h).
 *
 * Java, Kotlin and Swift are read as text with comments and strings masked
 * where a pattern must not match inside them; names are read from string
 * literals, so a name built from a constant is reported as unresolved.
 */

import * as fs from 'fs';
import { PathOperations } from '../path-operations';

/** Methods every Plugin inherits as @PluginMethod (Plugin.java), so no local class declares them. */
export const INHERITED_PLUGIN_METHODS: ReadonlySet<string> = new Set([
  'addListener',
  'removeListener',
  'removeAllListeners',
  'checkPermissions',
  'requestPermissions',
]);

export interface NativePluginClass {
  /** The `name` in @CapacitorPlugin, or the `jsName` in Swift; null when it is not a string literal. */
  name: string | null;
  className: string;
  methods: string[];
  file: string;
}

export interface ActivityRegistration {
  file: string;
  /** Plugin classes registered before super.onCreate (or with no super.onCreate to order against). */
  before: Set<string>;
  /** Plugin classes registered after super.onCreate — too late for the bridge. */
  after: Set<string>;
}

/** Every file under `dir` with one of `extensions`, recursively; [] when it does not exist. */
export function filesUnder(dir: string, extensions: readonly string[]): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = PathOperations.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extensions.some(ext => entry.name.endsWith(ext))) found.push(full);
    }
  };
  walk(dir);
  return found;
}

/**
 * Comments replaced by spaces (positions kept). Strings are kept: plugin and
 * method names live in them.
 */
export function stripComments(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (two === '//') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? text.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
    } else if (two === '/*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (text[i] === '"') {
      const stop = stringEnd(text, i);
      out += text.slice(i, stop);
      i = stop;
    } else {
      out += text[i];
      i++;
    }
  }
  return out;
}

function stringEnd(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length && text[i] !== '"' && text[i] !== '\n') {
    i += text[i] === '\\' ? 2 : 1;
  }
  return Math.min(i + 1, text.length);
}

/** The text between the parenthesis at `open` and its match (exclusive), or null. */
export function balancedArguments(text: string, open: number): string | null {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return null;
}

const ANNOTATION = /@CapacitorPlugin\b/g;
const PLUGIN_METHOD = /@PluginMethod\b(?:\s*\([^)]*\))?(?:\s*@\w+(?:\s*\([^)]*\))?)*\s*([^(;{}]*?)\b(\w+)\s*\(/g;
const NAME_ARGUMENT = /\bname\s*=\s*"([^"]*)"/;

/** The @CapacitorPlugin classes in one Java or Kotlin file. */
export function androidPluginClasses(file: string, raw: string): NativePluginClass[] {
  const text = stripComments(raw);
  const starts = [...text.matchAll(ANNOTATION)].map(match => match.index ?? 0);
  return starts.map((start, index) => {
    const open = text.indexOf('(', start);
    const classMatch = /\bclass\s+(\w+)/.exec(text.slice(start));
    const between = text.slice(start + '@CapacitorPlugin'.length, open).trim();
    const args = open !== -1 && between === '' ? (balancedArguments(text, open) ?? '') : '';
    const end = starts[index + 1] ?? text.length;
    const className = classMatch?.[1] ?? '';
    return {
      name: pluginName(args, className),
      className,
      methods: [...text.slice(start, end).matchAll(PLUGIN_METHOD)].map(match => match[2] ?? ''),
      file,
    };
  });
}

/**
 * PluginHandle: the annotation's `name`, or the class's simple name when it
 * is empty or absent. Null when `name` is given as something other than a
 * string literal (a constant this reader does not follow).
 */
function pluginName(args: string, className: string): string | null {
  const literal = NAME_ARGUMENT.exec(args);
  if (literal) return literal[1] || className;
  return /\bname\s*=/.test(args) ? null : className;
}

const REGISTER_CALL =/\bregisterPlugins?\s*\(/g;
const CLASS_LITERAL = /\b(\w+)(?:\.class|::class(?:\.java)?)\b/g;
const SUPER_ON_CREATE = /\bsuper\.onCreate\s*\(/;
const BRIDGE_ACTIVITY = /\bextends\s+BridgeActivity\b|:\s*BridgeActivity\s*\(/;

/** The local plugins a BridgeActivity subclass registers, split by whether they are in time. */
export function activityRegistration(file: string, raw: string): ActivityRegistration | null {
  const text = stripComments(raw);
  if (!BRIDGE_ACTIVITY.test(text)) return null;
  const superAt = SUPER_ON_CREATE.exec(text)?.index ?? -1;
  const registration: ActivityRegistration = { file, before: new Set(), after: new Set() };
  for (const match of text.matchAll(REGISTER_CALL)) {
    const at = match.index ?? 0;
    const args = balancedArguments(text, at + match[0].length - 1) ?? '';
    const target = superAt !== -1 && at > superAt ? registration.after : registration.before;
    for (const literal of args.matchAll(CLASS_LITERAL)) target.add(literal[1] ?? '');
  }
  return registration;
}

const SWIFT_CLASS = /\bclass\s+(\w+)\s*:[^{]*\bCAPBridgedPlugin\b/g;
const JS_NAME = /\bjsName\s*(?::\s*String\s*)?=\s*"([^"]*)"/;
const SWIFT_METHOD = /\bCAPPluginMethod\s*\(\s*name\s*:\s*"([^"]*)"/g;

/** The CAPBridgedPlugin classes in one Swift file. */
export function iosPluginClasses(file: string, raw: string): NativePluginClass[] {
  const text = stripComments(raw);
  const starts = [...text.matchAll(SWIFT_CLASS)];
  return starts.map((match, index) => {
    const start = match.index ?? 0;
    const end = starts[index + 1]?.index ?? text.length;
    const body = text.slice(start, end);
    return {
      name: JS_NAME.exec(body)?.[1] ?? null,
      className: match[1] ?? '',
      methods: [...body.matchAll(SWIFT_METHOD)].map(method => method[1] ?? ''),
      file,
    };
  });
}

/** A file's text, or null. */
export function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Capacitor Durable State Off WebView Storage
 *
 * Capacitor's storage guide says WebView storage "must be considered
 * transient": the OS reclaims local storage from Web Views when space runs
 * low (and IndexedDB, at least on iOS), and Capacitor's Preferences API is
 * its answer for durable values. WebView storage is also keyed by the app's
 * origin, so a hostname or scheme change orphans it on every device. A
 * storage service that wraps localStorage satisfies Web Storage
 * Encapsulation in full while holding data the server cannot give back.
 *
 * The law cannot know which values are durable, so it asks for a decision:
 * every writer of localStorage or IndexedDB either has a native branch (a
 * durable store imported by the writer's file, its port's file, or a file
 * that provides it) or writes only keys declared disposable. sessionStorage
 * is transient by definition and only noted.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { relative, withNotes } from '../../utils/capacitor/capacitor-law-support';
import {
  bridgeSources,
  enclosing,
  resolveRelative,
  stringValue,
} from '../../utils/capacitor/capacitor-sources';
import { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const PREFERENCES = '@capacitor/preferences';
const GLOBALS = /^(?:window\.|globalThis\.|self\.)?/;
const LOCAL_STORAGE = new RegExp(`${GLOBALS.source}localStorage$`);
const SESSION_STORAGE = new RegExp(`${GLOBALS.source}sessionStorage$`);
const INDEXED_DB = new RegExp(`${GLOBALS.source}indexedDB$`);
const GUIDE =
  "Capacitor's storage guide: WebView storage 'must be considered transient' — 'the OS will reclaim local storage from Web Views if a device is running low on space' — and it is keyed by the app origin";

type StoreKind = 'IndexedDB' | 'localStorage' | 'sessionStorage';

/** One write to WebView storage. */
export interface StorageWrite {
  kind: StoreKind;
  /** The key (or database name) when it is a literal or a same-file const. */
  key: string | null;
  line: number;
}

/** A class, or a module when the writes sit outside any class. */
interface Writer {
  source: TsxSource;
  className: string | null;
  owner: TS.ClassLikeDeclaration | null;
  writes: StorageWrite[];
}

export class CapacitorDurableStateOffWebviewStorageLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Durable State Off WebView Storage';

  static check(context: LawCheckContext): LawResult {
    const { sources, unread } = bridgeSources(context);
    const violations = unread.map(
      reason => `${reason} — a WebView storage writer in these files would not be judged, so this law does not pass on them`
    );
    const settings = context.config.thresholds?.capacitor;
    const durable = new Set([PREFERENCES, ...(settings?.durableStores ?? [])]);
    const disposable = new Set(settings?.disposableStorageKeys ?? []);
    const notes: string[] = [];
    const writers = sources.flatMap(source => this.writers(source));
    for (const writer of writers) {
      const where = `${relative(context, writer.source.fileName)}${writer.className ? ` (${writer.className})` : ''}`;
      const session = writer.writes.filter(write => write.kind === 'sessionStorage');
      if (session.length > 0) {
        notes.push(`${where}: writes sessionStorage — transient by definition, so only noted`);
      }
      const lasting = writer.writes.filter(write => write.kind !== 'sessionStorage');
      if (lasting.length === 0) continue;
      if (lasting.every(write => write.key !== null && disposable.has(write.key))) continue;
      if (this.hasNativeBranch(writer, sources, durable)) continue;
      violations.push(this.warning(where, lasting));
    }
    return withNotes(
      this.createResult(
        violations,
        this.LAW_NAME,
        'FRAMEWORK',
        [
          'Back durable values with @capacitor/preferences on native, behind the same storage port the web build uses',
          'Declare WebView-only keys as disposable in thresholds.capacitor.disposableStorageKeys; declare other native stores in thresholds.capacitor.durableStores',
        ],
        context
      ),
      notes
    );
  }

  private static warning(where: string, writes: StorageWrite[]): string {
    const kinds = [...new Set(writes.map(write => write.kind))].join(' and ');
    const keys = writes.map(write => (write.key === null ? `a runtime key (line ${write.line})` : `'${write.key}'`));
    return `${where}: writes ${kinds} (${[...new Set(keys)].join(', ')}) with no native branch — ${GUIDE}, so a hostname or scheme change orphans it on every device. Decide: back it with @capacitor/preferences (or a store in thresholds.capacitor.durableStores) on native, or declare its keys in thresholds.capacitor.disposableStorageKeys`;
  }

  /** The WebView storage writers of one source, grouped by class (or the module). */
  static writers(source: TsxSource): Writer[] {
    const ts = source.ts;
    const byOwner = new Map<TS.ClassLikeDeclaration | null, Writer>();
    const storeVariables = this.objectStoreVariables(source);
    const idbOnly = this.indexedDbWrites(source, storeVariables);
    source.walk(node => {
      if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return;
      const write = this.write(source, node, idbOnly);
      if (!write) return;
      const owner = enclosing(node, (candidate): candidate is TS.ClassLikeDeclaration => ts.isClassLike(candidate)) ?? null;
      const writer = byOwner.get(owner) ?? { source, owner, className: owner?.name?.text ?? null, writes: [] };
      writer.writes.push(write);
      byOwner.set(owner, writer);
    });
    return [...byOwner.values()];
  }

  private static write(source: TsxSource, node: TS.CallExpression | TS.NewExpression, idbWrites: boolean): StorageWrite | null {
    const ts = source.ts;
    const line = source.lineOf(node);
    const first = node.arguments?.[0];
    if (ts.isNewExpression(node)) {
      return ts.isIdentifier(node.expression) && node.expression.text === 'Dexie'
        ? { kind: 'IndexedDB', key: stringValue(source, first), line }
        : null;
    }
    const callee = node.expression;
    if (ts.isIdentifier(callee)) {
      return callee.text === 'openDB' && this.importsFrom(source, 'idb')
        ? { kind: 'IndexedDB', key: stringValue(source, first), line }
        : null;
    }
    if (!ts.isPropertyAccessExpression(callee)) return null;
    const kind = this.memberWrite(callee.expression.getText(source.sourceFile), callee.name.text, idbWrites);
    if (!kind) return null;
    const keyed = !(kind === 'IndexedDB' && callee.name.text === 'createInstance');
    return { kind, key: keyed ? stringValue(source, first) : null, line };
  }

  /** `<receiver>.<method>(…)`: which store it writes, or null. */
  private static memberWrite(receiver: string, method: string, idbWrites: boolean): StoreKind | null {
    if (method === 'setItem' && LOCAL_STORAGE.test(receiver)) return 'localStorage';
    if (method === 'setItem' && SESSION_STORAGE.test(receiver)) return 'sessionStorage';
    if (method === 'open' && INDEXED_DB.test(receiver)) return idbWrites ? 'IndexedDB' : null;
    const localforage = receiver === 'localforage' && (method === 'setItem' || method === 'createInstance');
    return localforage ? 'IndexedDB' : null;
  }

  /** Names bound to `<tx>.objectStore(…)` in this file. */
  private static objectStoreVariables(source: TsxSource): Set<string> {
    const ts = source.ts;
    const names = new Set<string>();
    source.walk(node => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        /\.objectStore\s*\(/.test(node.initializer.getText(source.sourceFile))
      ) {
        names.add(node.name.text);
      }
    });
    return names;
  }

  /**
   * Does this file write IndexedDB (createObjectStore, or put/add on an
   * object store)? An indexedDB.open that only reads — another library's
   * database, opened to look — is not a writer.
   */
  private static indexedDbWrites(source: TsxSource, storeVariables: Set<string>): boolean {
    const ts = source.ts;
    let writes = false;
    source.walk(node => {
      if (writes || !ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
      const method = node.expression.name.text;
      const receiver = node.expression.expression;
      if (method === 'createObjectStore') writes = true;
      if (method === 'put' || method === 'add') {
        const text = receiver.getText(source.sourceFile);
        writes = /\.objectStore\s*\(/.test(text) || (ts.isIdentifier(receiver) && storeVariables.has(receiver.text));
      }
    });
    return writes;
  }

  private static importsFrom(source: TsxSource, module: string): boolean {
    return source.imports().some(info => info.module === module);
  }

  private static importsDurable(source: TsxSource, durable: ReadonlySet<string>): boolean {
    return source.imports().some(info => !info.typeOnly && durable.has(info.module));
  }

  /** A durable store in the writer's file, its port's file (one import), or a file that provides the class. */
  private static hasNativeBranch(writer: Writer, sources: readonly TsxSource[], durable: ReadonlySet<string>): boolean {
    if (this.importsDurable(writer.source, durable)) return true;
    if (!writer.owner || !writer.className) return false;
    if (this.portFiles(writer).some(port => port.imports().some(info => !info.typeOnly && durable.has(info.module)))) return true;
    const name = writer.className;
    return sources.some(
      source => source !== writer.source && this.importsDurable(source, durable) && this.mentions(source, name)
    );
  }

  /** The files of the classes and interfaces the writer extends or implements, one relative import away. */
  private static portFiles(writer: Writer): TsxSource[] {
    const { source, owner } = writer;
    const ts = source.ts;
    const ports = (owner?.heritageClauses ?? [])
      .flatMap(clause => clause.types)
      .map(type => type.expression)
      .filter((expression): expression is TS.Identifier => ts.isIdentifier(expression))
      .map(expression => expression.text);
    const files: TsxSource[] = [];
    for (const info of source.imports()) {
      if (!info.module.startsWith('.') || !info.named.some(named => ports.includes(named.local))) continue;
      const file = resolveRelative(source.fileName, info.module);
      const port = file ? this.parseFile(source, file) : null;
      if (port) files.push(port);
    }
    return files;
  }

  private static parseFile(like: TsxSource, file: string): TsxSource | null {
    try {
      return TsxSource.parse(like.ts, file, fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }

  private static mentions(source: TsxSource, name: string): boolean {
    const ts = source.ts;
    let found = false;
    source.walk(node => {
      if (!found && ts.isIdentifier(node) && node.text === name) found = true;
    });
    return found;
  }
}

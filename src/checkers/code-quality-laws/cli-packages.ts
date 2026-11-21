/**
 * Which source files belong to a command-line program, and which are the
 * project's own logging module (#425).
 *
 * A package that declares `bin` in its package.json ships a command. In that
 * package `console.log/info` is how the command talks to its user — the
 * report, the progress line — so it is the product's output, not a forgotten
 * debug statement. `console.warn` writes to stderr, as `console.error` does,
 * and is judged with it: counted, until it is decided whether a command's
 * stderr is output too. `console.debug/trace` stay debug statements
 * everywhere. The rule is the same for every project: a file is judged by the
 * nearest package.json above it. Every law that applies it asks
 * `countedConsoleMethods`, so the laws cannot disagree.
 */
import * as fs from 'fs';
import * as path from 'path';

export class CliPackages {
  /** Directory → does the package.json that governs it declare a `bin`? */
  private readonly cache = new Map<string, boolean>();
  private readonly root: string;

  constructor(projectRoot: string) {
    this.root = path.resolve(projectRoot);
  }

  /**
   * A logging module: the place console output is supposed to go through
   * (logger.ts, logger.service.ts, logging-utils.ts, log.ts).
   */
  static isLoggingModule(file: string): boolean {
    return /^(?:logger|logging|log)(?:[.-][\w.-]*)?\.[cm]?[jt]sx?$/i.test(
      path.basename(file)
    );
  }

  /** The console methods that are a command's output in a `bin` package. */
  static readonly COMMAND_OUTPUT: ReadonlySet<string> = new Set([
    'log',
    'info',
  ]);

  /**
   * The console methods a law counts in `file`: its own list, less the
   * command's output when the file belongs to a package with a `bin`.
   */
  countedConsoleMethods(file: string, methods: readonly string[]): string[] {
    return this.isCliFile(file)
      ? methods.filter(method => !CliPackages.COMMAND_OUTPUT.has(method))
      : [...methods];
  }

  /** Is `file` part of a package that declares a `bin`? */
  isCliFile(file: string): boolean {
    return this.governedByBin(path.dirname(path.resolve(file)));
  }

  private governedByBin(dir: string): boolean {
    const known = this.cache.get(dir);
    if (known !== undefined) return known;
    const manifest = this.readManifest(dir);
    const parent = path.dirname(dir);
    const insideRoot = dir !== this.root && parent !== dir;
    const answer =
      manifest !== undefined
        ? CliPackages.declaresBin(manifest)
        : insideRoot && this.governedByBin(parent);
    this.cache.set(dir, answer);
    return answer;
  }

  /** The package.json in `dir`, or undefined when there is none (or it is unreadable). */
  private readManifest(dir: string): Record<string, unknown> | undefined {
    try {
      const parsed: unknown = JSON.parse(
        fs.readFileSync(path.join(dir, 'package.json'), 'utf8')
      );
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }

  /** `"bin": "cli.js"` or `"bin": { "name": "cli.js" }` with at least one entry. */
  private static declaresBin(manifest: Record<string, unknown>): boolean {
    const bin = manifest.bin;
    if (typeof bin === 'string') return bin.trim() !== '';
    return (
      !!bin &&
      typeof bin === 'object' &&
      Object.keys(bin as Record<string, unknown>).length > 0
    );
  }
}

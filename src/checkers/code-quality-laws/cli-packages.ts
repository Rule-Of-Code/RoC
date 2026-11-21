/**
 * Which source files belong to a command-line program, which of them are
 * the program's entry modules, and which are the project's own logging
 * module (#425). One rule, used by every law that judges console output.
 *
 * A package that declares `bin` in its package.json ships a command:
 *
 *  - in the WHOLE package `console.log/info` is how the command talks to its
 *    user — the report, the progress line — so it is the product's output,
 *    not a forgotten debug statement;
 *  - in the command's ENTRY modules `console.warn/error` are its output too:
 *    the warning and the error the command prints on stderr. In the rest of
 *    the package (library code the command calls) warn and error are still
 *    counted — there they bypass whatever reports errors to the user;
 *  - `console.debug/trace` are debug statements everywhere.
 *
 * A file is judged by the nearest package.json above it. The entry modules
 * are derived from that package's `bin`, never from file names chosen for
 * one repository: see cli-entry-modules.ts.
 */
import * as fs from 'fs';
import * as path from 'path';
import { CliEntryModules } from './cli-entry-modules';

/** The package that governs a directory: where its package.json is, and what it says. */
interface GoverningPackage {
  dir: string;
  manifest: Record<string, unknown>;
}

export class CliPackages {
  /** Directory → the package that governs it (null: none inside the project). */
  private readonly packages = new Map<string, GoverningPackage | null>();
  /** Package directory → its CLI entry modules. */
  private readonly entries = new Map<string, CliEntryModules>();
  private readonly root: string;

  constructor(projectRoot: string) {
    this.root = path.resolve(projectRoot);
  }

  /** Output of the command anywhere in a package that declares a `bin`. */
  static readonly COMMAND_OUTPUT: ReadonlySet<string> = new Set([
    'log',
    'info',
  ]);

  /** Also output of the command, but only in its entry modules (stderr). */
  static readonly ENTRY_OUTPUT: ReadonlySet<string> = new Set([
    'warn',
    'error',
  ]);

  /**
   * A logging module: the place console output is supposed to go through
   * (logger.ts, logger.service.ts, logging-utils.ts, log.ts).
   */
  static isLoggingModule(file: string): boolean {
    return /^(?:logger|logging|log)(?:[.-][\w.-]*)?\.[cm]?[jt]sx?$/i.test(
      path.basename(file)
    );
  }

  /**
   * The console methods a law counts in `file`: its own list, less the
   * command's output — log/info anywhere in a `bin` package, and warn/error
   * as well in the command's entry modules.
   */
  countedConsoleMethods(file: string, methods: readonly string[]): string[] {
    const pkg = this.packageOf(path.dirname(path.resolve(file)));
    if (!pkg || !CliPackages.declaresBin(pkg.manifest)) return [...methods];
    const entry = this.entriesOf(pkg).contains(file);
    return methods.filter(
      method =>
        !CliPackages.COMMAND_OUTPUT.has(method) &&
        !(entry && CliPackages.ENTRY_OUTPUT.has(method))
    );
  }

  /** Is `file` part of a package that declares a `bin`? */
  isCliFile(file: string): boolean {
    const pkg = this.packageOf(path.dirname(path.resolve(file)));
    return !!pkg && CliPackages.declaresBin(pkg.manifest);
  }

  /** Is `file` one of the command's entry modules (see cli-entry-modules.ts)? */
  isCliEntryModule(file: string): boolean {
    const pkg = this.packageOf(path.dirname(path.resolve(file)));
    return (
      !!pkg &&
      CliPackages.declaresBin(pkg.manifest) &&
      this.entriesOf(pkg).contains(file)
    );
  }

  private entriesOf(pkg: GoverningPackage): CliEntryModules {
    let known = this.entries.get(pkg.dir);
    if (!known) {
      known = new CliEntryModules(pkg.dir, pkg.manifest.bin);
      this.entries.set(pkg.dir, known);
    }
    return known;
  }

  /** The nearest package.json at or above `dir`, not above the project root. */
  private packageOf(dir: string): GoverningPackage | null {
    const known = this.packages.get(dir);
    if (known !== undefined) return known;
    const manifest = this.readManifest(dir);
    const parent = path.dirname(dir);
    const insideRoot = dir !== this.root && parent !== dir;
    let answer: GoverningPackage | null = null;
    if (manifest !== undefined) answer = { dir, manifest };
    else if (insideRoot) answer = this.packageOf(parent);
    this.packages.set(dir, answer);
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
    return CliEntryModules.binTargets(manifest.bin).length > 0;
  }
}

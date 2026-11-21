/**
 * The entry modules of a package's command-line program, derived from its
 * `bin` (#425).
 *
 * How they are found, for any project:
 *
 *  1. Every path `bin` points to (a string, or each value of the object),
 *     resolved against the package directory.
 *  2. A path inside the TypeScript `outDir` of the package's tsconfig.json is
 *     mapped back to the source: the same relative path under `rootDir`
 *     (`src` when no rootDir is set). Without a tsconfig, a path whose first
 *     segment is a usual build directory (dist, build, lib, out) is mapped to
 *     `src`. The compiled extension is swapped for the first source file that
 *     exists (.ts, .tsx, .mts, .cts, then .js, .mjs, .cjs).
 *  3. The command modules beside each entry: the directory named after the
 *     entry file (`src/cli.ts` → `src/cli/**`) and a `commands/` directory
 *     next to it.
 *
 * So `"bin": "dist/cli.js"` with `outDir: dist`, `rootDir: src` gives
 * `src/cli.ts` and everything under `src/cli/` and `src/commands/`.
 */
import * as fs from 'fs';
import * as path from 'path';

const BUILD_DIRS = ['dist', 'build', 'lib', 'out'];
const SOURCE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
];

export class CliEntryModules {
  private readonly files = new Set<string>();
  private readonly dirs: string[] = [];

  constructor(packageDir: string, bin: unknown) {
    const tsconfig = CliEntryModules.compilerDirs(packageDir);
    for (const target of CliEntryModules.binTargets(bin)) {
      const entry = CliEntryModules.sourceOf(
        packageDir,
        path.resolve(packageDir, target),
        tsconfig
      );
      this.files.add(CliEntryModules.key(entry));
      const base = path.join(path.dirname(entry), path.parse(entry).name);
      this.dirs.push(CliEntryModules.key(base) + '/');
      this.dirs.push(
        CliEntryModules.key(path.join(path.dirname(entry), 'commands')) + '/'
      );
    }
  }

  /** The paths a `bin` field points to: a string, or the object's values. */
  static binTargets(bin: unknown): string[] {
    if (typeof bin === 'string') return bin.trim() ? [bin] : [];
    if (!bin || typeof bin !== 'object') return [];
    return Object.values(bin as Record<string, unknown>).filter(
      (value): value is string => typeof value === 'string' && !!value.trim()
    );
  }

  /** Is `file` an entry module or inside a command directory? */
  contains(file: string): boolean {
    const key = CliEntryModules.key(path.resolve(file));
    return this.files.has(key) || this.dirs.some(dir => key.startsWith(dir));
  }

  /** One spelling per path: absolute, forward slashes, case as on disk. */
  private static key(file: string): string {
    return path.resolve(file).replace(/\\/g, '/');
  }

  /** outDir and rootDir from the package's tsconfig.json, when it has them. */
  private static compilerDirs(
    packageDir: string
  ): { outDir: string; rootDir: string } | null {
    try {
      const text = fs.readFileSync(
        path.join(packageDir, 'tsconfig.json'),
        'utf8'
      );
      const json = JSON.parse(
        text.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/[^\n]*/gm, '')
      ) as { compilerOptions?: { outDir?: string; rootDir?: string } };
      const options = json.compilerOptions ?? {};
      if (!options.outDir) return null;
      return {
        outDir: path.resolve(packageDir, options.outDir),
        rootDir: path.resolve(packageDir, options.rootDir ?? 'src'),
      };
    } catch {
      return null;
    }
  }

  /** The source file a compiled `bin` target was built from (or the target). */
  private static sourceOf(
    packageDir: string,
    target: string,
    tsconfig: { outDir: string; rootDir: string } | null
  ): string {
    const mapped = CliEntryModules.mapBuildPath(packageDir, target, tsconfig);
    const stem = mapped.replace(/\.[cm]?js$/i, '');
    for (const extension of SOURCE_EXTENSIONS) {
      if (fs.existsSync(stem + extension)) return stem + extension;
    }
    return target;
  }

  /** The path under the source root that a build-output path corresponds to. */
  private static mapBuildPath(
    packageDir: string,
    target: string,
    tsconfig: { outDir: string; rootDir: string } | null
  ): string {
    if (tsconfig) {
      const inside = path.relative(tsconfig.outDir, target);
      if (!inside.startsWith('..') && !path.isAbsolute(inside)) {
        return path.join(tsconfig.rootDir, inside);
      }
    }
    const [first, ...rest] = path.relative(packageDir, target).split(/[\\/]/);
    return first && BUILD_DIRS.includes(first) && rest.length > 0
      ? path.join(packageDir, 'src', ...rest)
      : target;
  }
}

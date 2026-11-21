/**
 * The source files a package starts in: what `bin` and `main` of the root
 * package.json name, mapped back from the build output to the source (#438).
 *
 * `bin: { "tool": "dist/cli.js" }` names the compiled file; the code a law
 * reads is `src/cli.ts`. The mapping is the usual one: an output directory
 * (`dist`, `lib`, `build`, `out`) back to `src`, and `.js`/`.cjs`/`.mjs` to the
 * TypeScript or JavaScript source. Only files that exist are returned; the
 * named file itself counts when it is a source file that exists.
 */
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';

const OUTPUT_DIRS = ['dist', 'lib', 'build', 'out'];
const SOURCE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
];

/** The paths `bin` (string or map) and `main` name, as written. */
function entryPaths(manifest: unknown): string[] {
  if (!manifest || typeof manifest !== 'object') return [];
  const paths: string[] = [];
  const bin: unknown = Reflect.get(manifest, 'bin');
  if (typeof bin === 'string') paths.push(bin);
  else if (bin && typeof bin === 'object')
    for (const value of Object.values(bin))
      if (typeof value === 'string') paths.push(value);
  const main: unknown = Reflect.get(manifest, 'main');
  if (typeof main === 'string') paths.push(main);
  return paths;
}

/**
 * `dist/cli.js` → `src/cli.ts`, `src/cli.tsx`, … ; `bin/run.js` → itself and
 * `bin/run.ts`, …. A built file is not read: it may be stale or absent (a
 * fresh clone, CI before the build), and the law judges the source.
 */
function sourceCandidates(entry: string): string[] {
  const normalized = entry.replace(/\\/g, '/').replace(/^\.\//, '');
  const withoutExt = normalized.replace(/\.(?:c|m)?js$/, '');
  const [first, ...rest] = withoutExt.split('/');
  const built = !!first && OUTPUT_DIRS.includes(first) && rest.length > 0;
  const base = built ? ['src', ...rest].join('/') : withoutExt;
  const candidates = built ? [] : [normalized];
  for (const ext of SOURCE_EXTENSIONS) candidates.push(base + ext);
  return candidates;
}

/** The existing source files of the root package's `bin` and `main`. */
export function packageEntrySources(projectRoot: string): string[] {
  const manifestPath = PathOperations.join(projectRoot, 'package.json');
  let manifest: unknown;
  try {
    manifest = JSON.parse(FileUtils.readFile(manifestPath));
  } catch {
    return [];
  }
  const found = new Set<string>();
  for (const entry of entryPaths(manifest))
    for (const candidate of sourceCandidates(entry)) {
      if (!SOURCE_EXTENSIONS.some(ext => candidate.endsWith(ext))) continue;
      const full = PathOperations.join(projectRoot, candidate);
      if (FileUtils.exists(full)) found.add(full);
    }
  return [...found];
}

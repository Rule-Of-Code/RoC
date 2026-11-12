/**
 * What a Next.js or Vite app's own build configuration says about bundle
 * optimization — read from `next.config.*` / `vite.config.*` as syntax.
 *
 * The performance laws knew two shapes, Angular and webpack, and asked both
 * for knobs a Next or Vite app does not have: a Next production build already
 * minifies, tree-shakes and splits by route, and the only honest question is
 * whether the project turned one of those OFF. So these readers report the
 * opt-outs as well as the opt-ins:
 *
 * - Next.js 16 (installed `next/dist`): client minification is on in
 *   production (`build/webpack-config.js`: `minimize: !dev && …`; for
 *   Turbopack, the default bundler, `experimental.turbopackMinify` turns it
 *   off); `usedExports` is disabled only in dev; `next start` serves hashed
 *   `/_next/static` assets with `Cache-Control: public, max-age=31536000,
 *   immutable` (`server/lib/router-server.js`) unless `output: 'export'`
 *   leaves serving to a static host; `experimental.optimizeCss` inlines
 *   critical CSS through `critters` (`server/post-process.js`); route-segment
 *   code splitting is automatic (`dist/docs/01-app/02-guides/production-checklist.md`).
 * - Vite 8 (installed `vite/dist/node/index.d.ts`): `build.minify` defaults to
 *   'oxc' for client builds; Rolldown's `treeshake` defaults to true; vendor
 *   chunks are split only when `manualChunks` / `advancedChunks` /
 *   `codeSplitting` groups are configured.
 *
 * An app is found by its manifest: a workspace package that declares `next`
 * is a Next app; one that declares `vite` and has a `vite.config.*` beside it
 * is a Vite app. A Vite config used only for tests is not a build, so a Vite
 * app counts as built only when something runs `vite build`.
 */

import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { WorkspaceManifests, type WorkspaceManifest } from '../workspace-manifests';
import { JsConfigSource } from './js-config-source';
import type { TsxSource } from './tsx-source';

/** The config filenames Next 16 loads (`next/dist/shared/lib/constants.js`). */
export const NEXT_CONFIG_FILES = ['next.config.js', 'next.config.mjs', 'next.config.ts', 'next.config.mts'];

/** The config filenames Vite 8 loads (`DEFAULT_CONFIG_FILES`). */
export const VITE_CONFIG_FILES = [
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.ts',
  'vite.config.cjs',
  'vite.config.mts',
  'vite.config.cts',
];

/**
 * A command that runs a bundle-size analyzer. `next analyze` / `next
 * experimental-analyze` and `next build --analyze` are Next 16's own analyzer
 * (`next/dist/bin/next`); `size-limit` measures size and fails on a limit.
 */
export const BUNDLE_ANALYZER_COMMAND =
  /source-map-explorer|webpack-bundle-analyzer|stats-json|rollup-plugin-visualizer|esbuild-visualizer|vite-bundle-visualizer|bundlesize|bundle-analyzer|\bsize-limit\b|\bnext\s+(?:experimental-)?analyze\b|\bnext\s+build\b[^&|;\n]*--(?:experimental-)?analyze\b/i;

/** The webpack config filenames read at the project root. */
export const WEBPACK_CONFIG_FILES = [
  'webpack.config.js',
  'webpack.config.cjs',
  'webpack.config.mjs',
  'webpack.config.ts',
];

const NEXT_BUILD = /\bnext\s+build\b/;
const VITE_BUILD = /\bvite\s+build\b/;
const NX_NEXT_BUILD = /"@nx\/next:build"|"@nx\/next\/plugin"/;
const NX_VITE_BUILD = /"@nx\/vite:build"|"@nx\/vite\/plugin"/;

export interface BundlerApp {
  kind: 'next' | 'vite';
  /** The package directory. */
  root: string;
  /** The config file read, or null when the app has none (defaults apply). */
  configFile: string | null;
  /** Something builds it for production: a script, an Nx executor or plugin. */
  builds: boolean;
  /** Where minification is turned off, or null. */
  minifyOff: string | null;
  /** Where tree-shaking is turned off, or null. */
  treeShakingOff: string | null;
  /** Next `output: 'export'`: a static host serves it, not Next. */
  staticExport: boolean;
  /** Next `images.unoptimized: true`. */
  imagesUnoptimized: boolean;
  /** Next `experimental.optimizeCss` on. */
  optimizeCss: boolean;
  /** Next `headers()` declares a `Cache-Control` header. */
  cacheControlHeaders: boolean;
  /** Next config wraps itself with `@next/bundle-analyzer`. */
  bundleAnalyzer: boolean;
  /** Vite config declares vendor/manual chunk groups. */
  manualChunks: boolean;
  /** Next app has an `app/` or `pages/` router directory. */
  hasRouter: boolean;
}

export interface BundlerReport {
  apps: BundlerApp[];
  /** Config files that exist but could not be parsed — never read as "no opt-out". */
  unread: string[];
}

function firstExisting(dir: string, names: readonly string[]): string | null {
  for (const name of names) {
    const file = PathOperations.join(dir, name);
    if (FileUtils.exists(file)) return file;
  }
  return null;
}

function readText(file: string): string {
  try {
    return FileUtils.readFile(file, { encoding: 'utf8' });
  } catch {
    return '';
  }
}

function emptyApp(kind: BundlerApp['kind'], root: string, configFile: string | null): BundlerApp {
  return {
    kind,
    root,
    configFile,
    builds: false,
    minifyOff: null,
    treeShakingOff: null,
    staticExport: false,
    imagesUnoptimized: false,
    optimizeCss: false,
    cacheControlHeaders: false,
    bundleAnalyzer: false,
    manualChunks: false,
    hasRouter: false,
  };
}

export class WebBundlerConfig {
  static inspect(projectRoot: string): BundlerReport {
    const report: BundlerReport = { apps: [], unread: [] };
    const nxJson = readText(PathOperations.join(projectRoot, 'nx.json'));
    for (const manifest of WorkspaceManifests.all(projectRoot)) {
      const projectJson = readText(PathOperations.join(manifest.dir, 'project.json'));
      if ('next' in manifest.dependencies) {
        report.apps.push(this.nextApp(projectRoot, manifest, projectJson + nxJson, report));
      } else if ('vite' in manifest.dependencies) {
        const configFile = firstExisting(manifest.dir, VITE_CONFIG_FILES);
        if (configFile) {
          report.apps.push(this.viteApp(projectRoot, manifest, configFile, projectJson + nxJson, report));
        }
      }
    }
    return report;
  }

  /** Apps whose production build minifies: built, and minification not turned off. */
  static optimizingBuilds(report: BundlerReport): BundlerApp[] {
    return report.apps.filter(app => app.builds && !app.minifyOff);
  }

  /**
   * A root webpack config that builds for production: webpack treats an unset
   * `mode` as production (`next/dist/compiled/webpack/bundle5.js`:
   * `production = mode === "production" || !mode`), whose defaults set
   * `minimize` and `usedExports`. It does not count when it says
   * `mode: 'development'` or `minimize: false`. Returns the file, or null.
   */
  static webpackProduction(projectRoot: string, unread: string[]): string | null {
    for (const name of WEBPACK_CONFIG_FILES) {
      const file = PathOperations.join(projectRoot, name);
      if (!FileUtils.exists(file)) continue;
      const read = JsConfigSource.read(projectRoot, file);
      if (!read.source) {
        unread.push(read.unread);
        continue;
      }
      const source = read.source;
      const development = JsConfigSource.valuesOf(source, 'mode').some(
        node => JsConfigSource.stringOf(source, node) === 'development'
      );
      if (!development && !JsConfigSource.hasBoolean(source, 'minimize', false)) return name;
    }
    return null;
  }

  /** A short label for messages: `Next.js app (apps/web)`. */
  static label(projectRoot: string, app: BundlerApp): string {
    const where = PathOperations.getRelative(projectRoot, app.root) || '.';
    return `${app.kind === 'next' ? 'Next.js' : 'Vite'} app (${where})`;
  }

  private static nextApp(
    projectRoot: string,
    manifest: WorkspaceManifest,
    nxText: string,
    report: BundlerReport
  ): BundlerApp {
    const configFile = firstExisting(manifest.dir, NEXT_CONFIG_FILES);
    const app = emptyApp('next', manifest.dir, configFile);
    app.builds =
      Object.values(manifest.scripts).some(command => NEXT_BUILD.test(command)) ||
      NX_NEXT_BUILD.test(nxText);
    app.hasRouter = ['app', 'src/app', 'pages', 'src/pages'].some(dir =>
      FileUtils.isDirectory(PathOperations.join(manifest.dir, dir))
    );
    if (!configFile) return app;
    const read = JsConfigSource.read(projectRoot, configFile);
    if (!read.source) {
      report.unread.push(read.unread);
      app.builds = false; // an unread config cannot vouch that nothing is turned off
      return app;
    }
    this.applyNextConfig(read.source, app);
    return app;
  }

  private static applyNextConfig(source: TsxSource, app: BundlerApp): void {
    const ts = source.ts;
    const turbopackMinifyOff = JsConfigSource.valuesOf(source, 'turbopackMinify').some(
      node =>
        JsConfigSource.isBoolean(source, node, false) ||
        (ts.isObjectLiteralExpression(node) &&
          node.properties.some(
            property =>
              ts.isPropertyAssignment(property) &&
              property.name.getText(source.sourceFile) === 'client' &&
              JsConfigSource.isBoolean(source, property.initializer, false)
          ))
    );
    if (turbopackMinifyOff) app.minifyOff = 'experimental.turbopackMinify';
    else if (JsConfigSource.hasBoolean(source, 'minimize', false)) app.minifyOff = 'optimization.minimize = false';
    if (JsConfigSource.hasBoolean(source, 'usedExports', false)) app.treeShakingOff = 'optimization.usedExports = false';
    app.staticExport = JsConfigSource.valuesOf(source, 'output').some(
      node => JsConfigSource.stringOf(source, node) === 'export'
    );
    app.imagesUnoptimized = JsConfigSource.hasBoolean(source, 'unoptimized', true);
    app.optimizeCss = JsConfigSource.valuesOf(source, 'optimizeCss').some(
      node => JsConfigSource.isBoolean(source, node, true) || ts.isObjectLiteralExpression(node)
    );
    app.cacheControlHeaders =
      JsConfigSource.declares(source, 'headers') &&
      JsConfigSource.valuesOf(source, 'key').some(
        node => JsConfigSource.stringOf(source, node)?.toLowerCase() === 'cache-control'
      );
    app.bundleAnalyzer =
      JsConfigSource.callsOf(source, JsConfigSource.importedNames(source, '@next/bundle-analyzer')).length > 0;
  }

  private static viteApp(
    projectRoot: string,
    manifest: WorkspaceManifest,
    configFile: string,
    nxText: string,
    report: BundlerReport
  ): BundlerApp {
    const app = emptyApp('vite', manifest.dir, configFile);
    app.builds =
      Object.values(manifest.scripts).some(command => VITE_BUILD.test(command)) ||
      NX_VITE_BUILD.test(nxText);
    const read = JsConfigSource.read(projectRoot, configFile);
    if (!read.source) {
      report.unread.push(read.unread);
      app.builds = false;
      return app;
    }
    const source = read.source;
    const ts = source.ts;
    if (JsConfigSource.hasBoolean(source, 'minify', false)) app.minifyOff = 'build.minify = false';
    if (JsConfigSource.hasBoolean(source, 'treeshake', false)) app.treeShakingOff = 'treeshake = false';
    app.manualChunks =
      JsConfigSource.valuesOf(source, 'manualChunks').some(
        node => !JsConfigSource.isBoolean(source, node, false)
      ) ||
      ['advancedChunks', 'codeSplitting'].some(name =>
        JsConfigSource.valuesOf(source, name).some(node => ts.isObjectLiteralExpression(node))
      );
    return app;
  }
}

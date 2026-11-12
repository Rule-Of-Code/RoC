/**
 * Content Security Policy — declared for every entry the project serves.
 *
 * A CSP is the backstop for the XSS sinks a review misses: a script the page
 * did not author does not run. It is declared in one of four places, and this
 * law reads all of them instead of one fixed `src/index.html`:
 *
 * - an HTML entry document (`index.html`) with a `<meta http-equiv>` tag;
 * - a Next.js app: the `headers()` of `next.config.*`, or `proxy.*` (the
 *   renamed `middleware.*`) at the app root or in `src/`, as Next's own CSP
 *   guide shows;
 * - a hosting config that serves the header for the whole site
 *   (firebase.json, vercel.json, netlify.toml), in the workspace root or a
 *   project directory;
 * - a file the project names in `thresholds.security.cspFiles`.
 *
 * A site-wide declaration covers every entry. An entry with none is a
 * violation, and so is a project in which the law found neither an entry nor
 * a declaration: it judged nothing and does not pass. `-Report-Only` does not
 * count — it reports, it does not block.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { NxWorkspace } from '../../utils/nx-workspace';
import { PathOperations } from '../../utils/path-operations';
import { ReactProject } from '../../utils/react/react-project';
import { SecurityLawBase } from './security-law-base';

const LAW_TITLE = 'Content Security Policy';
const CSP_HEADER = /Content-Security-Policy(?!-Report-Only)/i;
const CSP_META = /<meta\b[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["'\s>]/i;
const HOSTING_FILES = ['firebase.json', 'vercel.json', 'netlify.toml'];
const NEXT_CONFIGS = ['js', 'mjs', 'cjs', 'ts', 'mts'].map(ext => `next.config.${ext}`);
const NEXT_REQUEST_HOOKS = ['proxy', 'middleware'].flatMap(name =>
  ['', 'src/'].flatMap(dir => ['ts', 'js'].map(ext => `${dir}${name}.${ext}`))
);
/** Generated reports that ship an index.html but are not the app. */
const REPORT_DIRS = /(?:^|\/)(?:coverage|playwright-report|test-results|storybook-static|html-report)\//;
const SITE_WIDE = 'no site-wide declaration either (firebase.json, vercel.json, netlify.toml headers, or thresholds.security.cspFiles)';

/** Comments blanked: a header named in a comment declares nothing. */
const stripComments = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/^\s*#[^\n]*/gm, '');

export class ContentSecurityPolicyLaw {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const rel = (file: string): string => PathOperations.getRelative(projectRoot, file);
    const declares = (file: string, pattern: RegExp): boolean =>
      FileUtils.exists(file) && pattern.test(stripComments(FileUtils.readFile(file) ?? ''));

    const violations: string[] = [];
    const siteWide = HOSTING_FILES.flatMap(name => NxWorkspace.resolveSourceFiles(projectRoot, name))
      .filter(file => declares(file, CSP_HEADER))
      .map(rel);
    for (const configured of context.config.thresholds?.security?.cspFiles ?? []) {
      const file = PathOperations.join(projectRoot, configured);
      if (!FileUtils.exists(file)) {
        violations.push(`thresholds.security.cspFiles: ${configured} does not exist — the CSP it is said to declare cannot be read`);
      } else if (!declares(file, CSP_HEADER)) {
        violations.push(`thresholds.security.cspFiles: ${configured} does not set a Content-Security-Policy header`);
      } else {
        siteWide.push(configured);
      }
    }
    const covered = siteWide.length > 0;

    const nextApps = ReactProject.nextApps(projectRoot);
    for (const app of nextApps) {
      const where = [...NEXT_CONFIGS, ...NEXT_REQUEST_HOOKS].map(name => PathOperations.join(app.root, name));
      if (covered || where.some(file => declares(file, CSP_HEADER))) continue;
      violations.push(
        `${rel(app.root) || '.'}: this Next app declares no Content-Security-Policy — none in next.config.* headers(), proxy.* or middleware.*, and ${SITE_WIDE}`
      );
    }

    const entries = this.entryDocuments(context, nextApps.map(app => app.root));
    for (const entry of entries) {
      if (covered || declares(entry, CSP_META)) continue;
      violations.push(
        `${rel(entry)}: no Content-Security-Policy — no <meta http-equiv="Content-Security-Policy"> in this entry document, and ${SITE_WIDE}`
      );
    }

    const judgedNothing = !covered && nextApps.length === 0 && entries.length === 0;
    if (judgedNothing) {
      violations.push(
        `found no entry document (index.html), no Next app and ${SITE_WIDE} — this law judged nothing. Declare the CSP where it is served and, if the law cannot see that place, name it in thresholds.security.cspFiles`
      );
    }

    const result = SecurityLawBase.createResult(
      violations,
      LAW_TITLE,
      'SECURITY',
      violations.length > 0
        ? [
            "Declare a Content-Security-Policy (start from default-src 'self'; object-src 'none') where the app is served",
            'Next.js: set it in next.config.* headers() or in proxy.ts; static hosting: in its headers config; plain HTML: a <meta http-equiv> tag',
          ]
        : [],
      context
    );
    // Judged nothing: failed, score 0 — the one verdict for it (#302).
    return judgedNothing ? markJudgedNothing(result) : result;
  }

  /** index.html files the scan reaches, outside Next apps and generated reports. */
  private static entryDocuments(context: LawCheckContext, nextRoots: string[]): string[] {
    const { projectRoot, config, lawId } = context;
    return CheckerUtils.findFilesByExtension(projectRoot, ['.html'], config, lawId).filter(file => {
      const norm = file.replace(/\\/g, '/');
      if (!/(?:^|\/)index\.html$/.test(norm)) return false;
      if (REPORT_DIRS.test(PathOperations.getRelative(projectRoot, file))) return false;
      return !nextRoots.some(root => norm.startsWith(root.replace(/\\/g, '/') + '/'));
    });
  }
}

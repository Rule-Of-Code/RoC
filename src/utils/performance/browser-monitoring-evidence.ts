/**
 * Core Web Vitals measured in the browser, as the code shows it (#553).
 *
 * Three laws — Performance Standards, Performance Monitoring Policy and
 * Performance Monitoring Standards — each kept a copy of a list of
 * web-vitals v3 names (`getLCP`, `getCLS` …), searched in a few fixed files,
 * or took a declared `web-vitals` dependency as proof. So an app that
 * measures LCP, CLS and INP itself with PerformanceObserver failed all three,
 * web-vitals v4 (`onLCP` …) outside `main.ts` was not seen, and a dependency
 * nobody calls passed. This module is the one source they read.
 *
 * The evidence is a measurement in the project's production sources (the
 * files the law selects, tests excluded):
 * - a web-vitals metric function (v3 `get*`, v4 `on*`) or Next.js
 *   `useReportWebVitals` called in a file that imports `web-vitals` /
 *   `next/web-vitals`;
 * - a PerformanceObserver observing an entry type the vitals are made of
 *   (`largest-contentful-paint`, `layout-shift`, `event`, `first-input`);
 * - a Next.js / React report found by the React source scan.
 */

import type { RuleOfCodeConfig } from '../../config/types';
import { CheckerUtils } from '../checker-utils';
import { FileUtils } from '../file-utils';
import { PARSER_UNAVAILABLE_TEXT } from '../judged-nothing';
import type { ReactPerformanceEvidence } from '../react/react-performance-source';

export interface VitalsMeasurement {
  kind: 'performance-observer' | 'react-report' | 'web-vitals';
  /** Project-relative file, and what was found there. */
  at: string;
}

const WEB_VITALS_IMPORT =
  /(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)['"](?:next\/)?web-vitals(?:\/[\w-]+)?['"]/;
const WEB_VITALS_CALL =
  /\b(?:(?:on|get)(?:CLS|INP|LCP|FCP|TTFB|FID)|useReportWebVitals)\s*\(/;
const NEW_OBSERVER = /\bnew\s+PerformanceObserver\s*\(/;
const VITALS_ENTRY_TYPE =
  /['"`](?:largest-contentful-paint|layout-shift|event|first-input)['"`]/;

/** Block comments and whole-line comments: a name in prose measures nothing. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

function relative(projectRoot: string, file: string): string {
  return file
    .slice(projectRoot.length)
    .replace(/^[\\/]+/, '')
    .replace(/\\/g, '/');
}

/** What one source file measures, if anything. */
function measuredIn(text: string): VitalsMeasurement['kind'] | null {
  const source = code(text);
  if (WEB_VITALS_IMPORT.test(source) && WEB_VITALS_CALL.test(source)) {
    return 'web-vitals';
  }
  if (NEW_OBSERVER.test(source) && VITALS_ENTRY_TYPE.test(source)) {
    return 'performance-observer';
  }
  return null;
}

export class BrowserMonitoringEvidence {
  /**
   * Every place the project measures Core Web Vitals in the browser. Empty
   * means none was found — a declared `web-vitals` that is never called
   * measures nothing.
   */
  static vitalsMeasurements(
    projectRoot: string,
    config?: RuleOfCodeConfig,
    react?: ReactPerformanceEvidence,
    lawId?: string
  ): VitalsMeasurement[] {
    const found: VitalsMeasurement[] = (react?.webVitalsReports ?? []).map(
      report => ({ kind: 'react-report', at: report })
    );

    // In a React/Next project the parser reads the source. What it could not
    // read is reported by the law as not read, and not judged here by a
    // second-best method (#427): without the parser, nothing; otherwise not
    // the files it named.
    const unread = react?.applies ? react.unread : [];
    if (unread.some(note => PARSER_UNAVAILABLE_TEXT.test(note))) return found;
    const skipped = new Set(unread.map(note => note.split(':')[0]));

    const files = CheckerUtils.findFilesByExtension(
      projectRoot,
      [...CheckerUtils.getCommonExtensions().ALL_CODE, '.mjs', '.cjs'],
      config ?? FileUtils.getMinimalDefaultConfig(),
      lawId
    );
    for (const file of files) {
      if (skipped.has(relative(projectRoot, file))) continue;
      const text = FileUtils.readFileContentSync(file);
      if (!text) continue;
      const kind = measuredIn(text);
      if (kind) found.push({ kind, at: relative(projectRoot, file) });
    }
    return found;
  }

  /** "web-vitals in src/app/vitals.ts", for a result's details. */
  static describe(measurement: VitalsMeasurement): string {
    switch (measurement.kind) {
      case 'web-vitals':
        return `web-vitals called in ${measurement.at}`;
      case 'performance-observer':
        return `own measurement with PerformanceObserver in ${measurement.at}`;
      default:
        return `Web Vitals reported (${measurement.at})`;
    }
  }
}

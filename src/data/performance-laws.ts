/**
 * Performance Laws Data Module
 * Laws for performance optimization, BundleSizeAnalyzer, and Core Web Vitals
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const PERFORMANCE_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Performance Standards',
      'BundleSizeAnalyzer: Lighthouse scores ≥90, Core Web Vitals compliance, optimized bundle sizes',
      'performance'
    ),
    legacyId: 50,
    section: '10',
    subsection: '10.1',
    title: 'Performance Standards',
    rationale:
      'A slow app is a broken app the profiler has not caught yet — users leave before they reach the feature. This law asks for the guardrails (a Lighthouse threshold, budgets, web-vitals, bundle and image optimization) that keep speed from silently regressing.',
    satisfiedBy: {
      angular: 'Add a Lighthouse config with a >=90 threshold, angular.json/webpack budgets, web-vitals tracking, lazy-loading and image optimization.',
      react: 'Run Lighthouse from a script or CI step with a performance threshold, declare one enforced budget (Lighthouse assertions or a size-limit check that a script runs), report Web Vitals with useReportWebVitals or web-vitals, and render images with next/image. A Next build already optimizes and caches hashed assets unless next.config turns that off.',
    },
    detectionLimits: [
      'Configuration and source evidence only — it never measures a real Lighthouse score, LCP or CLS. On Angular, "web-vitals usage" is a substring match in main.ts / app.component.ts / *monitoring*.ts; on React/Next it is a parsed CALL of useReportWebVitals or a web-vitals metric function.',
      'The Lighthouse >=90 threshold is checked only IF a config file exists; a missing file yields a different, non-threshold violation.',
      'Next.js / Vite bundle optimization and Next caching are credited to the framework defaults (read in next/dist and vite types): it checks only that next.config / vite.config does not turn minification off or set output: "export". Values imported into the config from another module are not resolved.',
      'next/image counts as image optimization without resolving `src` (Next serves an SVG unoptimized); only the element\'s `unoptimized` prop and next.config images.unoptimized are read.',
      'TypeScript/JavaScript only — no Python path, so a backend fails all six checks.',
    ],
    stack: 'frontend',
    emoji: '⚡',
    description:
      'Lighthouse scores ≥90, Core Web Vitals compliance, optimized BundleSizeAnalyzer',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkPerformanceStandards',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 10.1: Performance below constitutional standards',
    remediation:
      'Optimize BundleSizeAnalyzer, improve Lighthouse scores, fix Core Web Vitals',
  },

  {
    id: generateLawId(
      'Bundle Size Optimization',
      'Main bundle MUST be ≤500KB compressed, lazy chunks ≤100KB each',
      'performance'
    ),
    legacyId: 51,
    section: '10',
    subsection: '10.2',
    title: 'Bundle Size Optimization',
    rationale:
      'Every kilobyte the browser must download is time the user waits before anything works. A bundle that grows unchecked is a page that gets slower with every feature. This law asks that the bundle be optimized and measured.',
    satisfiedBy: {
      angular: 'Enable optimization/tree-shaking in the build, lazy-load routes (loadChildren), and add a bundle analyzer (source-map-explorer / webpack-bundle-analyzer).',
      react: 'Build with next build or vite build without turning minification off, run a bundle analyzer from a script (next experimental-analyze, @next/bundle-analyzer wired into next.config, source-map-explorer, size-limit), and load heavy libraries with next/dynamic or React.lazy.',
    },
    detectionLimits: [
      'Never measures actual bundle bytes despite the name: "optimization configured" is read from the build tool\'s config (Angular budgets/esbuild/"optimization", Next/Vite defaults unless minification is turned off, webpack production mode, a Rollup terser plugin), never from the output.',
      'Lazy loading is credited project-wide (Angular loadChildren in a routing file; next/dynamic, React.lazy or import() in parsed React source) — it does not check that the heavy library itself is the deferred one, and heavy libraries are read from the root package.json only.',
      'TS/JS — no Python path, so a backend gets false "no optimization / no bundle analysis" violations.',
    ],
    stack: 'frontend',
    emoji: '📦',
    description:
      'Main bundle MUST be ≤500KB compressed, lazy chunks ≤100KB each',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'BundleSizeOptimizationLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 10.2: Bundle size exceeds constitutional limits',
    remediation:
      'Optimize BundleSizeAnalyzer: lazy loading, tree shaking, dynamic imports',
  },

  {
    id: generateLawId(
      'Core Web Vitals Compliance',
      'LCP ≤2.5s, FID ≤100ms, CLS ≤0.1 on all production pages',
      'performance'
    ),
    legacyId: 52,
    section: '10',
    subsection: '10.3',
    title: 'Core Web Vitals Compliance',
    rationale:
      'Core Web Vitals — LCP, CLS, INP — are how Google and your users measure whether the page feels fast. This law asks for the setup that keeps them green: budgets, lazy-loading, caching, resource hints.',
    satisfiedBy: {
      angular: 'Set performance budgets, lazy-load, add a service worker / caching, image optimization and resource hints (preload/preconnect) in index.html; track web-vitals.',
      react: 'Run Lighthouse from a script or CI step, declare an enforced budget (Lighthouse assertions or a size-limit check that a script runs), render images with next/image or loading="lazy", and preload fonts with next/font or a <link rel="preconnect"> in the root layout. Next serves hashed assets with immutable caching unless next.config sets output: "export".',
    },
    detectionLimits: [
      'Measures NO actual Core Web Vitals despite the name — configuration and source evidence only, and Lighthouse is wiring-only here (no threshold read).',
      'Resource hints: a raw string search of index.html (source and built) on Angular; on React, parsed <link rel> elements, next/font loader calls and react-dom preload/preconnect calls — a hint a library emits at run time is not seen.',
      'Next caching is credited to Next\'s own immutable /_next/static headers unless next.config sets output: "export"; a proxy or host in front of `next start` is not read.',
      'No Python path, so a backend fails all six sub-checks.',
    ],
    stack: 'frontend',
    emoji: '🎯',
    description: 'LCP ≤2.5s, FID ≤100ms, CLS ≤0.1 on all production pages',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkCoreWebVitals',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 10.3: Core Web Vitals not compliant',
    remediation:
      'Optimize LCP, FID, CLS metrics to meet constitutional standards',
  },

  {
    id: generateLawId(
      'Bundle Optimization Strategy Policy',
      'Implement lazy loading, preloading strategies, and proper code splitting',
      'performance'
    ),
    legacyId: 53,
    section: '6',
    subsection: '6.15',
    title: 'Bundle Optimization Strategy Policy',
    rationale:
      'Shipping one giant bundle means the user downloads the checkout page to see the home page. A real optimization strategy — code-splitting, tree-shaking, vendor chunking — sends only what each route needs.',
    satisfiedBy: {
      angular: 'Code-split with lazy routes and dynamic import(), enable tree-shaking (ESM, optimization), and configure vendor / critical-css chunking in angular.json.',
      react: 'Build with next build (route splitting, minification, tree-shaking and chunking are Next\'s own), enable experimental.optimizeCss (with critters) for critical CSS, split heavy client code with next/dynamic or React.lazy, and check it with an analyzer (next experimental-analyze, @next/bundle-analyzer, size-limit). On Vite, declare manualChunks / codeSplitting groups.',
    },
    detectionLimits: [
      'All configuration reads (angular.json / project.json / package.json / next.config / vite.config) — it measures no bundle.',
      'The Nx fallback walks only apps/* (not libs/*) for the Angular minification / critical-css / vendor checks.',
      'Vendor chunking does not apply to a Next app (Next owns chunking) and is reported satisfied with that reason. Outside Angular, tree-shaking is credited to Next / Vite / webpack-production defaults; on Angular the dependency-name heuristic ("@", "ng-", "ngx-") still stands.',
      'No Python path — a backend fails all six sub-checks.',
    ],
    stack: 'frontend',
    emoji: '🚀',
    description:
      'Implement lazy loading, preloading strategies, and proper code splitting',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    automation: 'CONFIGURABLE',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkBundleOptimization',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 6.15: Bundle optimization not implemented',
    remediation: 'Implement lazy loading modules and preloading strategies',
  },

  {
    id: generateLawId(
      'Performance Monitoring Policy',
      'BundleSizeAnalyzer: Use Angular DevTools, track Core Web Vitals, monitor bundle sizes',
      'performance'
    ),
    legacyId: 54,
    section: '6',
    subsection: '6.16',
    title: 'Performance Monitoring Policy',
    rationale:
      'You cannot fix a slowdown you cannot see. This law asks for the monitoring that turns "users say it is slow" into a graph: RUM, error tracking, alerts, dashboards, web-vitals in production.',
    satisfiedBy: {
      angular: 'Wire RUM (or analytics), error tracking, performance alerts, a dashboard, and web-vitals reporting from production.',
      react: 'Report Web Vitals with useReportWebVitals (or web-vitals) and errors with @sentry/nextjs or @sentry/react from the root layout or instrumentation*.ts; declare a size-limit or Lighthouse budget, an alert definition and a dashboard.',
    },
    detectionLimits: [
      'Dependency / config / file presence only — no proof monitoring actually reports; a Google Analytics snippet is detected by an index.html substring. On React/Next a parsed useReportWebVitals / web-vitals CALL counts as RUM and Web Vitals monitoring, and an error-tracking SDK import anywhere in the source counts as error tracking.',
      'Alerting and dashboards are keyword / file-presence checks on every stack (newrelic.js, datadog.json, .lighthouserc.js containing "alert", "notification" or "webhook"; grafana.json and similar).',
      'Browser-oriented with NO backend/Python path (unlike Performance Monitoring Standards) — a backend fails most checks.',
      'Conceptually overlaps Performance Monitoring Standards but is a separate, less capable detector.',
    ],
    stack: 'frontend',
    emoji: '📊',
    description:
      'Use Angular DevTools, track Core Web Vitals, monitor BundleSizeAnalyzer',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkPerformanceMonitoring',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 6.16: Performance monitoring not configured',
    remediation:
      'Configure performance monitoring with Angular DevTools and Lighthouse CI',
  },

  {
    id: generateLawId(
      'Performance Monitoring Standards',
      'Comprehensive monitoring of application performance with automated alerts',
      'performance'
    ),
    legacyId: 55,
    section: '18',
    subsection: '18.1',
    title: 'Performance Monitoring Standards',
    rationale:
      'A bot trading real money had a metric named unauthorized_401 that fed nothing and zero alert policies — it could have died silently while its dashboard looked green. Monitoring you never wire to an alert is decoration; the alert is the law.',
    satisfiedBy: {
      angular:
        'Wire RUM (web-vitals) and a Lighthouse budget in CI so a regression fails the build.',
      python:
        'Export metrics (Prometheus / OpenTelemetry) AND define alerting rules that actually fire on latency and error-rate — not just a dashboard.',
    },
    detectionLimits: [
      'RUM, Core Web Vitals and a Lighthouse budget are checked only for a browser-facing project; a backend has no page and is judged on APM/metrics/alerting instead.',
      'Presence, not proof: it verifies a monitoring/alerting integration is wired in, not that an alert would actually fire when the service degrades.',
    ],
    emoji: '🔍',
    description:
      'Comprehensive monitoring of application performance with automated alerts',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    automation: 'CONFIGURABLE',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkPerformanceMonitoringStandards',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 18.1: Performance monitoring standards not met',
    remediation:
      'Implement Lighthouse CI, performance budgets, automated monitoring alerts',
  },

  // Extended Performance Laws (56-59)
  {
    id: generateLawId(
      'Memory Leak Prevention',
      'Proactive memory leak detection and prevention',
      'performance'
    ),
    legacyId: 56,
    article: 'VI',
    subsection: '6.7',
    title: 'Memory Leak Prevention',
    rationale:
      'A subscription or listener that is never torn down keeps its whole closure alive. In a long-lived SPA that is a slow leak the user feels as a tab that grows heavier by the hour — the kind of bug that never reproduces in a five-minute test.',
    satisfiedBy: {
      angular:
        'takeUntilDestroyed(), toSignal(), or unsubscribe in ngOnDestroy — a component that subscribes must also clean up.',
      typescript:
        'Pair every addEventListener / setInterval with its remove / clear on teardown.',
    },
    detectionLimits: [
      'Detects missing subscription / listener / timer cleanup by PATTERN in TS/JS (takeUntilDestroyed, DestroyRef, unsubscribe, clearInterval).',
      'It cannot prove a leak occurs at runtime, only that a known cleanup idiom is absent — a genuinely leak-free custom pattern may still be flagged.',
      'No signal on non-TS/JS stacks; it does not analyse Python object lifetimes.',
    ],
    emoji: '🧠',
    description: 'Proactive memory leak detection and prevention',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkMemoryLeakPrevention',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VI.6.7: Memory leak risks detected',
    remediation: 'Implement proper cleanup and avoid circular references',
  },

  {
    id: generateLawId(
      'Database Query Optimization',
      'All database queries must be optimized for performance',
      'performance'
    ),
    legacyId: 57,
    article: 'VI',
    subsection: '6.8',
    title: 'Database Query Optimization',
    rationale:
      'An app that is fast in development dies in production when the data is real: an N+1 loop and an unindexed scan cost nothing on ten rows and everything on ten million. The cost is invisible until it is not, so it must be caught in review, not in an incident.',
    satisfiedBy: {
      typescript:
        'Batch or JOIN instead of querying inside a loop; select only the columns you use; index the columns you filter on.',
      python:
        'Use select_related / prefetch_related (Django) or joinedload (SQLAlchemy) instead of a query per row.',
    },
    detectionLimits: [
      'Query analysis is JS/TS-only — a regex/AST pass over TypeScript source.',
      'A Python project\'s SQLAlchemy / Django ORM access is not statically analysed by this law; absence of a JS data layer is N/A, never a pass.',
      'It flags query SHAPES it recognises; it cannot prove a query is slow without running it against real data.',
    ],
    emoji: '🗃️',
    description: 'All database queries must be optimized for performance',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkDatabaseQueryOptimization',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VI.6.8: Database query optimization needed',
    remediation: 'Add proper indexing and optimize slow queries',
  },

  {
    id: generateLawId(
      'CDN and Caching Strategy',
      'Implement proper CDN and caching strategies',
      'performance'
    ),
    legacyId: 58,
    article: 'VI',
    subsection: '6.9',
    title: 'CDN and Caching Strategy',
    rationale:
      'Serving every asset from your origin, uncached, on every request pays for latency you could have avoided. A CDN and cache headers put the bytes close to the user and keep them there.',
    satisfiedBy: { angular: 'Serve assets via a CDN (firebase hosting headers / deployUrl), set cache-control headers, add a service worker, and enable HTTP/2.' },
    detectionLimits: [
      'Correctly N/A for a pure backend (it gates on web assets first) — but its CDN check matches a bare "assets" or "cdn" anywhere in an env file, a trivially-satisfied false pass.',
      'All detection is config-file presence; no runtime CDN/edge verification.',
      'TS/JS + web config only.',
    ],
    emoji: '🚀',
    description: 'Implement proper CDN and caching strategies',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'CONFIGURABLE',
    checkFunction: 'checkCDNCachingStrategy',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VI.6.9: CDN/caching strategy missing',
    remediation: 'Configure CDN and implement proper caching headers',
  },

  {
    id: generateLawId(
      'Performance Budget Compliance',
      'Stay within defined performance budgets for all metrics',
      'performance'
    ),
    legacyId: 59,
    article: 'VI',
    subsection: '6.10',
    title: 'Performance Budget Compliance',
    rationale:
      'A performance budget is a number a regression cannot cross without failing the build — without it, "a little slower each release" compounds into unusable. This law asks that the budget exist and be enforced in CI.',
    satisfiedBy: {
      angular: 'Declare angular.json/webpack budgets, a Lighthouse budget, bundle-size monitoring, and a CI gate that fails on a budget breach.',
      react: 'Declare one enforced budget — a size-limit check with a limit, or Lighthouse CI assertions — run by a script, run it from a CI step (or a git hook when the project has no hosted CI), and report Web Vitals or errors in production (useReportWebVitals, @sentry/nextjs).',
    },
    detectionLimits: [
      'Presence only — it reads that a budget is declared and wired, never the budget value, and never whether a build actually breaches it.',
      'The gate is a CI command (comments and `name:` lines removed) or, with no hosted CI, a husky / lefthook / simple-git-hooks hook, that runs lhci, size-limit, bundlesize or bundlewatch — directly or through package scripts — or the Angular build when maximumError budgets exist. Whether the CI pipeline actually runs is not known.',
      'No Python N/A path — a backend fails it.',
    ],
    stack: 'frontend',
    emoji: '💰',
    description: 'Stay within defined performance budgets for all metrics',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkPerformanceBudgetCompliance',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article VI.6.10: Performance budget exceeded',
    remediation: 'Optimize assets and code to meet performance budgets',
  },
];

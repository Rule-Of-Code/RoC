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
    satisfiedBy: { angular: 'Add a Lighthouse config with a >=90 threshold, angular.json/webpack budgets, web-vitals tracking, lazy-loading and image optimization.' },
    detectionLimits: [
      'Presence and keyword detection only — it checks that config and tooling EXIST, never a real Lighthouse score, LCP or CLS; "web-vitals usage" is a substring match, not proof it runs.',
      'The Lighthouse >=90 threshold is checked only IF a config file exists; a missing file yields a different, non-threshold violation.',
      'TypeScript/Angular only — no Python path, so a backend fails all six checks.',
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
    satisfiedBy: { angular: 'Enable optimization/tree-shaking in the build, lazy-load routes (loadChildren), and add a bundle analyzer (source-map-explorer / webpack-bundle-analyzer).' },
    detectionLimits: [
      'Never measures actual bundle bytes despite the name — the "optimization config" check is a bare substring (the word "bundle", or a comment, satisfies it).',
      'Lazy-load detection is Angular loadChildren only; a dynamic import() is not counted here.',
      'TS/JS/Angular — no Python path, so a backend gets false "no optimization / no bundle analysis" violations.',
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
    satisfiedBy: { angular: 'Set performance budgets, lazy-load, add a service worker / caching, image optimization and resource hints (preload/preconnect) in index.html; track web-vitals.' },
    detectionLimits: [
      'Measures NO actual Core Web Vitals despite the name — it is pure file/config presence, and Lighthouse is presence-only here (no threshold read).',
      'Resource hints are detected by a raw string search of index.html; browser-only.',
      'Runs the SAME detector as "Extended Core Web Vitals Compliance" (a duplicate law entry); no Python path, so a backend fails all six.',
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
    satisfiedBy: { angular: 'Code-split with lazy routes and dynamic import(), enable tree-shaking (ESM, optimization), and configure vendor / critical-css chunking in angular.json.' },
    detectionLimits: [
      'All config-file heuristics (angular.json / package.json / project.json via includes/regex) — it measures nothing.',
      'The Nx fallback walks only apps/* (not libs/*) for the minification / critical-css / vendor checks.',
      'Runs the SAME detector as "Advanced Bundle Optimization Policy" (a duplicate law entry); Angular-centric, no Python path — a backend fails all six.',
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
    satisfiedBy: { angular: 'Wire RUM (or analytics), error tracking, performance alerts, a dashboard, and web-vitals reporting from production.' },
    detectionLimits: [
      'Dependency / config / file presence only — no proof monitoring is wired or actually reports; a Google Analytics snippet is detected by an index.html substring.',
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
    satisfiedBy: { angular: 'Declare angular.json/webpack budgets, a Lighthouse budget, bundle-size monitoring, and a CI gate that fails on a budget breach.' },
    detectionLimits: [
      'Presence only — it reads that a budget config EXISTS, never the budget value, and never whether a build actually breaches it.',
      'The CI gate is a keyword substring in a workflow YAML (a comment satisfies it).',
      'Angular/webpack/CI-oriented; no Python N/A path — a backend fails all six.',
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

  {
    id: generateLawId(
      'Extended Core Web Vitals Compliance',
      'Ensures performance meets Google Core Web Vitals standards',
      'performance'
    ),
    legacyId: 65,
    section: '10',
    subsection: '10.6',
    title: 'Extended Core Web Vitals Compliance',
    rationale:
      'Core Web Vitals — LCP, CLS, INP — are how Google and your users measure whether the page feels fast. This law asks for the setup that keeps them green: budgets, lazy-loading, caching, resource hints.',
    satisfiedBy: { angular: 'Set performance budgets, lazy-load, add a service worker / caching, image optimization and resource hints in index.html; track web-vitals.' },
    detectionLimits: [
      'A REDUNDANT law entry — it runs the exact same detector as "Core Web Vitals Compliance", with the same result.',
      'Measures no actual Core Web Vitals; pure file/config presence, Lighthouse presence-only.',
      'Browser-only; no Python path, so a backend fails all six.',
    ],
    stack: 'frontend',
    emoji: '🎯',
    description: 'Ensures performance meets Google Core Web Vitals standards',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkCoreWebVitalsCompliance',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 10.6: Core Web Vitals standards not met',
    remediation:
      'Implement performance monitoring, Lighthouse config, bundle analysis, resource hints, service workers, and image optimization',
  },

  {
    id: generateLawId(
      'Advanced Bundle Optimization Policy',
      'Ensures optimal BundleSizeAnalyzer and loading strategies',
      'performance'
    ),
    legacyId: 66,
    section: '10',
    subsection: '10.7',
    title: 'Advanced Bundle Optimization Policy',
    rationale:
      'Shipping one giant bundle means the user downloads the checkout page to see the home page. A real optimization strategy — code-splitting, tree-shaking, vendor chunking — sends only what each route needs.',
    satisfiedBy: { angular: 'Code-split with lazy routes and dynamic import(), enable tree-shaking, and configure vendor / critical-css chunking in angular.json.' },
    detectionLimits: [
      'A REDUNDANT law entry — it runs the exact same detector as "Bundle Optimization Strategy Policy", with the same result.',
      'All config-file heuristics; it measures no actual bundle size; the Nx fallback covers only apps/*.',
      'Angular-centric; no Python path, so a backend fails all six.',
    ],
    stack: 'frontend',
    emoji: '📦',
    description:
      'BundleSizeAnalyzer: Ensures optimal bundle size and loading strategies',
    priority: 'HIGH',
    category: 'PERFORMANCE',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkBundleOptimizationStrategy',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 10.7: Bundle optimization strategy incomplete',
    remediation:
      'Configure code splitting, tree shaking, bundle analyzer, minification, compression, and critical CSS extraction',
  },

  {
    id: generateLawId(
      'Extended Performance Monitoring Standards',
      'Ensures comprehensive performance monitoring is in place',
      'performance'
    ),
    legacyId: 68,
    section: '10',
    subsection: '10.8',
    title: 'Extended Performance Monitoring Standards',
    rationale:
      'A bot trading real money had a metric named unauthorized_401 that fed nothing and zero alert policies — it could have died silently while its dashboard looked green. Monitoring you never wire to an alert is decoration; the alert is the law.',
    satisfiedBy: { angular: 'Wire RUM (web-vitals) and a Lighthouse budget in CI so a regression fails the build.', python: 'Export metrics (Prometheus / OpenTelemetry) AND define alerting rules that actually fire on latency and error-rate — not just a dashboard.' },
    detectionLimits: [
      'A REDUNDANT law entry — it runs the exact same detector as "Performance Monitoring Standards".',
      'RUM, Core Web Vitals and a Lighthouse budget are checked only for a browser-facing project; a backend is judged on APM / metrics / alerting instead.',
      'Presence, not proof: it verifies an integration is wired in, not that an alert would actually fire.',
    ],
    emoji: '📊',
    description: 'Ensures comprehensive performance monitoring is in place',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    checkFunction: 'checkPerformanceMonitoringStandards',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 10.8: Performance monitoring standards not implemented',
    remediation:
      'Integrate monitoring tools, configure RUM, set performance budgets, build monitoring, error tracking, and alerts',
  },
];

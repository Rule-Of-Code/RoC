/**
 * FE Architecture Laws Data Module
 * From the frontend architecture audit. Turns the
 * root-cause findings (fragmented polling, eternal root polls, state leaking into
 * feature layer) into statically enforceable laws. Regex/string detection on
 * .ts (RoC has no AST); gated on an Angular project (stack: frontend). Rolled out
 * warn-first warn-first. legacyId range: 301+ (maps to ROC-FE-NN).
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const FE_ARCHITECTURE_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Poll Via Sanctioned Source',
      'HTTP polling must use the sanctioned visibility-gated tick source, not raw interval/timer',
      'angular'
    ),
    legacyId: 301,
    article: 'IV',
    subsection: '4.10',
    title: 'Poll Via Sanctioned Source',
    rationale:
      'Ad-hoc interval() polling that ignores whether the tab is even visible burns battery and hammers the API in the background. This law asks that polling go through a sanctioned source that respects page visibility.',
    satisfiedBy: { angular: 'Poll through the sanctioned source (a PageVisibilityService / poll-signal) rather than a raw interval/timer piped straight into an HTTP call; allowlist it via pollSourceAllowlist.' },
    detectionLimits: [
      'Scans only feature/data-access layer files; a poll in core/ or shared/ is invisible, and assigning the source to a variable first (const t = interval(); t.pipe(...)) evades detection.',
      'The HTTP heuristic is broad — `.get(` matches any object\'s .get() and `http.` any var named http; exemption is by basename (page-visibility/poll-signal/poll-ticks) or a path-substring allowlist.',
      'No comment/string stripping; setInterval is not covered.',
    ],
    emoji: '📡',
    description:
      'HTTP polls go through the sanctioned visibility-gated tick source (pollTicks), not ad-hoc interval/timer',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'PollViaSanctionedSourceLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.10: Ad-hoc interval/timer driving an HTTP poll',
    remediation:
      'Drive HTTP polls with PageVisibilityService.pollTicks(ms); keep raw ticks only for local UI without HTTP',
  },

  {
    id: generateLawId(
      'Root Service No Timer',
      'A providedIn root service must not own a timer (eternal background poll)',
      'angular'
    ),
    legacyId: 302,
    article: 'IV',
    subsection: '4.11',
    title: 'Root Service No Timer',
    rationale:
      'A timer in a providedIn:\'root\' singleton runs for the entire app lifetime with nothing to tear it down — a permanent background task and a permanent leak. This law keeps timers out of root services, or behind a sanctioned one.',
    satisfiedBy: { angular: 'Do not start interval/timer/setInterval in a providedIn:\'root\' service; own polling in a sanctioned service (page-visibility / poll-signal) or allowlist the class via rootTimerAllowlist.' },
    detectionLimits: [
      'Matches a real timer — RxJS interval(/timer( as a bare call, or setInterval( — in the class body with comments and strings stripped; a method named timer()/interval() (a dotted call like this.timer()) is not mistaken for one.',
      'A sanctioned root service is exempt only if its file path contains page-visibility/poll-signal/poll-ticks or its class name is in rootTimerAllowlist.',
      'The providedIn:\'root\' match breaks on nested braces (e.g. an inline useFactory); setTimeout is not covered.',
    ],
    emoji: '⏲️',
    description:
      "A providedIn:'root' service must not own an interval/timer/setInterval (eternal poll that never stops)",
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'RootServiceNoTimerLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.11: Timer inside a root-provided service',
    remediation:
      'Provide the service at the route/component lifecycle, or allowlist a genuine app-clock',
  },

  {
    id: generateLawId(
      'Stores In Data Access',
      'State stores live in the data-access layer, not in the feature layer',
      'angular'
    ),
    legacyId: 303,
    article: 'IV',
    subsection: '4.12',
    title: 'Stores In Data Access',
    rationale:
      'A store defined in the UI or util layer couples state to the wrong place and is where a feature\'s data logic quietly escapes its boundary. This law asks that stores live in the data-access layer.',
    satisfiedBy: { angular: 'Define signalStore/createFeature/createReducer stores (and *.store.ts) in the data-access layer, not in feature/ui/util.' },
    detectionLimits: [
      'Only checks the feature* layer — a store misplaced in ui/, util/, shared/ or core/ is never caught.',
      'Detection is by CONTENT — a real signalStore(/createFeature(/createReducer( call in code (comments and strings stripped) — so the filename does not matter and a re-export or empty *.store.ts stub is not flagged.',
      'Angular-gated (vacuous pass on non-Angular).',
    ],
    emoji: '🗄️',
    description:
      'State stores (*.store.ts / signalStore / createFeature) live in data-access, not in the feature layer',
    priority: 'HIGH',
    category: 'FRAMEWORK',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'StoresInDataAccessLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.12: State store in the feature layer',
    remediation:
      'Move the store into libs/**/data-access; feature components consume state, not own it',
  },

  {
    id: generateLawId(
      'Requires Spec',
      'Money-adjacent write services and large components must have a co-located spec',
      'angular'
    ),
    legacyId: 304,
    article: 'IV',
    subsection: '4.13',
    title: 'Requires Spec',
    rationale:
      'A money-adjacent service or a large feature file with no spec is the code most likely to break and least protected when it does. This law requires a test to exist exactly where a silent failure would cost the most.',
    satisfiedBy: {
      angular:
        'Add a co-located *.spec.ts for money-adjacent (*actions*) services and any feature/data-access file over the LOC threshold.',
    },
    detectionLimits: [
      'Checks that a spec FILE exists, not its content — an empty *.spec.ts satisfies it.',
      '"Money-adjacent" is a filename substring or the literal X-Control-Pass string (a comment mentioning it triggers it); LOC is a raw line count including blanks and comments.',
      'Only files under /feature*/ or /data-access/ paths, and Angular only — a money service elsewhere, or a non-Angular repo, is not checked.',
    ],
    emoji: '🧪',
    description:
      'Money-adjacent write services (*actions*/X-Control-Pass) and large components have a co-located *.spec.ts',
    priority: 'HIGH',
    category: 'TESTING',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'RequiresSpecLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.13: Money-adjacent/large file without a spec',
    remediation:
      'Add a co-located *.spec.ts; split large files; tune thresholds.angular.specRequiredMinLoc',
  },

  {
    id: generateLawId(
      'No Layout Transition',
      'CSS transitions must not animate layout properties (reflow); use transform/opacity',
      'angular'
    ),
    legacyId: 308,
    article: 'IV',
    subsection: '4.14',
    title: 'No Layout Transition',
    rationale:
      'A CSS transition on width, height or margin makes the browser re-lay-out the whole page every frame — janky on a phone, invisible on the developer’s laptop. Animating transform/opacity instead moves the work to the GPU and keeps it smooth.',
    satisfiedBy: {
      angular:
        'Animate transform and opacity, not layout properties; never transition width/height/top/left/margin/padding.',
    },
    detectionLimits: [
      'Regex over .scss/.css text, no AST — `transition: all` is NOT flagged (it animates layout props but names no layout keyword), and a transition inside a CSS comment is a false positive.',
      'Only .scss/.css files — inline style= in templates and CSS-in-JS are not scanned.',
      'Covers transition / transition-property only; animation and @keyframes on layout props are out of scope. Angular only.',
    ],
    emoji: '🎞️',
    description:
      'CSS transitions animate transform/opacity, not layout properties (width/height/top/… trigger reflow)',
    priority: 'MEDIUM',
    category: 'PERFORMANCE',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoLayoutTransitionLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.14: CSS transition on a layout property',
    remediation:
      'Animate transform/opacity (GPU-composited) instead of width/height/top/left/…',
  },

  {
    id: generateLawId(
      'No Hostname Gating',
      'Feature gating via location.hostname ships dev/demo code to production',
      'angular'
    ),
    legacyId: 310,
    article: 'IV',
    subsection: '4.15',
    title: 'No Hostname Gating',
    rationale:
      'A build that behaves differently because location.hostname says "demo" is a build you cannot trust in production — the code path that runs for real users was never the one you tested. Decide behaviour by injected configuration, not by the URL bar. (The class it guards against: a "graceful" paper-trading fallback that shipped under a LIVE label.)',
    satisfiedBy: {
      angular:
        'Branch on injected configuration / environment, never on location.hostname. Reading the hostname is fine; comparing it to decide behaviour is not.',
    },
    detectionLimits: [
      'Literal-token, single-line match on .ts/.tsx — aliasing defeats it: `const h = location.hostname; if (h === "demo")` is not flagged.',
      'Matches four comparison operators and six string methods; switch(location.hostname), location.host, location.href.includes(...) and gating inside templates are invisible.',
      'Angular only — auto-passes every non-Angular repo; no comment stripping.',
    ],
    emoji: '🚧',
    description:
      'No feature gating via location.hostname — dev/demo code behind environment flags or tree-shaken *.dev.ts',
    priority: 'MEDIUM',
    category: 'SECURITY',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoHostnameGatingLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.15: Feature gating via location.hostname',
    remediation:
      'Gate dev/demo code with environment.* flags, not the hostname; tree-shake dev harness',
  },

  {
    id: generateLawId(
      'Defensive Array Coercion',
      'Array methods on an HTTP-envelope property must be guarded with Array.isArray',
      'angular'
    ),
    legacyId: 306,
    article: 'IV',
    subsection: '4.16',
    title: 'Defensive Array Coercion',
    rationale:
      'A raw API envelope whose "array" field arrives as null, or as a single object, turns `data.items.map(...)` into a runtime crash on the one payload you did not see in dev. Coercing to an array at the boundary makes the shape safe before the code trusts it.',
    satisfiedBy: { angular: 'In data-access, coerce raw fields before iterating: (Array.isArray(x) ? x : []).map(...); do not .map/.filter/.reduce a Raw* field directly.' },
    detectionLimits: [
      'Scans only /data-access/ files with a Raw* type token, and only a single property hop — p.data.items.map() and an aliased receiver are false negatives.',
      'Reads RAW .ts (no comment/string stripping), so a p.items.map( inside a comment or string is a false positive.',
      'Angular only, and only /data-access/ files — a non-Angular project passes without a check.',
    ],
    emoji: '🛟',
    description:
      'map/filter/reduce on a Raw HTTP-envelope property is guarded with Array.isArray (not ?? [])',
    priority: 'HIGH',
    category: 'CODE_QUALITY',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'DefensiveArrayCoercionLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.16: Unguarded array method on a response property',
    remediation:
      'Coerce with Array.isArray(x) ? x : [] (or coerceArray) at the mapper boundary',
  },

  {
    id: generateLawId(
      'No Passthrough Cast',
      'data-access must not cast an HTTP result straight to a domain model',
      'angular'
    ),
    legacyId: 307,
    article: 'IV',
    subsection: '4.17',
    title: 'No Passthrough Cast',
    rationale:
      'http.get<RawDto>(url) that flows straight into the app hands the unvalidated wire shape to code that trusts it — the boundary that should have parsed and narrowed just relabelled `any`. Typing the call to the DOMAIN type forces a real transform.',
    satisfiedBy: { angular: 'Type the HTTP call to a validated domain type, not the Raw envelope; map/parse Raw* into the domain model at the boundary.' },
    detectionLimits: [
      'The receiver is not verified to be HttpClient — any .get<T>() / .post<T>() matches (a builder, a typed Map), and a wrapped generic .get<ApiResponse<Foo>>() is missed.',
      'Scans only /data-access/ files, reads RAW .ts (no stripping) so a generic in a comment/string is flagged; /Raw/ is a case-sensitive allow.',
      'Angular only, scoped to the /data-access/ layer — outside Angular it passes untested.',
    ],
    emoji: '🎭',
    description:
      'HTTP generics are Raw*/unknown, converted in a mapper — no passthrough cast to a domain model',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoPassthroughCastLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.17: Passthrough DTO→model cast at the HTTP boundary',
    remediation:
      'Type the HTTP call as Raw*/unknown and convert in .pipe(map(...))',
  },

  {
    id: generateLawId(
      'Timer Cleanup',
      'setInterval/requestAnimationFrame in a class must be cleaned up',
      'angular'
    ),
    legacyId: 309,
    article: 'IV',
    subsection: '4.18',
    title: 'Timer Cleanup',
    rationale:
      'A setInterval with no clearInterval keeps running after the component is gone — a callback firing into nothing, holding its closure alive. The timer\'s life must be tied to the component\'s, or it leaks.',
    satisfiedBy: { angular: 'Pair every setInterval / requestAnimationFrame with clearInterval / cancelAnimationFrame (or DestroyRef / takeUntilDestroyed) in the same component or service.' },
    detectionLimits: [
      'Whole-file token presence: ANY clearInterval/DestroyRef anywhere in the file (even a comment/string, or an unrelated timer) suppresses the violation — a false negative.',
      'Reads raw .ts (no stripping), so a setInterval( in a comment/string with no cleanup is a false positive; setTimeout is not checked.',
      'Angular only, files matching .component/.service/.directive/.store.ts; vacuous pass on non-Angular.',
    ],
    emoji: '🧹',
    description:
      'setInterval/requestAnimationFrame in a class has a clearInterval/cancelAnimationFrame/DestroyRef cleanup',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'TimerCleanupLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.18: Timer/RAF without cleanup',
    remediation:
      'Pair with clearInterval/cancelAnimationFrame or tie cleanup to DestroyRef',
  },

  {
    id: generateLawId(
      'No Risk Literals',
      'Risk/financial numbers must flow from state, not be hardcoded in the UI',
      'angular'
    ),
    legacyId: 311,
    article: 'IV',
    subsection: '4.19',
    title: 'No Risk Literals',
    rationale:
      'A bare 450 next to the word equityFloor is a business rule hidden in a literal — the reader cannot tell a deliberate risk limit from a typo, and the next editor changes it blind. Named constants carry the intent, and dollar amounts in a template almost always belong in config.',
    satisfiedBy: { angular: 'Name risk/limit/floor/equity/leverage values as constants from config, not inline literals; keep hardcoded $amounts out of templates.' },
    detectionLimits: [
      'The .ts branch does NOT strip comments or strings — a `// risk = 700` or a string literal is a false positive; the token match is a case-insensitive SUBSTRING, so delimiter/unlimited/rateLimit/floorplan all fire (a known high false-positive class).',
      'The .html branch flags any line with `$` followed by a digit (Angular interpolation is skipped, but literal `$5` text fires); .scss is not scanned.',
      'Angular only (it does not scan .scss) — a non-Angular project passes vacuously.',
    ],
    emoji: '💵',
    description:
      'No hardcoded risk/financial numeric literals (floor/risk/limit/equity/…) or $NNN in templates',
    priority: 'LOW',
    category: 'CODE_QUALITY',
    stack: 'frontend',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoRiskLiteralsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article IV.4.19: Hardcoded risk/financial literal in the UI',
    remediation:
      'Bind risk numbers from state; keep $-amounts out of templates',
  },
];

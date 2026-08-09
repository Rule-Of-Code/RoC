/**
 * Code Quality Laws Data Module
 * High-impact laws for code quality and standards
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const CODE_QUALITY_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Absolute Zero Tolerance Doctrine',
      'No TypeScript errors, ESLint warnings, debug statements in commits',
      'quality'
    ),
    legacyId: 10,
    article: 'II',
    subsection: '2.1',
    title: 'Absolute Zero Tolerance Doctrine',
    rationale:
      'Zero tolerance means the build has no acceptable number of console.logs, TODOs, `any`s or empty catches — because "we will clean it up later" is the comment on every line that shipped a bug. The bar is zero, so there is no line to argue about.',
    satisfiedBy: { typescript: 'Enable strict in tsconfig and keep zero console.*, TODO/FIXME, `: any`/unknown[], eslint-disable and empty catch blocks across non-test .ts.' },
    detectionLimits: [
      'The strict check is a SUBSTRING test: `"strict"` plus any `true` in the tsconfig passes — even `"strict": false` next to `"esModuleInterop": true`.',
      'No comment/string stripping — a console.log, `: any` or TODO inside a comment or string counts; only the ROOT tsconfig is read.',
      'TS/Angular only; a Python project has no tsconfig and cannot pass.',
    ],
    stack: 'typescript',
    emoji: '❌',
    description:
      'No TypeScript errors, ESLint warnings, debug statements in commits',
    priority: 'CRITICAL',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkZeroToleranceStrict',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.1: Zero tolerance doctrine breached',
    remediation:
      'Remove console statements, fix all TypeScript errors, ensure strict compliance',
  },

  {
    id: generateLawId(
      'NX Commands Only Policy',
      'All build/test commands must use NX workspace architecture',
      'quality'
    ),
    legacyId: 11,
    article: 'II',
    subsection: '2.2',
    title: 'NX Commands Only Policy',
    rationale:
      'In an Nx workspace, `ng build` and `nx build` are not the same command — one skips the caching, affected-detection and task graph the monorepo depends on. This law asks that the team drive the workspace through Nx, consistently.',
    satisfiedBy: { angular: 'Commit nx.json, use `nx ...` (not `ng ...`) in package.json scripts, and prefer workspace.json over a standalone angular.json.' },
    detectionLimits: [
      'Requires nx.json to exist — any non-Nx repo fails unless the law is scoped out.',
      'The docs scan is effectively dead (it looks for .md among ts/js/json results), so only the root README.md is checked for `ng` usage.',
      'Reads scripts / config / README, not build invocations; Angular/Nx only.',
    ],
    stack: 'typescript',
    emoji: '🛠️',
    description: 'All build/test commands must use NX workspace architecture',
    priority: 'HIGH',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'CONFIGURABLE',
    checkFunction: 'checkNxCommandsOnly',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.2: Non-NX commands detected',
    remediation:
      'Replace npm run with nx commands for all build/test operations',
  },

  {
    id: generateLawId(
      'Observable Cleanup Requirements',
      'All subscriptions must be properly unsubscribed to prevent memory leaks',
      'quality'
    ),
    legacyId: 12,
    article: 'II',
    subsection: '2.3',
    title: 'Observable Cleanup Requirements',
    rationale:
      'A subscription that outlives its component keeps firing into a dead view — a leak that grows as the user navigates, felt as a tab that gets heavier by the hour. Cleanup is what ties the subscription\'s life to the component\'s.',
    satisfiedBy: { angular: 'Clean up subscriptions with takeUntilDestroyed / DestroyRef, the async pipe, take(1), or unsubscribe in ngOnDestroy.' },
    detectionLimits: [
      'Whole-file, lenient exemption: ANY occurrence of the substring `async` (an async function anywhere) marks the whole file as cleaned up — a large false negative.',
      'A single uncleaned subscription in a component can trigger three near-duplicate violations (three overlapping checks).',
      'Regex, no AST; matches in comments/strings; no Python.',
    ],
    stack: 'frontend',
    emoji: '🧹',
    description:
      'All subscriptions must be properly unsubscribed to prevent memory leaks',
    priority: 'HIGH',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkObservableCleanup',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.3: Observable cleanup missing',
    remediation:
      'Use takeUntil pattern or async pipe to properly clean up subscriptions',
  },

  // Extended Code Quality Laws (13-19)
  {
    id: generateLawId(
      'Code Documentation Standards',
      'All functions and classes must have proper JSDoc documentation',
      'quality'
    ),
    legacyId: 13,
    article: 'II',
    subsection: '2.4',
    title: 'Code Documentation Standards',
    rationale:
      'Undocumented public code is a maze with no signs — the next engineer reverse-engineers what a docstring could have told them in a sentence. This law asks that classes and functions carry the why the code itself cannot.',
    satisfiedBy: { typescript: 'Put a JSDoc /** */ block before >=80% of exported classes and >=60% of functions/methods; keep a >=10% comment ratio in files over 50 lines; add a README in src/app or src/lib dirs.' },
    detectionLimits: [
      'Regex counting of classes/functions (no AST); the comment-ratio counts any // or /* line regardless of what it actually says.',
      'The README check fires only under src/app or src/lib paths; an empty project scores 100.',
      'TS only — no Python (no export class / JSDoc to count).',
    ],
    emoji: '📝',
    description:
      'All functions and classes must have proper JSDoc documentation',
    priority: 'HIGH',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkCodeDocumentation',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.4: Missing code documentation',
    remediation: 'Add JSDoc comments for all public functions and classes',
  },

  {
    id: generateLawId(
      'Code Complexity Control',
      'Functions must maintain reasonable cyclomatic complexity',
      'quality'
    ),
    legacyId: 14,
    article: 'II',
    subsection: '2.5',
    title: 'Code Complexity Control',
    rationale:
      'A function nobody can hold in their head is a function nobody can safely change — complexity is where bugs hide and reviews miss them. The metric is a proxy, but an honest one: it points at the code most likely to break under the next edit.',
    satisfiedBy: {
      typescript:
        'Extract branches into named helpers; a function should read as a short list of intentions.',
      python:
        'Split deeply nested conditionals into small functions; return early instead of nesting.',
    },
    detectionLimits: [
      'Measures structural / cyclomatic complexity from syntax; it does not measure cognitive load, naming quality, or whether the complexity is justified by the problem.',
      'A low score is not "simple" — a tangled function under the threshold still passes.',
      'Function bodies are found by brace matching, so an arrow with an expression body (x => x + 1) is never measured, and neither is a function whose return type is written as an inline object literal.',
      'thresholds.codeQuality.maxFileComplexity is opt-in: with no value set a file is judged only by its worst single function, never by its total, so a large file of simple functions is not reported.',
    ],
    emoji: '🌪️',
    description: 'Functions must maintain reasonable cyclomatic complexity',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkCodeComplexityControl',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.5: Excessive code complexity',
    remediation: 'Refactor complex functions into smaller, focused units',
  },

  {
    id: generateLawId(
      'Naming Convention Enforcement',
      'CodeNamingAnalyzer ensures consistent naming conventions across all code elements',
      'quality'
    ),
    legacyId: 15,
    article: 'II',
    subsection: '2.6',
    title: 'Naming Convention Enforcement',
    rationale:
      'Names are the API of the codebase — inconsistent casing and cryptic abbreviations make every file a small translation exercise. A convention, enforced, means a reader can predict a name before they find it.',
    satisfiedBy: { angular: 'Add an ESLint config with @typescript-eslint/naming-convention; under src/ use camelCase members, PascalCase types, kebab-case files and directories.' },
    detectionLimits: [
      'Code and file naming are scanned under src/ ONLY — a project with no src/ (Nx apps/libs, Python) skips those checks, and a Python project fails on the missing ESLint config.',
      'The method-name regex matches any `identifier(` call — including factory/constructor calls — a false-positive source; per-file code-naming is a single aggregate capped at 10.',
      'Regex, no AST; TS/Angular.',
    ],
    stack: 'typescript',
    emoji: '🏷️',
    description: 'Consistent CodeNamingAnalyzer across all code elements',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkNamingConventionEnforcement',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.6: Naming convention violations',
    remediation:
      'Follow established camelCase, PascalCase, and kebab-case conventions',
  },

  {
    id: generateLawId(
      'Dead Code Elimination',
      'Remove all unused imports, functions, and variables',
      'quality'
    ),
    legacyId: 16,
    article: 'II',
    subsection: '2.7',
    title: 'Dead Code Elimination',
    rationale:
      'Dead code is a lie the reader has to disprove — a commented-out block, an unreachable branch, a stray debugger. Each is a question ("is this needed?") the next engineer must answer before they can safely change anything.',
    satisfiedBy: { typescript: 'Enable ESLint no-unused-vars / no-unreachable; keep <=3 commented function/const/let lines per file; no code after return; no debugger.' },
    detectionLimits: [
      'The "unused vars/imports" in the title are enforced only by the PRESENCE of an ESLint rule — never actually detected in the code.',
      'Unreachable-code detection is an indentation heuristic (not scope-aware); the debugger/keyword match hits comments and strings.',
      'TS/JS only; no Python.',
    ],
    emoji: '🧟',
    description: 'Remove all unused imports, functions, and variables',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkDeadCodeElimination',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.7: Dead code detected',
    remediation: 'Remove all unused code elements and imports',
  },

  {
    id: generateLawId(
      'Magic Number Prevention',
      'All numeric literals must be replaced with named constants',
      'quality'
    ),
    legacyId: 17,
    article: 'II',
    subsection: '2.8',
    title: 'Magic Number Prevention',
    rationale:
      'A bare 0.05 in trading code could be a fee, a slippage cap, or a rounding epsilon — the reader cannot tell, and the next editor guesses wrong. A named constant carries the intent the literal hides, and makes a wrong value a visible one.',
    satisfiedBy: {
      typescript: 'const MAKER_FEE = 0.001; — not a bare 0.001 at the call site.',
      python: 'MAKER_FEE = 0.001 at module scope — not an inline literal.',
    },
    detectionLimits: [
      'Flags numeric literals by pattern; it cannot tell a domain constant from a magic number by MEANING, only by whether the value is named.',
      'It does not verify a named constant is used correctly — a well-named but wrong constant passes.',
    ],
    emoji: '🔮',
    description: 'All numeric literals must be replaced with named constants',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkMagicNumberPrevention',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.8: Magic numbers detected',
    remediation: 'Replace magic numbers with well-named constants',
  },

  {
    id: generateLawId(
      'Code Duplication Control',
      'Prevent code duplication through proper abstraction',
      'quality'
    ),
    legacyId: 18,
    article: 'II',
    subsection: '2.9',
    title: 'Code Duplication Control',
    rationale:
      'Copy-pasted logic is a bug you now have to fix in every place you forgot you pasted it. This law asks that duplication be measured and kept down, so a fix lands once.',
    satisfiedBy: { typescript: 'Add jscpd (or a copy-paste detector) to package.json, and extract byte-identical function bodies into a shared helper.' },
    detectionLimits: [
      'Tool-presence dominates: a project without jscpd fails regardless of actual duplication.',
      'Block extraction is naive brace-counting on function/=> lines; it matches only EXACT normalized bodies (a single differing identifier escapes) and can list the same file twice.',
      'TS/JS only; no Python.',
    ],
    emoji: '📋',
    description: 'Prevent code duplication through proper abstraction',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkCodeDuplicationControl',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.9: Code duplication detected',
    remediation: 'Extract common code into shared functions or classes',
  },

  {
    id: generateLawId(
      'Error Handling Completeness',
      'All async operations and external calls must have error handling',
      'quality'
    ),
    legacyId: 19,
    article: 'II',
    subsection: '2.10',
    title: 'Error Handling Completeness',
    rationale:
      'An unhandled await or a promise with no .catch is a 500 waiting for the one input you did not test. This law asks that the risky calls be guarded and the app carry a last-resort global handler, so a failure is logged, not silently swallowed.',
    satisfiedBy: { typescript: 'Wrap await/fetch/http calls in try/catch, add .catch() to promise chains, and register a global handler (ErrorHandler / ErrorBoundary / window.onerror).', python: 'Register a global handler (@app.errorhandler(Exception) / add_exception_handler) — recognised natively.' },
    detectionLimits: [
      'Per-file guarding is counting heuristics/ratios over JS/TS only (no AST, matches in comments/strings); Python files are not analysed per-file.',
      'Global-handler detection is a FIXED path allowlist — a bootstrap file placed elsewhere gets a false "no global error handling".',
      'Python satisfies only the global-handler clause, not the per-call gaps.',
    ],
    emoji: '🚨',
    description:
      'All async operations and external calls must have error handling',
    priority: 'HIGH',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkErrorHandlingCompleteness',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.10: Missing error handling',
    remediation:
      'Add proper try-catch blocks and error handling for all risky operations',
  },

  // TypeScript safety laws (v7.2.0 — from a front-end governance audit, dedup-verified)
  {
    id: generateLawId(
      'No Explicit Any / Non-Null Assertion',
      'Production code must not use explicit any or non-null assertions',
      'quality'
    ),
    legacyId: 20,
    article: 'II',
    subsection: '2.11',
    title: 'No Explicit Any / Non-Null Assertion',
    rationale:
      '`any` turns off the type checker exactly where you needed it, and `x!` promises the compiler something you have not proven. Both are the moment TypeScript stops being TypeScript — a runtime error the types said could not happen.',
    satisfiedBy: { typescript: 'Replace any with a real type or unknown + narrowing; replace `x!` with a guard or optional chaining.' },
    detectionLimits: [
      'Regex, strings NOT stripped — `"as any"` or `x!` inside a string literal is flagged; `: Object` / `: Function` fire on user types named Object/Function.',
      'The empty-object `{}` type is deliberately not detected; the per-file collapse hides the true count.',
      'TypeScript; not Angular-gated; no Python.',
    ],
    stack: 'typescript',
    emoji: '🚫',
    description:
      'Production code must not use explicit any, weak types, or non-null assertions',
    priority: 'HIGH',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoExplicitAnyNonNullLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.11: Explicit any / non-null assertion in production code',
    remediation:
      'Model the real type or validate at the boundary; replace non-null ! with an explicit guard',
  },

  {
    id: generateLawId(
      'No Double Cast',
      'Forbid as unknown as double casts that launder the type',
      'quality'
    ),
    legacyId: 21,
    article: 'II',
    subsection: '2.12',
    title: 'No Double Cast',
    rationale:
      '`x as unknown as T` is a written admission that the types do not line up and you are overruling them — a runtime shape mismatch the compiler was trying to warn you about. It is almost always a missing type or a wrong boundary.',
    satisfiedBy: { typescript: 'Fix the type at the boundary (a proper interface, a parser, a type guard) instead of double-casting through unknown.' },
    detectionLimits: [
      'Matches only the literal `as unknown as` form — an angle-bracket cast, `as any as`, or laundering through a variable is missed.',
      'Strings not stripped — a double-cast inside a string literal is flagged.',
      'TypeScript; no gate, no Python.',
    ],
    stack: 'typescript',
    emoji: '🧺',
    description: 'Forbid `as unknown as T` double casts that launder the type',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'NoDoubleCastLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.12: Double cast (as unknown as) detected',
    remediation:
      'Replace `as unknown as T` with a correctly modelled type or boundary validation',
  },

  {
    id: generateLawId(
      'Typed HTTP Boundaries',
      'HttpClient calls must declare a response-type generic',
      'quality'
    ),
    legacyId: 22,
    article: 'II',
    subsection: '2.13',
    title: 'Typed HTTP Boundaries',
    rationale:
      'An untyped HTTP call returns any — the response shape is a guess the rest of the code trusts. Typing the boundary is where the outside world becomes something the type checker can hold you to.',
    satisfiedBy: { typescript: 'Give every http.get/post/etc. a type parameter: http.get<User>(url), backed by a runtime validator at the boundary.' },
    detectionLimits: [
      'The receiver identifier must literally contain "http" — this.api.get() and client.post() are false negatives, while a Map named httpMap.get() is a false positive.',
      'Detection works by the ABSENCE of a `<T>` between the verb and `(`; fetch() is not covered.',
      'Regex, no AST; TypeScript, not Angular-gated.',
    ],
    stack: 'typescript',
    emoji: '🌐',
    description: 'HttpClient calls must declare a response-type generic',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'TypedHttpBoundariesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.13: Untyped HttpClient call detected',
    remediation: 'Add a response-type generic to every HttpClient call',
  },

  {
    id: generateLawId(
      'Prefer Union Over Enum',
      'Prefer string-union literal types over TypeScript enums',
      'quality'
    ),
    legacyId: 23,
    article: 'II',
    subsection: '2.14',
    title: 'Prefer Union Over Enum',
    rationale:
      'A TypeScript enum generates runtime code, resists tree-shaking, and behaves surprisingly (numeric reverse-mappings); a union of string literals is lighter, safer and needs no import. For most "one of these values" cases the union is simply better.',
    satisfiedBy: { typescript: 'Use a string-literal union (type Status = "open" | "closed") instead of an enum; add `// roc-allow-enum` with a reason where an enum is genuinely needed.' },
    detectionLimits: [
      'Flags only enum / const enum DECLARATIONS at line start; it does not judge enum usage, and an enum declared mid-expression is missed.',
      'Honours a `// roc-allow-enum` opt-out (config-gated) — the one law here that handles both block and line comments correctly.',
      'TypeScript; no Python.',
    ],
    stack: 'typescript',
    emoji: '🔤',
    description: 'Prefer string-union literal types over TypeScript enums',
    priority: 'LOW',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'PreferUnionOverEnumLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.14: Enum declaration — prefer string-union type',
    remediation:
      'Use a string-union literal type; keep an enum only with a // roc-allow-enum justification',
  },

  // Hygiene laws (v7.2.0 — from a front-end governance audit, dedup-verified)
  {
    id: generateLawId(
      'Centralized Logging',
      'All logging must go through the logger service, not direct console calls',
      'quality'
    ),
    legacyId: 24,
    article: 'II',
    subsection: '2.15',
    title: 'Centralized Logging',
    rationale:
      'A console.log in production is a log nobody collects and a leak nobody audits — scattered logging means no levels, no correlation, no off switch. A logging boundary is where you decide, once, what gets recorded and where.',
    satisfiedBy: { typescript: 'Log through a logger service, not console.*; keep console out of application code.', python: 'Log through the logging module / a logger, not print() — recognised natively (scripts, __main__, cli.py are exempt).' },
    detectionLimits: [
      'TS side matches inside string literals (comments stripped, strings not) and only the six named console methods; an aliased console is missed.',
      'Python side is comment- and string-clean and exempts scripts/tools/__main__/cli.py/manage.py.',
      'Dual-stack (TypeScript and Python); not Angular-gated.',
    ],
    emoji: '🪵',
    description:
      'All logging must go through the logger service, not direct console.* calls',
    priority: 'LOW',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CentralizedLoggingLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.15: Direct console.* call outside the logger service',
    remediation:
      'Route logging through the LoggerService (console.* allowed only in logger.service.ts / main.ts)',
  },

  {
    id: generateLawId(
      'Web Storage Encapsulation',
      'localStorage/sessionStorage access must be encapsulated in a service',
      'quality'
    ),
    legacyId: 25,
    article: 'II',
    subsection: '2.16',
    title: 'Web Storage Encapsulation',
    rationale:
      'localStorage sprinkled through components is untyped, unversioned global state with no single place to change a key or clear on logout. A storage boundary turns "a string under a magic key" into a typed, testable seam.',
    satisfiedBy: { angular: 'Access localStorage/sessionStorage only through a service (*.service.ts); wrap reads/writes in a typed API.' },
    detectionLimits: [
      'Only five method-call shapes are matched — localStorage["k"], .length, or a destructured getItem are missed; window.localStorage matches via substring.',
      'The boundary allow is *.service.ts only, so a *.store.ts / *.facade.ts wrapper is still flagged; strings not stripped.',
      'TS/Angular; not Angular-gated; no Python.',
    ],
    stack: 'frontend',
    emoji: '🗄️',
    description:
      'localStorage/sessionStorage access must be encapsulated inside a *.service.ts',
    priority: 'LOW',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'WebStorageEncapsulationLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.16: Web storage accessed outside a service',
    remediation:
      'Wrap localStorage/sessionStorage in a dedicated storage service and inject it',
  },
];

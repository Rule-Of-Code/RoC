/**
 * Code Quality Laws Data Module
 * High-impact laws for code quality and standards
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';
import {
  REQUIRES_NX_WORKSPACE,
  REQUIRES_RXJS,
} from '../utils/framework-requirements';

/** The detection limit of a code-quality law that reads .vue by its script (#607). */
const VUE_SCRIPT_ONLY =
  'A Vue single-file component (.vue) is read by its <script> and <script setup> blocks, at its own lines; its <template> and <style> are not read by this law (#607).';

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
    satisfiedBy: {
      typescript:
        "Enable strict in tsconfig and keep zero console.*, TODO/FIXME tags, `: any` annotations and `as any` casts, eslint-disable and empty catch blocks across non-test .ts. In a package that declares `bin`, console.log/info is the command's output, and console.warn too in the command's entry modules (what `bin` points to, and its command directory); console.debug/trace still count.",
    },
    detectionLimits: [
      'The strict check is a SUBSTRING test: `"strict"` plus any `true` in the tsconfig passes — even `"strict": false` next to `"esModuleInterop": true`.',
      'Reads the code and the comments from the TypeScript parse: console, `: any` annotations, `as any` casts and empty catch in code only, TODO tags (capitals, at the start of a // comment) and eslint-disable in comments only; without a loadable `typescript` the files are NOT read and the law judges nothing. Only the ROOT tsconfig is read.',
      'In a package whose nearest package.json declares `bin`, console.log/info are not counted anywhere in it — a stray log in such a package is not told apart from output; console.warn is not counted in the entry modules derived from `bin` (the source of each bin target, the directory named after it and a commands/ directory beside it), and is counted in the rest. A logging module (logger.*, logging*, log.*) is not counted.',
      'TS/Angular only; a Python project has no tsconfig and cannot pass.',
      'Owns the hand-written `any` of a declaration or a cast (`: any`, `as any`, `any[]`): No Explicit Any / Non-Null Assertion does not count them again (#482).',
      VUE_SCRIPT_ONLY,
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
    satisfiedBy: {
      angular:
        'Commit nx.json, use `nx ...` (not `ng ...`) in package.json scripts, and prefer workspace.json over a standalone angular.json.',
    },
    detectionLimits: [
      'Selected only for an Nx workspace (nx.json, or the nx / @nx/workspace / @nrwl/workspace package). An Angular CLI workspace without Nx is not selected (adopting Nx is a choice, not a defect), and neither is a TypeScript, React or Node project without Nx.',
      'Documentation means the root README.md and Markdown (.md, .mdx) under docs/; other files (CHANGELOG, notes elsewhere, .txt / .rst) are not read for `ng` usage.',
      'Reads scripts / config / README, not build invocations; Angular/Nx only.',
    ],
    stack: 'typescript',
    requires: REQUIRES_NX_WORKSPACE,
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
      "A subscription that outlives its component keeps firing into a dead view — a leak that grows as the user navigates, felt as a tab that gets heavier by the hour. Cleanup is what ties the subscription's life to the component's.",
    satisfiedBy: {
      angular:
        'Clean up subscriptions with takeUntilDestroyed / DestroyRef, the async pipe, take(1), or unsubscribe in ngOnDestroy.',
      react:
        'Return the cleanup from the effect that subscribes: const sub = source$.subscribe(…); return () => sub.unsubscribe(); — or take(1) for a one-shot value. Keep the subscription and its cleanup in the same .ts/.tsx file: the detector looks for them per file.',
    },
    detectionLimits: [
      'Reads .ts and .tsx files only — a subscription in a .jsx or plain .js file is not seen. A React module that imports react and not rxjs is skipped: its .subscribe( is a store API (useSyncExternalStore), not an RxJS Observable.',
      'Whole-file, lenient exemption: ANY occurrence of the substring `async` (an async function anywhere) marks the whole file as cleaned up — a large false negative.',
      'A single uncleaned subscription in a component can trigger three near-duplicate violations (three overlapping checks).',
      'Regex, no AST; matches in comments/strings; no Python.',
      VUE_SCRIPT_ONLY,
    ],
    stack: 'frontend',
    requires: REQUIRES_RXJS,
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
    satisfiedBy: {
      typescript:
        'Put a non-empty JSDoc /** */ block above every exported class and exported function (a function declaration, or a const/let/var initialised with an arrow or function expression), above its decorators. A file whose only exported class/function it is may carry the block at the top of the file instead.',
    },
    detectionLimits: [
      'Judges presence, not content: any non-empty JSDoc block satisfies it, however little it says.',
      'Only top-level declarations: methods, interfaces, types, enums, non-function constants, namespace members and non-exported code are not judged; a function wrapped in a call (export const f = wrap(() => …)) is not seen as a function.',
      'A re-export (export { a } from …) is judged in the module that declares it, not where it is re-exported; .d.ts files are not judged.',
      "Reads .ts/.tsx and .js/.jsx/.mjs/.cjs (#493) with the project's own typescript; without it the files are reported as not read, and a file that does not parse is named as not read. CommonJS exports (module.exports = …) are not ES exports and are not judged.",
      'TypeScript and JavaScript — no Python (Public Docstrings judges Python).',
      VUE_SCRIPT_ONLY,
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
      'Each function is measured on its own body from the TypeScript syntax tree (a nested callback is its own function); without a loadable `typescript` the .ts/.tsx files are NOT read and the law judges nothing. Decision points: if, for / for-in / for-of, while, do, case, catch, `?:`, `&&`, `||`, `&&=` and `||=`. Not counted: `??`, optional chaining (`?.`) and default parameters — the `complexity` rule of ESLint counts those too, so its numbers are higher than the ones this law reports.',
      'File length counts lines of code (no comment or blank lines) and is not applied to a data file with at most two functions; "too many functions" is reported only for a file that also has a function over the complexity limit.',
      'thresholds.codeQuality.maxFileComplexity is opt-in: with no value set a file is judged only by its worst single function, never by its total, so a large file of simple functions is not reported.',
      'The law is the check; ESLint complexity rules (`complexity`, `max-lines`, `max-depth`) are not required. When the project sets them, the result says so in its details, as information: not a finding, and it changes nothing about the verdict.',
      VUE_SCRIPT_ONLY,
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
    satisfiedBy: {
      angular:
        'Add an ESLint config with @typescript-eslint/naming-convention; under src/ use camelCase members, PascalCase types, kebab-case files and directories.',
    },
    detectionLimits: [
      'Code and file naming are scanned under src/ ONLY — a project with no src/ (Nx apps/libs, Python) skips those checks, and a Python project fails on the missing ESLint config.',
      'The method-name regex matches any `identifier(` call — including factory/constructor calls — a false-positive source; per-file code-naming is a single aggregate capped at 10.',
      'Regex, no AST; TS/Angular.',
      VUE_SCRIPT_ONLY,
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
    satisfiedBy: {
      typescript:
        'No debugger; no statement after a return; <=3 commented const/let/function lines per file; and a check for unused code: a dead-code tool (knip, ts-prune, ts-unused-exports or unimported) run from a package script, a committed git hook or a CI step, or, when ESLint is a devDependency, its no-unused-vars / no-unreachable rule.',
    },
    detectionLimits: [
      'Unused imports, exports and variables are NOT detected by this law. It asks for a tool that detects them: a dead-code tool (knip, ts-prune, ts-unused-exports or unimported) run from a package script, a committed git hook or a CI step — a tool that is only a devDependency, run nowhere, does not count — or, when ESLint is a devDependency, an ESLint no-unused-vars / no-unreachable rule (its presence in the config; the lint run itself is not checked).',
      'Read from the TypeScript parse (without a loadable `typescript` the files are NOT read and the law judges nothing): a `debugger;` statement, a statement after a `return` in the same block (a hoisted function or a type after it is not), and more than three `//` comments that hold a const/let declaration or a function header. Words in strings and prose comments are not code.',
      'TS/JS only; no Python.',
      VUE_SCRIPT_ONLY,
    ],
    emoji: '🧟',
    description:
      'No debugger, no code after a return, no commented-out code, and a check for unused code that runs',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkDeadCodeElimination',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.7: debugger, code after a return or commented-out code found, or no check for unused code configured',
    remediation:
      'Remove debugger statements, code after a return and commented-out code; run knip (or ts-prune, ts-unused-exports, unimported) from a script, a git hook or CI, or enable ESLint no-unused-vars / no-unreachable',
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
      'A bare 0.05 could be a fee, a discount, or a tolerance — the reader cannot tell, and the next editor guesses wrong. A named constant carries the intent the literal hides, and makes a wrong value a visible one.',
    satisfiedBy: {
      typescript:
        'const MAKER_FEE = 0.001; — not a bare 0.001 at the call site.',
      python: 'MAKER_FEE = 0.001 at module scope — not an inline literal.',
    },
    detectionLimits: [
      'Flags numeric literals by pattern; it cannot tell a domain constant from a magic number by MEANING, only by whether the value is named.',
      'It does not verify a named constant is used correctly — a well-named but wrong constant passes.',
      'Literals are read from the TypeScript parse: a digit in a string, template text, regex or comment is not one; without a loadable `typescript` the files are NOT read and the law judges nothing. Named: an initializer of a variable, property, class field, enum member, parameter or destructuring default (also through a constant expression or an array), the elements of a new Set/Map that initialises a const or a class field, the fallback of `??`, and a parseInt radix.',
      'The law is the check; an ESLint rule is not required. `no-magic-numbers` / `@typescript-eslint/no-magic-numbers` has no option for a `??` fallback or a constant expression in an initializer, so it reports numbers this law counts as named. When the project sets one, the result says so in its details, as information: not a finding, and it changes nothing about the verdict.',
      VUE_SCRIPT_ONLY,
    ],
    emoji: '🔮',
    description:
      'Numeric literals in code are named (a constant, an initializer, a ?? fallback), not written bare; judged by the law itself, no lint rule required',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkMagicNumberPrevention',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article II.2.8: Magic numbers detected',
    remediation:
      'Name each reported number where it is used: a named constant, or a config key with a ?? fallback. Adding an ESLint rule does not satisfy or change the verdict',
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
    satisfiedBy: {
      typescript:
        'Add jscpd (or a copy-paste detector) to package.json, and extract byte-identical function bodies into a shared helper.',
    },
    detectionLimits: [
      'Tool-presence dominates: a project without jscpd fails regardless of actual duplication.',
      'Compares the block bodies of functions, methods and arrows from the TypeScript parse (without a loadable `typescript` the files are NOT read and the law judges nothing); a body counts only at 5+ lines and 50+ tokens (thresholds.codeQuality.minDuplicationLines / minDuplicationTokens). It matches only EXACT token sequences — numbers are normalised, strings are not — so a single differing identifier escapes; a copy inside a larger copy is reported once, and the same file can be listed twice.',
      'TS/JS only; no Python.',
      VUE_SCRIPT_ONLY,
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
    satisfiedBy: {
      typescript:
        'Await, return or .catch() every promise you start (a statement like save(); or p.then(f); drops its rejection), guard fetch/http calls, and register a global handler in an entry point — the fixed bootstrap files or what package.json bin/main name: process.on(unhandledRejection / uncaughtException), window.onerror, Angular ErrorHandler, a React ErrorBoundary; for a CLI, parse()/parseAsync() inside a try with a catch in the bin entry.',
      python:
        'Register a global handler (@app.errorhandler(Exception) / add_exception_handler) — recognised natively.',
    },
    detectionLimits: [
      'A dropped promise is recognised from syntax only (no type checker): a .then chain, or a call to an async function or method declared in the same file, used as a statement. A promise-returning function imported from another module and called as a statement is not seen.',
      'HTTP guarding is still a per-file text check, over code only (strings and comments removed). An event listener is judged by its handler, from the syntax tree: async, an await, a throw, JSON.parse or a fetch / XMLHttpRequest / axios / http call with no try and no .catch in the handler is a finding; a handler passed by a name not declared in the same file is not judged. JS/TS only, Python files are not analysed per-file.',
      'Global-handler detection reads a fixed list of bootstrap files plus the source of package.json bin/main (dist|lib|build|out → src); a bootstrap file elsewhere gets a false "no global error handling". The handler is recognised in the parse (a listener call, a window.onerror assignment, a framework identifier, or a try around parse()/parseAsync() in the bin entry), not by what the handler body does.',
      'Python satisfies only the global-handler clause, not the per-call gaps.',
      VUE_SCRIPT_ONLY,
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
    satisfiedBy: {
      typescript:
        'Replace any with a real type or unknown + narrowing; replace `x!` with a guard or optional chaining.',
    },
    detectionLimits: [
      'Regex over the code of the TypeScript parse — strings, templates, regexes and comments are not read (without a loadable `typescript` the files are NOT read and the law judges nothing); `: Object` / `: Function` fire on user types named Object/Function, but not on a value after a colon (`Object.keys(`, `Function(`).',
      'The empty-object `{}` type is deliberately not detected; the per-file collapse hides the true count.',
      '`: any`, `as any` and `any[]` in a declaration or a cast are counted by Absolute Zero Tolerance Doctrine (error severity), which owns them, and not here (#482); this law counts `<any>` assertions and type arguments, the weak `Function` / `Object` types and non-null `!`.',
      'TypeScript; not Angular-gated; no Python.',
      VUE_SCRIPT_ONLY,
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
    satisfiedBy: {
      typescript:
        'Fix the type at the boundary (a proper interface, a parser, a type guard) instead of double-casting through unknown.',
    },
    detectionLimits: [
      'Matches only the literal `as unknown as` form — an angle-bracket cast, `as any as`, or laundering through a variable is missed.',
      'Reads the code of the TypeScript parse — the words in a string or a comment are not a cast; without a loadable `typescript` the files are NOT read and the law judges nothing.',
      'TypeScript; no gate, no Python.',
      VUE_SCRIPT_ONLY,
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
    satisfiedBy: {
      typescript:
        'Give every http.get/post/etc. a type parameter: http.get<User>(url), backed by a runtime validator at the boundary.',
    },
    detectionLimits: [
      'Reads the code of the TypeScript parse — `http.get(` in a string or a comment is not a call; without a loadable `typescript` the files are NOT read and the law judges nothing.',
      'The receiver identifier must literally contain "http" — this.api.get() and client.post() are false negatives, while a Map named httpMap.get() is a false positive.',
      'Detection works by the ABSENCE of a `<T>` between the verb and `(`; fetch() is not covered.',
      'Regex, no AST; TypeScript, not Angular-gated.',
      VUE_SCRIPT_ONLY,
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
    satisfiedBy: {
      typescript:
        'Use a string-literal union (type Status = "open" | "closed") instead of an enum; add `// roc-allow-enum` with a reason where an enum is genuinely needed.',
    },
    detectionLimits: [
      'Flags only enum / const enum DECLARATIONS at line start; it does not judge enum usage, and an enum declared mid-expression is missed.',
      'Honours a `// roc-allow-enum` opt-out (config-gated) — the one law here that handles both block and line comments correctly.',
      'TypeScript; no Python.',
      VUE_SCRIPT_ONLY,
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
    satisfiedBy: {
      typescript:
        "Log through a logger service, not console.*; keep console out of application code. A logging module (logger.*, logging*, log.*) and main.ts may use console; in a package that declares `bin`, console.log/info is the command's output, and console.warn/error too in the command's entry modules (what `bin` points to, and its command directory).",
      python:
        'Log through the logging module / a logger, not print() — recognised natively (scripts, __main__, cli.py are exempt).',
    },
    detectionLimits: [
      'TS side reads console calls from the TypeScript parse (not in strings or comments; without a loadable `typescript` the .ts files are NOT read) and only the six named console methods; an aliased console is missed.',
      'In a package whose nearest package.json declares `bin`, console.log/info are not counted anywhere in it — library code in such a package that bypasses its logger with them is not told apart from output; console.warn/error are not counted in the entry modules derived from `bin` (the source of each bin target, the directory named after it and a commands/ directory beside it), and are counted in the rest; console.debug/trace still count.',
      'Python side is comment- and string-clean and exempts scripts/tools/__main__/cli.py/manage.py.',
      'Dual-stack (TypeScript and Python); not Angular-gated.',
      VUE_SCRIPT_ONLY,
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
    satisfiedBy: {
      angular:
        'Access localStorage/sessionStorage only through a service (*.service.ts); wrap reads/writes in a typed API.',
      react:
        'Put every web-storage call in one small module named *.service.ts (a plain TS module; that suffix is the only place this detector exempts) and read it through a hook. Guard it for server rendering and for blocked storage.',
      capacitor:
        'Wrap storage in a service and, on native, back durable keys with @capacitor/preferences; declare WebView-only keys as disposable (#269).',
    },
    detectionLimits: [
      'Only five method-call shapes are matched — localStorage["k"], .length, or a destructured getItem are missed; window.localStorage matches via substring.',
      'The boundary allow is *.service.ts only, so a *.store.ts / *.facade.ts wrapper is still flagged; strings not stripped.',
      'TS/Angular; not Angular-gated; no Python.',
      "Judges where storage is called, not what backs it: in a Capacitor app WebView storage must be considered transient (Capacitor's storage guide) and is keyed by the WebView origin, so a service over localStorage passes in full. Which store backs a durable key is #269's question.",
      VUE_SCRIPT_ONLY,
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

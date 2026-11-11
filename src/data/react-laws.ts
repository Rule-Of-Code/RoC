/**
 * React Laws Data Module
 *
 * What React's runtime assumes and does not enforce: hooks in a fixed order
 * and effects that list what they read (checked by the lint plugin this file's
 * first law verifies), effects that stop what they start and ignore responses
 * they no longer want, renders that do not touch the browser on the server,
 * keys and context values that keep their identity. Each detector reads the
 * parse of the file (the project's own TypeScript), never a pattern over the
 * text, and reports files it could not read. Each law is gated by `requires`
 * on react (or next), so it never runs — and never passes — without it.
 * legacyId range: 501–519.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { REQUIRES_NEXT, REQUIRES_REACT } from '../utils/framework-requirements';
import { generateLawId } from '../utils/id-generator';

/** The limits every law reading source through the parse shares. */
const PARSED_SOURCE_ONLY =
  'Reads non-test .tsx/.jsx/.ts/.js/.mjs source through the normal scan (ignores apply), parsed with the project\'s own TypeScript; without it the files are reported as not read, never passed.';
const NO_CROSS_FILE =
  'Single-file and syntactic: no type checker and no import following — a resource, fetch or global reached through a helper in another file is invisible.';
const ONLY_INLINE_SETUP =
  'Judges effects whose setup is written inline (`useEffect(() => …)`); a setup passed by reference (`useEffect(subscribe, [])`) is not read.';

export const REACT_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'React Hooks Lint Enforced',
      'ESLint enforces eslint-plugin-react-hooks: its recommended preset or both core rules, none of the relied-on rules turned off',
      'react'
    ),
    legacyId: 501,
    article: 'XXII',
    subsection: '22.1',
    title: 'React Hooks Lint Enforced',
    rationale:
      "React relies on hooks being called in the same order on every render and on effects listing what they read; neither is checked at runtime — a conditional hook or a stale dependency shows up as state attached to the wrong hook or an effect reading an old value. eslint-plugin-react-hooks checks both (rules-of-hooks, exhaustive-deps), and its React Compiler rules (purity, immutability, set-state-in-effect, static-components) check pure render and state handling. RoC does not duplicate those rules as laws; this law makes sure they are on, because a green lint run proves nothing when the plugin is absent.",
    satisfiedBy: {
      react:
        "In eslint.config.mjs, spread reactHooks.configs.flat.recommended from eslint-plugin-react-hooks, or the eslint-config-next presets (they register the plugin and its recommended rules). Never set react-hooks/rules-of-hooks or exhaustive-deps to 'off'; disable a single line with a reason.",
    },
    detectionLimits: [
      'Reads the config ESLint would use for each package that declares react: the nearest flat eslint.config.* from the package up to the workspace root, else the .eslintrc cascade (and package.json eslintConfig). It does not run ESLint and does not read `eslint --print-config` output.',
      "Accepts by name: the plugin's configs.recommended / configs['recommended-latest'] (also under configs.flat), 'plugin:react-hooks/recommended(-latest)', and eslint-config-next / eslint-config-next/core-web-vitals (verified in 16.4.6; earlier versions and the bare 'next' extends are accepted by name). Any other shared preset (your own, or a framework's) is not read: the finding names it, and it is accepted once named in thresholds.react.hooksLintPresets.",
      "Any 'off' of rules-of-hooks, exhaustive-deps, set-state-in-effect, immutability, purity or static-components is reported, even when scoped by `files` to tests or overridden later in the array.",
      'A config that enables only the two core rules by name passes without the compiler rules. Files excluded from lint, and whether lint runs in the gate, are not checked. A YAML .eslintrc is reported as not read.',
    ],
    emoji: '🪝',
    description:
      'ESLint enforces eslint-plugin-react-hooks: its recommended preset or both core rules, none of the relied-on rules turned off',
    priority: 'HIGH',
    category: 'CODE_QUALITY',
    stack: 'frontend',
    requires: REQUIRES_REACT,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'ReactHooksLintEnforcedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXII.22.1: eslint-plugin-react-hooks is not enforced',
    remediation:
      'Enable eslint-plugin-react-hooks recommended (or eslint-config-next) and keep its core rules on',
  },

  {
    id: generateLawId(
      'React Effect Resource Cleanup',
      'An effect that starts an interval, listener, observer, socket or subscription returns a cleanup',
      'react'
    ),
    legacyId: 502,
    article: 'XXII',
    subsection: '22.2',
    title: 'React Effect Resource Cleanup',
    rationale:
      'React runs the function an effect returns before the next run and on unmount; it is the only place a resource the effect started is stopped. An effect that starts setInterval, addEventListener, an Observer, a WebSocket, an EventSource, a subscription or a requestAnimationFrame and returns nothing leaves it running after the component is gone — and under StrictMode, which mounts every effect twice in development, two of them run from the first render.',
    satisfiedBy: {
      react:
        'Return a cleanup that stops what the effect started: `const id = setInterval(tick, 1000); return () => clearInterval(id);` — removeEventListener, disconnect(), close(), unsubscribe(), cancelAnimationFrame alike. For a bounded one-shot resource, write `// roc-allow-effect-without-cleanup: <reason>` above the effect.',
    },
    detectionLimits: [
      PARSED_SOURCE_ONLY,
      NO_CROSS_FILE,
      ONLY_INLINE_SETUP,
      'Any returned function counts as the cleanup; whether it frees the right resource (removes the same listener, clears the same id) is not checked.',
      'setTimeout is not a starter; `{ once: true }` listeners and one-shot frames are flagged and need the inline reason.',
    ],
    emoji: '🧹',
    description:
      'An effect that starts an interval, listener, observer, socket or subscription returns a cleanup',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    stack: 'frontend',
    requires: REQUIRES_REACT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'ReactEffectResourceCleanupLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXII.22.2: Effect starts a resource and returns no cleanup',
    remediation: 'Return a cleanup from the effect that stops what it started',
  },

  {
    id: generateLawId(
      'React Effect Fetch Race Guarded',
      'A fetch in an effect is aborted in its cleanup or guarded by an ignore flag the cleanup sets',
      'react'
    ),
    legacyId: 503,
    article: 'XXII',
    subsection: '22.3',
    title: 'React Effect Fetch Race Guarded',
    rationale:
      "An effect that fetches when a dependency changes starts a new request on every change, and responses arrive in whatever order the network returns them: the slower, older one is written last and the screen shows data for an input the user has already left. The React documentation's fetching example guards this with a cleanup — `let ignore = false; … return () => { ignore = true; }` — and an AbortController aborted in the cleanup does the same and also cancels the request.",
    satisfiedBy: {
      react:
        'Either `const controller = new AbortController(); fetch(url, { signal: controller.signal }); return () => controller.abort();` or `let ignore = false; fetch(url).then(r => r.json()).then(d => { if (!ignore) setData(d); }); return () => { ignore = true; };`. A data library (TanStack Query, SWR) handles this for you.',
    },
    detectionLimits: [
      PARSED_SOURCE_ONLY,
      NO_CROSS_FILE,
      ONLY_INLINE_SETUP,
      'A signal counts only when passed in an inline init object (`fetch(url, { signal })`) and the cleanup calls abort(); an init built elsewhere is not read.',
      'An ignore flag is a `let` declared in the setup (or a property of an object it declares), assigned in the cleanup and read in the setup; that the read actually guards the state update is not checked.',
      'Judges the fetches an effect run starts: a fetch inside a callback handed to setInterval, setTimeout, requestAnimationFrame, addEventListener, subscribe or an Observer runs later and is not judged. Races in event handlers are out of scope.',
    ],
    emoji: '🏁',
    description:
      'A fetch in an effect is aborted in its cleanup or guarded by an ignore flag the cleanup sets',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    stack: 'frontend',
    requires: REQUIRES_REACT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'ReactEffectFetchRaceGuardedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXII.22.3: Effect fetch can be overwritten by a stale response',
    remediation: 'Abort the request in the cleanup, or guard the update with an ignore flag',
  },

  {
    id: generateLawId(
      'React Context Value Stable',
      'A context provider value is not an inline object or array literal',
      'react'
    ),
    legacyId: 504,
    article: 'XXII',
    subsection: '22.4',
    title: 'React Context Value Stable',
    rationale:
      'Every consumer of a context re-renders when the provider value changes by identity, and an object or array literal written in value={…} is a new identity on every render of the provider — so every consumer below it re-renders whether or not anything it reads changed. The React documentation for useContext recommends wrapping the value in useMemo (and its functions in useCallback) for this reason.',
    satisfiedBy: {
      react:
        'Memoize the value: `const value = useMemo(() => ({ user, login }), [user, login]); <AuthContext value={value}>` (or `<AuthContext.Provider value={value}>`). Split a context whose parts change at different rates.',
    },
    detectionLimits: [
      PARSED_SOURCE_ONLY,
      'Flags only an object or array literal written inline in value={…}; a value built earlier in render without useMemo is not seen.',
      "A provider is a `*.Provider` tag, a tag bound by createContext in the same file, or a tag named `…Context` (React 19 renders the context itself); a non-context component named `…Context` with a value prop is flagged.",
      'React Compiler, where enabled, memoizes such literals itself; the law does not detect it.',
    ],
    emoji: '🧬',
    description: 'A context provider value is not an inline object or array literal',
    priority: 'LOW',
    category: 'PERFORMANCE',
    stack: 'frontend',
    requires: REQUIRES_REACT,
    defaultEnabled: true,
    defaultSeverity: 'info',
    automation: 'AUTOMATED',
    checkFunction: 'ReactContextValueStableLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXII.22.4: Context provider value is a new object every render',
    remediation: 'Memoize the provider value with useMemo',
  },

  {
    id: generateLawId(
      'React Store Subscription Uses Sync External Store',
      'An external source is read with useSyncExternalStore, not copied into state from an effect subscription',
      'react'
    ),
    legacyId: 505,
    article: 'XXII',
    subsection: '22.5',
    title: 'React Store Subscription Uses Sync External Store',
    rationale:
      "Subscribing to an external source in an effect and copying each update into useState renders the stale value first (the effect runs after paint), can tear under concurrent rendering — two components reading different versions of the same source in one render — and has nothing to render on the server. useSyncExternalStore is React's API for exactly this: it subscribes, reads the snapshot during render, and takes a separate server snapshot.",
    satisfiedBy: {
      react:
        'Replace `useEffect(() => store.subscribe(() => setValue(store.get())), [])` with `const value = useSyncExternalStore(store.subscribe, store.get, getServerSnapshot)`; browser APIs (online status, media queries, window size) the same way.',
    },
    detectionLimits: [
      PARSED_SOURCE_ONLY,
      ONLY_INLINE_SETUP,
      'Flags a .subscribe(cb) or .addEventListener(type, cb) inside an effect whose inline callback is one call of a useState setter; a callback that does anything else, or is passed by name, is not flagged.',
      'A DOM event that is genuinely an event (a keypress closing a menu) and not a value is flagged the same way.',
    ],
    emoji: '🔌',
    description:
      'An external source is read with useSyncExternalStore, not copied into state from an effect subscription',
    priority: 'LOW',
    category: 'CODE_QUALITY',
    stack: 'frontend',
    requires: REQUIRES_REACT,
    defaultEnabled: true,
    defaultSeverity: 'info',
    automation: 'AUTOMATED',
    checkFunction: 'ReactStoreSubscriptionUsesSyncExternalStoreLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXII.22.5: External source copied into state from an effect',
    remediation: 'Read the external source with useSyncExternalStore',
  },

  {
    id: generateLawId(
      'React Render No Browser Global',
      'A client component does not read window, document or Web Storage while rendering',
      'react'
    ),
    legacyId: 506,
    article: 'XXII',
    subsection: '22.6',
    title: 'React Render No Browser Global',
    rationale:
      "Next pre-renders Client Components on the server before hydrating them, and renders every Pages Router page there too. window, document, localStorage and sessionStorage do not exist on the server, so reading one while rendering throws there — or, behind a check that makes the server and browser renders differ, produces a hydration mismatch. Effects and event handlers run only in the browser; that is where a browser read belongs.",
    satisfiedBy: {
      react:
        'Move the read into useEffect and render a neutral value first, or into the event handler that needs it; for a value that must render in the browser, use useSyncExternalStore with a server snapshot, or next/dynamic with { ssr: false }.',
    },
    detectionLimits: [
      PARSED_SOURCE_ONLY,
      NO_CROSS_FILE,
      "Reads files with a 'use client' directive and files under a Pages Router directory (pages/api excluded); a component without the directive that is imported by a client file is not read.",
      'Render scope is the body of a top-level component (PascalCase), hook (use…), default export or memo/forwardRef function, plus useState/useMemo/useReducer initializers and IIFEs; class components and nested component definitions are not read.',
      "A read under a typeof check of a browser global (if, ?:, &&, or after an early return) is accepted as the issue asks, although a guarded read can still mismatch on hydration.",
    ],
    emoji: '🪟',
    description:
      'A client component does not read window, document or Web Storage while rendering',
    priority: 'MEDIUM',
    category: 'FRAMEWORK',
    stack: 'frontend',
    requires: REQUIRES_NEXT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'ReactRenderNoBrowserGlobalLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXII.22.6: Browser global read while rendering on the server',
    remediation: 'Read browser globals in useEffect or an event handler, not during render',
  },

  {
    id: generateLawId(
      'Client Fetch Response Checked',
      'A fetch in client code reads res.ok or res.status, or is inside a catch',
      'react'
    ),
    legacyId: 507,
    article: 'XXII',
    subsection: '22.7',
    title: 'Client Fetch Response Checked',
    rationale:
      'fetch rejects only when the request cannot be made; a 401, 404 or 500 resolves like a success. Code that goes straight to res.json() renders the error body as data, or throws later on a body that is not JSON, far from the cause — and in the browser nothing reports it: the user sees an empty or wrong screen.',
    satisfiedBy: {
      react:
        'Check the status before the body: `const res = await fetch(url); if (!res.ok) throw new Error("HTTP " + res.status); return res.json();` — ideally in one client helper every call site uses, with the failure shown to the user.',
    },
    detectionLimits: [
      PARSED_SOURCE_ONLY,
      NO_CROSS_FILE,
      "Client code is a 'use client' file, or any React source outside a Next app (a Remix loader or other server code outside Next is treated as client).",
      'A fetch whose promise is returned is a wrapper and is not judged — its callers, who receive the response, are not followed.',
      'As the issue states, a catch around the call (try block in the same function, .catch, or .then(ok, onRejected)) is accepted, although fetch resolves on HTTP errors: a caught but unchecked 500 passes. A failure that is caught and ignored passes.',
    ],
    emoji: '📮',
    description: 'A fetch in client code reads res.ok or res.status, or is inside a catch',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    stack: 'frontend',
    requires: REQUIRES_REACT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'ClientFetchResponseCheckedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXII.22.7: Client fetch response used without checking its status',
    remediation: 'Read res.ok (or res.status) before using the response body',
  },
];

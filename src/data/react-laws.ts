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
import { REQUIRES_REACT } from '../utils/framework-requirements';
import { generateLawId } from '../utils/id-generator';

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
];

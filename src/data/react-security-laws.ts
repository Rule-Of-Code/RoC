/**
 * React Security Laws Data Module
 *
 * The places a React or Next.js app turns data into markup, a link or a
 * navigation: the `__html` of dangerouslySetInnerHTML, a non-literal `href` or
 * `src`, a redirect to a target taken from the request. Each is read on the
 * syntax tree with the project's own TypeScript, a file that cannot be parsed
 * is reported rather than passed, and each law is gated by `requires` on the
 * package its subject belongs to. legacyId range: 581–589.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { REQUIRES_REACT } from '../utils/framework-requirements';
import { generateLawId } from '../utils/id-generator';

/** The limit every law here shares: one file, no data flow across functions. */
const NO_CROSS_FILE_FLOW =
  'Reads one file at a time, without a type checker: a value that is safe because of what another module guarantees is not credited unless the guarding call appears at the sink.';
const NEEDS_THE_PARSER =
  "Parses with the project's own typescript package; where it cannot be loaded the law reports the files it could not read and fails.";

export const REACT_SECURITY_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'React Dangerous HTML Guarded',
      'Every dangerouslySetInnerHTML renders a literal, a sanitizer call, an allow-listed function or escaped JSON',
      'react'
    ),
    legacyId: 581,
    section: '25',
    subsection: '25.1',
    title: 'React Dangerous HTML Guarded',
    rationale:
      "dangerouslySetInnerHTML writes its __html into the page as markup, so a string from a user, a CMS or an API becomes script — React's escaping, the reason JSX is safe by default, is exactly what this prop turns off. The usual hole is JSON-LD: Next's own guide warns that JSON.stringify \"does not sanitize\" and that a '<' must be escaped as \\u003c, because a '</script>' inside the data closes the tag.",
    satisfiedBy: {
      react:
        "Render text by default. Where HTML must be rendered, sanitize at the sink — __html: DOMPurify.sanitize(html) — naming any other sanitizer in thresholds.security.htmlSanitizers; for JSON-LD write __html: JSON.stringify(data).replace(/</g, '\\\\u003c'). A function whose output is safe for another reason goes in thresholds.react.trustedHtmlFunctions with that reason.",
    },
    detectionLimits: [
      'Judges the __html expression at the sink only: a value sanitized earlier and passed in through a variable is flagged; what a sanitizer or an allow-listed function does inside (a weak DOMPurify configuration) is not seen. Callees are matched by name as written (DOMPurify.sanitize is the one default, taken from the issue, not checked against an installed DOMPurify).',
      'Sees the JSX attribute and a `dangerouslySetInnerHTML` property in an object literal (createElement props). A props object built elsewhere and spread into the element is not seen; a sink given a variable instead of `{ __html: … }` is flagged as unreadable.',
      "innerHTML written through a ref is the Angular Security XSS Prevention law's subject, not this one's. " + NO_CROSS_FILE_FLOW,
      NEEDS_THE_PARSER,
    ],
    emoji: '🧯',
    description:
      'Every dangerouslySetInnerHTML renders a literal, a sanitizer call, an allow-listed function or escaped JSON',
    priority: 'CRITICAL',
    category: 'SECURITY',
    stack: 'frontend',
    requires: REQUIRES_REACT,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'ReactDangerousHtmlGuardedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 25.1: dangerouslySetInnerHTML renders HTML that is not sanitized',
    remediation:
      'Sanitize the __html at the sink, escape < in serialized JSON, or render text instead',
  },
];

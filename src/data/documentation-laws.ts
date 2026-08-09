/**
 * Documentation Laws Data Module
 * Laws for documentation standards, TODO management, and compliance tracking
 */

import type { EnhancedConstitutionalLaw } from "../types/enhanced-law.types";
import { generateLawId } from "../utils/id-generator";

export const DOCUMENTATION_LAWS: EnhancedConstitutionalLaw[] = [
  // NEW REAL LAWS WITH IMPLEMENTATIONS!
  {
    id: generateLawId(
      "Documentation Standards",
      "Essential project documentation files and quality standards",
      "docs"
    ),
    legacyId: 884,
    section: "5",
    subsection: "5.0",
    title: "Documentation Standards",
    rationale:
      'A newcomer\'s first hour is spent in the README, CONTRIBUTING and LICENSE; their absence is a real onboarding tax. This law checks the baseline project docs exist.',
    satisfiedBy: { typescript: 'Keep README.md, CONTRIBUTING.md, LICENSE and CHANGELOG.md at the repo root, with a README longer than a stub.', python: 'The same four root files satisfy it on any stack; it reads Markdown and text, not code.' },
    detectionLimits: [
      'It checks filenames exist plus a README character count; it does not judge whether the content is useful.',
      'Required-section detection is a lowercase substring search for words like installation anywhere in the file, not a real heading.',
      'LICENSE must be named exactly that, so LICENSE.md or LICENSE.txt is read as missing.',
    ],
    emoji: "📚",
    description: "Essential project documentation files and quality standards",
    priority: "HIGH",
    category: "DOCUMENTATION",
    automation: "AUTOMATED",
    defaultEnabled: true,
    defaultSeverity: "error",
    checkFunction: "checkDocumentationStandards",
    violationMessage:
      "CONSTITUTIONAL VIOLATION Section 5.0: Documentation standards not met",
    remediation: "Create and maintain essential project documentation files",
  },

  {
    id: generateLawId(
      "Project Structure Standards",
      "Proper project organization and configuration",
      "docs"
    ),
    legacyId: 885,
    section: "5",
    subsection: "5.11",
    title: "Project Structure Standards",
    rationale:
      'A predictable layout and a described package manifest let tooling and teammates find their way. This law checks the manifest and points at a conventional structure.',
    satisfiedBy: { typescript: 'Provide a valid package.json with name, version, description and a scripts section; the src/test/config checks are advisory.', python: 'Provide a pyproject.toml (or setup.py / setup.cfg) — the manifest presence check accepts it, and the Node field checks do not apply.' },
    detectionLimits: [
      'It knows two manifests — package.json and the Python trio (pyproject.toml / setup.py / setup.cfg). A Rust or Go project still fails on the missing package.json, because no Cargo.toml or go.mod path exists yet.',
      'Only the manifest is load-bearing; the src/lib/app, test-directory and tsconfig/eslint/prettier/jest checks are suggestions that never fail the law.',
      'Manifest validity is a JSON parse plus a field-presence check, not a schema.',
    ],
    emoji: "🏗️",
    description: "Proper project organization and configuration",
    priority: "MEDIUM",
    category: "DOCUMENTATION",
    automation: "AUTOMATED",
    defaultEnabled: true,
    defaultSeverity: "warning",
    checkFunction: "checkProjectStructureStandards",
    violationMessage:
      "CONSTITUTIONAL VIOLATION Section 5.11: Project structure standards violated",
    remediation:
      "Organize project with proper structure and configuration files",
  },

  {
    id: generateLawId(
      "MD Footer Template (MANDATORY)",
      "Every MD file MUST have standardized footer with version, date, status, investment rating",
      "docs"
    ),
    legacyId: 80,
    section: "5",
    subsection: "5.1",
    title: "MD Footer Template (MANDATORY)",
    rationale:
      'This project mandates a constitutional footer on its docs so every Markdown file carries its version, status and rating. The law enforces that house convention.',
    satisfiedBy: { typescript: 'End each Markdown file with the footer block after a horizontal rule: Document Version, Last Updated, Status, and a Rating line. The rating accepts any scale you declare — N/10, a letter grade, or a status word such as reviewed / needs-review / superseded.' },
    detectionLimits: [
      'It globs every **/*.md and bypasses the configured ignore paths, so vendored or generated Markdown is graded too.',
      'A single ordinary Markdown file without the bespoke footer raises a violation and fails the whole law — the check is all-or-nothing across every file it globs.',
      'The rating is checked for being present and readable, never for being TRUE — nothing verifies that anyone reviewed the document or that the grade matches its state.',
    ],
    emoji: "📄",
    description:
      "Every MD file MUST have standardized footer with version, date, status, investment rating",
    priority: "MEDIUM",
    category: "DOCUMENTATION",
    automation: "CONFIGURABLE",
    defaultEnabled: false,
    defaultSeverity: "warning",
    checkFunction: "checkMDFooterTemplate",
    violationMessage:
      "CONSTITUTIONAL VIOLATION Section 5.1: MD footer template missing or incorrect",
    remediation:
      "Add mandatory MD footer with version, date, app version, status, 10/10 rating",
  },

  {
    id: generateLawId(
      "TODO Management Constitutional Requirements",
      "Descriptive TODOs with sprint reference, 30 TODO limit, GitHub issue conversion",
      "docs"
    ),
    legacyId: 81,
    section: "12",
    subsection: "12.1",
    title: "TODO Management Constitutional Requirements",
    rationale:
      'A codebase drowning in unformatted, untracked TODOs is debt nobody can see the shape of. This law caps the count and asks each TODO carry a sprint reference.',
    satisfiedBy: { typescript: 'Keep TODOs under the configured cap (default 30) and format them as TODO (Sprint N): so at least 80% are trackable.' },
    detectionLimits: [
      'The file scan omits .py entirely, so despite matching a # TODO pattern it never sees Python TODOs.',
      'It matches the word TODO in strings, comments and Markdown prose alike, with no way to tell code from documentation.',
      'Staleness is computed from a synthetic weekly-sprint clock anchored at a fixed 2024 date, so it drifts further from reality over time.',
    ],
    emoji: "📝",
    description:
      "Descriptive TODOs with sprint reference, 30 TODO limit, GitHub issue conversion",
    priority: "MEDIUM",
    category: "DOCUMENTATION",
    automation: "AUTOMATED",
    defaultEnabled: true,
    defaultSeverity: "warning",
    checkFunction: "checkTODOManagement",
    violationMessage:
      "CONSTITUTIONAL VIOLATION Section 12.1: TODO management standards not followed",
    remediation:
      "Use format: TODO (Sprint X): Description. Convert old TODOs to GitHub Issues",
  },

  {
    id: generateLawId(
      "TODO Management Standards",
      "All TODOs must be properly formatted with JIRA tickets and completion dates",
      "docs"
    ),
    legacyId: 82,
    section: "12",
    subsection: "12.1",
    title: "TODO Management Standards",
    rationale:
      'The complement to counting TODOs is grading them: does each name a ticket, and is the marker one the team recognises. This law checks TODO/FIXME/HACK carry a reference in a known format.',
    satisfiedBy: { typescript: 'Tag each TODO/FIXME/HACK/XXX with a reference the parser knows — JIRA-123, Sprint 4, Issue #12, GH-9 or a URL.' },
    detectionLimits: [
      'Only the format and missing-reference checks can fail it; the outdated, uncategorised and migration-candidate findings are advisory and affect neither the verdict nor the score.',
      'The isCodeFile helper lists .py/.java/.go, but the file discovery never requests those extensions, so that breadth is dead code.',
      'It overlaps TODO Management Constitutional Requirements and will double-report the same markers under a different format rule.',
    ],
    emoji: "📋",
    description:
      "All TODOs must be properly formatted with JIRA tickets and completion dates",
    priority: "MEDIUM",
    category: "DOCUMENTATION",
    automation: "CONFIGURABLE",
    defaultEnabled: false,
    defaultSeverity: "warning",
    checkFunction: "checkTODOManagementStandards",
    violationMessage:
      "CONSTITUTIONAL VIOLATION Section 12.1: TODO standards not followed",
    remediation:
      "Format all TODOs with JIRA references, set completion dates, track progress",
  },

  {
    id: generateLawId(
      "MD Footer Footer Consistency",
      "All footer templates across MD files must be consistent and up-to-date",
      "docs"
    ),
    legacyId: 83,
    section: "5",
    subsection: "5.3",
    title: "MD Footer Footer Consistency",
    rationale:
      'Where footers exist across docs, they should agree — same copyright, same shape — so the project reads as one voice. This law checks footer consistency, not footer presence.',
    satisfiedBy: { typescript: 'Keep Markdown footers to a small set of consistent patterns, each carrying a copyright, license or contact line.' },
    detectionLimits: [
      'A file with no footer keyword is skipped, so a repo with zero footers passes at full score — the opposite polarity to MD Footer Template.',
      'Only the format-consistency and missing-element checks can fail it; footer currency, link resolution and template matching are advisory and affect neither the verdict nor the score.',
      'Consistency is defined as five-or-fewer distinct footer patterns, a very loose bar, and the element check needs just one of copyright/license/contact anywhere in the trailing block.',
    ],
    emoji: "🔗",
    description:
      "All footer templates across MD files must be consistent and up-to-date",
    priority: "LOW",
    category: "DOCUMENTATION",
    automation: "CONFIGURABLE",
    defaultEnabled: false,
    defaultSeverity: "info",
    checkFunction: "checkMDFooterConsistency",
    violationMessage:
      "CONSTITUTIONAL VIOLATION Section 5.3: MD footer consistency not maintained",
    remediation:
      "Ensure all MD files have consistent footer format and current information",
  },

  {
    id: generateLawId(
      "Strategic Document Updates",
      "Strategic documents must be updated at every sprint completion",
      "docs"
    ),
    legacyId: 84,
    section: "5",
    subsection: "5.4",
    title: "Strategic Document Updates",
    rationale:
      'Strategic docs — README, status, changelog — rot silently; a stale roadmap misleads worse than none. This law checks the key docs exist and looks fresh.',
    satisfiedBy: { typescript: 'Keep README, a status/roadmap file and a CHANGELOG present and recently touched, with versions consistent across package.json, README and CHANGELOG.', python: 'The doc-presence checks are stack-neutral; the freshness signal is file mtime, which a fresh clone resets.' },
    detectionLimits: [
      'Only a missing README, status/roadmap file or CHANGELOG can fail it; a "basic" README, a stale mtime and a version mismatch are advisory and never fail the law.',
      'Freshness is judged by file modification time under 30 days, which a git clone resets and an old checkout inflates, independent of the actual content.',
      'Document quality is a count of heading keywords, not an assessment of what the doc says.',
    ],
    emoji: "📊",
    description:
      "Strategic documents must be updated at every sprint completion",
    priority: "MEDIUM",
    category: "DOCUMENTATION",
    automation: "MANUAL",
    defaultEnabled: false,
    defaultSeverity: "warning",
    checkFunction: "checkStrategicDocumentUpdates",
    violationMessage:
      "CONSTITUTIONAL VIOLATION Section 5.4: Strategic documents not updated",
    remediation:
      "Update README.md, PROJECT_STATUS.md, CHANGELOG.md at every sprint completion",
  },

  {
    id: generateLawId(
      "Internationalization (i18n) Compliance Policy",
      "All text MUST be externalized using Angular i18n, proper locale support",
      "docs"
    ),
    legacyId: 85,
    section: "6",
    subsection: "6.18",
    title: "Internationalization (i18n) Compliance Policy",
    rationale:
      'An app that hardcodes user-facing strings cannot be localised without a rewrite. This law checks that i18n is configured and that visible text goes through it.',
    satisfiedBy: { angular: 'Configure Angular i18n (angular.json i18n block or @angular/localize / @ngx-translate), keep translation files under src/locale or i18n, and mark template text with i18n= / $localize / | translate.' },
    detectionLimits: [
      'It is effectively Angular-only: a React or Vue frontend has no angular.json and no @angular/localize, so it fails on the config and translation-file checks by construction.',
      'The hardcoded-text regex matches any three-plus-letter tag text and even fires inside .ts and .scss files it scans, making it noisy.',
      'It confirms translation files exist but never checks the translations are correct or complete.',
    ],
    stack: "frontend",
    emoji: "🌍",
    description:
      "All text MUST be externalized using Angular i18n, proper locale support",
    priority: "HIGH",
    category: "DOCUMENTATION",
    automation: "CONFIGURABLE",
    defaultEnabled: false, // Angular-specific
    defaultSeverity: "error",
    checkFunction: "checkInternationalization",
    violationMessage:
      "CONSTITUTIONAL VIOLATION Section 6.18: Hardcoded text found, i18n not implemented",
    remediation: "Extract all text to i18n files, use Angular i18n directive",
  },

  {
    id: generateLawId(
      "Error Handling Standards",
      "All services must implement proper error handling with logging and user feedback",
      "docs"
    ),
    legacyId: 86,
    section: "13",
    subsection: "13.1",
    title: "Error Handling Standards",
    rationale:
      'Unguarded parsing, storage, fetch and subscribe calls are where an app crashes in production with no log to explain it. This documentation-side law scans sources for missing try/catch, logging and safe HTTP handling.',
    satisfiedBy: { typescript: 'Wrap risky operations (JSON.parse, localStorage, fetch, subscribe, await) in try/catch, log errors, and add catchError to Observables.', python: 'Every outbound HTTP call (urlopen, requests, httpx, aiohttp) must sit inside a try/except — that guard is the one check with a real Python path.' },
    detectionLimits: [
      'The try/catch, logging, message and Observable checks scan only .ts files, so on a pure Python repo they pass vacuously and the law reduces to the HTTP-guard check.',
      'Detection is file-level, not per-function — a file that handles errors with .catch() but has no `try {` anywhere is still flagged as missing try/catch.',
      'The user-friendly-message check matches patterns like status: 200 or throw new Error(CODE) inside strings and config literals, producing false positives.',
    ],
    emoji: "🚨",
    description:
      "All services must implement proper error handling with logging and user feedback",
    priority: "HIGH",
    category: "DOCUMENTATION",
    automation: "CONFIGURABLE",
    defaultEnabled: true,
    defaultSeverity: "error",
    checkFunction: "checkErrorHandlingStandards",
    violationMessage:
      "CONSTITUTIONAL VIOLATION Section 13.1: Error handling standards not met",
    remediation:
      "Implement try-catch blocks, proper error logging, user-friendly error messages",
  },

  {
    id: generateLawId(
      "Incident Response Protocol",
      "Clear documentation and procedures for incident response and escalation",
      "docs"
    ),
    legacyId: 87,
    section: "13",
    subsection: "13.2",
    title: "Incident Response Protocol",
    rationale:
      'When production breaks at 2am, a written runbook and escalation path is the difference between minutes and hours. This law checks those documents exist.',
    satisfiedBy: { typescript: 'Provide an incident runbook (INCIDENT_RESPONSE.md / RUNBOOK.md), an escalation path, and a communication plan; role and RTO/SLA docs are advisory.', python: 'The same documents satisfy it on any stack; the law is doc-presence and keyword content only.' },
    detectionLimits: [
      'Only the missing runbook, escalation and communication checks can fail it; the roles and RTO/SLA findings are advisory and affect neither the verdict nor the score.',
      'Satisfaction is file presence plus keyword matching in the doc text; it never verifies the described procedures are real or current.',
      'It applies to every project including a Python CLI or library that may have no incident surface at all, with no gating.',
    ],
    emoji: "🔔",
    description:
      "Clear documentation and procedures for incident response and escalation",
    priority: "HIGH",
    category: "DOCUMENTATION",
    automation: "MANUAL",
    defaultEnabled: true,
    defaultSeverity: "error",
    checkFunction: "checkIncidentResponseProtocol",
    violationMessage:
      "CONSTITUTIONAL VIOLATION Section 13.2: Incident response protocol not defined",
    remediation:
      "Document incident response procedures, escalation paths, communication plans",
  },
];

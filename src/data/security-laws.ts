/**
 * Security Laws Data Module
 * Critical laws for security, secrets management, and vulnerability response
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const SECURITY_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Environment Variables Policy',
      'SecretManagementAnalyzer NEVER commit production secrets, use EnvironmentVariablesAnalyzer environment templates',
      'security'
    ),
    legacyId: 40,
    section: '8',
    subsection: '8.1',
    title: 'Environment Variables Policy',
    rationale:
      'A production secret committed to git is committed forever — rewriting history does not un-leak it, and the first person to clone the repo already has it. This law looks for keys and tokens sitting in env and config files, where they must never be.',
    satisfiedBy: {
      typescript:
        'Keep only a template (.env.example / environment.template.ts) in the repo; inject real values at deploy time and gitignore the real files.',
    },
    detectionLimits: [
      'Scans a fixed list of files at the project ROOT only — no recursion, so Angular\'s src/environments/environment.ts and any nested config are not seen.',
      'Whole-file regex: a real secret sitting next to a placeholder in the same file is suppressed along with the placeholder.',
      'Detects quoted, length-thresholded secrets; an unquoted KEY=value in a .env is not matched. No Python.',
    ],
    emoji: '🔐',
    description:
      'SecretManagementAnalyzer NEVER commit production secrets, use EnvironmentVariablesAnalyzer environment templates',
    priority: 'CRITICAL',
    category: 'SECURITY',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkEnvironmentVariables',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 8.1: SecretManagementAnalyzer Production secrets in environment files',
    remediation:
      'Remove production secrets, use EnvironmentVariablesAnalyzer environment.template.ts, add to .gitignore',
  },

  {
    id: generateLawId(
      'Environment Security Enforcement',
      'No production secrets in environment files, proper secrets management required',
      'security'
    ),
    legacyId: 41,
    section: '8',
    subsection: '8.2',
    title: 'Environment Security Enforcement',
    rationale:
      'The distance between a secret and a leak is one `git add`. This law wants .env in .gitignore and the values kept out of source — read from the environment at runtime, never hardcoded into the code that ships.',
    satisfiedBy: {
      typescript:
        'Add .env to .gitignore; read config via process.env with a fallback, and keep URLs, DB URIs and secrets out of source.',
    },
    detectionLimits: [
      'Environment-variable usage is process.env (Node) only — Angular environment.ts objects and import.meta.env are invisible; no Python.',
      'Fallback detection is a crude character-window search: a || or ?? anywhere near a process.env read counts as "handled".',
      'URL / DB-URI / secret detection is substring/regex over raw text, including comments.',
    ],
    emoji: '🛡️',
    description:
      'No production secrets in environment files, proper secrets management required',
    priority: 'CRITICAL',
    category: 'SECURITY',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'EnvironmentSecurityEnforcementLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 8.2: Environment security not enforced',
    remediation:
      'Remove all hardcoded secrets, implement proper environment variable management',
  },

  {
    id: generateLawId(
      'Security Vulnerability Response',
      'Immediate response required for all security vulnerabilities with mandatory fixes',
      'security'
    ),
    legacyId: 42,
    section: '8',
    subsection: '8.3',
    title: 'Security Vulnerability Response',
    rationale:
      'When a CVE lands, the difference between a patch in hours and a breach in weeks is whether anyone knows where to look. This law asks for a written security policy and the docs that tell a reporter how to reach you.',
    satisfiedBy: {
      typescript:
        'Commit SECURITY.md (a disclosure contact and process), docs/security.md and docs/privacy.md, and a committed lockfile.',
    },
    detectionLimits: [
      'A repo-hygiene / file-presence law, not a vulnerability scanner — it checks that SECURITY.md, the docs and a lockfile EXIST, never their content, and it never runs an audit.',
      'A project full of vulnerable dependencies passes as long as the required files are present; finding an actual CVE is Dependency Security Scanning\'s job, not this law\'s.',
    ],
    emoji: '🚨',
    description:
      'Immediate response required for all security vulnerabilities with mandatory fixes',
    priority: 'CRITICAL',
    category: 'SECURITY',
    automation: 'CONFIGURABLE',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'SecurityVulnerabilityResponseLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 8.3: Security vulnerability response insufficient',
    remediation:
      'Implement automated security scanning, vulnerability response procedures',
  },

  {
    id: generateLawId(
      'Angular Security XSS Prevention Policy',
      'NEVER use innerHTML, bypassSecurityTrust* without sanitization',
      'security'
    ),
    legacyId: 43,
    section: '6',
    subsection: '6.5',
    title: 'Angular Security XSS Prevention Policy',
    rationale:
      'XSS is the vulnerability that turns your users\' own browsers against them, and it almost always enters through a string that was rendered as HTML when it should have been text. This law flags the sinks and asks that untrusted HTML be sanitized.',
    satisfiedBy: {
      angular:
        'Bind with interpolation or [textContent]; when you must render HTML, pass it through DomSanitizer; set a Content-Security-Policy in index.html.',
    },
    detectionLimits: [
      'Regex over raw .ts/.html text with NO comment stripping and no data-flow — a sink in a comment triggers it, and it cannot tell a safely-sanitized innerHTML from a tainted one.',
      'The sanitizer check is "does DomSanitizer / sanitizeHtml appear anywhere in the repo" — presence, not correct use at the sink.',
      'CSP is checked only in src/index.html; TS/HTML only — no .js, no Python.',
    ],
    stack: 'frontend',
    emoji: '🚫',
    description:
      'NEVER use innerHTML, bypassSecurityTrust* without sanitization',
    priority: 'CRITICAL',
    category: 'SECURITY',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkXSSPrevention',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 6.5: Potential XSS vulnerability detected',
    remediation: 'Use DomSanitizer properly or avoid innerHTML entirely',
  },

  {
    id: generateLawId(
      'Security Standards (XSS Prevention) Policy',
      'Implement CSP headers, sanitize all user input, avoid dangerous Angular methods',
      'security'
    ),
    legacyId: 44,
    section: '6',
    subsection: '6.19',
    title: 'Security Standards (XSS Prevention) Policy',
    rationale:
      'Untrusted input rendered as markup is how a comment box becomes a keylogger. This law flags the DOM sinks (innerHTML, document.write, eval, bypassSecurityTrust) and asks that HTML be sanitized before it reaches the page.',
    satisfiedBy: {
      angular:
        'Prefer interpolation / [textContent]; sanitize any HTML you must render via DomSanitizer; serve a Content-Security-Policy.',
    },
    detectionLimits: [
      'Runs the same detector as the Angular XSS law — regex over raw .ts/.html, no comment stripping, no data-flow, so a commented sink triggers and a sanitized one is not distinguished.',
      'The sanitizer signal is a keyword present anywhere in the repo, not verified at the sink.',
      'CSP checked only in src/index.html; TS/HTML only.',
    ],
    stack: 'frontend',
    emoji: '🔒',
    description:
      'Implement CSP headers, sanitize all user input, avoid dangerous Angular methods',
    priority: 'HIGH',
    category: 'SECURITY',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkSecurityStandards',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 6.19: Security vulnerability detected',
    remediation: 'Implement proper input sanitization and CSP headers',
  },

  // Extended Security Laws (45-49)
  {
    id: generateLawId(
      'Data Encryption Standards',
      'All sensitive data must be properly encrypted',
      'security'
    ),
    legacyId: 45,
    article: 'V',
    subsection: '5.6',
    title: 'Data Encryption Standards',
    rationale:
      'Weak crypto is worse than none — it looks like protection while offering little, so nobody goes looking for the hole. This law flags broken algorithms (MD5/SHA1/DES/RC4), hardcoded keys and home-rolled crypto, because the one thing you must never invent yourself is a cipher.',
    satisfiedBy: {
      typescript:
        'Use a vetted library and modern algorithms (AES-GCM, SHA-256, argon2/scrypt for passwords); never MD5/SHA1/DES/RC4, and never a hardcoded key.',
    },
    detectionLimits: [
      'Substring / regex heuristics over .ts/.js — no Python, and no data-flow.',
      'Weak-algorithm and hardcoded-secret matching is name-based; it cannot confirm a matched value is actually used as a key or that the algorithm is on a real code path.',
    ],
    emoji: '🔒',
    description: 'All sensitive data must be properly encrypted',
    priority: 'CRITICAL',
    category: 'SECURITY',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'DataEncryptionStandardsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article V.5.6: Data encryption standards not met',
    remediation: 'Implement proper encryption for all sensitive data',
  },

  {
    id: generateLawId(
      'Authentication Security',
      'Secure authentication and authorization mechanisms',
      'security'
    ),
    legacyId: 46,
    article: 'V',
    subsection: '5.7',
    title: 'Authentication Security',
    rationale:
      'Authentication is the door; authorization is what each lock inside protects. This law asks that both exist — an auth service, secure token handling, and the guards, roles and permissions that decide who may do what — because a login page with no checks behind it is theatre.',
    satisfiedBy: {
      typescript:
        'Have an auth service with secure token handling (no plaintext passwords, avoid tokens in localStorage) and route guards / role checks for authorization.',
      python:
        'Guard routes with @login_required / @jwt_required, check roles, and abort(401/403) for the unauthorized — recognised natively.',
    },
    detectionLimits: [
      'Keyword/regex presence ANYWHERE in the codebase, not per-route or data-flow — one decorative match satisfies a whole category, and a genuinely unguarded route can pass if the vocabulary appears elsewhere.',
      'JS/TS shapes; Python only toggles a native pass via auth-guard decorators — it does not positively analyse Python auth beyond that.',
      'Scans src/ (and Nx apps/ and libs/); code outside those trees is not seen.',
    ],
    emoji: '🔐',
    description: 'Secure authentication and authorization mechanisms',
    priority: 'CRITICAL',
    category: 'SECURITY',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'AuthenticationSecurityLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article V.5.7: Authentication security compromised',
    remediation:
      'Implement secure authentication with JWT and proper session management',
  },

  {
    id: generateLawId(
      'Security Testing Requirements',
      'Security testing must be part of CI/CD pipeline',
      'security'
    ),
    legacyId: 49,
    article: 'V',
    subsection: '5.10',
    title: 'API Security Testing Requirements',
    rationale:
      'An API\'s security is only as real as the test that would fail if it broke. This law asks for SAST, dependency scanning, and tests that ASSERT the security properties — a 401 on an unauthenticated call, the presence of the headers — so a regression is caught by CI, not by an attacker.',
    satisfiedBy: {
      typescript:
        'Wire a SAST tool and a dependency scanner into the gate, and assert 401/403 and security headers in integration tests.',
      python:
        'bandit + pip-audit in the gate, and pytest that asserts 401 on protected routes and HSTS/CSP on responses — recognised natively.',
    },
    detectionLimits: [
      'Presence, not correctness — it does not run the tests; a test that asserts the wrong thing still counts.',
      'Runs the same detector as Comprehensive Security Testing Requirements, and SAST detection is loose: any repo using @typescript-eslint/eslint-plugin satisfies it.',
      'Security-test discovery is limited to eight named directories (src, test, tests, spec, libs, apps, packages, functions).',
    ],
    emoji: '🧪',
    description: 'Security testing must be part of CI/CD pipeline',
    priority: 'HIGH',
    category: 'SECURITY',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkSecurityTestingRequirements',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article V.5.10: Security testing not implemented',
    remediation: 'Integrate security testing tools in CI/CD pipeline',
  },

  {
    id: generateLawId(
      'API Security Standards',
      'Comprehensive API security including HTTPS, authentication, rate limiting, input validation',
      'security'
    ),
    legacyId: 60,
    section: '5',
    subsection: '5.11',
    title: 'API Security Standards',
    rationale:
      'The boring API mistakes are the ones that get exploited: no HTTPS, no auth on an endpoint, no rate limit in front of a login. This law checks the perimeter — transport, authentication, throttling, CORS, headers and input validation.',
    satisfiedBy: {
      angular:
        'Enforce HTTPS (firebase.json / nginx), an auth service with token handling, rate limiting on sensitive endpoints, explicit CORS, security headers and input validation.',
    },
    detectionLimits: [
      'Heavily Angular + Firebase + nginx-shaped — no Python, and no generic Express/Fastify/Nest route analysis beyond filename heuristics.',
      'Auth and rate limiting are detected by a substring appearing SOMEWHERE; a backend concern like rate limiting reads as "missing" on a pure frontend, for which it does not apply.',
      'Regex/substring over raw text, no data-flow.',
    ],
    stack: 'typescript',
    emoji: '🛡️',
    description:
      'Comprehensive API security including HTTPS, authentication, rate limiting, input validation',
    priority: 'CRITICAL',
    category: 'SECURITY',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkAPISecurityStandards',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article V.5.11: API security standards not properly implemented',
    remediation:
      'Implement HTTPS enforcement, authentication, rate limiting, input validation, CORS, and security headers',
  },
  {
    id: generateLawId(
      'Dependency Security Scanning',
      'Comprehensive DependencyVulnerabilityAnalyzer dependency security scanning including audit integration, vulnerability detection, LicenseCompatibilityChecker license checking',
      'security'
    ),
    legacyId: 61,
    section: '5',
    subsection: '5.12',
    title: 'Dependency Security Scanning',
    rationale:
      'A backend team had a vulnerability scanner in CI for months; a real CVE sat unnoticed because CI did not run on every push. The first time they wired the same scanner into pre-push, it fired on day one. A scanner outside the gate is not a scanner.',
    satisfiedBy: {
      typescript:
        'Commit the lockfile; run npm / yarn / pnpm audit in the pre-push and CI gate.',
      python:
        'Commit uv.lock / poetry.lock; run pip-audit (or safety) in pre-commit and CI, against the locked set — not just top-level requirements.',
    },
    detectionLimits: [
      'Checks that the graph is LOCKED and a scanner is wired INTO THE GATE — Node reads package-lock + npm/yarn/pnpm audit; Python reads uv.lock/poetry.lock/Pipfile.lock/pdm.lock + pip-audit/safety.',
      'It does NOT run the scanner and cannot see a vulnerability the scanner would find — a scanner outside the gate is not a scanner, and one that is present but never run is invisible to this law.',
    ],
    emoji: '🔍',
    description:
      'Comprehensive DependencyVulnerabilityAnalyzer dependency security scanning including audit integration, vulnerability detection, LicenseCompatibilityChecker license checking',
    priority: 'CRITICAL',
    category: 'SECURITY',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkDependencySecurityScanning',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article V.5.12: Dependency security scanning not properly implemented',
    remediation:
      'Implement DependencyVulnerabilityAnalyzer npm audit, dependency pinning, security scanning tools, and LicenseCompatibilityChecker license compliance checks',
  },

  {
    id: generateLawId(
      'Comprehensive Security Testing Requirements',
      'Ensures comprehensive security testing is implemented',
      'security'
    ),
    legacyId: 60,
    section: '8',
    subsection: '8.11',
    title: 'Comprehensive Security Testing Requirements',
    rationale:
      'Security you ASSERT in a test is security you can regress-proof; security you only configure is security that silently rots. The 401 that used to be enforced and quietly stopped is caught only by a test that asserts a caller without a token is refused.',
    satisfiedBy: {
      typescript:
        'Integration tests that assert 401/403 on protected routes and the presence of HSTS / CSP headers.',
      python:
        'test_ that GET on a protected route returns 401 and that responses carry Strict-Transport-Security / Content-Security-Policy; run bandit + pip-audit in the gate.',
    },
    detectionLimits: [
      'Recognises a security test by what it ASSERTS (status 401/403, HSTS, CSP, X-Frame-Options) and a SAST/dep-scanner wired in the gate — in TS/JS and Python.',
      'It does not run the tests or judge their correctness, only their presence; a test that asserts the wrong thing still counts.',
    ],
    emoji: '🛡️',
    description: 'Ensures comprehensive security testing is implemented',
    priority: 'HIGH',
    category: 'SECURITY',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    checkFunction: 'checkSecurityTestingRequirements',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Section 8.11: Security testing requirements not met',
    remediation:
      'Implement SAST tools, DependencyVulnerabilityAnalyzer dependency scanning, security test cases, auth tests, input validation tests, and security headers tests',
  },
];

/**
 * Version Control Laws Data Module
 * Critical laws for Git workflow and version control standards
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';

export const VERSION_CONTROL_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Branch Governance Standards',
      'Proper git branching strategy with protected main branch',
      'git'
    ),
    legacyId: 20,
    article: 'III',
    subsection: '3.1',
    title: 'Branch Governance Standards',
    rationale:
      'A branch model is what keeps work off main and reviewable; without a rule that names branches and blocks direct commits to a protected branch, a team drifts into committing straight to main. This law reads the real branch state and enforces the naming pattern.',
    satisfiedBy: { typescript: 'Work on a feature/hotfix/bugfix/release branch (lowercase, dash-separated); never commit directly to main/master; keep commits-per-branch under the configured cap.' },
    detectionLimits: [
      'It judges the branch you are standing on and nothing else — source-identifier naming belongs to Naming Convention Enforcement and is deliberately not merged in here.',
      'The code-naming scan only reads src/**/*.ts, so on a Python or Go repo that half of the law is silently empty.',
      'The branch-name regex is the whole content check — a well-named branch with terrible commits passes.',
      'On a detached HEAD (most CI checkouts, git bisect, a tag checkout) there is no branch to judge: when the CI environment does not name the branch either, naming and branch size are not checked at all and the law passes.',
    ],
    emoji: '🌿',
    description: 'Proper git branching strategy with protected main branch',
    priority: 'HIGH',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'CONFIGURABLE',
    checkFunction: 'checkBranchGovernance',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.1: Branch governance violation',
    remediation: 'Follow git-flow or GitHub flow branching standards',
  },

  {
    id: generateLawId(
      'Commit Message Standards',
      'Conventional commit format with proper semantic meaning',
      'git'
    ),
    legacyId: 21,
    article: 'III',
    subsection: '3.2',
    title: 'Commit Message Standards',
    rationale:
      'A commit subject is the one line every reviewer, changelog and bisect reads; a wall of "wip" and "fix stuff" makes history useless. This law parses the actual git log and requires Conventional-Commit subjects.',
    satisfiedBy: { typescript: 'Write subjects as type(scope): summary using feat/fix/docs/refactor/test/chore/perf/build/ci/revert; keep the subject within the configured length (default 72).' },
    detectionLimits: [
      'It judges the subject line only — a perfectly-typed `feat: x` with an empty or nonsensical body still passes.',
      'Merge, revert and "initial commit" subjects are exempted, so those are never graded.',
      'Not evaluated in the pre-commit hook: these describe history, and blocking a commit on the past deadlocks the rewrite that would fix it. They run on pre-push and in CI; the commit-msg hook still checks the message being written.',
      'A second, identically-named class in commit-message-standards-impl.ts (the commitlint/husky variant) is dead code and never runs.',
    ],
    emoji: '💬',
    description: 'Conventional commit format with proper semantic meaning',
    priority: 'HIGH',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'CommitMessageStandardsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.2: Invalid commit message format',
    remediation: 'Use conventional commits: type(scope): description format',
  },

  {
    id: generateLawId(
      'Commit Description Standards',
      'Commit body separated from subject by a blank line and wrapped at 72 chars',
      'git'
    ),
    legacyId: 30,
    article: 'III',
    subsection: '3.3',
    title: 'Commit Description Standards',
    rationale:
      'A commit body is where the why lives — the reasoning a diff can never show. This law reads the real commit bodies and enforces the format that keeps them readable: a blank line after the subject and wrapped body lines.',
    satisfiedBy: { typescript: 'Separate subject and body with a blank line and wrap body lines at the configured width (default 72); URLs and trailer lines are exempt.' },
    detectionLimits: [
      'It checks shape, never substance — a body that is wrapped correctly but says nothing still passes.',
      'Single-line commits (subject only) are skipped entirely rather than flagged for a missing body.',
      'Only commits inside the configured range or baseline are read; older history is out of scope.',
      'Not evaluated in the pre-commit hook: these describe history, and blocking a commit on the past deadlocks the rewrite that would fix it. They run on pre-push and in CI; the commit-msg hook still checks the message being written.',
    ],
    emoji: '📝',
    description:
      'Commit body separated from subject by a blank line and wrapped at 72 chars',
    priority: 'MEDIUM',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CommitDescriptionStandardsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.3: Malformed commit body/description',
    remediation:
      'Separate subject from body with a blank line; wrap body lines at 72 characters',
  },

  {
    id: generateLawId(
      'Pull Request Workflow Standards',
      'Mandatory PR reviews and checks before merging',
      'git'
    ),
    legacyId: 22,
    article: 'III',
    subsection: '3.3',
    title: 'Pull Request Workflow Standards',
    rationale:
      'A PR template, CODEOWNERS and CI on every pull request are what make review consistent instead of ad-hoc. This law checks that the repository is configured for a reviewed workflow.',
    satisfiedBy: { typescript: 'Add a .github/ PR template and CODEOWNERS, wire CI, and give package.json precommit/prepush/test/lint/build scripts.', python: 'Provide a CI config the multi-provider detector recognises; the script-presence check is package.json-only and simply does not fire without one.' },
    detectionLimits: [
      'It reads configuration files, not real pull requests — it can never see whether reviews actually happen.',
      'The required-scripts violation is package.json-only, so a repo with no package.json skips that check instead of failing it.',
      'When .github/ is absent the template and CODEOWNERS checks become suggestions, leaving only the CI-presence violations live.',
    ],
    emoji: '🔄',
    description: 'Mandatory PR reviews and checks before merging',
    priority: 'HIGH',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'CONFIGURABLE',
    checkFunction: 'PRWorkflowStandardsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.3: PR workflow standards not met',
    remediation: 'Ensure all PRs have reviews and pass all required checks',
  },

  // NEW REAL LAWS WITH IMPLEMENTATIONS!
  {
    id: generateLawId(
      'Git Ignore Standards',
      'Proper .gitignore configuration for project security',
      'git'
    ),
    legacyId: 881,
    article: 'III',
    subsection: '3.8',
    title: 'Git Ignore Standards',
    rationale:
      'A .gitignore that misses the obvious — build output, secrets, logs — is how a committed .env or a 200MB dist/ ends up in history. This law checks the ignore file lists the usual dangerous paths.',
    satisfiedBy: { typescript: 'List node_modules, dist, .env, *.log and .DS_Store in .gitignore; keep .env and debug logs off disk.', python: 'List __pycache__, .venv, .env, *.log and .DS_Store — the Node artifacts are only required of projects that carry a package.json.' },
    detectionLimits: [
      'Matching is a raw substring test, so a comment mentioning node_modules, or a negation like !node_modules, counts as ignoring it.',
      'The "committed sensitive file" check is really a file-exists-on-disk test; it never runs git check-ignore or git ls-files, so an ignored-but-present .env still fails.',
      'The required entries follow the stack: __pycache__/.venv are asked of a Python project, node_modules/dist only of one carrying a package.json — a repo with neither manifest is asked for nothing beyond the universal three.',
    ],
    emoji: '🙈',
    description: 'Proper .gitignore configuration for project security',
    priority: 'HIGH',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkGitIgnoreStandards',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.8: .gitignore standards violation',
    remediation:
      'Configure .gitignore to exclude sensitive and unnecessary files',
  },

  {
    id: generateLawId(
      'Git Hooks Standards',
      'Automated quality gates through Git hooks',
      'git'
    ),
    legacyId: 882,
    article: 'III',
    subsection: '3.9',
    title: 'Git Hooks Standards',
    rationale:
      'Git hooks are where a team runs its lint and tests before a bad commit lands; a repo with hooks recommended but never installed loses that safety net. This law nudges toward configured hooks.',
    satisfiedBy: { typescript: 'Configure pre-commit and commit-msg hooks (husky or native); if husky is in devDependencies, actually configure .husky/.', python: 'A .pre-commit-config.yaml (or a "pre-commit" entry in gate config) short-circuits the whole hook/tool block as satisfied.' },
    detectionLimits: [
      'A hook counts as configured if a committed .husky/<hook> exists or the .git/hooks file is not git\'s own template — it is never executed, so a hook that runs nothing still counts.',
      'It shares one hook-status resolver with Git Hook Compliance, so the two can no longer disagree about the same repo; the overlap between them is real and deliberate.',
      'It also flags half-installed husky — husky in devDependencies but no .husky directory.',
    ],
    emoji: '🪝',
    description: 'Automated quality gates through Git hooks',
    priority: 'MEDIUM',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkGitHooksStandards',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.9: Git hooks standards not implemented',
    remediation: 'Configure pre-commit hooks for automated code quality checks',
  },

  {
    id: generateLawId(
      'Branch Protection Standards',
      'CodeNamingAnalyzer: Branch protection rules and naming conventions',
      'git'
    ),
    legacyId: 883,
    article: 'III',
    subsection: '3.10',
    title: 'Branch Protection Standards',
    rationale:
      'The one PR that skipped review is the one that shipped the incident. Protection that depends on discipline fails on a deadline; it has to be enforced by the host, not by hope. (satisfiedBy is omitted on purpose: the fix is a host setting, identical across languages.)',
    detectionLimits: [
      'Branch protection is configured SERVER-SIDE on Bitbucket and Azure DevOps — there is no repo file to read there, so protection is inferred from the host, not verified.',
      'A GitHub repo is checked for a settings/branch-protection file; the actual enforced ruleset lives in the host API, which this static pass does not query.',
    ],
    emoji: '🛡️',
    description: 'Branch protection rules and CodeNamingAnalyzer',
    priority: 'MEDIUM',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'checkBranchProtectionStandards',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.10: Branch protection standards not configured',
    remediation:
      'Implement branch protection rules and document CodeNamingAnalyzer',
  },

  // Extended Version Control Laws (23-29)
  {
    id: generateLawId(
      'Git History Integrity',
      'Maintain clean and meaningful git history',
      'git'
    ),
    legacyId: 23,
    article: 'III',
    subsection: '3.4',
    title: 'Git History Integrity',
    rationale:
      'A protected history is one nobody force-pushes or silently rewrites; the intent is to keep the shared branch trustworthy. This law is meant to guard that discipline.',
    satisfiedBy: { typescript: 'Either add a pre-push hook that guards force-push, OR declare your no-force-push policy in CONTRIBUTING.md / docs/BRANCH_PROTECTION.md — either one satisfies it, because a server-side ruleset is invisible from a clone.' },
    detectionLimits: [
      'Server-side branch protection (Bitbucket, GitHub, Azure rulesets) cannot be read from a clone, so a policy declared in a doc is ACCEPTED as the signal — that is presence of the words, never proof the host enforces anything.',
      'Despite the name it never inspects the reflog, force-push events, or rewritten commits — it verifies that a guard or a declared policy exists, not that history stayed clean.',
      'The pre-push guard check is a substring test for "force" in the hook, so any mention of the word counts; the rebase-policy and CI/workflow sub-checks are advisory and never affect the verdict.',
    ],
    emoji: '🕰️',
    description: 'Maintain clean and meaningful git history',
    priority: 'MEDIUM',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'CONFIGURABLE',
    checkFunction: 'GitHistoryIntegrityLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.4: Git history integrity compromised',
    remediation: 'Use interactive rebase to maintain clean commit history',
  },

  {
    id: generateLawId(
      'Feature Branch Protection',
      'All features must be developed in dedicated branches',
      'git'
    ),
    legacyId: 24,
    article: 'III',
    subsection: '3.5',
    title: 'Feature Branch Protection',
    rationale:
      'Feature work belongs on a prefixed, adequately-named branch, documented so the team follows the same model. This law checks the current branch and that a branching policy is written down.',
    satisfiedBy: { typescript: 'Document your branching model, and name feature work feature/bugfix/hotfix/release/chore-prefixed with a name at least the configured minimum length (default 10).' },
    detectionLimits: [
      'It overlaps Branch Governance heavily — both regex the current branch, differing mainly in that this one also accepts chore/ and requires a branching doc.',
      'The policy check is keyword presence in a docs file, not an actual protection rule; it cannot read the remote branch-protection settings.',
      'The prefix list differs from Branch Governance only by including chore/, which is the main reason both exist.',
    ],
    emoji: '🛡️',
    description: 'All features must be developed in dedicated branches',
    priority: 'HIGH',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'FeatureBranchProtectionLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.5: Direct main branch commits detected',
    remediation: 'Create feature branches for all development work',
  },

  {
    id: generateLawId(
      'Commit Size Control',
      'Commits must be focused and reasonably sized',
      'git'
    ),
    legacyId: 25,
    article: 'III',
    subsection: '3.6',
    title: 'Commit Size Control',
    rationale:
      'Small, atomic commits are reviewable and revertable; a 3,000-line "misc" commit is neither. The intent is to keep commits focused.',
    satisfiedBy: { typescript: 'Document an atomic-commit policy in CONTRIBUTING/WORKFLOW; keep individual commits small and single-purpose.' },
    detectionLimits: [
      'It reads at most the last 10 commits from the past week, so an oversized commit older than that is invisible.',
      'Size is measured from git\'s own --stat summary (files changed, insertions/deletions); a commit is oversized if it breaks either limit, and a generated or vendored file counts like any other.',
      'The limits are configurable (thresholds.git.maxFilesPerCommit, default 10; maxLinesPerCommit, default 500), and the law also requires an atomic-commit policy doc.',
    ],
    emoji: '📏',
    description: 'Commits must be focused and reasonably sized',
    priority: 'MEDIUM',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'CommitSizeControlLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.6: Oversized commits detected',
    remediation: 'Break large commits into focused, atomic changes',
  },

  {
    id: generateLawId(
      'Merge Conflict Prevention',
      'Proactive conflict prevention through regular syncing',
      'git'
    ),
    legacyId: 26,
    article: 'III',
    subsection: '3.7',
    title: 'Merge Conflict Prevention',
    rationale:
      'An unresolved conflict marker committed to a branch breaks the build for everyone; a team also wants a written strategy for avoiding conflicts. This law scans the live tree for conflicts and asks for a documented approach.',
    satisfiedBy: { typescript: 'Keep the tree free of conflict markers and out of a stuck merge/rebase, and document a conflict-prevention strategy (rebase workflow) in CONTRIBUTING/WORKFLOW.' },
    detectionLimits: [
      'The live-conflict detection is genuine but only fires during an actual conflict, merge, or rebase; a clean checkout shows nothing.',
      'The always-firing violation is the missing conflict-prevention doc, so on most repos this reduces to a documentation check.',
      'It deliberately ignores the ======= marker to avoid false positives from Markdown rules and coverage output.',
    ],
    emoji: '⚔️',
    description: 'Proactive conflict prevention through regular syncing',
    priority: 'MEDIUM',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'CONFIGURABLE',
    checkFunction: 'MergeConflictPreventionLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.7: Merge conflict prevention lacking',
    remediation: 'Sync with main branch regularly to prevent conflicts',
  },

  {
    id: generateLawId(
      'Release Tag Standards',
      'All releases must follow semantic versioning and tagging',
      'git'
    ),
    legacyId: 27,
    article: 'III',
    subsection: '3.8',
    title: 'Release Tag Standards',
    rationale:
      'Consistent, SemVer-shaped tags and a changelog are what make a release traceable. This law checks the version, the tag formats, and that release documentation exists.',
    satisfiedBy: { typescript: 'Keep package.json version SemVer-valid, tag releases consistently (pick v-prefixed or bare, not both), and maintain a CHANGELOG.', python: 'A missing package.json is only a suggestion here, so a Python repo passes on a valid CHANGELOG plus consistent tags.' },
    detectionLimits: [
      'It never verifies a tag points at a real release commit or matches a changelog entry — only that the string format is valid.',
      'The most common failure is a missing CHANGELOG/RELEASES/VERSIONING doc, which trips most repos regardless of their tagging.',
      'Version reading is package.json-first with no pyproject.toml [project].version path.',
    ],
    emoji: '🏷️',
    description: 'All releases must follow semantic versioning and tagging',
    priority: 'HIGH',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'ReleaseTagStandardsLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.8: Release tagging standards not met',
    remediation: 'Follow semantic versioning (v1.2.3) for all release tags',
  },

  {
    id: generateLawId(
      'Code Review Quality',
      'All code reviews must be thorough and constructive',
      'git'
    ),
    legacyId: 28,
    article: 'III',
    subsection: '3.9',
    title: 'Code Review Quality',
    rationale:
      'Review guidelines, a PR template, CODEOWNERS and automated lint/CI are the scaffolding that makes review consistent. This law checks that scaffolding is present.',
    satisfiedBy: { typescript: 'Add review guidelines (CONTRIBUTING), a PR template, a populated CODEOWNERS, an ESLint/Prettier config, and CI whose steps mention lint/test.', python: 'ruff, flake8, pylint, mypy or black are recognised as the linter, but only when the project is detected as Python (pyproject/setup.cfg/requirements).' },
    detectionLimits: [
      'Everything is file-and-config presence — it never reads an actual review thread, approval, or comment.',
      'The linting-tool recognition is stack-gated: Python linters only count when the Python project detector fires first.',
      'A CODEOWNERS that exists but is empty or unreadable is treated as a violation.',
    ],
    emoji: '👁️',
    description: 'All code reviews must be thorough and constructive',
    priority: 'HIGH',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'MANUAL',
    checkFunction: 'CodeReviewQualityLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.9: Insufficient code review quality',
    remediation: 'Provide detailed, constructive feedback in all code reviews',
  },

  {
    id: generateLawId(
      'Git Hook Compliance',
      'All required git hooks must be properly configured',
      'git'
    ),
    legacyId: 29,
    article: 'III',
    subsection: '3.10',
    title: 'Git Hook Compliance',
    rationale:
      'A repo that declares hooks should actually have them installed and executable, not left as unconfigured samples. This law checks pre-commit, pre-push and commit-msg are real and runnable.',
    satisfiedBy: { typescript: 'Install real pre-commit/pre-push/commit-msg hooks (committed .husky/ counts) with an exec bit and a shebang, and add a hook tool (husky/pre-commit/ghooks/yorkie) to devDependencies.', python: 'A .pre-commit-config.yaml on a detected Python project skips the whole hook/automation block as satisfied.' },
    detectionLimits: [
      'On a stock git repo the default .sample hooks are read as unconfigured and fail — Git Hooks Standards now reads the same shared resolver and reaches the same verdict.',
      'A JavaScript/TypeScript repo that uses the pre-commit framework instead of husky is not recognised (that path is gated on the Python detector) and still fails.',
      'Recognition is husky-first; the hooks directory is resolved through git (common dir plus core.hooksPath), so linked worktrees and relocated hooks are found.',
      'The executable bit is read from the git INDEX, so it is judged only for TRACKED hook files. Hooks generated at install time are untracked — husky ignores its whole `_` directory — and carry no mode that git or a consumer could set, so their executability is not checked at all.',
      'Only the names git actually runs as hooks are judged; other files sharing the hooks directory (husky keeps .gitignore, husky.sh and h there) are ignored, so a broken support file is invisible to this law.',
    ],
    emoji: '🎣',
    description: 'All required git hooks must be properly configured',
    priority: 'MEDIUM',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'GitHookComplianceLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.10: Git hooks not properly configured',
    remediation: 'Configure pre-commit, pre-push, and commit-msg git hooks',
  },

  {
    id: generateLawId(
      'Semantic Versioning Standards',
      'Strict adherence to Semantic Versioning (SemVer) everywhere',
      'git'
    ),
    legacyId: 88,
    article: 'III',
    subsection: '3.11',
    title: 'Semantic Versioning Standards',
    rationale:
      'A version number that lies about compatibility breaks every consumer that trusts it; SemVer is the contract. This law checks the declared version and that tags stay consistent with it.',
    satisfiedBy: { typescript: 'Keep package.json version SemVer-valid, tag each release, and never let package.json fall behind the latest tag.', python: 'Declare a SemVer version in pyproject.toml — [project] version (PEP 621) or [tool.poetry] version — and tag releases to match.' },
    detectionLimits: [
      'It reads package.json first and pyproject.toml ([project] or [tool.poetry]) for a Python project; a stack with neither manifest (Rust, Go) declares no version it can read, so the version check stays silent rather than inventing a finding.',
      'It duplicates the version/tag-format logic of Release Tag Standards but with a stricter, violation-level stance on the missing file.',
      'The behind-latest-tag check uses semver.coerce, so loosely-formatted tags may compare in surprising ways.',
    ],
    emoji: '🔢',
    description: 'Strict adherence to Semantic Versioning (SemVer) everywhere',
    priority: 'CRITICAL',
    category: 'VERSION_CONTROL',
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'checkSemVerCompliance',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article III.3.11: SemVer standards not followed',
    remediation:
      'Use semantic versioning format: MAJOR.MINOR.PATCH (e.g., 1.0.1)',
  },
];

/**
 * Cross-stack concern satisfaction (QA-6).
 *
 * Several universal laws carry JS/TS-only detectors: they demand Jest, Firestore,
 * Express middleware or husky, and then FAIL a Python project that satisfies the
 * very same concern the Python way — pytest with `--cov-fail-under=100`, a Flask
 * `@app.errorhandler`, a `GET /health` route, `.pre-commit-config.yaml`. Worse,
 * some fail for the ABSENCE of their substrate ("No TypeScript files found" on a
 * Python backend), which turns a non-applicable law into a permanent red mark
 * that consumers can only silence with a waiver — teaching them that waivers are
 * normal. They are not.
 *
 * Two rules, encoded here once:
 *   1. A concern satisfied natively for the project's stack IS satisfied.
 *   2. The absence of a law's substrate is never a violation — it is N/A.
 */

import { glob } from 'glob';
import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';
import { ProjectTypeDetector } from './config/project-type-detector';

/** Never scan dependencies, virtualenvs or build output. */
const NODE_MODULES = '**/node_modules/**';
const VENV = '**/.venv/**';
const BUILD_OUT = '**/build/**';
const DIST_OUT = '**/dist/**';

/** The Node manifest — read as gate config, and probed as a substrate marker. */
const PACKAGE_JSON = 'package.json';

/** The PEP 621 manifest — version source, and a Python substrate marker. */
const PYPROJECT_TOML = 'pyproject.toml';

/** Files that describe how the project is built/tested/gated. */
const GATE_FILES = [
  PYPROJECT_TOML,
  'setup.cfg',
  'pytest.ini',
  'tox.ini',
  'noxfile.py',
  '.pre-commit-config.yaml',
  'Makefile',
  '.coveragerc',
  PACKAGE_JSON,
];

/** Files whose presence alone declares a Python test runner. */
const TEST_RUNNER_FILES = ['pytest.ini', 'tox.ini', 'noxfile.py'];

/**
 * A Python test runner declared in project config: a pytest section, a tox/nox
 * env, or a runner named in a dependency list or a `test` script
 * (`"test": "uv run pytest"` — package.json is part of the gate config).
 */
const PY_TEST_CONFIG =
  /\[tool\.pytest\.ini_options\]|\[tool:pytest\]|\[pytest\]|\[testenv|\bpytest\b|\bunittest\b|\bnox\b|\btox\b/i;

/** Outbound HTTP, the Python way (urllib / requests / httpx / aiohttp). */
const PY_HTTP_CALL =
  /\b(?:urlopen|requests\.(?:get|post|put|delete|patch|head|request)|httpx\.(?:get|post|put|delete|patch|request|stream|Client|AsyncClient)|aiohttp\.(?:ClientSession|request))\s*\(/;

export class PythonSatisfaction {
  /** Is this a Python project at all? */
  static isPython(projectRoot: string): boolean {
    return ProjectTypeDetector.isPythonProject(projectRoot);
  }

  /** The manifests that describe a Python project, in precedence order. */
  private static readonly MANIFESTS = [PYPROJECT_TOML, 'setup.py', 'setup.cfg'];

  /** The Python project's declared manifest file, or null when it has none. */
  static projectManifest(projectRoot: string): string | null {
    return (
      this.MANIFESTS.find(m =>
        FileUtils.exists(PathOperations.join(projectRoot, m))
      ) ?? null
    );
  }

  /**
   * The version a Python project declares — PEP 621 `[project] version` or
   * Poetry's `[tool.poetry] version`.
   *
   * Node has package.json; Python's equivalent lives in a TOML table, and until
   * v7.13.0 nothing read it. Laws that resolve "the project's version" only via
   * package.json therefore failed EVERY Python project unconditionally, with no
   * way to pass but to add a Node manifest — a law satisfiable only by a lie.
   *
   * Returns null when no version is declared (a real finding), which the caller
   * must not confuse with "not a Python project".
   */
  static projectVersion(projectRoot: string): string | null {
    const content = this.read(projectRoot, PYPROJECT_TOML);
    if (!content) {
      return null;
    }
    for (const table of ['project', 'tool.poetry']) {
      const section = this.tomlTable(content, table);
      const match = /^\s*version\s*=\s*["']([^"']+)["']/m.exec(section);
      if (match?.[1]) {
        return match[1];
      }
    }
    return null;
  }

  /** The body of a single TOML table, so a key cannot be read across tables. */
  private static tomlTable(content: string, header: string): string {
    const out: string[] = [];
    let inSection = false;
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[')) {
        inSection = trimmed === `[${header}]`;
        continue;
      }
      if (inSection) {
        out.push(line);
      }
    }
    return out.join('\n');
  }

  /** Read a project-root file, or '' when absent. */
  private static read(projectRoot: string, rel: string): string {
    const p = PathOperations.join(projectRoot, rel);
    return FileUtils.exists(p) ? (FileUtils.readFileContentSync(p) ?? '') : '';
  }

  /** Concatenated gate/config files — where tooling declares itself. */
  static gateConfig(projectRoot: string): string {
    return GATE_FILES.map(rel => this.read(projectRoot, rel)).join('\n');
  }

  /** First-party Python sources (excludes venvs, caches, build output). */
  static pythonFiles(projectRoot: string): string[] {
    return glob.sync('**/*.py', {
      cwd: projectRoot,
      absolute: true,
      ignore: [
        NODE_MODULES,
        VENV,
        '**/venv/**',
        '**/__pycache__/**',
        BUILD_OUT,
        DIST_OUT,
        '**/site-packages/**',
      ],
    });
  }

  /** Does any Python source match this pattern? */
  static anyPythonSource(projectRoot: string, pattern: RegExp): boolean {
    return this.pythonFiles(projectRoot).some(file => {
      const content = FileUtils.readFileContentSync(file);
      return !!content && pattern.test(content);
    });
  }

  /** Project has TypeScript/JavaScript sources at all (substrate check). */
  static hasJsTsSources(projectRoot: string): boolean {
    return (
      glob.sync('**/*.{ts,tsx,js,jsx}', {
        cwd: projectRoot,
        ignore: [
          NODE_MODULES,
          DIST_OUT,
          BUILD_OUT,
          '**/coverage/**',
          '**/*.d.ts',
        ],
      }).length > 0
    );
  }

  // ── Concern satisfaction, the Python way ───────────────────────────────

  /** A health endpoint: Flask/FastAPI/Django route named health/healthz/livez. */
  static hasHealthEndpoint(projectRoot: string): boolean {
    return this.anyPythonSource(
      projectRoot,
      /(@\w+\.(route|get)\s*\(\s*["'][^"']*\/(health|healthz|livez|readyz)|["']\/(health|healthz|livez|readyz)["']\s*,?\s*(view_func|methods|endpoint)?)/i
    );
  }

  /** A global exception handler: Flask errorhandler / FastAPI exception_handler. */
  static hasGlobalErrorHandler(projectRoot: string): boolean {
    return this.anyPythonSource(
      projectRoot,
      /@\w+\.errorhandler\s*\(|add_exception_handler\s*\(|@\w+\.exception_handler\s*\(|def\s+handle_\w*(error|exception)/i
    );
  }

  /** Auth guards: login/auth decorators, role checks, token verification. */
  static hasAuthGuards(projectRoot: string): boolean {
    return this.anyPythonSource(
      projectRoot,
      /@(login_required|requires_auth|authed|auth_required|jwt_required|token_required)\b|verify_id_token\s*\(|check_password_hash\s*\(|\brole\s*(==|!=|in)\s*|current_user\b|abort\s*\(\s*40[13]/i
    );
  }

  /** Coverage enforced: pytest --cov / coverage config / fail-under threshold. */
  static hasCoverageConfigured(projectRoot: string): boolean {
    const config = this.gateConfig(projectRoot);
    return (
      /--cov\b|--cov[=-]/.test(config) ||
      /\[tool\.coverage/.test(config) ||
      /\[coverage:/.test(config) ||
      /fail[_-]under/.test(config) ||
      FileUtils.exists(PathOperations.join(projectRoot, '.coveragerc'))
    );
  }

  /** API tests: a tests/api tree, or tests exercising a Flask/FastAPI client. */
  static hasApiTests(projectRoot: string): boolean {
    const apiTestDirs = glob.sync('**/tests/**/{api,routes,endpoints}/**/*.py', {
      cwd: projectRoot,
      ignore: [NODE_MODULES, VENV],
    });
    if (apiTestDirs.length > 0) return true;

    return this.pythonFiles(projectRoot).some(file => {
      const p = file.replace(/\\/g, '/').toLowerCase();
      if (!/(^|\/)tests?\//.test(p) && !/test_[^/]*\.py$/.test(p)) return false;
      const content = FileUtils.readFileContentSync(file);
      return (
        !!content &&
        /\btest_client\b|\bTestClient\b|\bapp\.test_client\s*\(|\brequests\.(get|post)\s*\(/.test(
          content
        )
      );
    });
  }

  /** A hook framework is configured (pre-commit is the Python-native husky). */
  static hasHookFramework(projectRoot: string): boolean {
    return (
      FileUtils.exists(
        PathOperations.join(projectRoot, '.pre-commit-config.yaml')
      ) ||
      FileUtils.exists(
        PathOperations.join(projectRoot, '.pre-commit-config.yml')
      ) ||
      /\bpre-commit\b/.test(this.gateConfig(projectRoot))
    );
  }

  /**
   * A Python project's lock file. `uv.lock` / `poetry.lock` / `Pipfile.lock` /
   * `pdm.lock` pin the dependency graph exactly as `package-lock.json` does —
   * demanding a package-lock from a uv project is demanding a foreign artifact.
   */
  static hasPythonLockFile(projectRoot: string): boolean {
    return [
      'uv.lock',
      'poetry.lock',
      'Pipfile.lock',
      'pdm.lock',
      'conda-lock.yml',
      'requirements.lock',
    ].some(rel => FileUtils.exists(PathOperations.join(projectRoot, rel)));
  }

  /** Is a Python dependency scanner wired into the gate (pip-audit/safety)? */
  static hasPythonDependencyScanner(projectRoot: string): boolean {
    return /\bpip-audit\b|\bpip_audit\b|\bsafety\s+(check|scan)\b|\bosv-scanner\b/i.test(
      this.gateConfig(projectRoot)
    );
  }

  /** Does the project have a Node manifest at all (substrate for npm checks)? */
  static hasPackageJson(projectRoot: string): boolean {
    return FileUtils.exists(PathOperations.join(projectRoot, PACKAGE_JSON));
  }

  /**
   * Static application security testing, the Python way. bandit is Python's SAST
   * — a `[tool.bandit]` section, a `.bandit` file, or bandit in the pre-commit
   * gate IS SAST configured. So are semgrep and ruff's flake8-bandit rules
   * (`select = ["S"]`). Looking only for eslint-plugin-security is looking for
   * SAST in a language the project does not speak.
   */
  static hasPythonSast(projectRoot: string): boolean {
    return (
      FileUtils.exists(PathOperations.join(projectRoot, '.bandit')) ||
      FileUtils.exists(PathOperations.join(projectRoot, 'bandit.yaml')) ||
      FileUtils.exists(PathOperations.join(projectRoot, '.semgrep.yml')) ||
      /\[tool\.bandit\]|\bbandit\b|\bsemgrep\b|\bdlint\b|select\s*=\s*\[[^\]]*["']S\d*["']/i.test(
        this.gateConfig(projectRoot)
      )
    );
  }

  /**
   * A Python linter/type-checker declared in project config. ruff, flake8,
   * pylint and mypy live in `pyproject.toml` / `setup.cfg`, not in an `.eslintrc`
   * — asking a Python repo for an ESLint config is asking for a foreign artifact
   * it can only satisfy by faking one.
   */
  static hasPythonLinter(projectRoot: string): boolean {
    return (
      ['ruff.toml', '.ruff.toml', '.flake8', '.pylintrc', 'mypy.ini'].some(rel =>
        FileUtils.exists(PathOperations.join(projectRoot, rel))
      ) ||
      /\[tool\.(ruff|mypy|flake8|pylint|black)\b/i.test(
        this.gateConfig(projectRoot)
      )
    );
  }

  /**
   * Environment detection, the Python way: os.environ / os.getenv, pydantic
   * BaseSettings, python-decouple, django settings. `process.env.NODE_ENV` is
   * advice a Flask service cannot take.
   */
  static hasPythonEnvironmentDetection(projectRoot: string): boolean {
    return this.anyPythonSource(
      projectRoot,
      /\bos\.environ\b|\bos\.getenv\s*\(|\bBaseSettings\b|\bpydantic_settings\b|\bdecouple\b|\bdotenv_values\b|\bload_dotenv\s*\(|\bdjango\.conf\b/
    );
  }

  /**
   * Structured logging, the Python way: the stdlib `logging` module configured
   * (dictConfig / basicConfig / getLogger), or structlog / loguru / json logging.
   */
  static hasStructuredLogging(projectRoot: string): boolean {
    return this.anyPythonSource(
      projectRoot,
      /\blogging\.(config\.)?(dictConfig|fileConfig|basicConfig|getLogger)\s*\(|\bstructlog\b|\bloguru\b|\bjson_?log(ging|ger)\b|\bJsonFormatter\b/
    );
  }

  /** A Python formatter: black, ruff format, isort, yapf. */
  static hasPythonFormatter(projectRoot: string): boolean {
    return /\[tool\.(black|isort|yapf)\b|\[tool\.ruff\.format\]|\bblack\b|\bruff[- ]format\b|\bisort\b/i.test(
      this.gateConfig(projectRoot)
    );
  }

  /** A declared build system: PEP 517 backend, or a container image. */
  static hasPythonBuildSystem(projectRoot: string): boolean {
    return (
      /\[build-system\]|\bpython -m build\b|\buv build\b|\bpoetry build\b|\bhatch build\b/i.test(
        this.gateConfig(projectRoot)
      ) ||
      ['Dockerfile', 'Containerfile'].some(rel =>
        FileUtils.exists(PathOperations.join(projectRoot, rel))
      )
    );
  }

  /** Is the linter actually ENFORCED — named in a hook or a CI step? */
  static hasPythonLinterInGate(projectRoot: string): boolean {
    return /\b(ruff|flake8|pylint|mypy|black)\b/i.test(
      this.gateConfig(projectRoot)
    );
  }

  /**
   * Does this project render anything in a BROWSER?
   *
   * Real User Monitoring, Core Web Vitals and a Lighthouse budget are properties
   * of a page a human loads. A backend has no page. Demanding RUM from a service
   * with no browser surface is demanding evidence that cannot exist — and the
   * only way to produce it is to fabricate it (a backend consumer).
   */
  static hasBrowserSubstrate(projectRoot: string): boolean {
    const markers = [
      'index.html',
      'angular.json',
      'next.config.js',
      'next.config.mjs',
      'vite.config.ts',
      'vite.config.js',
      'nuxt.config.ts',
      'public/index.html',
      'src/index.html',
    ];
    if (
      markers.some(rel =>
        FileUtils.exists(PathOperations.join(projectRoot, rel))
      )
    ) {
      return true;
    }

    const pkg = this.read(projectRoot, PACKAGE_JSON);
    return /"(@angular\/core|react|react-dom|vue|svelte|preact|solid-js|@sveltejs\/kit|next|nuxt)"\s*:/i.test(
      pkg
    );
  }

  /**
   * Backend performance monitoring: the concern is real for a service, but the
   * evidence is Prometheus / OpenTelemetry / an APM — not Core Web Vitals.
   */
  static hasBackendPerformanceMonitoring(projectRoot: string): boolean {
    return /\b(prometheus[_-]?client|opentelemetry|opentracing|sentry[_-]?sdk|\bsentry\b|datadog|ddtrace|statsd|newrelic|new_relic|elastic[_-]?apm|py[_-]?spy|scout_apm)\b/i.test(
      this.gateConfig(projectRoot) + this.read(projectRoot, 'requirements.txt')
    );
  }

  /**
   * Alerting on degradation, the service way: Prometheus rules, Alertmanager,
   * Grafana alerts. A backend does not alert through a Lighthouse budget.
   */
  static hasBackendAlerting(projectRoot: string): boolean {
    const alertFiles = [
      'alerts.yml',
      'alerts.yaml',
      'alertmanager.yml',
      'prometheus.yml',
      'prometheus/rules.yml',
      'monitoring/alerts.yml',
      'grafana/alerts.yml',
    ];
    return (
      alertFiles.some(rel =>
        FileUtils.exists(PathOperations.join(projectRoot, rel))
      ) ||
      /\balertmanager\b|\balerting_rules\b|\bgroups:\s*\n\s*-\s*name:|\bPrometheusRule\b|\balert:\s/i.test(
        this.gateConfig(projectRoot)
      )
    );
  }

  /** Which Python SAST tools the gate actually names — for honest diagnostics. */
  static detectPythonSastTools(projectRoot: string): string[] {
    const gate = this.gateConfig(projectRoot);
    const tools: string[] = [];
    if (
      /\bbandit\b/i.test(gate) ||
      FileUtils.exists(PathOperations.join(projectRoot, '.bandit')) ||
      FileUtils.exists(PathOperations.join(projectRoot, 'bandit.yaml'))
    ) {
      tools.push('bandit');
    }
    if (
      /\bsemgrep\b/i.test(gate) ||
      FileUtils.exists(PathOperations.join(projectRoot, '.semgrep.yml'))
    ) {
      tools.push('Semgrep');
    }
    if (/select\s*=\s*\[[^\]]*["']S\d*["']/i.test(gate)) {
      tools.push('ruff (flake8-bandit)');
    }
    return tools;
  }

  /** Does the project talk to a database at all (any stack)? */
  static hasDatabaseLayer(projectRoot: string): boolean {
    const deps = this.gateConfig(projectRoot);
    if (
      /\b(sqlalchemy|django|psycopg2?|asyncpg|pymongo|motor|firebase-admin|firestore|prisma|typeorm|mongoose|knex|sequelize)\b/i.test(
        deps
      )
    ) {
      return true;
    }
    return this.anyPythonSource(
      projectRoot,
      /\b(session\.query|select\(|cursor\.execute|collection\(|\.find_one\(|\.aggregate\()/
    );
  }

  /**
   * A test framework is configured: pytest/tox/nox runner files, a pytest
   * section in pyproject/setup.cfg, a runner named in a dependency list or in a
   * `test` script (`"test": "uv run pytest"`), or a pytest-style test tree.
   * Jest is not the only way to have automated tests.
   */
  static hasTestFramework(projectRoot: string): boolean {
    return (
      TEST_RUNNER_FILES.some(rel =>
        FileUtils.exists(PathOperations.join(projectRoot, rel))
      ) ||
      PY_TEST_CONFIG.test(this.gateConfig(projectRoot)) ||
      this.hasTestSuite(projectRoot)
    );
  }

  /** A pytest-style suite on disk: `tests/test_*.py`, `*_test.py`. */
  private static hasTestSuite(projectRoot: string): boolean {
    return this.pythonFiles(projectRoot).some(file =>
      /(^|\/)test_[^/]*\.py$|_test\.py$/.test(this.normalize(file))
    );
  }

  /**
   * Every outbound HTTP call in first-party Python code sits inside a `try:`
   * block that has an `except` clause. A project that makes no outbound call at
   * all has nothing to guard — that concern is N/A, which is not a violation
   * either. Test code is excluded: it is not the app talking to the network.
   */
  static hasGuardedHttpCalls(projectRoot: string): boolean {
    return this.pythonFiles(projectRoot).every(file => {
      if (this.isTestPath(file)) return true;
      const content = FileUtils.readFileContentSync(file);
      return !content || this.httpCallsGuarded(this.stripPython(content));
    });
  }

  /** Is every HTTP call site in this (stripped) source inside a try/except? */
  private static httpCallsGuarded(content: string): boolean {
    const lines = content.split('\n');
    return lines.every(
      (line, index) =>
        !PY_HTTP_CALL.test(line) || this.insideTryWithExcept(lines, index)
    );
  }

  /**
   * Walk up the enclosing blocks of `index` — in Python the block structure IS
   * the indentation. The call is guarded when the chain reaches a `try:` with an
   * `except` clause before it leaves the function (a `def`/`class` header at a
   * lower indent means no try wrapped it).
   */
  private static insideTryWithExcept(lines: string[], index: number): boolean {
    let indent = this.indentOf(lines[index] ?? '');
    for (let i = index - 1; i >= 0; i--) {
      const line = lines[i] ?? '';
      if (line.trim() === '') continue;
      const lineIndent = this.indentOf(line);
      if (lineIndent >= indent) continue;
      if (/^\s*try\s*:/.test(line)) {
        return this.hasExceptClause(lines, i, lineIndent);
      }
      if (/^\s*(?:async\s+def|def|class)\s/.test(line)) return false;
      indent = lineIndent;
    }
    return false;
  }

  /** Does the try block opened at `tryIndex` have an `except` clause of its own? */
  private static hasExceptClause(
    lines: string[],
    tryIndex: number,
    tryIndent: number
  ): boolean {
    for (let i = tryIndex + 1; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (line.trim() === '') continue;
      const lineIndent = this.indentOf(line);
      if (lineIndent > tryIndent) continue;
      return lineIndent === tryIndent && /^\s*except\b/.test(line);
    }
    return false;
  }

  /** Leading-whitespace width — Python's block delimiter. */
  private static indentOf(line: string): number {
    return line.length - line.trimStart().length;
  }

  /** Forward-slash, lower-cased path (Windows checkouts included). */
  private static normalize(file: string): string {
    return file.replace(/\\/g, '/').toLowerCase();
  }

  /** pytest-style test path: a tests/ tree, test_*.py, *_test.py, conftest.py. */
  private static isTestPath(file: string): boolean {
    const p = this.normalize(file);
    return (
      /(^|\/)tests?\//.test(p) ||
      /(^|\/)test_[^/]*\.py$/.test(p) ||
      /_test\.py$/.test(p) ||
      /(^|\/)conftest\.py$/.test(p)
    );
  }

  /**
   * Blank out docstrings, string literals and `#` comments so the call patterns
   * cannot match inside them. Replacement preserves newlines and columns, so
   * indentation — and therefore the block structure — survives intact.
   */
  private static stripPython(content: string): string {
    return content
      .replace(/\r\n|\r/g, '\n')
      .replace(/'''[\s\S]*?'''|"""[\s\S]*?"""/g, m => m.replace(/[^\n]/g, ' '))
      .replace(/(['"])(?:\\.|(?!\1).)*\1/g, m => m.replace(/[^\n]/g, ' '))
      .replace(/#[^\n]*/g, '');
  }
}

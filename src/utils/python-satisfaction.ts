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
import {
  NODE_MODULES,
  PACKAGE_JSON,
  PythonProject,
  VENV,
} from './python-project';

/** Files whose presence alone declares a Python test runner. */
const TEST_RUNNER_FILES = ['pytest.ini', 'tox.ini', 'noxfile.py'];

/**
 * A Python test runner declared in project config: a pytest section, a tox/nox
 * env, or a runner named in a dependency list or a `test` script
 * (`"test": "uv run pytest"` — package.json is part of the gate config).
 */
const PY_TEST_CONFIG =
  /\[tool\.pytest\.ini_options\]|\[tool:pytest\]|\[pytest\]|\[testenv|\bpytest\b|\bunittest\b|\bnox\b|\btox\b/i;

export class PythonSatisfaction extends PythonProject {
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
    const apiTestDirs = glob.sync(
      '**/tests/**/{api,routes,endpoints}/**/*.py',
      {
        cwd: projectRoot,
        ignore: [NODE_MODULES, VENV],
      }
    );
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
      ['ruff.toml', '.ruff.toml', '.flake8', '.pylintrc', 'mypy.ini'].some(
        rel => FileUtils.exists(PathOperations.join(projectRoot, rel))
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

  /**
   * Does the Python code query a database? Proved by a query in a Python
   * source, not by a word in the manifests: the text of package.json,
   * pyproject.toml or a Makefile matched `firestore` in a plugin name or a
   * deploy script, and a project with no query was judged for indexes and
   * pagination (#555). JS/TS use is proved by the law itself (an import of a
   * database module).
   */
  static hasDatabaseLayer(projectRoot: string): boolean {
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

  /** Forward-slash, lower-cased path (Windows checkouts included). */
  private static normalize(file: string): string {
    return file.replace(/\\/g, '/').toLowerCase();
  }
}

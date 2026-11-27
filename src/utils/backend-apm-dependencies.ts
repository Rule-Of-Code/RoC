/**
 * Backend performance monitoring, read from the packages a project declares
 * (#12, b4). It was a word search: `\bsentry\b`, `datadog`, `statsd` … over
 * the text of package.json, pyproject.toml, the Makefile and other gate files
 * plus requirements.txt. So a frontend with `@sentry/react` — or a script
 * named "sentry:upload" — counted as a service with an APM. Now only a
 * declared dependency's NAME counts:
 *
 * - Python: every manifest `declaredPythonDependencies` reads (requirements,
 *   pyproject, Pipfile, setup.*), PEP 503 names;
 * - Node: the root package.json's dependencies and devDependencies.
 *
 * The names are the words the search used, now matched against a package
 * name. Browser SDKs and the build tooling of a frontend do not count here:
 * a frontend earns its credit on its own path (the Sentry browser SDK list,
 * Web Vitals, a performance tracing init).
 */

import { ProjectTypeDetectorValidation } from './config/project-type-detector/project-type-detector-validation';
import { declaredPythonDependencies } from './python-dependencies';
import { SENTRY_BROWSER_SDKS } from './sentry-browser-sdks';

/** The words of the former search, as Python distribution names (PEP 503). */
const PYTHON_APM = new Set([
  'sentry-sdk',
  'prometheus-client',
  'opentracing',
  'ddtrace',
  'datadog',
  'statsd',
  'newrelic',
  'elastic-apm',
  'py-spy',
  'scout-apm',
]);
const PYTHON_APM_PREFIX = 'opentelemetry-';

/** The same words, found in a Node package name. */
const NODE_APM =
  /(?:^|[@/_-])(?:prometheus|opentelemetry|opentracing|sentry|datadog|ddtrace|statsd|newrelic|elastic-apm)(?:$|[/_-])/i;
/** A browser SDK, an agent for the browser, or frontend build tooling: not a service's APM. */
const NOT_BACKEND = /browser|^@sentry\/(?:cli|.+-plugin)$/i;

function isNodeApm(name: string): boolean {
  return (
    NODE_APM.test(name) &&
    !NOT_BACKEND.test(name) &&
    !SENTRY_BROWSER_SDKS.includes(name)
  );
}

function isPythonApm(name: string): boolean {
  return PYTHON_APM.has(name) || name.startsWith(PYTHON_APM_PREFIX);
}

/** The backend APM / metrics packages the project declares, Python then Node. */
export function backendApmDependencies(projectRoot: string): string[] {
  const python = [...declaredPythonDependencies(projectRoot)].filter(
    isPythonApm
  );
  const node = Object.keys(
    ProjectTypeDetectorValidation.getProjectDependencies(projectRoot)
  ).filter(isNodeApm);
  return [...python.sort(), ...node.sort()];
}

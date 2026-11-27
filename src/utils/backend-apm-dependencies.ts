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
 * Both are allowlists of server-side APM / metrics / tracing packages. Any
 * other package — a browser or mobile SDK, a meta-framework SDK, types, build
 * tooling — gives no backend credit: a frontend earns its credit on its own
 * path (the Sentry browser SDK list, Web Vitals, a tracing init).
 */

import { ProjectTypeDetectorValidation } from './config/project-type-detector/project-type-detector-validation';
import { declaredPythonDependencies } from './python-dependencies';

/** Python APM / metrics distributions (PEP 503 names), the words of the former search. */
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

/**
 * Node server-side APM / metrics / tracing packages.
 *
 * - Sentry's server-side JavaScript SDKs, as its guides name them: @sentry/node
 *   ("Sentry for Node.js"), @sentry/bun, @sentry/deno, @sentry/aws-serverless
 *   (AWS Lambda), @sentry/google-cloud-serverless (Google Cloud Functions),
 *   @sentry/nestjs — https://docs.sentry.io/platforms/javascript/guides/<node|bun|deno|aws-lambda|gcp-functions|nestjs>/
 * - Other APM agents, by their npm descriptions: dd-trace ("Datadog APM tracing
 *   client for JavaScript"), prom-client ("Client for prometheus"), newrelic
 *   ("New Relic agent"), elastic-apm-node ("The official Elastic APM agent for
 *   Node.js"), @opentelemetry/sdk-node ("OpenTelemetry SDK for Node.js"),
 *   @opentelemetry/auto-instrumentations-node ("Metapackage which bundles
 *   opentelemetry node core and contrib instrumentations").
 *
 * Not listed: @opentelemetry/api ("Public API for OpenTelemetry"), which a
 * browser app uses as well.
 */
export const NODE_APM_PACKAGES: readonly string[] = [
  '@sentry/node',
  '@sentry/bun',
  '@sentry/deno',
  '@sentry/aws-serverless',
  '@sentry/google-cloud-serverless',
  '@sentry/nestjs',
  'dd-trace',
  'prom-client',
  'newrelic',
  'elastic-apm-node',
  '@opentelemetry/sdk-node',
  '@opentelemetry/auto-instrumentations-node',
];

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
  ).filter(name => NODE_APM_PACKAGES.includes(name));
  return [...python.sort(), ...node.sort()];
}

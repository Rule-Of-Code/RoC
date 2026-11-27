/**
 * #12 (b4) — backend performance monitoring is read from declared dependency
 * NAMES, not from words in a file (PythonSatisfaction
 * .hasBackendPerformanceMonitoring → backendApmDependencies). Its users:
 * Performance Monitoring Standards (monitoring tools, performance tracing)
 * and the Pre-Deployment checklist's performance clause.
 *
 * Credited: a Python service declaring an APM / metrics distribution in any
 * manifest; a Node service declaring one in package.json. Not credited: a
 * frontend's browser SDK or build plugin, a script name, a description, a
 * word in the Makefile.
 */
import { backendApmDependencies } from '../../src/utils/backend-apm-dependencies';
import { PythonSatisfaction } from '../../src/utils/python-satisfaction';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const manifest = (fields: Record<string, unknown>): string =>
  JSON.stringify({ name: 'app', version: '1.0.0', private: true, ...fields });

describe('#12 (b4): backend APM is a declared dependency', () => {
  it.each([
    [
      'Python: sentry-sdk in requirements.txt',
      { 'requirements.txt': 'flask==3.0.0\nsentry-sdk[flask]==2.19.0\n' },
      ['sentry-sdk'],
    ],
    [
      'Python: prometheus_client in pyproject (PEP 503 name)',
      {
        'pyproject.toml':
          '[project]\nname = "svc"\ndependencies = ["prometheus_client>=0.21"]\n',
      },
      ['prometheus-client'],
    ],
    [
      'Python: an OpenTelemetry distribution',
      { 'requirements.txt': 'opentelemetry-sdk==1.29.0\n' },
      ['opentelemetry-sdk'],
    ],
    [
      'Node: @sentry/node and newrelic',
      {
        'package.json': manifest({
          dependencies: { express: '^4.21.0', '@sentry/node': '^8.47.0' },
          devDependencies: { newrelic: '^12.0.0' },
        }),
      },
      ['@sentry/node', 'newrelic'],
    ],
    [
      'Node: an OpenTelemetry SDK',
      {
        'package.json': manifest({
          dependencies: { '@opentelemetry/sdk-node': '^0.57.0' },
        }),
      },
      ['@opentelemetry/sdk-node'],
    ],
  ])('%s → credited', (_name, files, expected) => {
    const root = project(files as Record<string, string>);
    expect(backendApmDependencies(root)).toEqual(expected);
    expect(PythonSatisfaction.hasBackendPerformanceMonitoring(root)).toBe(true);
  });

  it.each([
    [
      'a frontend with Sentry browser SDKs',
      {
        'package.json': manifest({
          dependencies: {
            vue: '^3.5.13',
            '@sentry/vue': '^8.47.0',
            '@sentry/react': '^8.47.0',
            '@sentry/nextjs': '^8.47.0',
          },
        }),
      },
    ],
    [
      'browser agents and Sentry build tooling',
      {
        'package.json': manifest({
          dependencies: { '@datadog/browser-rum': '^5.35.0' },
          devDependencies: {
            '@sentry/vite-plugin': '^2.22.0',
            '@sentry/cli': '^2.39.0',
          },
        }),
      },
    ],
    [
      'decoy: "sentry" and "datadog" only in a script name and the description',
      {
        'package.json': manifest({
          description: 'Ships metrics to Datadog and errors to Sentry',
          scripts: { 'sentry:upload': 'echo upload', statsd: 'echo statsd' },
          dependencies: { express: '^4.21.0' },
        }),
      },
    ],
    [
      'decoy: "statsd" and "newrelic" only in the Makefile',
      {
        'package.json': manifest({ dependencies: { express: '^4.21.0' } }),
        Makefile: 'metrics:\n\techo statsd newrelic\n',
      },
    ],
  ])('%s → not credited', (_name, files) => {
    const root = project(files as Record<string, string>);
    expect(backendApmDependencies(root)).toEqual([]);
    expect(PythonSatisfaction.hasBackendPerformanceMonitoring(root)).toBe(
      false
    );
  });
});

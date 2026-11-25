/**
 * What Health Check Monitoring reads: whether a project serves anything at
 * all, and what its code and manifests say about health endpoints, probes
 * and monitoring.
 */
import type { RuleOfCodeConfig } from '../../config/types';
import { PathOperations } from '../../utils';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { FileUtils } from '../../utils/file-utils';
import { PathResolver } from '../../utils/path-resolver';
import { PythonSatisfaction } from '../../utils/python-satisfaction';

/**
 * Does this project SERVE anything?
 *
 * Health endpoints, database probes and dependency checks are properties of a
 * service. A browser client — Angular, React, an Ionic app — exposes no
 * endpoint and connects to no database, so every sub-check here was a demand
 * it could not meet. The evidence for "service" is a server framework in the
 * dependencies, a Python web stack, a container that exposes a port, or a
 * deployment manifest.
 */
export function projectIsAService(projectRoot: string): boolean {
  // NOT a signal: a file named `health.ts`.
  //
  // This check used to return true the moment one existed, on the reasoning
  // that a project carrying health-check substrate had answered the question
  // itself. It had not. A browser client that calls `GET /api/health` and
  // interprets the response keeps its readiness probe in exactly such a file —
  // and was then told to expose an endpoint, own a database connection and
  // declare Kubernetes probes, none of which a browser can do. The shortcut
  // traded one false positive for another and wrote down the reasoning as if
  // it were a safeguard.
  //
  // Every genuine service is still caught below, by evidence of serving: a web
  // framework, a process declaration, a container that opens a port, or a
  // deployment manifest.
  if (hasPythonWebStack(projectRoot)) return true;

  // Frameworks that run APPLICATION code behind a port. `http-server` and its
  // kin are deliberately absent: they serve pre-built files and nothing else,
  // so a static bundle handed to one has no endpoint of its own to probe, no
  // database, and nothing for a liveness check to mean.
  const SERVER_DEPS = [
    'express',
    'fastify',
    '@nestjs/core',
    'koa',
    'hapi',
    '@hapi/hapi',
    'restify',
    'apollo-server',
    '@apollo/server',
    'next',
    'nuxt',
  ];
  const pkg = ProjectTypeDetector.getPackageJson(projectRoot) as {
    dependencies?: Record<string, unknown>;
    devDependencies?: Record<string, unknown>;
  } | null;
  // RUNTIME dependencies only. A framework in devDependencies is tooling —
  // a local preview server, a fixture in a test harness — and a project does
  // not ship it. Matching both lists made any repository that serves its own
  // build for an end-to-end run look like a backend, and then asked a static
  // bundle for database and Kubernetes probes.
  if (pkg?.dependencies) {
    const runtimeDeps = pkg.dependencies;
    if (SERVER_DEPS.some(dependency => runtimeDeps[dependency])) return true;
  }

  // A container that opens a port, or a deployment manifest, is a service too.
  const dockerfile = PathOperations.join(projectRoot, 'Dockerfile');
  if (
    FileUtils.exists(dockerfile) &&
    /^\s*EXPOSE\s+\d+/im.test(FileUtils.readFile(dockerfile))
  ) {
    return true;
  }

  // A Procfile declares long-running processes by name; a `web:` entry is a
  // server by definition.
  const procfile = PathOperations.join(projectRoot, 'Procfile');
  if (
    FileUtils.exists(procfile) &&
    /^\s*web\s*:/im.test(FileUtils.readFile(procfile))
  ) {
    return true;
  }

  return ['k8s', 'kubernetes', 'helm', 'deploy'].some(dir =>
    FileUtils.exists(PathOperations.join(projectRoot, dir))
  );
}

/**
 * A Python project that actually serves HTTP.
 *
 * `isPython()` alone used to stand in for this, which made every Python
 * project a service — a CLI, a library, a batch job. The manifest names the
 * web stack when there is one.
 */
export function hasPythonWebStack(projectRoot: string): boolean {
  if (!PythonSatisfaction.isPython(projectRoot)) return false;

  // Read the manifests' CONTENT. `projectManifest()` returns the file name,
  // not what is in it.
  const manifests = [
    'pyproject.toml',
    'requirements.txt',
    'requirements/base.txt',
    'setup.py',
    'setup.cfg',
    'Pipfile',
    'poetry.lock',
  ];
  const declared = manifests
    .map(name => {
      const path = PathOperations.join(projectRoot, name);
      return FileUtils.exists(path) ? FileUtils.readFile(path) : '';
    })
    .join('\n');

  return /\b(?:fastapi|flask|django|starlette|uvicorn|gunicorn|aiohttp|tornado|sanic|bottle|falcon|quart)\b/i.test(
    declared
  );
}

/** Does the code route a health, status, ping, alive or ready endpoint? */
export function hasHealthEndpointConfiguration(content: string): boolean {
  const healthEndpointPatterns = [
    /\/health/i,
    /\/status/i,
    /\/ping/i,
    /\/alive/i,
    /\/ready/i,
    /health.*endpoint/i,
    /status.*endpoint/i,
  ];

  return healthEndpointPatterns.some(pattern => pattern.test(content));
}

/** How much a health endpoint reports: dependencies, timings, metrics. */
export function assessHealthEndpointQuality(content: string): string {
  const qualityIndicators = [
    /database.*health/i,
    /external.*service/i,
    /dependency.*check/i,
    /detailed.*status/i,
    /response.*time/i,
    /health.*metrics/i,
  ];

  const matches = qualityIndicators.filter(pattern =>
    pattern.test(content)
  ).length;

  if (matches >= 4) return 'comprehensive';
  if (matches >= 2) return 'good';
  return 'basic';
}

/** Does a manifest declare liveness, readiness or startup probes? */
export function hasKubernetesHealthProbes(content: string): boolean {
  const k8sProbePatterns = [
    /livenessProbe/i,
    /readinessProbe/i,
    /startupProbe/i,
    /healthz/i,
    /livez/i,
    /readyz/i,
  ];

  return k8sProbePatterns.some(pattern => pattern.test(content));
}

/** Does the text wire monitoring: Prometheus, Grafana, metrics, alerting? */
export function hasMonitoringIntegration(content: string): boolean {
  const monitoringPatterns = [
    /prometheus/i,
    /grafana/i,
    /metrics/i,
    /monitoring/i,
    /alerting/i,
    /observability/i,
  ];

  return monitoringPatterns.some(pattern => pattern.test(content));
}

/** Does an app, server, routes or module file route a health endpoint? */
export async function checkRouteFilesForHealthEndpoints(
  projectRoot: string,
  config?: RuleOfCodeConfig
): Promise<{
  found: boolean;
}> {
  let routeFiles: string[];
  if (config?.pathMappings) {
    const resolver = PathResolver.create(config, projectRoot);
    const [mainTsPaths, appModulePaths] = await Promise.all([
      resolver.getMainTsPaths(),
      resolver.getAppModulePaths(),
    ]);
    routeFiles = [
      PathOperations.join(projectRoot, 'src/app.ts'),
      ...mainTsPaths,
      PathOperations.join(projectRoot, 'src/server.ts'),
      PathOperations.join(projectRoot, 'src/routes/index.ts'),
      ...appModulePaths,
    ];
  } else {
    routeFiles = [
      PathOperations.join(projectRoot, 'src/app.ts'),
      PathOperations.join(projectRoot, 'src/main.ts'),
      PathOperations.join(projectRoot, 'src/server.ts'),
      PathOperations.join(projectRoot, 'src/routes/index.ts'),
      PathOperations.join(projectRoot, 'src/app/app.module.ts'),
    ];
  }

  for (const filePath of routeFiles) {
    if (FileUtils.exists(filePath)) {
      try {
        const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
        if (hasHealthEndpointConfiguration(content)) {
          return { found: true };
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }
  }

  return { found: false };
}

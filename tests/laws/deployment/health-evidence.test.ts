/**
 * What Health Check Monitoring reads, tested where the readers live: whether
 * a project serves anything, and what its text says about health.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  assessHealthEndpointQuality,
  checkRouteFilesForHealthEndpoints,
  hasHealthEndpointConfiguration,
  hasKubernetesHealthProbes,
  hasMonitoringIntegration,
  projectIsAService,
} from '../../../src/laws/deployment/health-evidence';
import { makeTempDir, removeTempDirs } from '../../helpers/temp-dirs';

let dir: string;
const write = (file: string, text: string): void => {
  const full = path.join(dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
};

beforeEach(() => {
  dir = makeTempDir('health-evidence-');
});
afterEach(removeTempDirs);

describe('projectIsAService', () => {
  it('a server framework among the runtime dependencies is a service', () => {
    write(
      'package.json',
      JSON.stringify({ dependencies: { express: '4.0.0' } })
    );
    expect(projectIsAService(dir)).toBe(true);
  });

  it('the same framework as a devDependency is tooling, not a service', () => {
    write(
      'package.json',
      JSON.stringify({ devDependencies: { express: '4.0.0' } })
    );
    expect(projectIsAService(dir)).toBe(false);
  });

  it('a container that exposes a port is a service', () => {
    write('Dockerfile', 'FROM node:22\nEXPOSE 8080\n');
    expect(projectIsAService(dir)).toBe(true);
  });

  it('a file named health.ts alone is not evidence of serving', () => {
    write('src/health.ts', 'export const ping = () => fetch("/api/health");');
    expect(projectIsAService(dir)).toBe(false);
  });
});

describe('health text', () => {
  it('endpoints, probes and monitoring are told apart', () => {
    expect(hasHealthEndpointConfiguration("app.get('/health', ok)")).toBe(true);
    expect(hasHealthEndpointConfiguration('')).toBe(false);
    expect(hasKubernetesHealthProbes('livenessProbe:\n  httpGet:')).toBe(true);
    expect(hasKubernetesHealthProbes("app.get('/health')")).toBe(false);
    expect(hasMonitoringIntegration('prometheus scrape')).toBe(true);
  });

  it('an endpoint that reports dependencies and timings reads as good or better', () => {
    expect(assessHealthEndpointQuality('ok')).toBe('basic');
    expect(assessHealthEndpointQuality('database health, response time')).toBe(
      'good'
    );
    expect(
      assessHealthEndpointQuality(
        'database health, external service, dependency check, detailed status'
      )
    ).toBe('comprehensive');
  });

  it('a route file that serves /health is found; none at all is not', async () => {
    expect(await checkRouteFilesForHealthEndpoints(dir)).toEqual({
      found: false,
    });
    write(
      'src/server.ts',
      "app.get('/health', (_req, res) => res.send('ok'));"
    );
    expect(await checkRouteFilesForHealthEndpoints(dir)).toEqual({
      found: true,
    });
  });
});

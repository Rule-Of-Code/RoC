/**
 * #439 (Pre-Deployment Checklist) — the health-check clause passed on any code
 * file whose name contained "health", "status" or "ping": `order-status.ts`,
 * `status-bar.component.ts`, even `shopping-cart.ts` ("…ping…"). And a server
 * that serves `GET /healthz` from `server.ts` did not count. A health check is
 * a route that answers it, or a file named for it.
 */
import { PerformanceValidationChecker } from '../../src/laws/deployment/pre-deployment/performance-validator';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const healthConfigured = (files: Record<string, string>): boolean =>
  new PerformanceValidationChecker().checkMonitoringSetup(
    project({
      'package.json': JSON.stringify({ name: 'svc', version: '1.0.0' }),
      ...files,
    }),
    FileUtils.getMinimalDefaultConfig()
  ).healthChecksConfigured;

describe('#439 a health check is a route or a file named for it', () => {
  afterEach(removeProjects);

  it.each([
    ['src/order-status.ts', 'export type OrderStatus = "open" | "closed";'],
    ['src/app/status-bar.component.ts', 'export class StatusBarComponent {}'],
    ['src/shopping-cart.ts', 'export const cart: string[] = [];'],
  ])('does not take %s for a health check', (file, content) => {
    expect(healthConfigured({ [file]: content })).toBe(false);
  });

  it.each([
    [
      'src/server.ts',
      "app.get('/healthz', (_req, res) => res.send('ok'));",
      'an Express route in server.ts',
    ],
    [
      'src/app.controller.ts',
      "@Get('health')\nhealth() { return { ok: true }; }",
      'a Nest route',
    ],
    [
      'src/routes.ts',
      "router.get('/api/status', (_req, res) => res.json({ ok: true }));",
      'a status route under /api (Python services are read by PythonSatisfaction)',
    ],
    [
      'src/health.controller.ts',
      'export class HealthController {}',
      'a file named for it',
    ],
  ])('takes %s (%s)', (file, content) => {
    expect(healthConfigured({ [file]: content })).toBe(true);
  });
});

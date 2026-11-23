/**
 * #550 (and the API Security findings of the self-audit, #559) — API
 * Security Standards judged names and words, not code:
 *   - CORS: a file whose basename contains `server`, `main` or `app` and whose
 *     text matches `/express/i` anywhere (`ts.isExpressionStatement`, a law's
 *     prose about Express) without the word `cors` was "an Express server
 *     missing CORS configuration";
 *   - input validation: a file that uses `HttpClient` had to contain the word
 *     `validate`; a file that merely LISTS '@Injectable()' and 'HttpClient' in
 *     its pattern table was judged as a service making HTTP requests.
 * The rule (#426): a pattern counts where it starts in code, and a server is
 * an Express server when it imports express, not when a word appears.
 * (Authentication by file name is the #549 change: one detector for both.)
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ApiSecurityStandardsLaw } from '../../src/laws/security/api-security-standards';
import { FileUtils } from '../../src/utils/file-utils';
import * as tsxSource from '../../src/utils/react/tsx-source';

jest.mock('../../src/utils/react/tsx-source', () => {
  const actual = jest.requireActual('../../src/utils/react/tsx-source');
  return { ...actual, loadTypeScript: jest.fn(actual.loadTypeScript) };
});
const loadTypeScript = tsxSource.loadTypeScript as jest.MockedFunction<
  typeof tsxSource.loadTypeScript
>;
const realLoad = jest.requireActual<typeof tsxSource>(
  '../../src/utils/react/tsx-source'
).loadTypeScript;
// jest.config resets mocks before every test: give back the real loader.
beforeEach(() => loadTypeScript.mockImplementation(realLoad));

const config = FileUtils.getMinimalDefaultConfig();
const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-550-'));
  made.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'api-550', version: '1.0.0' })
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

async function violations(files: Record<string, string>): Promise<string[]> {
  const result = await ApiSecurityStandardsLaw.check({
    projectRoot: project(files),
    config,
  });
  return result.violations ?? [];
}

const CORS = /Express server missing CORS/;
const UNVALIDATED = /HTTP requests without proper validation/;

describe('#559/#550 CORS: an Express server is one that imports express', () => {
  it('a checker that walks `ts.isExpressionStatement` is not a server', async () => {
    const v = await violations({
      'src/checkers/next-server-support.ts': [
        "import type * as TS from 'typescript';",
        'export function statements(ts: typeof TS, node: TS.Node): number {',
        '  return ts.isExpressionStatement(node) ? 1 : 0;',
        '}',
        '',
      ].join('\n'),
    });
    expect(v.filter(x => CORS.test(x))).toEqual([]);
  });

  it('a law text that names Express is not a server', async () => {
    const v = await violations({
      'src/data/server-laws.ts': [
        'export const LIMITS = [',
        "  'Framework helpers that read the headers for you (Express req.ip) are not seen.',",
        '];',
        '',
      ].join('\n'),
    });
    expect(v.filter(x => CORS.test(x))).toEqual([]);
  });

  it('an Express server without CORS is still reported (control)', async () => {
    const v = await violations({
      'src/server.ts': [
        "import express from 'express';",
        'const app = express();',
        "app.get('/orders', (_req, res) => res.json([]));",
        'app.listen(3000);',
        '',
      ].join('\n'),
    });
    expect(v).toContainEqual(expect.stringMatching(CORS));
  });

  it('a server is a server whatever its file is called', async () => {
    const v = await violations({
      'src/routes/index.ts': [
        "import express from 'express';",
        'export const api = express();',
        "api.get('/orders', (_req, res) => res.json([]));",
        '',
      ].join('\n'),
    });
    expect(v).toContainEqual(
      'src/routes/index.ts: Express server missing CORS configuration'
    );
  });

  it('a comment that says cors configures nothing', async () => {
    const v = await violations({
      'src/server.ts': [
        "import express from 'express';",
        '// TODO: add cors before launch',
        'express().listen(3000);',
        '',
      ].join('\n'),
    });
    expect(v).toContainEqual(expect.stringMatching(CORS));
  });

  it('a server that uses the cors middleware is not reported (control)', async () => {
    const v = await violations({
      'src/server.ts': [
        "import express from 'express';",
        "import cors from 'cors';",
        'const app = express();',
        "app.use(cors({ origin: ['https://shop.prod-service.io'] }));",
        'app.listen(3000);',
        '',
      ].join('\n'),
    });
    expect(v.filter(x => CORS.test(x))).toEqual([]);
  });

  it('an Express router module is not a server (control)', async () => {
    const v = await violations({
      'src/app/orders.routes.ts': [
        "import { Router } from 'express';",
        'export const orders = Router();',
        "orders.get('/', (_req, res) => res.json([]));",
        '',
      ].join('\n'),
    });
    expect(v.filter(x => CORS.test(x))).toEqual([]);
  });
});

/** A repository that narrows an untyped response into typed values. */
const NARROWING_REPOSITORY = [
  "import { Injectable } from '@angular/core';",
  "import { HttpClient } from '@angular/common/http';",
  "import { map, Observable } from 'rxjs';",
  '',
  'export interface Order { id: string; total: number }',
  '',
  'function toOrder(raw: unknown): Order | null {',
  "  if (typeof raw !== 'object' || raw === null) return null;",
  '  const { id, total } = raw as Record<string, unknown>;',
  "  return typeof id === 'string' && typeof total === 'number' ? { id, total } : null;",
  '}',
  '',
  "@Injectable({ providedIn: 'root' })",
  'export class OrdersRepository {',
  '  constructor(private readonly http: HttpClient) {}',
  '  list(): Observable<Order[]> {',
  "    return this.http.get<unknown[]>('/api/orders').pipe(",
  '      map(rows => rows.map(toOrder).filter((o): o is Order => o !== null))',
  '    );',
  '  }',
  '}',
  '',
].join('\n');

describe('#550 input validation is not the word "validate"', () => {
  it('a response narrowed from unknown is validated', async () => {
    const v = await violations({
      'src/app/orders/orders.repository.ts': NARROWING_REPOSITORY,
    });
    expect(v.filter(x => UNVALIDATED.test(x))).toEqual([]);
  });

  it('a response parsed by a schema library is validated', async () => {
    const v = await violations({
      'src/app/orders/orders.service.ts': [
        "import { Injectable } from '@angular/core';",
        "import { HttpClient } from '@angular/common/http';",
        "import { z } from 'zod';",
        "import { map } from 'rxjs';",
        '',
        'const OrderSchema = z.object({ id: z.string(), total: z.number() });',
        '',
        "@Injectable({ providedIn: 'root' })",
        'export class OrdersService {',
        '  constructor(private readonly http: HttpClient) {}',
        "  list = () => this.http.get('/api/orders').pipe(map(r => z.array(OrderSchema).parse(r)));",
        '}',
        '',
      ].join('\n'),
    });
    expect(v.filter(x => UNVALIDATED.test(x))).toEqual([]);
  });

  it('the word validate in a comment is not validation', async () => {
    const v = await violations({
      'src/app/orders/orders.service.ts': [
        "import { Injectable } from '@angular/core';",
        "import { HttpClient } from '@angular/common/http';",
        '',
        '// TODO: validate the response',
        "@Injectable({ providedIn: 'root' })",
        'export class OrdersService {',
        '  constructor(private readonly http: HttpClient) {}',
        "  list = () => this.http.get<unknown>('/api/orders');",
        '}',
        '',
      ].join('\n'),
    });
    expect(v).toContainEqual(expect.stringMatching(UNVALIDATED));
  });

  it("a pattern table that lists '@Injectable()' and 'HttpClient' is not a service", async () => {
    const v = await violations({
      'src/utils/service-architecture-configuration.ts': [
        'export const PATTERNS = {',
        "  INJECTABLE_DECORATOR: '@Injectable',",
        "  HTTP_CLIENT: 'HttpClient',",
        '};',
        'export const MESSAGES = {',
        "  missingInjectable: 'Add @Injectable() decorator to service class in {fileName}',",
        '};',
        '',
      ].join('\n'),
    });
    expect(v.filter(x => UNVALIDATED.test(x))).toEqual([]);
  });
});

describe('#550 without the parser, servers and services are not judged', () => {
  it('says the files were not read instead of judging them by words', async () => {
    loadTypeScript.mockReturnValue(null);
    const v = await violations({
      'src/server.ts':
        "import express from 'express';\nexpress().listen(3000);\n",
    });
    expect(v.filter(x => CORS.test(x) || UNVALIDATED.test(x))).toEqual([]);
    expect(v).toContainEqual(expect.stringContaining('were NOT read'));
  });
});

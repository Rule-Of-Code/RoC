/**
 * #551 — API Testing Standards recognised an API test only by its file name
 * (`api.spec.ts`, `*.api.ts`, `request.spec.ts`, …). An Angular HTTP layer
 * tested in `*.repository.spec.ts` with `HttpTestingController`, or a server
 * tested with `supertest` in `server.spec.ts`, was "No API test files found".
 *
 * A test file is an API test when its code drives an HTTP test harness. The
 * name patterns stay one way in.
 */
import { UnitTestAPITestingAnalyzerService } from '../../src/laws/testing/unit-test-api-testing/services/api-testing-analyzer.service';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const apiTests = (files: Record<string, string>): string[] => {
  const root = project({
    'package.json': JSON.stringify({ name: 'fixture', version: '1.0.0' }),
    ...files,
  });
  return UnitTestAPITestingAnalyzerService.analyzeAPITestFiles(
    root,
    FileUtils.getMinimalDefaultConfig()
  )
    .testFiles.map(file => file.replace(/\\/g, '/').split('/').pop() ?? '')
    .sort();
};

const ANGULAR_HTTP_SPEC = [
  "import { TestBed } from '@angular/core/testing';",
  "import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';",
  "import { UserRepository } from './user.repository';",
  "describe('UserRepository', () => {",
  "  it('loads a user', () => {",
  '    const http = TestBed.inject(HttpTestingController);',
  "    TestBed.inject(UserRepository).load('1').subscribe();",
  "    http.expectOne('/users/1').flush({ id: '1' });",
  '  });',
  '});',
].join('\n');

const SUPERTEST_SPEC = [
  "import request from 'supertest';",
  "import { app } from './server';",
  "describe('GET /health', () => {",
  "  it('answers 200', async () => {",
  "    await request(app).get('/health').expect(200);",
  '  });',
  '});',
].join('\n');

const PLAIN_SPEC = [
  "import { sum } from './sum';",
  "describe('sum', () => {",
  "  it('adds', () => { expect(sum(1, 2)).toBe(3); });",
  '});',
].join('\n');

describe('#551 an API test is recognised by what its code drives', () => {
  afterEach(removeProjects);

  it('counts a repository spec that uses HttpTestingController', () => {
    expect(
      apiTests({ 'src/app/user.repository.spec.ts': ANGULAR_HTTP_SPEC })
    ).toEqual(['user.repository.spec.ts']);
  });

  it('counts a server spec that uses supertest', () => {
    expect(apiTests({ 'src/server.spec.ts': SUPERTEST_SPEC })).toEqual([
      'server.spec.ts',
    ]);
  });

  /** The controls: a name is still one way in, and a plain unit test is not an API test. */
  it('still counts a file named api.spec.ts', () => {
    expect(apiTests({ 'src/api.spec.ts': PLAIN_SPEC })).toEqual([
      'api.spec.ts',
    ]);
  });

  it('does not count a unit test that drives no HTTP harness', () => {
    expect(apiTests({ 'src/sum.spec.ts': PLAIN_SPEC })).toEqual([]);
  });

  it('does not count a source file that only uses HttpClient', () => {
    expect(
      apiTests({
        'src/app/user.repository.ts':
          "import { HttpClient, HttpTestingController } from '@angular/common/http';\nexport class UserRepository {}",
      })
    ).toEqual([]);
  });
});

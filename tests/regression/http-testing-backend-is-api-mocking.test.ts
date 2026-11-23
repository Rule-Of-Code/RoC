/**
 * #551 — API Testing Standards looked for API mocking only among the
 * declared dependencies (msw, nock, sinon, mirage). Angular's mock backend,
 * `HttpTestingController`, ships inside `@angular/common`, so a project whose
 * API tests answer every request with it was told "Consider implementing API
 * mocking with tools like MSW or nock" and lost 10 points: the same blind
 * spot as recognising API tests by file name — the harness was not read.
 */
import { APITestingStandardsLaw } from '../../src/laws/testing/api-testing-standards';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const MOCKING_SUGGESTION = /Consider implementing API mocking/;

const suggestsMocking = (spec: string[]): boolean => {
  const root = project({
    'package.json': JSON.stringify({
      name: 'fixture',
      version: '1.0.0',
      dependencies: { '@angular/core': '18.0.0', '@angular/common': '18.0.0' },
      devDependencies: { jest: '^29.0.0' },
    }),
    'src/app/user.repository.spec.ts': spec.join('\n'),
  });
  const result = APITestingStandardsLaw.check({
    projectRoot: root,
    config: FileUtils.getMinimalDefaultConfig(),
  });
  return (result.suggestions ?? []).some(s => MOCKING_SUGGESTION.test(s));
};

describe('#551 a mock HTTP backend in the API tests is API mocking', () => {
  afterEach(removeProjects);

  it('does not ask for MSW or nock when the API tests use HttpTestingController', () => {
    expect(
      suggestsMocking([
        "import { TestBed } from '@angular/core/testing';",
        "import { HttpTestingController } from '@angular/common/http/testing';",
        "describe('UserRepository', () => {",
        "  it('loads a user', () => {",
        '    const http = TestBed.inject(HttpTestingController);',
        "    http.expectOne('/users/1').flush({ id: '1' });",
        '  });',
        '});',
      ])
    ).toBe(false);
  });

  /** The control: supertest sends real requests in process; it is not a mock. */
  it('still asks for mocking when the API tests only use supertest', () => {
    expect(
      suggestsMocking([
        "import request from 'supertest';",
        "import { app } from './server';",
        "describe('GET /health', () => {",
        "  it('answers 200', async () => {",
        "    await request(app).get('/health').expect(200);",
        '  });',
        '});',
      ])
    ).toBe(true);
  });
});

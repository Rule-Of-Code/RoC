import path from 'path';

import { HttpTestHarness } from '../../../src/utils/testing/http-test-harness';
import { project, removeProjects } from '../../checkers/toolkit-fixture';

/** #551 — an API test is a test file whose code drives an HTTP test harness. */
describe('HttpTestHarness.drives', () => {
  afterEach(removeProjects);

  const drives = (name: string, lines: string[]): boolean => {
    const root = project({ [name]: lines.join('\n') });
    return HttpTestHarness.drives(path.join(root, name));
  };

  it.each([
    [["import request from 'supertest';"], 'a supertest import'],
    [["const nock = require('nock');"], 'a nock require'],
    [["const { setupServer } = await import('msw/node');"], 'an msw import()'],
    [
      ['const http = TestBed.inject(HttpTestingController);'],
      'HttpTestingController',
    ],
    [
      [
        'TestBed.configureTestingModule({ providers: [provideHttpClientTesting()] });',
      ],
      'provideHttpClientTesting',
    ],
  ])('takes %s (%s) for a harness', lines => {
    expect(drives('src/x.spec.ts', lines)).toBe(true);
  });

  it('does not read a harness named in a fixture string or a comment', () => {
    expect(
      drives('src/detector.spec.ts', [
        '// HttpTestingController is what the detector looks for',
        'expect(detect("import request from \'supertest\';")).toBe(true);',
        "expect(detect('TestBed.inject(HttpTestingController)')).toBe(true);",
      ])
    ).toBe(false);
  });

  it('does not read a file that is not a test', () => {
    expect(drives('src/server.ts', ["import request from 'supertest';"])).toBe(
      false
    );
  });

  it('keeps its patterns stateless', () => {
    expect(HttpTestHarness.HARNESS_MODULE.global).toBe(false);
    expect(HttpTestHarness.HARNESS_CALL.global).toBe(false);
    expect(HttpTestHarness.TEST_FILE.global).toBe(false);
  });
});

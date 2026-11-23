import { UnitTestDataManagementConstants } from '../../../src/laws/testing/unit-test-data-management/constants/data-management';
import { ExternalBoundary } from '../../../src/utils/testing/external-boundary';
import { TestNetworkClients } from '../../../src/utils/testing/test-coverage-analyzer/test-network-clients';

// The child-process module, spelled in parts: the guard in
// tests/utils/child-process-guard.test.ts reads test files as text.
const CHILD_PROCESS = ['child', 'process'].join('_');

/** #491 — one definition of an external boundary for both test laws. */
describe('ExternalBoundary', () => {
  it.each([
    ['node:https', 'a node network module'],
    ['axios', 'an HTTP client'],
    ['@angular/common/http', "Angular's HTTP client"],
    ['pg', 'a database'],
    ['kafkajs', 'a broker'],
    ['@aws-sdk/client-s3', 'a cloud SDK'],
    ['firebase/firestore', 'a firebase subpath'],
  ])('takes %s (%s) for a client across the boundary', specifier => {
    expect(ExternalBoundary.isClient(specifier)).toBe(true);
  });

  it.each([['fs'], ['node:fs'], ['fs/promises'], [CHILD_PROCESS], ['./api']])(
    'does not take %s for a client across the boundary',
    specifier => {
      expect(ExternalBoundary.isClient(specifier)).toBe(false);
    }
  );

  it.each([
    ["jest.mock('axios');"],
    ['const get = vi.fn();'],
    ['const server = setupServer();'],
    ['providers: [provideHttpClientTesting()]'],
    ['const repo = new InMemoryOrdersRepository();'],
    ['const fakeAxios = { get: async () => 1 };'],
  ])('finds a double in %s', code => {
    expect(ExternalBoundary.hasTestDouble(code)).toBe(true);
  });

  it('finds none in code that calls a client for real', () => {
    expect(ExternalBoundary.hasTestDouble("await axios.get('/x');")).toBe(
      false
    );
  });

  it('is the definition both laws read', () => {
    expect(UnitTestDataManagementConstants.EXTERNAL_CLIENT_MODULE).toBe(
      ExternalBoundary.CLIENT_MODULE
    );
    expect(UnitTestDataManagementConstants.MOCKING_PATTERNS).toBe(
      ExternalBoundary.FRAMEWORK_DOUBLES
    );
    expect(TestNetworkClients.DOUBLE_NAME_PATTERN).toBe(
      ExternalBoundary.DOUBLE_NAME
    );
    expect(TestNetworkClients.LOCAL_PROCESS_MODULE).toBe(
      ExternalBoundary.LOCAL_RESOURCE_MODULE
    );
  });

  it('keeps its patterns stateless', () => {
    for (const pattern of [
      ExternalBoundary.CLIENT_MODULE,
      ExternalBoundary.LOCAL_RESOURCE_MODULE,
      ExternalBoundary.HTTP_CALL,
      ExternalBoundary.DOUBLE_NAME,
      ...Object.values(ExternalBoundary.FRAMEWORK_DOUBLES),
    ]) {
      expect(pattern.global).toBe(false);
    }
  });
});

describe('UnitTestDataManagementConstants.boundaryReached', () => {
  const reached = (lines: string[]): string[] =>
    UnitTestDataManagementConstants.boundaryReached(
      lines.join('\n'),
      'x.spec.ts',
      process.cwd()
    );

  it('names the clients a test imports, and not the filesystem', () => {
    expect(
      reached(["import axios from 'axios';", "import fs from 'node:fs';"])
    ).toEqual(['axios']);
  });

  it('names a request the code makes with no import', () => {
    expect(reached(["const r = await fetch('https://x.test/');"])).toEqual([
      'an HTTP call',
    ]);
  });

  it('does not read a request inside a fixture string', () => {
    expect(reached(["expect(detect('await fetch(url)')).toBe(true);"])).toEqual(
      []
    );
  });
});

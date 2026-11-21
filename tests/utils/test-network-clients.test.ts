/**
 * TestNetworkClients — what Unit Test Quality's mocking checks read of a
 * test file (#429): the network and service clients it loads, from its
 * syntax tree, and whether its code holds a double.
 */
import ts from 'typescript';

import { TestNetworkClients } from '../../src/utils/testing/test-coverage-analyzer/test-network-clients';

// The child-process module, spelled in parts: the guard in
// tests/utils/child-process-guard.test.ts reads test files as text and
// would take this fixture string for an import of it.
const CHILD_PROCESS = ['child', 'process'].join('_');

describe('TestNetworkClients', () => {
  describe('LOCAL_PROCESS_MODULE', () => {
    it.each(['fs', 'node:fs', 'fs/promises', 'child_process'])(
      'reads %s as a local process boundary',
      specifier => {
        expect(TestNetworkClients.LOCAL_PROCESS_MODULE.test(specifier)).toBe(
          true
        );
      }
    );

    it('does not read a network module as local', () => {
      expect(TestNetworkClients.LOCAL_PROCESS_MODULE.test('http')).toBe(false);
    });
  });

  describe('imported', () => {
    const clients = (content: string): string[] =>
      TestNetworkClients.imported(ts, content, 'x.test.ts');

    it('names the network and service clients a test loads', () => {
      expect(
        clients(
          [
            "import axios from 'axios';",
            "import { Pool } from 'pg';",
            "const https = require('node:https');",
            "const s3 = await import('@aws-sdk/client-s3');",
          ].join('\n')
        )
      ).toEqual(['axios', 'pg', 'node:https', '@aws-sdk/client-s3']);
    });

    it('does not count the code under test, fs, child_process or other packages', () => {
      expect(
        clients(
          [
            "import { audit } from '../src/audit';",
            "import fs from 'fs';",
            `import { execFileSync } from '${CHILD_PROCESS}';`,
            "import ts from 'typescript';",
            'TestBed.configureTestingModule({ providers: [inject(Svc)] });',
          ].join('\n')
        )
      ).toEqual([]);
    });

    it('does not count a type-only import, or a client named in a string or comment', () => {
      expect(
        clients(
          [
            "import type { AxiosInstance } from 'axios';",
            "// import axios from 'axios';",
            'const fixture = "import { Pool } from \'pg\';";',
          ].join('\n')
        )
      ).toEqual([]);
    });
  });

  describe('hasTestDouble', () => {
    it.each([
      "jest.mock('axios');",
      'const spy = jest.spyOn(api, "get");',
      'const fakeClient = { get: () => Promise.resolve(1) };',
      'TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });',
    ])('recognises a double in %s', code => {
      expect(TestNetworkClients.hasTestDouble(code)).toBe(true);
    });

    it('finds none in code that calls a client for real', () => {
      expect(
        TestNetworkClients.hasTestDouble('const r = await axios.get("");')
      ).toBe(false);
    });
  });
});

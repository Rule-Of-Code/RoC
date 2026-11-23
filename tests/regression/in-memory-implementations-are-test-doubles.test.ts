/**
 * #29 — Unit Test Quality and Test Data Management asked for mocks in suites
 * that use a real in-memory implementation instead: an `InMemory…Service`
 * that runs the same code as production with a different environment. A
 * mock of it would assert against a hand-written table that can drift; the
 * in-memory implementation is the stronger double.
 *
 * Since #310 and #429 a test that loads only the code under test is not
 * judged at all (locked below). What is left: a test that loads a client and
 * replaces it with a double named by its role — `InMemory…`, `Fake…`,
 * `Stub…` — is a test with a double, for both laws.
 */
import { removeProjects } from '../checkers/toolkit-fixture';
import { mockingVerdict } from './external-boundary-fixture';

const NO_DOUBLE_ASKED = { unitTestQuality: false, testDataManagement: false };

describe('#29 a real in-memory implementation is a test double', () => {
  afterEach(removeProjects);

  /** Locked: the case of the original report, fixed by #310 and #429. */
  it('asks nothing of a test that injects a local in-memory implementation', async () => {
    expect(
      await mockingVerdict({
        'src/app/launch.page.spec.ts': [
          "import { LaunchPage } from './launch.page';",
          "import { InMemoryPlatformCapabilityService } from '../testing/in-memory-platform-capability.service';",
          "describe('LaunchPage', () => {",
          "  it('offers the camera where the matrix allows it', () => {",
          "    const capabilities = new InMemoryPlatformCapabilityService('ios');",
          '    expect(new LaunchPage(capabilities).canScan()).toBe(true);',
          '  });',
          '});',
        ],
      })
    ).toEqual(NO_DOUBLE_ASKED);
  });

  it.each([['InMemoryFirestore'], ['FakeFirestore'], ['StubFirestore']])(
    'takes %s, provided in place of a client the test loads, for a double',
    async double => {
      expect(
        await mockingVerdict({
          'src/app/orders.repository.spec.ts': [
            "import { TestBed } from '@angular/core/testing';",
            "import { Firestore } from 'firebase/firestore';",
            `import { ${double} } from '../testing/firestore.double';`,
            "import { OrdersRepository } from './orders.repository';",
            "describe('OrdersRepository', () => {",
            "  it('lists the orders of a user', async () => {",
            '    TestBed.configureTestingModule({',
            `      providers: [{ provide: Firestore, useValue: new ${double}() }],`,
            '    });',
            "    expect(await TestBed.inject(OrdersRepository).list('u1')).toEqual([]);",
            '  });',
            '});',
          ],
        })
      ).toEqual(NO_DOUBLE_ASKED);
    }
  );

  /** The red control: the client loaded and no double of any kind in place. */
  it('still asks for a double when the client is used for real', async () => {
    expect(
      await mockingVerdict({
        'src/app/orders.repository.spec.ts': [
          "import { getFirestore } from 'firebase/firestore';",
          "import { OrdersRepository } from './orders.repository';",
          "describe('OrdersRepository', () => {",
          "  it('lists the orders of a user', async () => {",
          "    expect(await new OrdersRepository(getFirestore()).list('u1')).toEqual([]);",
          '  });',
          '});',
        ],
      })
    ).toEqual({ unitTestQuality: true, testDataManagement: true });
  });
});

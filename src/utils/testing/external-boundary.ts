import { FixtureIsolation } from './fixture-isolation';

/**
 * What a test reaches outside its own process, and what stands in for it
 * (#491). One definition for Unit Test Quality and Test Data Management:
 * both ask whether a test reaches a boundary with no double in place, and
 * they answered it from two tables, so the same test was "external data"
 * for one law and "no external dependency" for the other.
 *
 * A boundary is something a test cannot run for real on its own machine
 * without depending on the world: a network, or a service the test does not
 * own. The filesystem and a child process are not on it: a test that builds
 * a temp-dir fixture or spawns the CLI it ships is an integration test by
 * design, and a double there would remove the very thing it checks. Measured
 * before the change: taking them off Test Data Management's table changed no
 * finding in this repository or in a large Angular app.
 */
export class ExternalBoundary {
  /** Node's own network modules. Reason: they open sockets. */
  private static readonly NODE_NETWORK =
    '^(?:node:)?(?:http|https|http2|net|tls|dgram|dns)$';

  /** HTTP and socket clients. Reason: they reach a network. */
  private static readonly NETWORK_CLIENTS =
    '^(?:axios|node-fetch|cross-fetch|got|superagent|undici|ky|ws|socket\\.io-client|nodemailer|@angular\\/common\\/http)$';

  /** Databases and brokers. Reason: a shared service the test does not own. */
  private static readonly SHARED_SERVICES =
    '^(?:pg|mysql|mysql2|mongodb|mongoose|redis|ioredis|sequelize|typeorm|knex|@prisma\\/client|kafkajs|amqplib)$';

  /** Cloud SDKs. Reason: a hosted service, reached over the network. */
  private static readonly CLOUD_SERVICES =
    '^(?:firebase|firebase-admin|@supabase\\/supabase-js)$|^(?:@aws-sdk|@google-cloud|@azure)\\/|^firebase\\/';

  /**
   * A module specifier, matched whole, whose import means the test reaches
   * a boundary.
   */
  static readonly CLIENT_MODULE = new RegExp(
    [
      this.NODE_NETWORK,
      this.NETWORK_CLIENTS,
      this.SHARED_SERVICES,
      this.CLOUD_SERVICES,
    ].join('|')
  );

  /**
   * Local resources a unit test may use for real: the filesystem and a
   * child process. Not a boundary (see above); named so a reader sees they
   * were decided, not forgotten.
   */
  static readonly LOCAL_RESOURCE_MODULE =
    /^(?:node:)?(?:fs|fs\/promises|child_process)$/;

  /** A request the test's own code makes, with no import to name it. */
  static readonly HTTP_CALL =
    /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\s*\(|\b(?:axios|got|superagent|https?|httpClient|HttpClient|apiClient)\s*\.\s*(?:get|post|put|patch|delete|del|request|head|options)\s*(?:<[^>]*>\s*)?\(/;

  /** Doubles made by a mocking framework or a network interceptor. */
  static readonly FRAMEWORK_DOUBLES = {
    JEST_MOCK: /jest\.mock|jest\.spyOn/,
    SINON_MOCK: /sinon\./,
    SPY_ON: /spyOn/,
    CREATE_MOCK: /createMock/,
    VI_MOCK: /vi\.mock/,
    // The ordinary ways browser globals get mocked: Object.defineProperty
    // with a jest.fn() over localStorage, Document or matchMedia.
    JEST_FN: /jest\.fn\(/,
    VI_FN: /\bvi\.fn\(/,
    MOCK_IMPL:
      /mockImplementation|mockReturnValue|mockResolvedValue|mockRejectedValue/,
    DEFINE_PROPERTY: /Object\.defineProperty/,
    // Network doubles that intercept requests instead of replacing a module.
    NETWORK_DOUBLE: /\bsetupServer\s*\(|\bnock\s*\(/,
  };

  /**
   * A hand-written double named by its role (`fakeClient`, `stubApi`,
   * `mockHttp`, `InMemoryFirestore`): a real in-memory implementation that
   * runs the production code with a different environment is a stronger
   * double than a mock of it (#29).
   */
  static readonly DOUBLE_NAME = /mock|spy|stub|fake|sinon|inmemory/i;

  /** Whether a module specifier names a client across the boundary. */
  static isClient(specifier: string): boolean {
    return this.CLIENT_MODULE.test(specifier);
  }

  /**
   * Whether the text of a test file holds a test double: a framework double,
   * Angular's HTTP testing backend, or a double named by its role.
   */
  static hasTestDouble(code: string): boolean {
    return (
      Object.values(this.FRAMEWORK_DOUBLES).some(pattern =>
        pattern.test(code)
      ) ||
      FixtureIsolation.replacesHttpBackend(code) ||
      this.DOUBLE_NAME.test(code)
    );
  }
}

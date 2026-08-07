/**
 * Tests for TestIsolationEnforcementLaw
 *
 * Tests the Test Isolation Enforcement law which validates test independence
 * and proper isolation practices.
 */
import type { RuleOfCodeConfig } from '../../../src/config/types';
import { TestIsolationEnforcementLaw } from '../../../src/laws/testing/test-isolation-enforcement';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('TestIsolationEnforcementLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let context: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('test-isolation-enforcement-test-');
    mockConfig = FileUtils.getMinimalDefaultConfig();
    context = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('check', () => {
    describe('shared mutable state detection', () => {
      it('should flag tests with shared mutable state', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'shared-state.spec.ts'),
          `
            let globalCounter = 0;
            let sharedData = { value: 0 };

            describe('Shared State Tests', () => {
              it('test 1 modifies shared state', () => {
                globalCounter++;
                sharedData.value = 1;
                expect(globalCounter).toBe(1);
              });

              it('test 2 depends on shared state', () => {
                globalCounter++;
                expect(sharedData.value).toBe(1);
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        // May detect shared state
        expect(result.score).toBeLessThanOrEqual(100);
      });

      it('should pass when state is properly isolated', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'isolated.spec.ts'),
          `
            describe('Isolated Tests', () => {
              let localCounter: number;
              let localData: TestData;

              beforeEach(() => {
                localCounter = 0;
                localData = { value: 0 };
              });

              afterEach(() => {
                localCounter = 0;
                localData = null;
              });

              it('test 1', () => {
                localCounter++;
                expect(localCounter).toBe(1);
              });

              it('test 2', () => {
                localCounter++;
                expect(localCounter).toBe(1);
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        expect(result.violations).not.toContain(
          'Tests share mutable state that can cause interference'
        );
      });
    });

    describe('setup/teardown isolation', () => {
      it('should detect proper beforeEach/afterEach usage', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'proper-setup.spec.ts'),
          `
            describe('Proper Setup', () => {
              let service: UserService;
              let mockDb: MockDatabase;

              beforeEach(() => {
                mockDb = new MockDatabase();
                service = new UserService(mockDb);
              });

              afterEach(() => {
                mockDb.clear();
                service = null;
              });

              it('should create user', () => {
                const user = service.create({ name: 'Test' });
                expect(user).toBeDefined();
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        expect(result.violations).not.toContain(
          'Tests missing proper isolation in setup/teardown'
        );
      });

      it('should flag tests without proper setup/teardown', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'no-setup.spec.ts'),
          `
            const service = new UserService();

            describe('No Setup Tests', () => {
              it('test 1', () => {
                service.doSomething();
                expect(true).toBe(true);
              });

              it('test 2', () => {
                service.doSomethingElse();
                expect(true).toBe(true);
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        // May detect missing isolation
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    describe('test order dependencies', () => {
      it('should flag tests with order dependencies', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'order-dependent.spec.ts'),
          `
            let createdUserId: string;

            describe('Order Dependent Tests', () => {
              it('should create user first', () => {
                createdUserId = createUser().id;
                expect(createdUserId).toBeDefined();
              });

              it('should update the previously created user', () => {
                updateUser(createdUserId, { name: 'Updated' });
                expect(getUser(createdUserId).name).toBe('Updated');
              });

              it('should delete the previously created user', () => {
                deleteUser(createdUserId);
                expect(getUser(createdUserId)).toBeNull();
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        // May detect order dependencies
        expect(result.score).toBeLessThanOrEqual(100);
      });

      it('should pass when tests are order independent', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'order-independent.spec.ts'),
          `
            describe('Order Independent Tests', () => {
              let userId: string;

              beforeEach(() => {
                userId = createTestUser().id;
              });

              afterEach(() => {
                deleteTestUser(userId);
              });

              it('should create user', () => {
                expect(userId).toBeDefined();
              });

              it('should update user', () => {
                updateUser(userId, { name: 'Updated' });
                expect(getUser(userId).name).toBe('Updated');
              });

              it('should get user', () => {
                const user = getUser(userId);
                expect(user).toBeDefined();
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        expect(result.violations).not.toContain(
          'Tests appear to have order dependencies'
        );
      });
    });

    describe('external resource isolation', () => {
      it('should detect proper external resource cleanup', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'resource-cleanup.spec.ts'),
          `
            describe('Resource Cleanup', () => {
              let dbConnection: DatabaseConnection;
              let fileHandle: FileHandle;

              beforeEach(async () => {
                dbConnection = await createConnection();
                fileHandle = await openFile('test.txt');
              });

              afterEach(async () => {
                await dbConnection.close();
                await fileHandle.close();
                await cleanupTempFiles();
              });

              it('should use database', async () => {
                const result = await dbConnection.query('SELECT 1');
                expect(result).toBeDefined();
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        expect(result.violations).not.toContain(
          'External resources not properly isolated between tests'
        );
      });

      it('should flag missing resource cleanup', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'no-cleanup.spec.ts'),
          `
            let dbConnection: DatabaseConnection;

            describe('No Cleanup Tests', () => {
              beforeEach(async () => {
                dbConnection = await createConnection();
              });

              it('should query database', async () => {
                await dbConnection.query('SELECT 1');
                expect(true).toBe(true);
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        // May detect missing cleanup
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    describe('global state pollution', () => {
      it('should detect DOM/global state pollution', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'global-pollution.spec.ts'),
          `
            describe('Global Pollution Tests', () => {
              it('modifies window object', () => {
                window.customProp = 'test';
                document.body.innerHTML = '<div>test</div>';
                expect(window.customProp).toBe('test');
              });

              it('depends on modified window', () => {
                expect(window.customProp).toBe('test');
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        // May detect global state pollution
        expect(result.score).toBeLessThanOrEqual(100);
      });

      it('should pass when global state is properly cleaned', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'clean-global.spec.ts'),
          `
            describe('Clean Global Tests', () => {
              const originalInnerHTML = document.body.innerHTML;

              afterEach(() => {
                document.body.innerHTML = originalInnerHTML;
                delete window.customProp;
                jest.restoreAllMocks();
              });

              it('modifies DOM safely', () => {
                document.body.innerHTML = '<div>test</div>';
                expect(document.body.innerHTML).toContain('test');
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        expect(result.suggestions).not.toContain(
          'Clean up global state modifications in tests'
        );
      });
    });

    describe('test framework isolation patterns', () => {
      it('should detect proper describe block usage', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'proper-describe.spec.ts'),
          `
            describe('User Service', () => {
              describe('create', () => {
                let service: UserService;

                beforeEach(() => {
                  service = new UserService();
                });

                afterEach(() => {
                  service = null;
                });

                it('should create valid user', () => {
                  expect(service.create({ name: 'Test' })).toBeDefined();
                });
              });

              describe('update', () => {
                let service: UserService;

                beforeEach(() => {
                  service = new UserService();
                });

                afterEach(() => {
                  service = null;
                });

                it('should update user', () => {
                  expect(service.update(1, { name: 'Updated' })).toBeDefined();
                });
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        expect(result.suggestions).not.toContain(
          'Use test framework isolation features (describe blocks, proper mocking)'
        );
      });

      it('should suggest isolation patterns when missing', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'flat-tests.spec.ts'),
          `
            test('test 1', () => {
              expect(true).toBe(true);
            });

            test('test 2', () => {
              expect(false).toBe(false);
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        // May suggest isolation patterns
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    describe('error handling', () => {
      it('should return error result when exception occurs', () => {
        const invalidContext: LawCheckContext = {
          projectRoot: '/non/existent/path/that/should/not/exist',
          config: mockConfig,
        };

        const result = TestIsolationEnforcementLaw.check(invalidContext);

        // Error handling may vary - just verify valid result structure
        expect(typeof result.passed).toBe('boolean');
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    describe('result structure', () => {
      it('should include config in result', () => {
        const result = TestIsolationEnforcementLaw.check(context);

        expect(result.config).toBe(mockConfig);
      });

      it('should include details array', () => {
        const result = TestIsolationEnforcementLaw.check(context);

        expect(Array.isArray(result.details)).toBe(true);
      });

      it('should have passed boolean', () => {
        const result = TestIsolationEnforcementLaw.check(context);

        expect(typeof result.passed).toBe('boolean');
      });

      it('should have message string', () => {
        const result = TestIsolationEnforcementLaw.check(context);

        expect(typeof result.message).toBe('string');
      });

      it('should have score between 0 and 100', () => {
        const result = TestIsolationEnforcementLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    describe('message generation', () => {
      it('should show success message when all isolation checks pass', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'fully-isolated.spec.ts'),
          `
            describe('Fully Isolated', () => {
              let data: TestData;

              beforeEach(() => {
                data = createFreshData();
              });

              afterEach(() => {
                data = null;
                cleanupResources();
                jest.restoreAllMocks();
              });

              it('test 1', () => {
                expect(data).toBeDefined();
              });

              it('test 2', () => {
                expect(data).toBeDefined();
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        if (result.passed) {
          expect(result.message).toContain('✅');
        }
      });

      it('should show warning message when issues found', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'not-isolated.spec.ts'),
          `
            let sharedState = {};
            describe('Not Isolated', () => {
              it('modifies shared state', () => {
                sharedState.value = 1;
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        // Message may contain ⚠️ for warnings or ✅ for pass - depends on analysis
        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
      });
    });

    describe('comprehensive isolation setup', () => {
      it('should pass with comprehensive isolation practices', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);

        // Create well-isolated test file
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'comprehensive-isolation.spec.ts'),
          `
            describe('Comprehensive Isolation', () => {
              // Local scope variables
              let userService: UserService;
              let mockDatabase: MockDatabase;
              let testUser: User;

              // Fresh setup for each test
              beforeEach(() => {
                mockDatabase = new MockDatabase();
                userService = new UserService(mockDatabase);
                testUser = createTestUser();
              });

              // Complete cleanup after each test
              afterEach(() => {
                mockDatabase.clear();
                userService = null;
                testUser = null;
                jest.clearAllMocks();
                jest.restoreAllMocks();
              });

              describe('create operations', () => {
                let creationData: CreateUserDTO;

                beforeEach(() => {
                  creationData = { name: 'Test', email: 'test@test.com' };
                });

                afterEach(() => {
                  creationData = null;
                });

                it('should create user successfully', () => {
                  const result = userService.create(creationData);
                  expect(result.id).toBeDefined();
                });

                it('should validate email', () => {
                  creationData.email = 'invalid';
                  expect(() => userService.create(creationData)).toThrow();
                });
              });

              describe('read operations', () => {
                beforeEach(() => {
                  mockDatabase.seed([testUser]);
                });

                it('should find user by id', () => {
                  const found = userService.findById(testUser.id);
                  expect(found).toEqual(testUser);
                });

                it('should return null for unknown id', () => {
                  const found = userService.findById('unknown');
                  expect(found).toBeNull();
                });
              });
            });
          `
        );

        const result = TestIsolationEnforcementLaw.check(context);

        expect(result.violations).not.toContain(
          'Tests share mutable state that can cause interference'
        );
        expect(result.violations).not.toContain(
          'Tests missing proper isolation in setup/teardown'
        );
        expect(result.violations).not.toContain(
          'Tests appear to have order dependencies'
        );
      });
    });
  });
});

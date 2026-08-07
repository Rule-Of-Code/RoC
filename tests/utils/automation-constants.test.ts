/**
 * Automation Constants Tests
 * Tests for the automation-constants utility module
 */
import {
  AUTOMATION_CONSTANTS,
  TESTING_CONSTANTS,
} from '../../src/utils/automation-constants';

describe('automation-constants', () => {
  describe('TESTING_CONSTANTS', () => {
    describe('test frameworks', () => {
      it('should have common test frameworks', () => {
        expect(TESTING_CONSTANTS.JEST).toBe('jest');
        expect(TESTING_CONSTANTS.JASMINE).toBe('jasmine');
        expect(TESTING_CONSTANTS.KARMA).toBe('karma');
        expect(TESTING_CONSTANTS.CYPRESS).toBe('cypress');
        expect(TESTING_CONSTANTS.PLAYWRIGHT).toBe('playwright');
        expect(TESTING_CONSTANTS.MOCHA).toBe('mocha');
      });
    });

    describe('test file patterns', () => {
      it('should have test file extensions', () => {
        expect(TESTING_CONSTANTS.SPEC_FILE_EXTENSION).toBe('.spec.ts');
        expect(TESTING_CONSTANTS.TEST_FILE_EXTENSION).toBe('.test.ts');
        expect(TESTING_CONSTANTS.E2E_SPEC_EXTENSION).toBe('.e2e-spec.ts');
        expect(TESTING_CONSTANTS.E2E_TEST_EXTENSION).toBe('.e2e-test.ts');
      });
    });

    describe('Jest configuration', () => {
      it('should have Jest config files', () => {
        expect(TESTING_CONSTANTS.JEST_CONFIG).toBe('jest.config.js');
        expect(TESTING_CONSTANTS.JEST_SETUP).toBe('jest.setup.js');
        expect(TESTING_CONSTANTS.JEST_PRESET).toBe('jest.preset.js');
        expect(TESTING_CONSTANTS.JEST_JSON_CONFIG).toBe('jest.json');
      });
    });

    describe('Karma configuration', () => {
      it('should have Karma config files', () => {
        expect(TESTING_CONSTANTS.KARMA_CONFIG).toBe('karma.conf.js');
      });
    });

    describe('Cypress configuration', () => {
      it('should have Cypress paths', () => {
        expect(TESTING_CONSTANTS.CYPRESS_CONFIG).toBe('cypress.config.ts');
        expect(TESTING_CONSTANTS.CYPRESS_JSON).toBe('cypress.json');
        expect(TESTING_CONSTANTS.CYPRESS_SUPPORT).toBe('cypress/support');
        expect(TESTING_CONSTANTS.CYPRESS_E2E).toBe('cypress/e2e');
      });
    });

    describe('test directories', () => {
      it('should have test directory names', () => {
        expect(TESTING_CONSTANTS.TESTS_DIR).toBe('tests');
        expect(TESTING_CONSTANTS.SPEC_DIR).toBe('spec');
        expect(TESTING_CONSTANTS.E2E_DIR).toBe('e2e');
        expect(TESTING_CONSTANTS.CYPRESS_DIR).toBe('cypress');
        expect(TESTING_CONSTANTS.COVERAGE_DIR).toBe('coverage');
      });
    });

    describe('coverage tools', () => {
      it('should have coverage tools and files', () => {
        expect(TESTING_CONSTANTS.NYC).toBe('nyc');
        expect(TESTING_CONSTANTS.ISTANBUL).toBe('istanbul');
        expect(TESTING_CONSTANTS.LCOV).toBe('lcov');
        expect(TESTING_CONSTANTS.COVERAGE_HTML).toBe('coverage/index.html');
        expect(TESTING_CONSTANTS.LCOV_INFO).toBe('lcov.info');
      });
    });

    describe('test keywords', () => {
      it('should have test structure keywords', () => {
        expect(TESTING_CONSTANTS.DESCRIBE).toBe('describe');
        expect(TESTING_CONSTANTS.IT).toBe('it');
        expect(TESTING_CONSTANTS.TEST).toBe('test');
        expect(TESTING_CONSTANTS.EXPECT).toBe('expect');
        expect(TESTING_CONSTANTS.BEFORE_EACH).toBe('beforeEach');
        expect(TESTING_CONSTANTS.AFTER_EACH).toBe('afterEach');
      });
    });

    describe('mocking keywords', () => {
      it('should have mocking utilities', () => {
        expect(TESTING_CONSTANTS.MOCK).toBe('mock');
        expect(TESTING_CONSTANTS.SPY).toBe('spy');
        expect(TESTING_CONSTANTS.STUB).toBe('stub');
        expect(TESTING_CONSTANTS.JEST_MOCK).toBe('jest.mock');
        expect(TESTING_CONSTANTS.JEST_SPY_ON).toBe('jest.spyOn');
        expect(TESTING_CONSTANTS.SPY_ON).toBe('spyOn');
      });
    });

    describe('Angular testing', () => {
      it('should have Angular testing utilities', () => {
        expect(TESTING_CONSTANTS.TEST_BED).toBe('TestBed');
        expect(TESTING_CONSTANTS.COMPONENT_FIXTURE).toBe('ComponentFixture');
        expect(TESTING_CONSTANTS.FAKE_ASYNC).toBe('fakeAsync');
        expect(TESTING_CONSTANTS.TICK).toBe('tick');
        expect(TESTING_CONSTANTS.FLUSH).toBe('flush');
      });

      it('should have HTTP testing utilities', () => {
        expect(TESTING_CONSTANTS.HTTP_CLIENT_TESTING_MODULE).toBe(
          'HttpClientTestingModule'
        );
        expect(TESTING_CONSTANTS.HTTP_TEST_CONTROLLER).toBe(
          'HttpTestingController'
        );
        expect(TESTING_CONSTANTS.EXPECT_ONE).toBe('expectOne');
      });

      it('should have Router testing utilities', () => {
        expect(TESTING_CONSTANTS.ROUTER_TESTING_MODULE).toBe(
          'RouterTestingModule'
        );
      });

      it('should have debug utilities', () => {
        expect(TESTING_CONSTANTS.DEBUG_ELEMENT).toBe('DebugElement');
        expect(TESTING_CONSTANTS.BY).toBe('By');
        expect(TESTING_CONSTANTS.BY_CSS).toBe('By.css');
        expect(TESTING_CONSTANTS.DETECT_CHANGES).toBe('detectChanges');
      });
    });

    describe('accessibility testing', () => {
      it('should have a11y keywords', () => {
        expect(TESTING_CONSTANTS.AXE).toBe('axe');
        expect(TESTING_CONSTANTS.A11Y).toBe('a11y');
        expect(TESTING_CONSTANTS.ARIA).toBe('aria');
      });
    });
  });

  describe('AUTOMATION_CONSTANTS', () => {
    describe('CI/CD platforms', () => {
      it('should have CI config files', () => {
        expect(AUTOMATION_CONSTANTS.BITBUCKET_PIPELINES).toBe(
          'bitbucket-pipelines.yml'
        );
        expect(AUTOMATION_CONSTANTS.GITHUB_ACTIONS).toBe('.github/workflows');
        expect(AUTOMATION_CONSTANTS.GITLAB_CI).toBe('.gitlab-ci.yml');
        expect(AUTOMATION_CONSTANTS.TRAVIS_CI).toBe('.travis.yml');
        expect(AUTOMATION_CONSTANTS.JENKINS).toBe('Jenkinsfile');
        expect(AUTOMATION_CONSTANTS.AZURE_PIPELINES).toBe(
          'azure-pipelines.yml'
        );
      });
    });

    describe('Docker', () => {
      it('should have Docker files', () => {
        expect(AUTOMATION_CONSTANTS.DOCKERFILE).toBe('Dockerfile');
        expect(AUTOMATION_CONSTANTS.DOCKER_COMPOSE).toBe('docker-compose.yml');
        expect(AUTOMATION_CONSTANTS.DOCKER_IGNORE).toBe('.dockerignore');
      });
    });

    describe('build tools', () => {
      it('should have build tool configs', () => {
        expect(AUTOMATION_CONSTANTS.WEBPACK).toBe('webpack.config.js');
        expect(AUTOMATION_CONSTANTS.ROLLUP).toBe('rollup.config.js');
        expect(AUTOMATION_CONSTANTS.VITE).toBe('vite.config.ts');
        expect(AUTOMATION_CONSTANTS.ESBUILD).toBe('esbuild.config.js');
      });
    });

    describe('package managers', () => {
      it('should have package manager configs', () => {
        expect(AUTOMATION_CONSTANTS.NPM).toBe('npm');
        expect(AUTOMATION_CONSTANTS.YARN).toBe('yarn');
        expect(AUTOMATION_CONSTANTS.PNPM).toBe('pnpm');
        expect(AUTOMATION_CONSTANTS.PACKAGE_JSON).toBe('package.json');
        expect(AUTOMATION_CONSTANTS.PACKAGE_LOCK).toBe('package-lock.json');
        expect(AUTOMATION_CONSTANTS.YARN_LOCK).toBe('yarn.lock');
      });
    });

    describe('quality tools', () => {
      it('should have ESLint configs', () => {
        expect(AUTOMATION_CONSTANTS.ESLINT).toBe('.eslintrc');
        expect(AUTOMATION_CONSTANTS.ESLINT_JS).toBe('.eslintrc.js');
        expect(AUTOMATION_CONSTANTS.ESLINT_JSON).toBe('.eslintrc.json');
      });

      it('should have Prettier configs', () => {
        expect(AUTOMATION_CONSTANTS.PRETTIER).toBe('.prettierrc');
        expect(AUTOMATION_CONSTANTS.PRETTIER_JS).toBe('prettier.config.js');
        expect(AUTOMATION_CONSTANTS.PRETTIER_IGNORE).toBe('.prettierignore');
      });

      it('should have other quality configs', () => {
        expect(AUTOMATION_CONSTANTS.EDITORCONFIG).toBe('.editorconfig');
        expect(AUTOMATION_CONSTANTS.GITIGNORE).toBe('.gitignore');
        expect(AUTOMATION_CONSTANTS.GITATTRIBUTES).toBe('.gitattributes');
      });
    });

    describe('commands', () => {
      it('should have linting commands', () => {
        expect(AUTOMATION_CONSTANTS.LINT).toBe('lint');
        expect(AUTOMATION_CONSTANTS.FORMAT).toBe('format');
        expect(AUTOMATION_CONSTANTS.FIX).toBe('fix');
        expect(AUTOMATION_CONSTANTS.CHECK).toBe('check');
      });

      it('should have build/run commands', () => {
        expect(AUTOMATION_CONSTANTS.BUILD).toBe('build');
        expect(AUTOMATION_CONSTANTS.START).toBe('start');
        expect(AUTOMATION_CONSTANTS.DEV).toBe('dev');
        expect(AUTOMATION_CONSTANTS.SERVE).toBe('serve');
        expect(AUTOMATION_CONSTANTS.WATCH).toBe('watch');
      });

      it('should have test commands', () => {
        expect(AUTOMATION_CONSTANTS.TEST).toBe('test');
        expect(AUTOMATION_CONSTANTS.TEST_WATCH).toBe('test:watch');
        expect(AUTOMATION_CONSTANTS.TEST_COVERAGE).toBe('test:coverage');
        expect(AUTOMATION_CONSTANTS.E2E).toBe('e2e');
      });
    });

    describe('environment variables', () => {
      it('should have NODE_ENV variants', () => {
        expect(AUTOMATION_CONSTANTS.NODE_ENV).toBe('NODE_ENV');
        expect(AUTOMATION_CONSTANTS.NODE_ENV_DEVELOPMENT).toBe('development');
        expect(AUTOMATION_CONSTANTS.NODE_ENV_PRODUCTION).toBe('production');
        expect(AUTOMATION_CONSTANTS.NODE_ENV_TEST).toBe('test');
      });

      it('should have CI/CD variables', () => {
        expect(AUTOMATION_CONSTANTS.CI).toBe('CI');
        expect(AUTOMATION_CONSTANTS.BUILD_NUMBER).toBe('BUILD_NUMBER');
        expect(AUTOMATION_CONSTANTS.GIT_COMMIT).toBe('GIT_COMMIT');
        expect(AUTOMATION_CONSTANTS.GIT_BRANCH).toBe('GIT_BRANCH');
      });
    });
  });
});

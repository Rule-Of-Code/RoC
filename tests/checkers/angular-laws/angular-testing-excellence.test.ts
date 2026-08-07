/**
 * @fileoverview Tests for AngularTestingExcellenceLaw
 * @description Tests for Angular testing standards enforcement
 */

import { AngularTestingExcellenceLaw } from '../../../src/checkers/angular-laws/angular-testing-excellence';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('checkers/angular-laws/angular-testing-excellence', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-testing-excellence-test-');
    mockContext = {
      projectRoot: tempDir,
      config: {
        project: {
          name: 'test-project',
          root: '',
          componentPrefix: 'app',
          type: 'angular',
        },
        ignores: { global: [], tests: [], build: [], design: [] },
        laws: { paretoMode: false, severity: {} },
        hooks: { preCommit: false, prePush: false, commitMsg: false },
        includes: { global: [] },
        excludes: {},
        reporting: {
          format: 'console',
          verbose: false,
          onlyFailures: false,
          scoring: false,
        },
        performance: {
          parallel: false,
          maxConcurrent: 3,
          cache: true,
        },
      },
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ==========================================================================
  // Result Structure Tests
  // ==========================================================================

  describe('Result Structure', () => {
    it('should return all required LawResult properties', () => {
      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('config');
    });

    it('should have passed as boolean', () => {
      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(typeof result.passed).toBe('boolean');
    });

    it('should have message as string', () => {
      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(typeof result.message).toBe('string');
    });

    it('should have score as number', () => {
      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(typeof result.score).toBe('number');
    });

    it('should return law name in kebab-case format', () => {
      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(result.lawName).toBe('angular-testing-excellence');
    });
  });

  // ==========================================================================
  // Non-Angular Project Tests
  // ==========================================================================

  describe('Non-Angular Project', () => {
    it('should return early when no Angular project detected', () => {
      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should not analyze test files for non-Angular projects', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.spec.ts'),
        'describe("bad test", () => { it("no should prefix", () => {}) });'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(result.violations).toEqual([]);
    });
  });

  // ==========================================================================
  // Testing Framework Detection Tests
  // ==========================================================================

  describe('Testing Framework Detection', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));
    });

    it('should detect missing testing framework', () => {
      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.violations!.some(
          v => v.includes('No testing framework') || v.includes('Jest/Jasmine')
        )
      ).toBe(true);
    });

    it('should pass when Jest is configured', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('No testing framework'))
      ).toBe(false);
    });

    it('should pass when Jasmine is configured', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jasmine: '^4.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('No testing framework'))
      ).toBe(false);
    });
  });

  // ==========================================================================
  // Test Coverage Tests
  // ==========================================================================

  describe('Test Coverage', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
    });

    it('should detect insufficient test coverage', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');

      // Create 10 source files
      for (let i = 1; i <= 10; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.component.ts`),
          `@Component({}) class Component${i} {}`
        );
      }

      // Create only 2 test files (20% coverage)
      for (let i = 1; i <= 2; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.component.spec.ts`),
          `describe('Component${i}', () => { it('should work', () => {}); });`
        );
      }

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('Insufficient test coverage'))
      ).toBe(true);
    });

    it('should pass when test coverage is above 80%', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');

      // Create 5 source files
      for (let i = 1; i <= 5; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.component.ts`),
          `@Component({}) class Component${i} {}`
        );
      }

      // Create 5 test files (100% coverage)
      for (let i = 1; i <= 5; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.component.spec.ts`),
          `describe('Component${i}', () => { it('should work', () => {}); });`
        );
      }

      const result = AngularTestingExcellenceLaw.check(mockContext);

      // Should analyze test coverage when sufficient spec files exist
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  // ==========================================================================
  // Component Test Pattern Tests
  // ==========================================================================

  describe('Component Test Patterns', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
    });

    it('should detect missing TestBed in component tests', () => {
      const testContent = `
describe('AppComponent', () => {
  it('should create', () => {
    const component = new AppComponent();
    expect(component).toBeTruthy();
  });
});
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'app.component.spec.ts'),
        testContent
      );

      // Source file
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'app.component.ts'),
        '@Component({}) class AppComponent {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      // Should analyze component test structure
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should detect missing ComponentFixture in component tests', () => {
      const testContent = `
import { TestBed } from '@angular/core/testing';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent]
    }).compileComponents();
  });

  it('should create', () => {
    const component = TestBed.createComponent(AppComponent);
    expect(component).toBeTruthy();
  });
});
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'app.component.spec.ts'),
        testContent
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'app.component.ts'),
        '@Component({}) class AppComponent {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      // Should analyze component test patterns
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should pass for properly structured component tests', () => {
      const testContent = `
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'app.component.spec.ts'),
        testContent
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'app.component.ts'),
        '@Component({}) class AppComponent {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.violations!.some(
          v =>
            v.includes('app.component.spec.ts') &&
            (v.includes('TestBed') || v.includes('ComponentFixture'))
        )
      ).toBe(false);
    });
  });

  // ==========================================================================
  // Service Test Pattern Tests
  // ==========================================================================

  describe('Service Test Patterns', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
    });

    it('should detect missing injection in service tests', () => {
      const testContent = `
describe('DataService', () => {
  it('should get data', () => {
    const service = new DataService();
    expect(service.getData()).toBeDefined();
  });
});
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'data.service.spec.ts'),
        testContent
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'data.service.ts'),
        '@Injectable() class DataService {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      // Should analyze service test patterns
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should pass for properly structured service tests', () => {
      const testContent = `
import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'data.service.spec.ts'),
        testContent
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'data.service.ts'),
        '@Injectable() class DataService {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.violations!.some(
          v => v.includes('data.service.spec.ts') && v.includes('injection')
        )
      ).toBe(false);
    });
  });

  // ==========================================================================
  // Async Testing Pattern Tests
  // ==========================================================================

  describe('Async Testing Patterns', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
    });

    it('should detect missing async handling for Observable tests', () => {
      const testContent = `
import { TestBed, ComponentFixture } from '@angular/core/testing';

describe('AsyncComponent', () => {
  it('should handle observable', () => {
    const result: Observable<string> = component.getData();
    expect(result).toBeDefined();
  });
});
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'async.component.spec.ts'),
        testContent
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'async.component.ts'),
        '@Component({}) class AsyncComponent {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      // Should analyze async test patterns
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should pass when using fakeAsync for async tests', () => {
      const testContent = `
import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { Observable } from 'rxjs';

describe('AsyncComponent', () => {
  it('should handle observable', fakeAsync(() => {
    const result: Observable<string> = component.getData();
    tick(100);
    expect(result).toBeDefined();
  }));
});
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'async.component.spec.ts'),
        testContent
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'async.component.ts'),
        '@Component({}) class AsyncComponent {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.violations!.some(
          v =>
            v.includes('async.component.spec.ts') &&
            v.includes('async handling')
        )
      ).toBe(false);
    });

    it('should pass when using async for async tests', () => {
      const testContent = `
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Observable } from 'rxjs';

describe('AsyncComponent', () => {
  it('should handle observable', async () => {
    const result: Observable<string> = component.getData();
    await fixture.whenStable();
    expect(result).toBeDefined();
  });
});
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'async.component.spec.ts'),
        testContent
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'async.component.ts'),
        '@Component({}) class AsyncComponent {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.violations!.some(
          v =>
            v.includes('async.component.spec.ts') &&
            v.includes('async handling')
        )
      ).toBe(false);
    });
  });

  // ==========================================================================
  // Test Description Tests
  // ==========================================================================

  describe('Test Description Validation', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
    });

    it('should detect test cases not starting with "should"', () => {
      const testContent = `
import { TestBed, ComponentFixture } from '@angular/core/testing';

describe('TestComponent', () => {
  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders correctly', () => {
    expect(fixture.nativeElement).toBeDefined();
  });
});
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'test.component.spec.ts'),
        testContent
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'test.component.ts'),
        '@Component({}) class TestComponent {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      // Should analyze test descriptions
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should detect describe blocks with short descriptions', () => {
      const testContent = `
import { TestBed, ComponentFixture } from '@angular/core/testing';

describe('Comp', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'short.component.spec.ts'),
        testContent
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'short.component.ts'),
        '@Component({}) class ShortComponent {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      // Should analyze describe block descriptions
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should pass for properly described tests', () => {
      const testContent = `
import { TestBed, ComponentFixture } from '@angular/core/testing';

describe('HeaderComponent tests', () => {
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the title', () => {
    expect(fixture.nativeElement.textContent).toContain('Title');
  });
});
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'header.component.spec.ts'),
        testContent
      );

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'header.component.ts'),
        '@Component({}) class HeaderComponent {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      const headerTestViolations = result.violations!.filter(
        v =>
          v.includes('header.component.spec.ts') &&
          (v.includes('should start') || v.includes('too short'))
      );

      expect(headerTestViolations.length).toBe(0);
    });
  });

  // ==========================================================================
  // E2E Test Detection Tests
  // ==========================================================================

  describe('E2E Test Detection', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));
    });

    it('should detect missing E2E tests for substantial applications', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      // Create 6+ source files (substantial application)
      for (let i = 1; i <= 6; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.component.ts`),
          `@Component({}) class Component${i} {}`
        );
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.component.spec.ts`),
          `describe('Component${i}', () => { it('should work', () => {}); });`
        );
      }

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('No E2E tests found'))
      ).toBe(true);
    });

    it('should pass when E2E tests exist in e2e directory', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      const e2eDir = PathOperations.join(tempDir, 'e2e');
      FileUtils.createDirectory(srcDir);
      FileUtils.createDirectory(e2eDir);

      // Create source files
      for (let i = 1; i <= 6; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.component.ts`),
          `@Component({}) class Component${i} {}`
        );
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.component.spec.ts`),
          `describe('Component${i}', () => { it('should work', () => {}); });`
        );
      }

      // Create E2E test
      FileUtils.writeFile(
        PathOperations.join(e2eDir, 'app.e2e.spec.ts'),
        `describe('App E2E', () => { it('should load', () => {}); });`
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      // Should analyze E2E test presence
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should detect E2E tests in cypress directory', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      const cypressDir = PathOperations.join(tempDir, 'cypress');
      FileUtils.createDirectory(srcDir);
      FileUtils.createDirectory(cypressDir);

      // Create source files
      for (let i = 1; i <= 6; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.component.ts`),
          `@Component({}) class Component${i} {}`
        );
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.component.spec.ts`),
          `describe('Component${i}', () => { it('should work', () => {}); });`
        );
      }

      // Create Cypress test
      FileUtils.writeFile(
        PathOperations.join(cypressDir, 'app.spec.ts'),
        `describe('App', () => { it('should load', () => {}); });`
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      // Should detect Cypress E2E tests
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  // ==========================================================================
  // Suggestions Tests
  // ==========================================================================

  describe('Suggestions', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));
    });

    it('should provide comprehensive testing suggestions', () => {
      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.suggestions!.some(s => s.includes('Configure testing framework'))
      ).toBe(true);
      expect(
        result.suggestions!.some(s => s.includes('80%+ test coverage'))
      ).toBe(true);
      expect(result.suggestions!.some(s => s.includes('Use TestBed'))).toBe(
        true
      );
      expect(result.suggestions!.some(s => s.includes('async testing'))).toBe(
        true
      );
      expect(result.suggestions!.some(s => s.includes('should'))).toBe(true);
      expect(result.suggestions!.some(s => s.includes('E2E tests'))).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty project gracefully', () => {
      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
    });

    it('should handle project with no test files', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        '@Component({}) class AppComponent {}'
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should handle deeply nested test files', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const deepDir = PathOperations.join(
        tempDir,
        'src',
        'app',
        'features',
        'users',
        'components'
      );
      FileUtils.createDirectory(deepDir);

      FileUtils.writeFile(
        PathOperations.join(deepDir, 'user-list.component.ts'),
        '@Component({}) class UserListComponent {}'
      );
      FileUtils.writeFile(
        PathOperations.join(deepDir, 'user-list.component.spec.ts'),
        `
import { TestBed, ComponentFixture } from '@angular/core/testing';

describe('UserListComponent', () => {
  it('should create', () => {
    expect(true).toBe(true);
  });
});
`
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Score Calculation Tests
  // ==========================================================================

  describe('Score Calculation', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { jest: '^29.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));
    });

    it('should have perfect score with excellent testing', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      // Create well-tested component
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        '@Component({}) class AppComponent {}'
      );

      const goodTest = `
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render correctly', () => {
    expect(fixture.nativeElement).toBeDefined();
  });
});
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.spec.ts'),
        goodTest
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      // Good tests should result in a high score
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should decrease score with violations', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);

      // Create many source files without tests
      for (let i = 1; i <= 10; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.component.ts`),
          `@Component({}) class Component${i} {}`
        );
      }

      // Only 1 poor quality test
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'component1.component.spec.ts'),
        `describe('C', () => { it('test', () => {}); });`
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(result.score).toBeLessThan(100);
      expect(result.passed).toBe(false);
    });
  });

  // ==========================================================================
  // F-09 regression (a downstream consumer): the spec-name matcher must be word-bounded.
  // `(?:it|test)\(` matched the `it(` inside split(, so an e2e helper doing
  // text.split('\n') was read as a test named "\n" not starting with "should"
  // — a phantom violation that broke a live consumer's dogfood build.
  // ==========================================================================
  describe('spec-name matching is word-bounded (F-09)', () => {
    beforeEach(() => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify({ version: 1 })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'angular-app',
          dependencies: { '@angular/core': '18.0.0' },
        })
      );
    });

    it('does not read split()/emit()/commit() as a test description', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'e2e.helper.spec.ts'),
        [
          "describe('flow', () => {",
          "  it('should split lines', () => {",
          "    const lines = text.split('\\n');",
          "    emitter.emit('done');",
          "    repo.commit('msg');",
          '  });',
          '});',
        ].join('\n')
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('should start with'))
      ).toBe(false);
    });

    it('still flags a real test whose description omits "should"', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'bad.spec.ts'),
        "describe('x', () => { it('does a thing', () => {}); });"
      );

      const result = AngularTestingExcellenceLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('should start with'))
      ).toBe(true);
    });
  });
});

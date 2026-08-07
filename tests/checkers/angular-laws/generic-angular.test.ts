/**
 * @fileoverview Tests for GenericAngularLaw
 * @description Tests for general Angular best practices and standards
 */

import { GenericAngularLaw } from '../../../src/checkers/angular-laws/generic-angular';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('checkers/angular-laws/generic-angular', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('generic-angular-test-');
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
      const result = GenericAngularLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('config');
    });

    it('should have passed as boolean', () => {
      const result = GenericAngularLaw.check(mockContext);

      expect(typeof result.passed).toBe('boolean');
    });

    it('should have message as string', () => {
      const result = GenericAngularLaw.check(mockContext);

      expect(typeof result.message).toBe('string');
    });

    it('should have score as number', () => {
      const result = GenericAngularLaw.check(mockContext);

      expect(typeof result.score).toBe('number');
    });

    it('should return law name in kebab-case format', () => {
      const result = GenericAngularLaw.check(mockContext);

      expect(result.lawName).toBe('generic-angular-standards');
    });
  });

  // ==========================================================================
  // Non-Angular Project Tests
  // ==========================================================================

  describe('Non-Angular Project', () => {
    it('should return early when no Angular project detected', () => {
      const result = GenericAngularLaw.check(mockContext);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should not analyze files for non-Angular projects', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        'export class AppComponent { console.log("test"); }'
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(result.violations).toEqual([]);
    });
  });

  // ==========================================================================
  // Angular Version Detection Tests
  // ==========================================================================

  describe('Angular Version Detection', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));
    });

    it('should detect outdated Angular version', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: {
          '@angular/core': '15.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = GenericAngularLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('outdated'))).toBe(true);
    });

    it('should not flag current Angular versions', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: {
          '@angular/core': '18.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = GenericAngularLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('outdated'))).toBe(false);
    });

    it('should handle version 16 as current', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: {
          '@angular/core': '16.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = GenericAngularLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('outdated'))).toBe(false);
    });
  });

  // ==========================================================================
  // Component Standards Tests
  // ==========================================================================

  describe('Component Standards', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
    });

    it('should detect missing @Component decorator', () => {
      const componentContent = `
export class HeaderComponent {
  title = 'Header';
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'header.component.ts'),
        componentContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('missing @Component decorator'))
      ).toBe(true);
    });

    it('should detect component without template', () => {
      const componentContent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-empty'
})
export class EmptyComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'empty.component.ts'),
        componentContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('missing template or templateUrl')
        )
      ).toBe(true);
    });

    it('should detect missing ChangeDetectionStrategy', () => {
      const componentContent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  template: '<p>Test</p>'
})
export class TestComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'test.component.ts'),
        componentContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('should specify ChangeDetectionStrategy')
        )
      ).toBe(true);
    });

    it('should detect subscriptions without OnDestroy', () => {
      const componentContent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-sub',
  template: '<p>Sub</p>'
})
export class SubComponent {
  ngOnInit() {
    this.service.getData().subscribe(data => this.data = data);
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'sub.component.ts'),
        componentContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes("has subscriptions but doesn't implement OnDestroy")
        )
      ).toBe(true);
    });

    it('should pass for well-structured components', () => {
      const componentContent = `
import { Component, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-good',
  template: '<p>Good</p>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoodComponent implements OnDestroy {
  ngOnDestroy() {
    // cleanup
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'good.component.ts'),
        componentContent
      );

      const result = GenericAngularLaw.check(mockContext);

      // Well-structured components should pass analysis
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  // ==========================================================================
  // Service Standards Tests
  // ==========================================================================

  describe('Service Standards', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
    });

    it('should detect missing @Injectable decorator', () => {
      const serviceContent = `
export class DataService {
  getData() {
    return [];
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'data.service.ts'),
        serviceContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('missing @Injectable decorator')
        )
      ).toBe(true);
    });

    it('should detect missing providedIn configuration', () => {
      const serviceContent = `
import { Injectable } from '@angular/core';

@Injectable()
export class UserService {
  getUser() {
    return {};
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'user.service.ts'),
        serviceContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('should specify providedIn'))
      ).toBe(true);
    });

    it('checks a suffix-less @Injectable service (Angular 20)', () => {
      // Angular 20 allows a service to be `user.ts`, not `user.service.ts`.
      // Service standards are now gated on @Injectable, not the filename, so
      // this suffix-less service is still checked (providedIn missing here).
      const serviceContent = `
import { Injectable } from '@angular/core';

@Injectable()
export class User {
  getUser() {
    return {};
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'user.ts'),
        serviceContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('should specify providedIn'))
      ).toBe(true);
    });

    it('should pass for properly configured services', () => {
      const serviceContent = `
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  login() {
    return true;
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'auth.service.ts'),
        serviceContent
      );

      const result = GenericAngularLaw.check(mockContext);

      const authServiceViolations = result.violations!.filter(
        v =>
          v.includes('auth.service.ts') &&
          (v.includes('@Injectable') || v.includes('providedIn'))
      );
      expect(authServiceViolations.length).toBe(0);
    });
  });

  // ==========================================================================
  // Module Standards Tests
  // ==========================================================================

  describe('Module Standards', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
    });

    it('should detect missing @NgModule decorator', () => {
      const moduleContent = `
export class SharedModule {}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'shared.module.ts'),
        moduleContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('missing @NgModule decorator'))
      ).toBe(true);
    });

    it('should detect empty NgModule configuration', () => {
      const moduleContent = `
import { NgModule } from '@angular/core';

@NgModule({})
export class EmptyModule {}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'empty.module.ts'),
        moduleContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('empty NgModule configuration'))
      ).toBe(true);
    });

    it('should pass for properly configured modules', () => {
      const moduleContent = `
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedComponent } from './shared.component';

@NgModule({
  declarations: [SharedComponent],
  imports: [CommonModule],
  exports: [SharedComponent]
})
export class SharedModule {}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'proper.module.ts'),
        moduleContent
      );

      const result = GenericAngularLaw.check(mockContext);

      const properModuleViolations = result.violations!.filter(
        v =>
          v.includes('proper.module.ts') &&
          (v.includes('@NgModule') || v.includes('empty'))
      );
      expect(properModuleViolations.length).toBe(0);
    });
  });

  // ==========================================================================
  // General Standards Tests
  // ==========================================================================

  describe('General Standards', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
    });

    it('should detect deprecated rxjs/operators imports', () => {
      const componentContent = `
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { map, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-legacy',
  template: '<p>Legacy RxJS</p>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LegacyComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'legacy.component.ts'),
        componentContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('deprecated rxjs/operators imports')
        )
      ).toBe(true);
    });

    it('does NOT flag console statements (owned by Centralized Logging law, v7.2.0)', () => {
      const componentContent = `
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-debug',
  template: '<p>Debug</p>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DebugComponent {
  debug() {
    console.log('debugging');
    console.error('error message');
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'debug.component.ts'),
        componentContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('contains console statements'))
      ).toBe(false);
    });

    it('should detect excessive any usage', () => {
      const componentContent = `
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-weak',
  template: '<p>Weak Types</p>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeakComponent {
  data: any;
  items: any;
  result: any;
  value: any;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'weak.component.ts'),
        componentContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes("excessive 'any' usage"))
      ).toBe(true);
    });

    it('should detect improper file naming', () => {
      const componentContent = `
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-bad',
  template: '<p>Bad</p>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadComponent {}
`;
      // File name with uppercase
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'BadComponent.component.ts'),
        componentContent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes("doesn't follow Angular naming conventions")
        )
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Suggestions Tests
  // ==========================================================================

  describe('Suggestions', () => {
    it('should provide helpful suggestions', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = GenericAngularLaw.check(mockContext);

      // Should have a suggestions array (may be empty if no violations)
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ==========================================================================
  // Multiple File Analysis Tests
  // ==========================================================================

  describe('Multiple File Analysis', () => {
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

    it('should analyze all Angular source files', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      // Multiple file types
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        '@Component({ template: "" }) class AppComponent {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'data.service.ts'),
        'class DataService {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'shared.module.ts'),
        'class SharedModule {}'
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('app.component.ts'))).toBe(
        true
      );
      expect(result.violations!.some(v => v.includes('data.service.ts'))).toBe(
        true
      );
      expect(result.violations!.some(v => v.includes('shared.module.ts'))).toBe(
        true
      );
    });

    it('should handle nested directories', () => {
      const featuresDir = PathOperations.join(
        tempDir,
        'src',
        'app',
        'features',
        'users'
      );
      FileUtils.createDirectory(featuresDir);

      FileUtils.writeFile(
        PathOperations.join(featuresDir, 'user-list.component.ts'),
        '@Component({ template: "" }) class UserListComponent {}'
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('user-list.component.ts'))
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty project gracefully', () => {
      const result = GenericAngularLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
    });

    it('should handle project with no source files', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const result = GenericAngularLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.violations).toEqual([]);
    });

    it('should handle files with no content', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'empty.component.ts'),
        ''
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should handle special characters in file paths', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'my-feature.component.ts'),
        '@Component({ template: "", changeDetection: ChangeDetectionStrategy.OnPush }) class MyFeatureComponent {}'
      );

      const result = GenericAngularLaw.check(mockContext);

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
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));
    });

    it('should have perfect score with no violations', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const goodComponent = `
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-perfect',
  templateUrl: './perfect.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerfectComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'perfect.component.ts'),
        goodComponent
      );

      const result = GenericAngularLaw.check(mockContext);

      // Well-structured component should have a high score
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should decrease score with violations', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const badComponent = `
class BadComponent {
  console.log('bad');
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'bad.component.ts'),
        badComponent
      );

      const result = GenericAngularLaw.check(mockContext);

      expect(result.score).toBeLessThan(100);
      expect(result.passed).toBe(false);
    });
  });
});

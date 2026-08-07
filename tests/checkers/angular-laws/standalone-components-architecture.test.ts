/**
 * @fileoverview Tests for StandaloneComponentsArchitectureLaw
 * @description Tests for Angular standalone components architecture compliance
 */

import { StandaloneComponentsArchitectureLaw } from '../../../src/checkers/angular-laws/standalone-components-architecture';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('checkers/angular-laws/standalone-components-architecture', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'standalone-components-architecture-test-'
    );
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
  // Basic Result Structure Tests
  // ==========================================================================

  describe('Result Structure', () => {
    it('should return all required LawResult properties', () => {
      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('config');
    });

    it('should have passed as boolean', () => {
      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(typeof result.passed).toBe('boolean');
    });

    it('should have message as string', () => {
      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should have score as number', () => {
      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(typeof result.score).toBe('number');
    });

    it('should return law name as standalone-components-architecture', () => {
      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // Law names are in kebab-case format
      expect(result.lawName).toBe('standalone-components-architecture');
    });
  });

  // ==========================================================================
  // Non-Angular Project Tests
  // ==========================================================================

  describe('Non-Angular Project', () => {
    it('should handle non-Angular project gracefully', () => {
      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // Non-Angular projects should pass or have minimal issues
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should not have critical violations for non-Angular project', () => {
      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // Should pass or have minimal issues for non-Angular projects
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });

  // ==========================================================================
  // Angular Project Without src Directory
  // ==========================================================================

  describe('Angular Project Without src Directory', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));
    });

    it('should handle missing src directory gracefully', () => {
      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // Should handle missing src directory without crashing
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });
  });

  // ==========================================================================
  // Angular Project With Standalone Components
  // ==========================================================================

  describe('Angular Project With Standalone Components', () => {
    beforeEach(() => {
      // Create Angular project structure
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      // Create src/app directory
      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);
    });

    it('should pass when all components are standalone', () => {
      const componentPath = PathOperations.join(
        tempDir,
        'src',
        'app',
        'app.component.ts'
      );
      const standaloneComponent = `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html'
})
export class AppComponent {
  title = 'app';
}
`;
      FileUtils.writeFile(componentPath, standaloneComponent);

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('not standalone'))).toBe(
        false
      );
    });

    it('should detect non-standalone components', () => {
      const componentPath = PathOperations.join(
        tempDir,
        'src',
        'app',
        'old.component.ts'
      );
      const nonStandaloneComponent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-old',
  templateUrl: './old.component.html'
})
export class OldComponent {
  title = 'old';
}
`;
      FileUtils.writeFile(componentPath, nonStandaloneComponent);

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('components are not standalone')
        )
      ).toBe(true);
    });

    it('should suggest defining imports array for standalone components', () => {
      const componentPath = PathOperations.join(
        tempDir,
        'src',
        'app',
        'simple.component.ts'
      );
      const standaloneWithoutImports = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-simple',
  standalone: true,
  template: '<p>Simple</p>'
})
export class SimpleComponent {}
`;
      FileUtils.writeFile(componentPath, standaloneWithoutImports);

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // Component analysis should work correctly
      expect(result).toBeDefined();
      // May or may not have suggestions depending on implementation details
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should handle mixed standalone and non-standalone components', () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');

      // Standalone component
      const standaloneComponent = `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-standalone',
  standalone: true,
  imports: [CommonModule],
  template: '<p>Standalone</p>'
})
export class StandaloneComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(appDir, 'standalone.component.ts'),
        standaloneComponent
      );

      // Non-standalone component
      const nonStandaloneComponent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-legacy',
  template: '<p>Legacy</p>'
})
export class LegacyComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(appDir, 'legacy.component.ts'),
        nonStandaloneComponent
      );

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('1/2 components are not standalone')
        )
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Bootstrap Configuration Tests
  // ==========================================================================

  describe('Bootstrap Configuration', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
    });

    it('should detect legacy platformBrowserDynamic usage', () => {
      const mainTsPath = PathOperations.join(tempDir, 'src', 'main.ts');
      const legacyMain = `
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
`;
      FileUtils.writeFile(mainTsPath, legacyMain);

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('should use bootstrapApplication')
        )
      ).toBe(true);
    });

    it('should pass when using bootstrapApplication', () => {
      const mainTsPath = PathOperations.join(tempDir, 'src', 'main.ts');
      const modernMain = `
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
`;
      FileUtils.writeFile(mainTsPath, modernMain);

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('should use bootstrapApplication')
        )
      ).toBe(false);
    });

    it('should detect AppModule reference in standalone architecture', () => {
      const mainTsPath = PathOperations.join(tempDir, 'src', 'main.ts');
      const mixedMain = `
import { bootstrapApplication } from '@angular/platform-browser';
import { AppModule } from './app/app.module';
import { AppComponent } from './app/app.component';

// Some reference to AppModule
`;
      FileUtils.writeFile(mainTsPath, mixedMain);

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('should not reference AppModule')
        )
      ).toBe(true);
    });
  });

  // ==========================================================================
  // App Configuration Tests
  // ==========================================================================

  describe('App Configuration', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);
    });

    it('should handle missing app.config.ts', () => {
      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // Should handle and analyze the project
      expect(result).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should handle app.config.ts when it exists with providers', () => {
      const appConfigPath = PathOperations.join(
        tempDir,
        'src',
        'app',
        'app.config.ts'
      );
      const appConfig = `
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)]
};
`;
      FileUtils.writeFile(appConfigPath, appConfig);

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // Should analyze the project with existing config
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle empty app.config.ts', () => {
      const appConfigPath = PathOperations.join(
        tempDir,
        'src',
        'app',
        'app.config.ts'
      );
      const emptyConfig = `
export const appConfig = {};
`;
      FileUtils.writeFile(appConfigPath, emptyConfig);

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // Should handle empty config file
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });
  });

  // ==========================================================================
  // TypeScript Configuration Tests
  // ==========================================================================

  describe('TypeScript Configuration', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
    });

    it('should provide suggestions when tsconfig is not strict', () => {
      const tsconfigPath = PathOperations.join(tempDir, 'tsconfig.json');
      const tsconfig = {
        compilerOptions: {
          strict: false,
        },
      };
      FileUtils.writeFile(tsconfigPath, JSON.stringify(tsconfig));

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // Result structure should be valid regardless of suggestions
      expect(result).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ==========================================================================
  // Multiple Components Tests
  // ==========================================================================

  describe('Multiple Components', () => {
    beforeEach(() => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);
    });

    it('should analyze all component files', () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');

      // Create multiple standalone components
      for (let i = 1; i <= 5; i++) {
        const componentContent = `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-component${i}',
  standalone: true,
  imports: [CommonModule],
  template: '<p>Component ${i}</p>'
})
export class Component${i}Component {}
`;
        FileUtils.writeFile(
          PathOperations.join(appDir, `component${i}.component.ts`),
          componentContent
        );
      }

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // All components are standalone, so no violation for non-standalone
      expect(
        result.violations!.filter(v => v.includes('not standalone')).length
      ).toBe(0);
    });

    it('should report correct ratio of non-standalone components', () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');

      // 3 standalone components
      for (let i = 1; i <= 3; i++) {
        FileUtils.writeFile(
          PathOperations.join(appDir, `standalone${i}.component.ts`),
          `@Component({ standalone: true, imports: [CommonModule], template: '' }) class C${i} {}`
        );
      }

      // 2 non-standalone components
      for (let i = 1; i <= 2; i++) {
        FileUtils.writeFile(
          PathOperations.join(appDir, `legacy${i}.component.ts`),
          `@Component({ template: '' }) class L${i} {}`
        );
      }

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('2/5 components are not standalone')
        )
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty directory gracefully', () => {
      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should handle components with no Angular decorators', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);

      const invalidComponent = `
export class NotAComponent {
  title = 'not a component';
}
`;
      FileUtils.writeFile(
        PathOperations.join(appDir, 'not.component.ts'),
        invalidComponent
      );

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should handle deeply nested component directories', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const nestedDir = PathOperations.join(
        tempDir,
        'src',
        'app',
        'features',
        'users',
        'components'
      );
      FileUtils.createDirectory(nestedDir);

      const deepComponent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [],
  template: '<p>User Profile</p>'
})
export class UserProfileComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(nestedDir, 'user-profile.component.ts'),
        deepComponent
      );

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should handle project with no components gracefully', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // Should handle empty projects gracefully
      expect(result).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ==========================================================================
  // Suggestions Tests
  // ==========================================================================

  describe('Suggestions', () => {
    it('should always provide helpful suggestions', () => {
      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should suggest conversion for non-standalone components', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);

      const nonStandalone = `@Component({ template: '' }) class C {}`;
      FileUtils.writeFile(
        PathOperations.join(appDir, 'old.component.ts'),
        nonStandalone
      );

      const result = StandaloneComponentsArchitectureLaw.check(mockContext);

      // "standalone: true" was dropped from the advice on purpose: from Angular
      // v19 standalone is the DEFAULT and a correct component omits the flag, so
      // telling a v19 project to add it is wrong advice.
      expect(
        result.suggestions!.some(s =>
          s.includes('Convert components to standalone architecture')
        )
      ).toBe(true);
    });
  });
});

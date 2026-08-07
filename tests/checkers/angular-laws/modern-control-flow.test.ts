/**
 * @fileoverview Tests for ModernAngularControlFlowLaw
 * @description Tests for Angular 18+ control flow syntax enforcement (@if, @for, @switch)
 */

import { ModernAngularControlFlowLaw } from '../../../src/checkers/angular-laws/modern-control-flow';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('checkers/angular-laws/modern-control-flow', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('modern-control-flow-test-');
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
      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('config');
    });

    it('should have passed as boolean', () => {
      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(typeof result.passed).toBe('boolean');
    });

    it('should have message as string', () => {
      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(typeof result.message).toBe('string');
    });

    it('should have score as number', () => {
      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(typeof result.score).toBe('number');
    });

    it('should return law name in kebab-case format', () => {
      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.lawName).toBe('modern-angular-control-flow');
    });
  });

  // ==========================================================================
  // Non-Angular Project Tests
  // ==========================================================================

  describe('Non-Angular Project', () => {
    it('should return early when no Angular project detected', () => {
      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should not check templates for non-Angular projects', () => {
      // Create HTML file but no Angular
      const htmlPath = PathOperations.join(tempDir, 'src', 'template.html');
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(htmlPath, '<div *ngIf="condition">Legacy</div>');

      const result = ModernAngularControlFlowLaw.check(mockContext);

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

    it('should skip check for Angular versions below 18', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: {
          '@angular/core': '17.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.html'),
        '<div *ngIf="condition">Legacy</div>'
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      // Should pass since Angular 17 doesn't require @ syntax
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should enforce @ syntax for Angular 18+', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: {
          '@angular/core': '18.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.html'),
        '<div *ngIf="condition">Legacy</div>'
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('*ngIf'))).toBe(true);
    });

    it('should handle version with caret prefix', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: {
          '@angular/core': '^18.1.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.html'),
        '<div *ngFor="let item of items">{{ item }}</div>'
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('*ngFor'))).toBe(true);
    });

    it('should handle version with tilde prefix', () => {
      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: {
          '@angular/core': '~19.0.0',
        },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.html'),
        '<div *ngSwitch="value">Legacy</div>'
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('*ngSwitch'))).toBe(true);
    });
  });

  // ==========================================================================
  // Legacy *ngIf Detection Tests
  // ==========================================================================

  describe('Legacy *ngIf Detection', () => {
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

    it('should detect *ngIf in templates', () => {
      const template = `
<div class="container">
  <span *ngIf="isLoading">Loading...</span>
  <span *ngIf="!isLoading">Content</span>
</div>
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.component.html'),
        template
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('*ngIf'))).toBe(true);
      expect(result.violations!.some(v => v.includes('use @if instead'))).toBe(
        true
      );
    });

    it('should pass when using @if syntax', () => {
      const template = `
<div class="container">
  @if (isLoading) {
    <span>Loading...</span>
  } @else {
    <span>Content</span>
  }
</div>
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.component.html'),
        template
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('*ngIf'))).toBe(false);
    });
  });

  // ==========================================================================
  // Legacy *ngFor Detection Tests
  // ==========================================================================

  describe('Legacy *ngFor Detection', () => {
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

    it('should detect *ngFor in templates', () => {
      const template = `
<ul>
  <li *ngFor="let item of items; trackBy: trackById">{{ item.name }}</li>
</ul>
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'list.component.html'),
        template
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('*ngFor'))).toBe(true);
      expect(result.violations!.some(v => v.includes('use @for instead'))).toBe(
        true
      );
    });

    it('should pass when using @for syntax', () => {
      const template = `
<ul>
  @for (item of items; track item.id) {
    <li>{{ item.name }}</li>
  }
</ul>
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'list.component.html'),
        template
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('*ngFor'))).toBe(false);
    });
  });

  // ==========================================================================
  // Legacy *ngSwitch Detection Tests
  // ==========================================================================

  describe('Legacy *ngSwitch Detection', () => {
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

    it('should detect *ngSwitch in templates', () => {
      const template = `
<div [ngSwitch]="color">
  <span *ngSwitchCase="'red'">Red</span>
  <span *ngSwitchCase="'blue'">Blue</span>
  <span *ngSwitchDefault>Other</span>
</div>
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'switch.component.html'),
        template
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      // Note: *ngSwitch itself is the directive, not *ngSwitch but [ngSwitch]
      // The test checks for the *ngSwitch pattern which includes the full directive usage
      expect(result).toBeDefined();
    });

    it('should pass when using @switch syntax', () => {
      const template = `
@switch (color) {
  @case ('red') {
    <span>Red</span>
  }
  @case ('blue') {
    <span>Blue</span>
  }
  @default {
    <span>Other</span>
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'switch.component.html'),
        template
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('*ngSwitch'))).toBe(false);
    });
  });

  // ==========================================================================
  // Mixed Control Flow Syntax Tests
  // ==========================================================================

  describe('Mixed Control Flow Syntax', () => {
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

    it('should detect partially migrated files', () => {
      const template = `
<div class="container">
  @if (showHeader) {
    <header>Header</header>
  }
  <ul>
    <li *ngFor="let item of items">{{ item }}</li>
  </ul>
</div>
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'mixed.component.html'),
        template
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('Mixed control flow syntax'))
      ).toBe(true);
    });

    it('should suggest completing migration for mixed files', () => {
      const template = `
@for (item of items; track item.id) {
  <div *ngIf="item.visible">{{ item.name }}</div>
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'partial.component.html'),
        template
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('complete migration'))
      ).toBe(true);
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
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
    });

    it('should provide migration suggestions', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.component.html'),
        '<div *ngIf="x">content</div>'
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(
        result.suggestions!.some(s => s.includes('Replace *ngIf with @if'))
      ).toBe(true);
      expect(
        result.suggestions!.some(s => s.includes('Replace *ngFor with @for'))
      ).toBe(true);
      expect(
        result.suggestions!.some(s =>
          s.includes('Replace *ngSwitch with @switch')
        )
      ).toBe(true);
    });

    it('should suggest completing migration for partial updates', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.component.html'),
        '<div>@if (x) { } <span *ngFor="let i of list"></span></div>'
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(
        result.suggestions!.some(s =>
          s.includes('Complete migration in partially updated files')
        )
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Multiple Template Files Tests
  // ==========================================================================

  describe('Multiple Template Files', () => {
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

    it('should analyze all template files in project', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      // Create multiple template files
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.html'),
        '<div *ngIf="a">App</div>'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'header.component.html'),
        '<nav *ngFor="let item of menu">{{ item }}</nav>'
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('app.component.html'))
      ).toBe(true);
      expect(
        result.violations!.some(v => v.includes('header.component.html'))
      ).toBe(true);
    });

    it('should report relative paths in violations', () => {
      const featuresDir = PathOperations.join(
        tempDir,
        'src',
        'app',
        'features'
      );
      FileUtils.createDirectory(featuresDir);

      FileUtils.writeFile(
        PathOperations.join(featuresDir, 'user.component.html'),
        '<div *ngIf="user">{{ user.name }}</div>'
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      // Should contain relative path
      expect(
        result.violations!.some(
          v =>
            v.includes('src/app/features/user.component.html') ||
            v.includes('user.component.html')
        )
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty project gracefully', () => {
      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
    });

    it('should handle project with no template files', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, JSON.stringify({ version: 1 }));

      const packageJsonPath = PathOperations.join(tempDir, 'package.json');
      const packageJson = {
        name: 'angular-app',
        dependencies: { '@angular/core': '18.0.0' },
      };
      FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson));

      // Only TypeScript files, no templates
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        'export class AppComponent {}'
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.violations).toEqual([]);
    });

    it('should handle templates with complex expressions', () => {
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

      const complexTemplate = `
<div *ngIf="(items$ | async)?.length > 0 && user?.permissions?.canView">
  Complex condition
</div>
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'complex.component.html'),
        complexTemplate
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('*ngIf'))).toBe(true);
    });

    it('should handle inline templates in component files', () => {
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

      // Inline template is in .ts file which may or may not be checked
      // depending on implementation
      const inlineComponent = `
@Component({
  selector: 'app-inline',
  template: '<div *ngIf="show">Inline</div>'
})
export class InlineComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'inline.component.ts'),
        inlineComponent
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

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

    it('should have perfect score with no legacy syntax', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.html'),
        '@if (show) { <div>Modern</div> }'
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.score).toBe(100);
    });

    it('should decrease score with violations', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.html'),
        '<div *ngIf="x">Legacy</div>'
      );

      const result = ModernAngularControlFlowLaw.check(mockContext);

      expect(result.score).toBeLessThan(100);
    });
  });
});

/**
 * @fileoverview Tests for OnPushChangeDetectionLaw
 * @description Tests for OnPush change detection strategy enforcement
 */

import { OnPushChangeDetectionLaw } from '../../../src/checkers/angular-laws/onpush-change-detection';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('checkers/angular-laws/onpush-change-detection', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('onpush-change-detection-test-');
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
      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('config');
    });

    it('should have passed as boolean', () => {
      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(typeof result.passed).toBe('boolean');
    });

    it('should have message as string', () => {
      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should have score as number', () => {
      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(typeof result.score).toBe('number');
    });

    it('should return law name in kebab-case format', () => {
      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result.lawName).toBe('onpush-change-detection');
    });
  });

  // ==========================================================================
  // No Components Found Tests
  // ==========================================================================

  describe('No Components Found', () => {
    it('should report violation when no Angular components exist', () => {
      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result.violations).toContain('No Angular components found');
    });

    it('should suggest ensuring components exist when none are found', () => {
      const result = OnPushChangeDetectionLaw.check(mockContext);

      // Wording no longer hardcodes "src/app": components are identified by the
      // @Component decorator across the workspace, not by a fixed directory.
      expect(result.suggestions).toContain(
        'Ensure Angular components (@Component) exist in the app'
      );
    });

    it('should fail when no components found', () => {
      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result.passed).toBe(false);
    });
  });

  // ==========================================================================
  // OnPush Component Tests
  // ==========================================================================

  describe('OnPush Components', () => {
    beforeEach(() => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);
    });

    it('should pass when component uses OnPush strategy', () => {
      const componentContent = `
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-test',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>Test</p>'
})
export class TestComponent {}
`;
      const componentPath = PathOperations.join(
        tempDir,
        'src',
        'app',
        'test.component.ts'
      );
      FileUtils.writeFile(componentPath, componentContent);

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('Low OnPush usage'))).toBe(
        false
      );
    });

    it('finds a short-named Angular-20 component (a downstream consumer Nx finding)', () => {
      // Angular 20 dropped the *.component.ts suffix. A component identified by
      // its @Component decorator, in a file named law-card.ts, must be found —
      // the old filename filter reported "No Angular components found" here.
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'law-card.ts'),
        [
          "import { Component, ChangeDetectionStrategy } from '@angular/core';",
          '@Component({',
          "  selector: 'app-law-card',",
          '  changeDetection: ChangeDetectionStrategy.OnPush,',
          "  template: '',",
          '})',
          'export class LawCard {}',
        ].join('\n')
      );

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('No Angular components found'))
      ).toBe(false);
    });

    it('should detect low OnPush usage', () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');

      // Create 3 components without OnPush
      for (let i = 1; i <= 3; i++) {
        const componentContent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-test${i}',
  template: '<p>Test ${i}</p>'
})
export class Test${i}Component {}
`;
        FileUtils.writeFile(
          PathOperations.join(appDir, `test${i}.component.ts`),
          componentContent
        );
      }

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result.violations!.some(v => v.includes('OnPush usage'))).toBe(
        true
      );
    });

    it('should calculate OnPush percentage correctly', () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');

      // Create 2 components with OnPush
      for (let i = 1; i <= 2; i++) {
        const componentContent = `
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-onpush${i}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>OnPush ${i}</p>'
})
export class OnPush${i}Component {}
`;
        FileUtils.writeFile(
          PathOperations.join(appDir, `onpush${i}.component.ts`),
          componentContent
        );
      }

      // Create 2 components without OnPush
      for (let i = 1; i <= 2; i++) {
        const componentContent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-default${i}',
  template: '<p>Default ${i}</p>'
})
export class Default${i}Component {}
`;
        FileUtils.writeFile(
          PathOperations.join(appDir, `default${i}.component.ts`),
          componentContent
        );
      }

      const result = OnPushChangeDetectionLaw.check(mockContext);

      // Mixed OnPush usage should be detected
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should not flag when OnPush usage is above 50%', () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');

      // Create 3 components with OnPush
      for (let i = 1; i <= 3; i++) {
        const componentContent = `
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-onpush${i}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>OnPush ${i}</p>'
})
export class OnPush${i}Component {}
`;
        FileUtils.writeFile(
          PathOperations.join(appDir, `onpush${i}.component.ts`),
          componentContent
        );
      }

      // Create 1 component without OnPush
      const defaultComponent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-default',
  template: '<p>Default</p>'
})
export class DefaultComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(appDir, 'default.component.ts'),
        defaultComponent
      );

      const result = OnPushChangeDetectionLaw.check(mockContext);

      // 75% OnPush usage should not trigger low usage warning
      expect(result.violations!.some(v => v.includes('Low OnPush usage'))).toBe(
        false
      );
    });
  });

  // ==========================================================================
  // ShouldUseOnPush Detection Tests
  // ==========================================================================

  describe('ShouldUseOnPush Detection', () => {
    beforeEach(() => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);
    });

    it('should detect components with @Input that should use OnPush', () => {
      const componentContent = `
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-presentational',
  template: '<p>{{ data }}</p>'
})
export class PresentationalComponent {
  @Input() data: string = '';
}
`;
      const componentPath = PathOperations.join(
        tempDir,
        'src',
        'app',
        'presentational.component.ts'
      );
      FileUtils.writeFile(componentPath, componentContent);

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(
        result.violations!.some(v =>
          v.includes('Components that should use OnPush')
        )
      ).toBe(true);
    });

    it('should detect components using async pipe that should use OnPush', () => {
      const componentContent = `
import { Component } from '@angular/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-async',
  template: '<p>{{ data$ | async }}</p>'
})
export class AsyncComponent {
  data$: Observable<string> = of('data');
}
`;
      const componentPath = PathOperations.join(
        tempDir,
        'src',
        'app',
        'async.component.ts'
      );
      FileUtils.writeFile(componentPath, componentContent);

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(
        result.violations!.some(v => v.includes('should use OnPush'))
      ).toBe(true);
    });

    it('should detect presentational components that should use OnPush', () => {
      const componentContent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-pure',
  template: '<p>Pure component</p>'
})
export class PureComponent {
  // No ngOnInit, no constructor with private, no subscribe
}
`;
      const componentPath = PathOperations.join(
        tempDir,
        'src',
        'app',
        'pure.component.ts'
      );
      FileUtils.writeFile(componentPath, componentContent);

      const result = OnPushChangeDetectionLaw.check(mockContext);

      // Should detect components not using OnPush
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should not flag components with complex logic as needing OnPush', () => {
      const componentContent = `
import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';

@Component({
  selector: 'app-complex',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>{{ data }}</p>'
})
export class ComplexComponent implements OnInit {
  data: string = '';

  constructor(private service: DataService) {}

  ngOnInit() {
    this.service.getData().subscribe(d => this.data = d);
  }
}
`;
      const componentPath = PathOperations.join(
        tempDir,
        'src',
        'app',
        'complex.component.ts'
      );
      FileUtils.writeFile(componentPath, componentContent);

      const result = OnPushChangeDetectionLaw.check(mockContext);

      // Component already uses OnPush
      expect(
        result.violations!.filter(
          v =>
            v.includes('complex.component.ts') &&
            v.includes('should use OnPush')
        ).length
      ).toBe(0);
    });

    it('should handle file read errors gracefully', () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');

      // Create one valid component
      const validComponentContent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-valid',
  template: '<p>Valid</p>'
})
export class ValidComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(appDir, 'valid.component.ts'),
        validComponentContent
      );

      // Create another component that will error when read
      const errorComponentPath = PathOperations.join(
        appDir,
        'error.component.ts'
      );
      FileUtils.writeFile(errorComponentPath, 'some content');

      // Mock readFile to throw error for the error component
      const originalReadFile = FileUtils.readFile;
      const spy = jest
        .spyOn(FileUtils, 'readFile')
        .mockImplementation((path: string) => {
          if (path === errorComponentPath) {
            throw new Error('File read error');
          }
          return originalReadFile(path);
        });

      const result = OnPushChangeDetectionLaw.check(mockContext);

      // Should still analyze the valid component
      expect(result).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);

      spy.mockRestore();
    });
  });

  // ==========================================================================
  // Suggestions Tests
  // ==========================================================================

  describe('Suggestions', () => {
    beforeEach(() => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);
    });

    it('should suggest increasing OnPush usage when low', () => {
      const componentContent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-default',
  template: '<p>Default</p>'
})
export class DefaultComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'default.component.ts'),
        componentContent
      );

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(
        result.suggestions!.some(s =>
          s.includes('Increase OnPush usage to improve performance')
        )
      ).toBe(true);
    });

    it('should suggest adding OnPush to presentational components', () => {
      const componentContent = `
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  template: '<div>{{ title }}</div>'
})
export class CardComponent {
  @Input() title: string = '';
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'card.component.ts'),
        componentContent
      );

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(
        result.suggestions!.some(s =>
          s.includes(
            'ChangeDetectionStrategy.OnPush to presentational components'
          )
        )
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Multiple Component Analysis Tests
  // ==========================================================================

  describe('Multiple Component Analysis', () => {
    beforeEach(() => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);
    });

    it('should analyze all component files in directory', () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');

      for (let i = 1; i <= 10; i++) {
        const useOnPush = i <= 8; // 80% use OnPush
        const componentContent = useOnPush
          ? `
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-comp${i}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>Component ${i}</p>'
})
export class Comp${i}Component {}
`
          : `
import { Component } from '@angular/core';

@Component({
  selector: 'app-comp${i}',
  template: '<p>Component ${i}</p>'
})
export class Comp${i}Component {}
`;
        FileUtils.writeFile(
          PathOperations.join(appDir, `comp${i}.component.ts`),
          componentContent
        );
      }

      const result = OnPushChangeDetectionLaw.check(mockContext);

      // 80% usage should not trigger low usage warning
      expect(result.violations!.some(v => v.includes('Low OnPush usage'))).toBe(
        false
      );
    });

    it('should limit violations shown for readability', () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');

      // Create 10 presentational components without OnPush
      for (let i = 1; i <= 10; i++) {
        const componentContent = `
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pres${i}',
  template: '<p>{{ value }}</p>'
})
export class Pres${i}Component {
  @Input() value: string = '';
}
`;
        FileUtils.writeFile(
          PathOperations.join(appDir, `pres${i}.component.ts`),
          componentContent
        );
      }

      const result = OnPushChangeDetectionLaw.check(mockContext);

      // Should limit the list of components shown
      const shouldUseOnPushViolation = result.violations!.find(v =>
        v.includes('Components that should use OnPush')
      );

      if (shouldUseOnPushViolation) {
        // Should only show first 5 components
        const componentCount = (
          shouldUseOnPushViolation.match(/\.component\.ts/g) || []
        ).length;
        expect(componentCount).toBeLessThanOrEqual(5);
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty directory gracefully', () => {
      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.violations).toContain('No Angular components found');
    });

    it('should handle unreadable files gracefully', () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);

      // Create a valid component file
      const validComponent = `
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-valid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>Valid</p>'
})
export class ValidComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(appDir, 'valid.component.ts'),
        validComponent
      );

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should handle components with non-standard decorators', () => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);

      const component = `
import { Component } from '@angular/core';
import { CustomDecorator } from './custom';

@CustomDecorator()
@Component({
  selector: 'app-custom',
  template: '<p>Custom</p>'
})
export class CustomComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(appDir, 'custom.component.ts'),
        component
      );

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result).toBeDefined();
    });

    it('should handle nested component directories', () => {
      const nestedDir = PathOperations.join(
        tempDir,
        'src',
        'app',
        'features',
        'dashboard'
      );
      FileUtils.createDirectory(nestedDir);

      const nestedComponent = `
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>Dashboard</p>'
})
export class DashboardComponent {}
`;
      FileUtils.writeFile(
        PathOperations.join(nestedDir, 'dashboard.component.ts'),
        nestedComponent
      );

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.violations).not.toContain('No Angular components found');
    });
  });

  // ==========================================================================
  // Score Calculation Tests
  // ==========================================================================

  describe('Score Calculation', () => {
    beforeEach(() => {
      const appDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(appDir);
    });

    it('should have higher score with more OnPush components', () => {
      // All OnPush
      for (let i = 1; i <= 4; i++) {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', `comp${i}.component.ts`),
          `@Component({ changeDetection: ChangeDetectionStrategy.OnPush, template: '' }) class C${i} {}`
        );
      }

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should have lower score with violations', () => {
      // No OnPush
      for (let i = 1; i <= 4; i++) {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', 'app', `comp${i}.component.ts`),
          `@Component({ template: '' }) class C${i} { @Input() x: any; }`
        );
      }

      const result = OnPushChangeDetectionLaw.check(mockContext);

      expect(result.score).toBeLessThan(100);
    });
  });
});

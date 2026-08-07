/**
 * Component Selector Prefix Compliance Law
 * Ensures all Angular component selectors use the configured componentPrefix
 */

import { glob } from 'glob';
import * as path from 'path';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { AngularLawBase } from './angular-law-base';

export class ComponentSelectorPrefixLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const projectRoot = context.projectRoot;

    // Allow more than one valid prefix: the app prefix plus any design-system
    // prefixes (e.g. "acme" for @acme/ui, like Material's "mat"). Configure via
    // thresholds.angular.allowedComponentPrefixes; project.componentPrefix is
    // always included. Trailing dashes are tolerated ("app-" or "app").
    const prefixes = [
      context.config.project.componentPrefix,
      ...(context.config.thresholds?.angular?.allowedComponentPrefixes ?? []),
    ]
      .filter((p): p is string => typeof p === 'string' && p.length > 0)
      .map(p => p.replace(/-+$/, ''));

    if (prefixes.length === 0) {
      suggestions.push('No componentPrefix configured - skipping validation');
      return AngularLawBase.createResult(
        violations,
        'Component Selector Prefix',
        'ANGULAR',
        suggestions,
        context
      );
    }

    // Find all component TypeScript files
    const componentFiles = glob.sync('**/*.component.ts', {
      cwd: projectRoot,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.nx/**',
        '**/.angular/**',
        '**/packages/ruleofcode/**',
      ],
      absolute: true,
    });

    for (const filePath of componentFiles) {
      try {
        const content = FileUtils.readFile(filePath);

        // Match @Component({ selector: '...' })
        const selectorMatch = content.match(
          /@Component\s*\(\s*\{[^}]*selector\s*:\s*['"]([^'"]+)['"]/s
        );

        if (selectorMatch) {
          const selector = selectorMatch[1];
          const relativePath = path.relative(projectRoot, filePath);

          // Pass if the selector starts with ANY allowed prefix.
          const ok =
            !!selector && prefixes.some(p => selector.startsWith(`${p}-`));
          if (selector && !ok) {
            const allowed = prefixes.map(p => `${p}-`).join('", "');
            violations.push(
              `${relativePath}: Selector "${selector}" should start with "${allowed}"`
            );
          }
        }
      } catch (error) {
        // Silently skip files that can't be read
        continue;
      }
    }

    return AngularLawBase.createResult(
      violations,
      'Component Selector Prefix',
      'ANGULAR',
      suggestions,
      context
    );
  }
}

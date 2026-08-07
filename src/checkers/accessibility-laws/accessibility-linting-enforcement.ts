/**
 * Accessibility Linting Enforcement Law (META / config)
 * If a project has Angular templates, its ESLint config must activate the
 * @angular-eslint template a11y rule set. This single meta-law installs the
 * infrastructure that catches most per-element a11y issues at every lint, so
 * accessibility debt cannot accumulate unchecked.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AccessibilityLawBase } from './accessibility-law-base';

export class AccessibilityLintingEnforcementLaw extends AccessibilityLawBase {
  private static readonly LAW_NAME = 'Accessibility Linting Enforcement';
  private static readonly PLUGIN_TOKENS = [
    '@angular-eslint/template',
    '@angular-eslint/eslint-plugin-template',
  ];
  // Core a11y rules expected to be enabled (the high-value subset).
  private static readonly CORE_RULES = [
    'click-events-have-key-events',
    'label-has-associated-control',
    'valid-aria',
    'alt-text',
    'role-has-required-aria',
  ];

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const required =
      context.config.thresholds?.accessibility?.requireAngularTemplateA11y !==
      false; // default: true
    if (!required) {
      return this.createResult(violations, this.LAW_NAME, [], context);
    }

    // Only applies when the project actually has Angular templates.
    const templates = this.findTemplateFiles(projectRoot, context);
    if (templates.length === 0) {
      return this.createResult(violations, this.LAW_NAME, [], context);
    }

    const eslintContent = this.readEslintConfigs(projectRoot, context);
    if (eslintContent === null) {
      violations.push(
        'No ESLint configuration found to enforce template accessibility — add @angular-eslint template a11y rules.'
      );
      return this.createResult(
        violations,
        this.LAW_NAME,
        ['Add @angular-eslint/eslint-plugin-template with the a11y rule set'],
        context
      );
    }

    const hasPlugin = this.PLUGIN_TOKENS.some(token =>
      eslintContent.includes(token)
    );
    if (!hasPlugin) {
      violations.push(
        'ESLint config has no @angular-eslint template a11y plugin — accessibility is unenforced. Add the plugin + a11y rules on error.'
      );
    } else {
      const missing = this.CORE_RULES.filter(
        rule => !eslintContent.includes(rule)
      );
      if (missing.length > 0) {
        violations.push(
          `@angular-eslint template a11y rules missing: ${missing.join(', ')}.`
        );
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      [
        'Enable @angular-eslint/eslint-plugin-template for *.html',
        'Turn on click-events-have-key-events, label-has-associated-control, valid-aria, alt-text, role-has-required-aria (error)',
      ],
      context
    );
  }

  /** Read all ESLint config files (root + per-project) into one string, or null. */
  private static readEslintConfigs(
    projectRoot: string,
    context: LawCheckContext
  ): string | null {
    const parts: string[] = [];

    const rootNames = [
      'eslint.config.mjs',
      'eslint.config.js',
      'eslint.config.cjs',
      'eslint.config.ts',
      '.eslintrc.json',
      '.eslintrc.js',
      '.eslintrc.cjs',
    ];
    for (const name of rootNames) {
      const p = PathOperations.join(projectRoot, name);
      if (FileUtils.exists(p)) {
        const c = FileUtils.readFileContentSync(p);
        if (c) parts.push(c);
      }
    }

    // Per-project / nested ESLint configs discovered through the workspace.
    const discovered = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['mjs', 'cjs', 'js', 'json'],
      context.config
    ).filter(f => /(?:^|[\\/])(?:eslint\.config|\.eslintrc)/.test(f));
    for (const f of discovered) {
      const c = FileUtils.readFileContentSync(f);
      if (c) parts.push(c);
    }

    return parts.length > 0 ? parts.join('\n') : null;
  }
}

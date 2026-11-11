/**
 * Accessibility Linting Enforcement Law (META / config)
 * A project's ESLint config must activate the accessibility rule set for the
 * markup it writes, so accessibility debt cannot accumulate unchecked:
 *
 * - Angular templates (.html files in a project that declares @angular/core):
 *   the @angular-eslint template a11y rules. An .html file in a project
 *   without Angular (a Vite index.html, public/*.html) is not an Angular
 *   template and does not ask for the Angular plugin.
 * - JSX (.tsx/.jsx): eslint-plugin-jsx-a11y with its core rules — named one
 *   by one, or through the plugin's `recommended`/`strict` preset, which
 *   enables all of them (eslint-plugin-jsx-a11y 6.10.2 lib/index.js). A flat
 *   config's `<plugin>.flatConfigs.recommended` is found by parsing the
 *   config, so the binding is the one imported from eslint-plugin-jsx-a11y.
 *   eslint-config-next registers the plugin and enables alt-text, aria-props
 *   and role-has-required-aria-props (eslint-config-next 16.4.6
 *   dist/index.js:176-191), so a Next config is asked only for the others.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { declaredDependencies } from '../../utils/law-requirements';
import { PathOperations } from '../../utils/path-operations';
import { ReactProject } from '../../utils/react/react-project';
import { loadTypeScript, TsxSource, type TypeScriptModule } from '../../utils/react/tsx-source';
import { AccessibilityLawBase } from './accessibility-law-base';
import { JSX_EXTENSIONS } from './jsx-sources';

interface EslintConfig {
  file: string;
  content: string;
}

const JSX_PLUGIN = 'eslint-plugin-jsx-a11y';
const JSX_RULE_PREFIX = 'jsx-a11y/';
const NEXT_CONFIG_TOKENS = ['eslint-config-next', 'next/core-web-vitals'];
const NEXT_JSX_RULES = ['alt-text', 'aria-props', 'role-has-required-aria-props'];
const PRESET_NAMES = ['recommended', 'strict'];
const PRESET_HOLDERS = ['flatConfigs', 'configs'];

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
  private static readonly JSX_CORE_RULES = [
    'alt-text',
    'aria-props',
    'click-events-have-key-events',
    'label-has-associated-control',
    'role-has-required-aria-props',
  ];

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const angularRequired =
      context.config.thresholds?.accessibility?.requireAngularTemplateA11y !==
      false; // default: true
    const needsAngular =
      angularRequired &&
      this.findTemplateFiles(projectRoot, context).length > 0 &&
      declaredDependencies(projectRoot).has('@angular/core');
    const needsJsx = ReactProject.sourceFiles(context, JSX_EXTENSIONS).length > 0;
    if (!needsAngular && !needsJsx) {
      return this.createResult(violations, this.LAW_NAME, [], context);
    }

    const configs = this.readEslintConfigs(projectRoot, context);
    if (configs.length === 0) {
      violations.push(
        `No ESLint configuration found to enforce accessibility — add ${[
          needsAngular ? '@angular-eslint template a11y rules' : '',
          needsJsx ? 'eslint-plugin-jsx-a11y (recommended)' : '',
        ]
          .filter(Boolean)
          .join(' and ')}.`
      );
      return this.createResult(
        violations,
        this.LAW_NAME,
        ['Add an ESLint config with the a11y rule set for your markup'],
        context
      );
    }
    const eslintContent = configs.map(c => c.content).join('\n');
    if (needsAngular) violations.push(...this.angularFindings(eslintContent));
    if (needsJsx) violations.push(...this.jsxFindings(context, configs, eslintContent));

    return this.createResult(
      violations,
      this.LAW_NAME,
      [
        'Enable @angular-eslint/eslint-plugin-template for *.html',
        'Turn on click-events-have-key-events, label-has-associated-control, valid-aria, alt-text, role-has-required-aria (error)',
        'For .tsx/.jsx: enable eslint-plugin-jsx-a11y — jsxA11y.flatConfigs.recommended, or plugin:jsx-a11y/recommended',
      ],
      context
    );
  }

  private static angularFindings(eslintContent: string): string[] {
    const hasPlugin = this.PLUGIN_TOKENS.some(token => eslintContent.includes(token));
    if (!hasPlugin) {
      return [
        'ESLint config has no @angular-eslint template a11y plugin — accessibility is unenforced. Add the plugin + a11y rules on error.',
      ];
    }
    const missing = this.CORE_RULES.filter(rule => !eslintContent.includes(rule));
    return missing.length > 0
      ? [`@angular-eslint template a11y rules missing: ${missing.join(', ')}.`]
      : [];
  }

  private static jsxFindings(
    context: LawCheckContext,
    configs: EslintConfig[],
    eslintContent: string
  ): string[] {
    const viaNext = NEXT_CONFIG_TOKENS.some(token => eslintContent.includes(token));
    const pluginLoaded =
      viaNext ||
      eslintContent.includes(JSX_PLUGIN) ||
      eslintContent.includes(`plugin:${JSX_RULE_PREFIX}`) ||
      /['"]jsx-a11y['"]/.test(eslintContent);
    if (!pluginLoaded) {
      return [
        'The project has .tsx/.jsx files but its ESLint config does not load eslint-plugin-jsx-a11y — JSX accessibility is unenforced. Enable its recommended preset.',
      ];
    }
    if (this.usesJsxPreset(context, configs, eslintContent)) return [];
    const missing = this.JSX_CORE_RULES.filter(
      rule =>
        !eslintContent.includes(`${JSX_RULE_PREFIX}${rule}`) &&
        !(viaNext && NEXT_JSX_RULES.includes(rule))
    );
    return missing.length > 0
      ? [
          `eslint-plugin-jsx-a11y rules missing: ${missing.join(', ')} — enable them, or use the plugin's recommended preset.`,
        ]
      : [];
  }

  /** `plugin:jsx-a11y/recommended|strict`, or `<binding>.flatConfigs|configs.recommended|strict`. */
  private static usesJsxPreset(
    context: LawCheckContext,
    configs: EslintConfig[],
    eslintContent: string
  ): boolean {
    if (PRESET_NAMES.some(name => eslintContent.includes(`plugin:${JSX_RULE_PREFIX}${name}`))) {
      return true;
    }
    const scripts = configs.filter(c => /\.[cm]?[jt]s$/.test(c.file) && c.content.includes(JSX_PLUGIN));
    if (scripts.length === 0) return false;
    const ts = loadTypeScript(context.projectRoot);
    if (!ts) return false;
    return scripts.some(config => this.scriptUsesPreset(ts, config));
  }

  private static scriptUsesPreset(ts: TypeScriptModule, config: EslintConfig): boolean {
    const source = TsxSource.parse(ts, config.file, config.content);
    const bindings = new Set<string>();
    for (const entry of source.imports()) {
      if (entry.module !== JSX_PLUGIN) continue;
      if (entry.defaultName) bindings.add(entry.defaultName);
      if (entry.namespaceName) bindings.add(entry.namespaceName);
    }
    source.walk(node => {
      const bound = this.requireBinding(ts, node);
      if (bound) bindings.add(bound);
    });
    let found = false;
    source.walk(node => {
      if (found || !ts.isPropertyAccessExpression(node)) return;
      if (!PRESET_NAMES.includes(node.name.text)) return;
      const holder = node.expression;
      found =
        ts.isPropertyAccessExpression(holder) &&
        PRESET_HOLDERS.includes(holder.name.text) &&
        ts.isIdentifier(holder.expression) &&
        bindings.has(holder.expression.text);
    });
    return found;
  }

  /** `const x = require('eslint-plugin-jsx-a11y')` → `x`. */
  private static requireBinding(ts: TypeScriptModule, node: TS.Node): string | null {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) return null;
    const init = node.initializer;
    if (!init || !ts.isCallExpression(init)) return null;
    if (!ts.isIdentifier(init.expression) || init.expression.text !== 'require') return null;
    const argument = init.arguments[0];
    return argument && ts.isStringLiteral(argument) && argument.text === JSX_PLUGIN
      ? node.name.text
      : null;
  }

  /** Every ESLint config file (root + per-project), with its content. */
  private static readEslintConfigs(
    projectRoot: string,
    context: LawCheckContext
  ): EslintConfig[] {
    const configs: EslintConfig[] = [];
    const seen = new Set<string>();
    const add = (file: string): void => {
      const key = PathOperations.toUnixStyle(file);
      if (seen.has(key)) return;
      seen.add(key);
      const content = FileUtils.readFileContentSync(file);
      if (content) configs.push({ file, content });
    };

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
      if (FileUtils.exists(p)) add(p);
    }

    // Per-project / nested ESLint configs discovered through the workspace.
    CheckerUtils.findFilesByExtension(
      projectRoot,
      ['mjs', 'cjs', 'js', 'ts', 'json'],
      context.config
    )
      .filter(f => /(?:^|[\\/])(?:eslint\.config|\.eslintrc)/.test(f))
      .forEach(add);

    return configs;
  }
}

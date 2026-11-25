import { InternationalizationCompliancePolicyLaw } from '../../../src/laws/documentation/internationalization-compliance-policy';
import { MdFooterTemplateLaw } from '../../../src/laws/documentation/md-footer-template';
import { TodoManagementLaw } from '../../../src/laws/documentation/todo-management';
import { TodoManagementStandardsLaw } from '../../../src/laws/documentation/todo-management-standards';
import type { LawResult, ViolationDetail } from '../../../src/types/law.types';
import {
  ctx,
  manifest,
  project,
  removeProjects,
} from '../../checkers/toolkit-fixture';

afterAll(removeProjects);

/**
 * #43 — the documentation laws said how many ("1/2 markdown files missing
 * constitutional footers", "3 TODOs with improper formatting", "Hardcoded text
 * found in JSX: 4 text(s), e.g. <three of them>") and never which. Each law
 * already held the files and TODOs it counted; the details now carry them,
 * relative to the audited project (never to the directory the audit was
 * started from). The violation lines stay as they were.
 */
describe('#43 documentation laws name what they counted', () => {
  const withReason = (result: LawResult, reason: string): ViolationDetail[] =>
    (result.violationDetails ?? []).filter(d => d.message.startsWith(reason));
  const countIn = (result: LawResult, pattern: RegExp): number => {
    const line = (result.violations ?? []).find(v => pattern.test(v));
    return Number(line?.match(pattern)?.[1] ?? NaN);
  };

  describe('MD Footer Template', () => {
    const FOOTER_WITH_BAD_RATING_AND_DATE = [
      '# Guide',
      '',
      'Body.',
      '',
      '---',
      '📋 Constitutional Footer',
      'Document Version: 1.0',
      'Last Updated: soon',
      'Status: Active',
      'Investment Rating: superb',
      '',
    ].join('\n');

    it('names each file behind each count, relative to the project', async () => {
      const root = project({
        'docs/plain.md': '# Plain\n\nNo footer here.\n',
        'docs/guide.md': FOOTER_WITH_BAD_RATING_AND_DATE,
      });

      const result = await MdFooterTemplateLaw.check(ctx(root));

      expect(result.violations).toEqual(
        expect.arrayContaining([
          '1/2 markdown files missing constitutional footers',
          '1 files have incorrect investment rating format',
          '1 files have incorrect date format',
        ])
      );
      expect(result.violationDetails).toEqual(
        expect.arrayContaining([
          { file: 'docs/plain.md', message: 'no constitutional footer' },
          {
            file: 'docs/guide.md',
            message: 'footer rating not in a readable format',
          },
          {
            file: 'docs/guide.md',
            message: 'footer date not in the standard format',
          },
        ])
      );
      for (const detail of result.violationDetails ?? []) {
        expect(detail.file).toMatch(/^docs\/(plain|guide)\.md$/);
      }
    });

    it('carries no details when every footer is in order', async () => {
      const root = project({
        'README.md': [
          '# Readme',
          '',
          '---',
          '📋 Constitutional Footer',
          'Document Version: 1.0',
          'Last Updated: December 27, 2025',
          'Status: Active',
          'Investment Rating: 9/10',
          '',
        ].join('\n'),
      });

      const result = await MdFooterTemplateLaw.check(ctx(root));

      expect(result.violations).toEqual([]);
      expect(result.violationDetails).toBeUndefined();
    });
  });

  describe('TODO Management Constitutional Requirements', () => {
    it('names every TODO a line counted, at its file and line, with why', async () => {
      const root = project({
        'src/a.ts': [
          'export const a = 1;',
          '// TODO: fix',
          '// TODO (Sprint 1): replace the retry loop with the shared backoff helper',
          '',
        ].join('\n'),
      });

      const result = await TodoManagementLaw.check(ctx(root));

      expect(result.violations).toEqual(
        expect.arrayContaining(['1 vague or incomplete TODOs'])
      );
      const vague = withReason(result, 'not in the form');
      expect(vague).toEqual([
        {
          file: 'src/a.ts',
          line: 2,
          message:
            'not in the form TODO (Sprint X): description; vague or incomplete: TODO: fix',
        },
      ]);
      // Each counted kind has as many details as its line counts.
      for (const [pattern, reason] of [
        [/^(\d+) vague or incomplete TODOs$/, 'vague or incomplete'],
        [/^(\d+) potentially stale TODOs/, 'old sprint reference'],
      ] as const) {
        const counted = countIn(result, pattern);
        if (Number.isNaN(counted)) continue;
        expect(
          (result.violationDetails ?? []).filter(d =>
            d.message.includes(reason)
          )
        ).toHaveLength(counted);
      }
    });

    it('names every TODO when the count is over the limit', async () => {
      const root = project({
        'src/a.ts': [
          '// TODO (Sprint 9999): replace the retry loop with the shared backoff helper',
          '// TODO (Sprint 9999): move the date parsing into the formatting module',
          '',
        ].join('\n'),
      });

      const result = await TodoManagementLaw.check(
        ctx(root, {
          thresholds: { documentation: { maxTodoCount: 1 } },
        })
      );

      expect(result.violations).toContain('2 TODOs found (limit: 1)');
      expect(result.violationDetails).toEqual([
        {
          file: 'src/a.ts',
          line: 1,
          message:
            'one of the TODOs over the limit of 1: TODO (Sprint 9999): replace the retry loop with the shared backoff helper',
        },
        {
          file: 'src/a.ts',
          line: 2,
          message:
            'one of the TODOs over the limit of 1: TODO (Sprint 9999): move the date parsing into the formatting module',
        },
      ]);
    });

    it('carries no details when no line counts a TODO', async () => {
      const root = project({ 'src/a.ts': 'export const a = 1;\n' });

      const result = await TodoManagementLaw.check(ctx(root));

      expect(result.violations).toEqual([]);
      expect(result.violationDetails).toBeUndefined();
    });
  });

  describe('TODO Management Standards', () => {
    it('names each TODO behind the formatting and reference counts', async () => {
      const root = project({
        'src/a.ts': [
          'export const a = 1;',
          '// TODO: tidy the parser',
          '// TODO (JIRA-12): split the reader into two',
          '// FIXME (Sprint 4): this has no ticket number',
          '',
        ].join('\n'),
      });

      const result = await TodoManagementStandardsLaw.check(ctx(root));

      expect(result.violations).toEqual([
        '1 TODOs with improper formatting',
        '2 TODOs without JIRA/GitHub references',
      ]);
      expect(result.violationDetails).toEqual([
        {
          file: 'src/a.ts',
          line: 2,
          message:
            'improper formatting; no JIRA/GitHub reference: TODO: tidy the parser',
        },
        {
          file: 'src/a.ts',
          line: 4,
          message:
            'no JIRA/GitHub reference: FIXME (Sprint 4): this has no ticket number',
        },
      ]);
    });

    it('carries no details when every TODO is formatted and referenced', async () => {
      const root = project({
        'src/a.ts': '// TODO (JIRA-12): split the reader into two\n',
      });

      const result = await TodoManagementStandardsLaw.check(ctx(root));

      expect(result.violations).toEqual([]);
      expect(result.violationDetails).toBeUndefined();
    });
  });

  describe('Internationalization (i18n) Compliance Policy', () => {
    it('names every hardcoded JSX text, where the line quotes three', async () => {
      const root = project({
        'package.json': manifest({ react: '19.3.0', 'next-intl': '4.0.0' }),
        'messages/en.json': '{"title":"Hello"}',
        'src/app/page.tsx': [
          'export default function P() {',
          '  return (',
          '    <form>',
          '      <h1>Welcome back friend</h1>',
          '      <p>Sign in to continue</p>',
          '      <input placeholder="Your email address" />',
          '      <button>Send the link</button>',
          '    </form>',
          '  );',
          '}',
        ].join('\n'),
      });

      const result = await InternationalizationCompliancePolicyLaw.check(
        ctx(root)
      );

      expect(result.violations).toEqual([
        'Hardcoded text found in JSX: 4 text(s), e.g. src/app/page.tsx:4 "Welcome back friend"; src/app/page.tsx:5 "Sign in to continue"; src/app/page.tsx:6 "Your email address"; …',
      ]);
      expect(result.violationDetails).toEqual([
        {
          file: 'src/app/page.tsx',
          line: 4,
          message: 'hardcoded JSX text "Welcome back friend"',
        },
        {
          file: 'src/app/page.tsx',
          line: 5,
          message: 'hardcoded JSX text "Sign in to continue"',
        },
        {
          file: 'src/app/page.tsx',
          line: 6,
          message: 'hardcoded JSX text "Your email address"',
        },
        {
          file: 'src/app/page.tsx',
          line: 7,
          message: 'hardcoded JSX text "Send the link"',
        },
      ]);
    });

    it('names the template where the Angular check stopped', async () => {
      const root = project({
        'package.json': manifest({ '@angular/core': '20.0.0' }),
        'angular.json': JSON.stringify({ projects: {}, i18n: {} }),
        'src/locale/messages.xlf': '<xliff/>',
        'src/app/home.component.html':
          '<section><h2>Welcome to the dashboard</h2></section>',
      });

      const result = await InternationalizationCompliancePolicyLaw.check(
        ctx(root)
      );

      expect(result.violations).toContain('Hardcoded text found in templates');
      expect(result.violationDetails).toEqual([
        {
          file: 'src/app/home.component.html',
          message:
            'hardcoded text in this template (the first one found: the check stops at the first)',
        },
      ]);
    });

    it('carries no details when no text is hardcoded', async () => {
      const root = project({
        'package.json': manifest({ react: '19.3.0', 'next-intl': '4.0.0' }),
        'messages/en.json': '{"welcome":"Welcome back"}',
        'src/app/page.tsx':
          "import { useTranslations } from 'next-intl';\nexport default function P() {\n  const t = useTranslations('home');\n  return <h1>{t('welcome')}</h1>;\n}",
      });

      const result = await InternationalizationCompliancePolicyLaw.check(
        ctx(root)
      );

      expect(result.violations).toEqual([]);
      expect(result.violationDetails).toBeUndefined();
    });
  });
});

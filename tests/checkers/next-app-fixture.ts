/**
 * A Next.js app as `create-next-app` generates it (reduced to what the
 * performance laws read), and the same app declaring everything those laws
 * ask for, the Next way. Shared by the reader tests and the law tests.
 */
export type Files = Record<string, string>;

const NEXT_VERSION = '16.4.6';

export function nextManifest(
  scripts: Record<string, string> = {},
  dependencies: Record<string, string> = {}
): string {
  return JSON.stringify({
    name: 'web',
    private: true,
    scripts: { dev: 'next dev', build: 'next build', start: 'next start', ...scripts },
    dependencies: {
      next: NEXT_VERSION,
      react: '19.3.0',
      'react-dom': '19.3.0',
      ...dependencies,
    },
    devDependencies: { typescript: '^5' },
  });
}

const EMPTY_NEXT_CONFIG = [
  "import type { NextConfig } from 'next';",
  'const nextConfig: NextConfig = {};',
  'export default nextConfig;',
].join('\n');

/** What `create-next-app` generates, reduced to what the laws read. */
export const PLAIN_NEXT: Files = {
  'package.json': nextManifest(),
  'next.config.ts': EMPTY_NEXT_CONFIG,
  'src/app/layout.tsx': [
    "import { Geist } from 'next/font/google';",
    "const geist = Geist({ subsets: ['latin'] });",
    'export default function RootLayout({ children }: { children: React.ReactNode }) {',
    '  return <html lang="en" className={geist.className}><body>{children}</body></html>;',
    '}',
  ].join('\n'),
  'src/app/page.tsx': [
    "import Image from 'next/image';",
    'export default function Home() {',
    '  return (',
    '    <main>',
    '      <Image src="/hero.png" alt="Hero" width={1200} height={600} priority />',
    '      <Image src="/card.png" alt="Card" width={300} height={200} />',
    '    </main>',
    '  );',
    '}',
  ].join('\n'),
};

/** The same app, declaring everything the six laws ask for, the Next way. */
export const DECLARED_NEXT: Files = {
  ...PLAIN_NEXT,
  'package.json': nextManifest(
    {
      lighthouse: 'lhci autorun',
      size: 'size-limit',
      analyze: 'next experimental-analyze',
    },
    { '@sentry/nextjs': '^10.0.0', critters: '^0.0.25' }
  ),
  'next.config.ts': [
    "import type { NextConfig } from 'next';",
    'const nextConfig: NextConfig = { experimental: { optimizeCss: true } };',
    'export default nextConfig;',
  ].join('\n'),
  '.size-limit.json': JSON.stringify([
    { path: '.next/static/chunks/**/*.js', limit: '250 kB' },
  ]),
  '.lighthouserc.json': JSON.stringify({
    ci: {
      assert: {
        assertions: { 'categories:performance': ['error', { minScore: 0.9 }] },
      },
    },
  }),
  'src/app/web-vitals.tsx': [
    "'use client';",
    "import { useReportWebVitals } from 'next/web-vitals';",
    'export function WebVitals() {',
    "  useReportWebVitals(metric => navigator.sendBeacon('/api/vitals', JSON.stringify(metric)));",
    '  return null;',
    '}',
  ].join('\n'),
  'instrumentation-client.ts': [
    "import * as Sentry from '@sentry/nextjs';",
    'Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0.1 });',
  ].join('\n'),
  '.husky/pre-push': 'npm run size\n',
  'datadog.json': JSON.stringify({
    monitors: [{ name: 'LCP p75 regression', type: 'metric alert' }],
  }),
};

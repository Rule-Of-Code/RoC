/**
 * The Sentry browser SDKs the performance laws recognise as error tracking,
 * declared once (#12). Performance Monitoring Policy, Performance Budget
 * Compliance and Performance Monitoring Standards each kept their own list,
 * and a package missing from one (a framework SDK) was a hole in that law
 * only. Each law spreads this list where its own list had these entries.
 */
export const SENTRY_BROWSER_SDKS: readonly string[] = [
  '@sentry/browser',
  '@sentry/angular',
  '@sentry/nextjs',
  '@sentry/react',
];

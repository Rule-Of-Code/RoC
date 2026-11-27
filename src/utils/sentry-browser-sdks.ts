/**
 * The Sentry browser and mobile SDKs the performance laws recognise as error
 * tracking, declared once (#12). Performance Monitoring Policy, Performance
 * Budget Compliance and Performance Monitoring Standards each kept their own
 * list, and a package missing from one (a framework SDK) was a hole in that
 * law only. Each law spreads this list where its own list had these entries.
 *
 * The list is the SDKs for the stacks RoC judges — Angular, React, Next.js,
 * Vue, Nuxt, Ionic / Capacitor — and the plain browser SDK. Nuxt and
 * Capacitor (#12, b4): "Official Sentry SDK for Nuxt" / "for Capacitor"
 * (npm), whose init the Capacitor guide shows as
 * `Sentry.init({ dsn, tracesSampleRate, … }, SentryAngular.init)`
 * (https://docs.sentry.io/platforms/javascript/guides/capacitor/). SDKs for
 * stacks RoC has no laws for (React Native, SvelteKit, Remix, Astro …) are
 * not listed.
 */
export const SENTRY_BROWSER_SDKS: readonly string[] = [
  '@sentry/browser',
  '@sentry/angular',
  '@sentry/nextjs',
  '@sentry/react',
  '@sentry/vue',
  '@sentry/nuxt',
  '@sentry/capacitor',
];

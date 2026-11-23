/**
 * The `requires` of the laws whose subject is something that runs for users:
 * a service that answers requests, a page a browser loads, an app a store
 * ships, a deploy target. A CLI tool or a library has none of these, and a
 * law about CDN headers, APM alerts, an incident runbook or a launch
 * checklist has nothing to inspect there. Run anyway, it either demands an
 * artefact that cannot exist (a runbook for a service nobody operates) or
 * reports a green check that proves nothing. Both teach the team to stop
 * reading the verdict, so the law is not selected and not counted.
 *
 * Every condition here is something the repository declares or contains —
 * a dependency, a platform config at a workspace root, a deploy command —
 * never the name or path of a particular project.
 */

import type {
  JsonFileWithKey,
  LawRequirement,
} from '../types/enhanced-law.types';
import { REQUIRES_SERVERLESS_DEPLOY } from './deployment/serverless-platforms';
import { TEST_TREES } from './edge-deploy/gate-files';
import { jsonFilesWithKey } from './law-requirements';

const FIREBASE_JSON = 'firebase.json';

/**
 * firebase.json configures several products; only its `hosting` key declares
 * something a browser loads. `firestore`, `functions`, `storage` and
 * `emulators` serve no page (#547). The file is parsed, not searched: the
 * word "hosting" also appears under `emulators`.
 */
export const FIREBASE_HOSTING: JsonFileWithKey = {
  file: FIREBASE_JSON,
  key: 'hosting',
};

/** What the firebase.json files of a project say about web hosting. */
export interface FirebaseHosting {
  /** A firebase.json (root or workspace project) parses and has a top-level `hosting`. */
  hosting: boolean;
  /** firebase.json files that could not be read or parsed, with the reason. */
  unreadable: string[];
}

/** The law's reading of FIREBASE_HOSTING — the same reader the selector uses. */
export function firebaseHosting(projectRoot: string): FirebaseHosting {
  const found = jsonFilesWithKey(projectRoot, FIREBASE_HOSTING);
  return { hosting: found.matched.length > 0, unreadable: found.unreadable };
}

/**
 * A Node HTTP framework is declared, so something here answers HTTP. A
 * dependency is the only thing `requires` can read, so a server built on
 * bare `node:http` declares none of them and is not selected by this one.
 */
export const REQUIRES_NODE_HTTP_SERVER: LawRequirement = {
  anyDependency: [
    'next',
    'express',
    'fastify',
    'koa',
    'hono',
    '@nestjs/core',
    '@hapi/hapi',
  ],
};

/** A Python web framework or ASGI/WSGI server is declared. */
export const REQUIRES_PYTHON_HTTP_SERVER: LawRequirement = {
  anyPythonDependency: [
    'fastapi',
    'flask',
    'django',
    'starlette',
    'aiohttp',
    'tornado',
    'sanic',
    'falcon',
    'litestar',
    'quart',
    'uvicorn',
    'gunicorn',
  ],
};

/**
 * Configuration of a platform that runs or hosts this repository's code: a
 * container, a PaaS manifest, a hosting config, a serverless deploy. Looked
 * up at the workspace root and in each workspace project directory.
 */
export const REQUIRES_DEPLOY_TARGET: LawRequirement = {
  anyOf: [
    {
      anyFile: [
        'Dockerfile',
        'Dockerfile.*',
        'Containerfile',
        'docker-compose.yml',
        'docker-compose.yaml',
        'compose.yml',
        'compose.yaml',
        'Procfile',
        'app.yaml',
        'apphosting.yaml',
        'fly.toml',
        'render.yaml',
        'railway.json',
        'railway.toml',
        FIREBASE_JSON,
        'vercel.json',
        'netlify.toml',
        'wrangler.toml',
        'wrangler.json',
        'wrangler.jsonc',
        'serverless.yml',
        'serverless.yaml',
        'Chart.yaml',
        'skaffold.yaml',
      ],
    },
    REQUIRES_SERVERLESS_DEPLOY,
  ],
};

/**
 * Something a browser loads: a web framework, a web build or hosting
 * config, or an HTML document of the project's own (outside test trees).
 * `react` alone is not enough — React Native declares it too and has no
 * page; `react-dom` is the browser renderer.
 */
export const REQUIRES_WEB_SURFACE: LawRequirement = {
  anyOf: [
    {
      anyDependency: [
        '@angular/core',
        'react-dom',
        'vue',
        'svelte',
        '@sveltejs/kit',
        'preact',
        'solid-js',
        'next',
        'nuxt',
        'astro',
        'lit',
      ],
    },
    {
      anyFile: [
        'angular.json',
        'ngsw-config.json',
        'next.config.js',
        'next.config.mjs',
        'next.config.ts',
        'nuxt.config.ts',
        'nuxt.config.js',
        'netlify.toml',
        'vercel.json',
        'wrangler.toml',
        'nginx.conf',
      ],
    },
    // Parsed: firebase.json declares a page only with `hosting` (#547);
    // one that does not parse selects the law, which reports it not read.
    { anyJsonFileWithKey: [FIREBASE_HOSTING] },
    {
      anyFileContaining: [
        {
          files: ['**/*.{html,htm}'],
          pattern: String.raw`\S`,
          exclude: [...TEST_TREES, '**/coverage/**'],
        },
      ],
    },
  ],
};

/**
 * Sample and test trees: an example app a library ships, or a fixture, is
 * not the repository's own app (#577).
 */
const NOT_THE_APP: readonly string[] = [
  ...TEST_TREES,
  '**/example/**',
  '**/examples/**',
  '**/sample/**',
  '**/samples/**',
  '**/androidTest/**',
  '**/Pods/**',
];

/**
 * A mobile app: what a store ships to users' devices. A JS shell is a
 * dependency; a native app is what its build declares (#577) — read, not
 * guessed from a folder name:
 * - Android: a Gradle module applying `com.android.application` (directly
 *   or through a version-catalog alias); `com.android.library` is a library;
 * - iOS: an Xcode project with an application target
 *   (`com.apple.product-type.application…`), not a framework or a library;
 * - Flutter: a `pubspec.yaml` on the Flutter SDK with an entry point
 *   `lib/main.dart` (a Flutter package has none).
 */
export const REQUIRES_MOBILE_APP: LawRequirement = {
  anyOf: [
    {
      anyDependency: [
        'react-native',
        'expo',
        '@capacitor/core',
        '@nativescript/core',
      ],
    },
    {
      anyFileContaining: [
        {
          files: ['**/build.gradle', '**/build.gradle.kts'],
          pattern: String.raw`com\.android\.application\b|\bplugins\.android\.application\b`,
          exclude: NOT_THE_APP,
        },
        {
          files: ['**/*.xcodeproj/project.pbxproj'],
          pattern: String.raw`com\.apple\.product-type\.application\b`,
          exclude: NOT_THE_APP,
        },
      ],
    },
    {
      anyFile: ['lib/main.dart'],
      anyFileContaining: [
        {
          files: ['pubspec.yaml'],
          pattern: String.raw`^\s+sdk:\s*flutter\b`,
          exclude: NOT_THE_APP,
        },
      ],
    },
  ],
};

/** Anything that runs for users: a service, a web surface, a mobile app, or a deploy target. */
export const REQUIRES_PRODUCTION_SUBJECT: LawRequirement = {
  anyOf: [
    REQUIRES_NODE_HTTP_SERVER,
    REQUIRES_PYTHON_HTTP_SERVER,
    REQUIRES_WEB_SURFACE,
    REQUIRES_MOBILE_APP,
    REQUIRES_DEPLOY_TARGET,
  ],
};

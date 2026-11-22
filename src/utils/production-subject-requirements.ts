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

import * as fs from 'fs';
import type { LawRequirement } from '../types/enhanced-law.types';
import { REQUIRES_SERVERLESS_DEPLOY } from './deployment/serverless-platforms';
import { TEST_TREES } from './edge-deploy/gate-files';
import { NxWorkspace } from './nx-workspace';

const FIREBASE_JSON = 'firebase.json';

/** What the firebase.json files of a project say about web hosting. */
export interface FirebaseHosting {
  /** A firebase.json (root or workspace project) parses and has a top-level `hosting`. */
  hosting: boolean;
  /** firebase.json files that could not be read or parsed, with the reason. */
  unreadable: string[];
}

/**
 * firebase.json configures several products; only its `hosting` key declares
 * something a browser loads. `firestore`, `functions`, `storage` and
 * `emulators` serve no page (#547). The file is parsed, not searched: the
 * word "hosting" also appears under `emulators`.
 */
export function firebaseHosting(projectRoot: string): FirebaseHosting {
  const unreadable: string[] = [];
  let hosting = false;
  for (const file of NxWorkspace.resolveSourceFiles(
    projectRoot,
    FIREBASE_JSON
  )) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        'hosting' in parsed
      ) {
        hosting = true;
      }
    } catch (error) {
      const rel = file.slice(projectRoot.length).replace(/^[\\/]+/, '');
      unreadable.push(
        `${rel.replace(/\\/g, '/')}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return { hosting, unreadable };
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
        FIREBASE_JSON,
        'netlify.toml',
        'vercel.json',
        'wrangler.toml',
        'nginx.conf',
      ],
    },
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

/** A mobile app shell: what a store ships to users' devices. */
export const REQUIRES_MOBILE_APP: LawRequirement = {
  anyDependency: [
    'react-native',
    'expo',
    '@capacitor/core',
    '@nativescript/core',
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

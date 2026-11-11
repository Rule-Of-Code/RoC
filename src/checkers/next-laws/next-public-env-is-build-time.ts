/**
 * Next Public Env Is Build Time
 *
 * Next replaces `process.env.NEXT_PUBLIC_X` with the value present when
 * `next build` runs, everywhere it appears; "after being built, your app will
 * no longer respond to changes to these environment variables", and "dynamic
 * lookups will not be inlined"
 * (next/dist/docs/01-app/02-guides/environment-variables.md). A value given
 * only to the running container changes nothing, and the deploy is green.
 * And whatever is named NEXT_PUBLIC_* is shown to every visitor.
 *
 * 1. Every NEXT_PUBLIC_* the code reads is declared where the build runs: an
 *    ARG/ENV before the build in each Dockerfile stage that builds Next (else
 *    each CI file that does), or a committed `.env`/`.env.production` of the
 *    app. When no build can be found in the repository, the law fails unless
 *    `thresholds.next.publicEnvBuildSource` says where the build gets them.
 * 2. No computed or whole-object `process.env` use in a client graph module.
 * 3. No NEXT_PUBLIC_* name containing SECRET, TOKEN, PASSWORD, PRIVATE or KEY,
 *    unless listed in `thresholds.next.publicEnvAllowed` with the reason.
 */

import { glob } from 'glob';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { clientGraph, envReads, type NextModuleGraph } from '../../utils/react/next-module-graph';
import { NextThresholds } from '../../utils/react/next-thresholds';
import { ReactProject } from '../../utils/react/react-project';
import { LawBase } from '../law-base';
import { listed, readProject } from './next-server-support';

const PREFIX = 'NEXT_PUBLIC_';
const SECRET_WORDS = ['SECRET', 'TOKEN', 'PASSWORD', 'PRIVATE', 'KEY'];
const NEXT_BUILD = /\bnext\s+build\b/;
const GENERIC_BUILD = /\b(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?build\b|turbo\s+(?:run\s+)?build\b|nx\s+(?:run\s+\S*:build|build|run-many\b.*\bbuild))/;
const SCAN_IGNORE = ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.git/**'];
const DOCKERFILES = '**/{Dockerfile,Dockerfile.*,*.Dockerfile,*.dockerfile}';
const CI_FILES = ['.github/workflows/*.{yml,yaml}', '.gitlab-ci.yml', 'bitbucket-pipelines.yml', 'azure-pipelines.yml'];
const ALLOWED_KEY = 'thresholds.next.publicEnvAllowed';
const SOURCE_KEY = 'thresholds.next.publicEnvBuildSource';

interface BuildSite {
  where: string;
  declared: Set<string>;
}

export class NextPublicEnvIsBuildTimeLaw extends LawBase {
  static readonly LAW_NAME = 'Next Public Env Is Build Time';

  static check(context: LawCheckContext): LawResult {
    const source = NextThresholds.publicEnvBuildSource(context);
    const allowed = NextThresholds.publicEnvAllowed(context);
    const { graph, sources, unread } = readProject(context);
    const violations = [...source.problems, ...allowed.problems, ...unread];
    const reads = new Map<string, string>();
    for (const file of sources) {
      for (const read of envReads(file)) {
        if (read.name?.startsWith(PREFIX) && !reads.has(read.name)) {
          reads.set(read.name, `${graph?.relative(file.fileName) ?? file.fileName}:${read.line}`);
        }
      }
    }
    const sites = this.buildSites(context.projectRoot);
    const dotenv = this.dotenvNames(context.projectRoot);
    if (reads.size > 0 && !source.value) violations.push(...this.undeclared(reads, sites, dotenv));
    if (graph) violations.push(...this.computedInClient(graph, context));
    const names = new Set([...reads.keys(), ...dotenv, ...sites.flatMap(site => [...site.declared])]);
    violations.push(...this.secretLooking(names, new Set((allowed.value ?? []).map(entry => entry.key))));
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        'Declare each NEXT_PUBLIC_* as an ARG before `next build` in the Dockerfile (or in the CI build step env)',
        `Say where a hosted build gets its values in ${SOURCE_KEY}`,
        'Read public variables as process.env.NEXT_PUBLIC_NAME, never through a computed key',
        'Never give a secret a NEXT_PUBLIC_ name',
      ],
      context
    );
  }

  /** Rule 2: computed or whole-object process.env in a client graph module. */
  private static computedInClient(graph: NextModuleGraph, context: LawCheckContext): string[] {
    const client = clientGraph(graph, ReactProject.nextApps(context.projectRoot));
    const violations: string[] = [];
    for (const [file, visit] of client.modules) {
      for (const read of envReads(visit.source).filter(r => r.name === null)) {
        violations.push(
          `${graph.relative(file)}:${read.line}: ${read.text} — computed or whole-object process.env in browser code is never inlined; it is undefined there. Read each variable as process.env.NEXT_PUBLIC_NAME`
        );
      }
    }
    return [...violations, ...client.unresolved.map(item => graph.describeUnresolved(item))];
  }

  /** Rule 3: NEXT_PUBLIC_ names that read like secrets and are not allowed with a reason. */
  private static secretLooking(names: Set<string>, exempt: Set<string>): string[] {
    const violations: string[] = [];
    for (const name of [...names].sort()) {
      const word = SECRET_WORDS.find(w => name.slice(PREFIX.length).includes(w));
      if (!name.startsWith(PREFIX) || !word || exempt.has(name)) continue;
      violations.push(
        `${name}: a NEXT_PUBLIC_ name containing ${word} — its value is in the JavaScript every visitor downloads. Keep secrets server-side, or list a publishable value in ${ALLOWED_KEY} with the reason`
      );
    }
    return violations;
  }

  private static undeclared(reads: Map<string, string>, sites: BuildSite[], dotenv: Set<string>): string[] {
    const names = [...reads.keys()].filter(name => !dotenv.has(name)).sort();
    if (names.length === 0) return [];
    if (sites.length === 0) {
      return [
        `${names.length} NEXT_PUBLIC_ variable(s) are read (${listed(names.map(n => `${n} at ${reads.get(n)}`))}) and no Dockerfile or CI file here runs next build — the law cannot see whether the build has them. Declare them where the build runs, or say where in ${SOURCE_KEY}`,
      ];
    }
    return sites.flatMap(site => {
      const missing = names.filter(name => !site.declared.has(name));
      return missing.length === 0
        ? []
        : [`${site.where}: builds Next without ${listed(missing)} — each is inlined as undefined, and setting it at runtime changes nothing. Add ARG ${missing[0]} (and the rest) before the build`];
    });
  }

  /** Dockerfile stages that build Next; when there are none, CI files that do. */
  static buildSites(projectRoot: string): BuildSite[] {
    const docker = glob
      .sync(DOCKERFILES, { cwd: projectRoot, absolute: true, dot: true, ignore: SCAN_IGNORE })
      .flatMap(file => this.dockerSites(projectRoot, file));
    if (docker.length > 0) return docker;
    return glob
      .sync(CI_FILES, { cwd: projectRoot, absolute: true, dot: true, ignore: SCAN_IGNORE })
      .flatMap(file => {
        const text = FileUtils.readFileContentSync(file) ?? '';
        const builds = NEXT_BUILD.test(text) || (GENERIC_BUILD.test(text) && /\.next\b|NEXT_PUBLIC_/.test(text));
        if (!builds) return [];
        const declared = new Set([...text.matchAll(/\b(NEXT_PUBLIC_[A-Z0-9_]+)\s*[:=]/g)].map(m => m[1] as string));
        return [{ where: PathOperations.getRelative(projectRoot, file), declared }];
      });
  }

  /** Each RUN that builds Next, with the ARG/ENV names its stage declared before it. */
  private static dockerSites(projectRoot: string, file: string): BuildSite[] {
    const text = FileUtils.readFileContentSync(file) ?? '';
    const generic = /\.next\b/.test(text);
    const sites: BuildSite[] = [];
    let declared = new Set<string>();
    const lines = text.replace(/\\\r?\n/g, ' ').split(/\r?\n/);
    lines.forEach((raw, index) => {
      const line = raw.trim();
      const instruction = /^(\w+)\s+(.*)$/.exec(line);
      if (!instruction) return;
      const [, keyword = '', rest = ''] = instruction;
      const upper = keyword.toUpperCase();
      if (upper === 'FROM') declared = new Set();
      if (upper === 'ARG') declared.add(rest.split('=')[0]?.trim() ?? '');
      if (upper === 'ENV') {
        for (const match of rest.matchAll(/(?:^|\s)([A-Za-z_]\w*)(?==|\s)/g)) declared.add(match[1] as string);
      }
      if (upper === 'RUN' && (NEXT_BUILD.test(rest) || (generic && GENERIC_BUILD.test(rest)))) {
        sites.push({ where: `${PathOperations.getRelative(projectRoot, file)}:${index + 1}`, declared: new Set(declared) });
      }
    });
    return sites;
  }

  /** NEXT_PUBLIC_* names in each app's committed `.env` and `.env.production`, which every build reads. */
  private static dotenvNames(projectRoot: string): Set<string> {
    const names = new Set<string>();
    for (const app of ReactProject.nextApps(projectRoot)) {
      for (const name of ['.env', '.env.production']) {
        const text = FileUtils.readFileContentSync(PathOperations.join(app.root, name)) ?? '';
        for (const match of text.matchAll(/^\s*(?:export\s+)?(NEXT_PUBLIC_[A-Z0-9_]+)\s*=/gm)) names.add(match[1] as string);
      }
    }
    return names;
  }
}

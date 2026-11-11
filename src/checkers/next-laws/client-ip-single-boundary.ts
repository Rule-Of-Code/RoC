/**
 * Client IP Single Boundary
 *
 * Rate limits, abuse logs and legal evidence rely on "the client's IP", and
 * the forwarding headers have one correct reading per deployment — it depends
 * on how many proxies sit in front. Next even sets x-forwarded-for from the
 * socket when it is absent (`req.headers['x-forwarded-for'] ??= …remoteAddress`,
 * next/dist/server/base-server.js), so "the header exists" proves nothing
 * about a proxy. Spread across handlers, each reading drifts on its own, and
 * a client can write the value a rate limit trusts.
 *
 * Non-test reads of x-forwarded-for, forwarded, x-real-ip and
 * cf-connecting-ip must all be in the one module named in
 * `thresholds.clientIp.module`. A project that reads none passes only when it
 * declares `thresholds.clientIp.notUsed` — absence of a read is not proof
 * that the IP is not taken some other way.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { PathOperations } from '../../utils/path-operations';
import { NextModuleGraph } from '../../utils/react/next-module-graph';
import { NextThresholds } from '../../utils/react/next-thresholds';
import { REACT_SOURCE_EXTENSIONS, ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { listed } from './next-server-support';

/** Header names whose only use is carrying a client address — any literal of them counts. */
const ADDRESS_HEADERS = new Set(['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip']);
/** `forwarded` is also an ordinary word, so it counts only where a header is looked up. */
const FORWARDED = 'forwarded';
const MODULE_KEY = 'thresholds.clientIp.module';
const NOT_USED_KEY = 'thresholds.clientIp.notUsed';

interface HeaderRead {
  file: string;
  line: number;
  header: string;
}

export class ClientIpSingleBoundaryLaw extends LawBase {
  static readonly LAW_NAME = 'Client IP Single Boundary';

  static check(context: LawCheckContext): LawResult {
    const boundary = NextThresholds.clientIpModule(context);
    const notUsed = NextThresholds.clientIpNotUsed(context);
    const violations = [...boundary.problems, ...notUsed.problems];
    const files = ReactProject.sourceFiles(context, [...REACT_SOURCE_EXTENSIONS, '.cjs']);
    const graph = NextModuleGraph.create(context);
    if (typeof graph === 'string') {
      if (files.length > 0) violations.push(`${files.length} file(s): ${graph}`);
      return this.result(violations, context);
    }
    const reads = graph.sourcesOf(files).flatMap(source => this.reads(graph, source));
    violations.push(...graph.unread);
    const at = (read: HeaderRead): string => `${read.file}:${read.line}`;
    if (boundary.value && notUsed.value) {
      violations.push(`${MODULE_KEY} and ${NOT_USED_KEY} are both declared — a project either reads client IPs in one module or not at all. Keep one`);
    }
    if (boundary.value) {
      const module = PathOperations.normalize(boundary.value).replace(/^\.\//, '');
      if (!FileSystemOperations.isFile(PathOperations.join(context.projectRoot, module))) {
        violations.push(`${MODULE_KEY}: '${module}' does not exist — a boundary that names no file bounds nothing`);
      }
      for (const read of reads.filter(r => r.file !== module)) {
        violations.push(`${at(read)}: reads '${read.header}' outside ${module} — a second reading of the client IP drifts from the first. Call the boundary module instead`);
      }
    } else if (notUsed.value) {
      for (const read of reads) {
        violations.push(`${at(read)}: reads '${read.header}', but ${NOT_USED_KEY} says the project uses no client IP — remove the read or declare ${MODULE_KEY}`);
      }
    } else if (reads.length === 0) {
      violations.push(
        `no read of ${[...ADDRESS_HEADERS, FORWARDED].join(', ')} in ${files.length} file(s), and neither ${MODULE_KEY} nor ${NOT_USED_KEY} is declared — absence of a read does not prove the IP is not taken another way. Declare which is true`
      );
    } else {
      const modules = [...new Set(reads.map(read => read.file))];
      violations.push(
        `client IP headers are read in ${modules.length} module(s) (${listed(reads.map(at))}) and no ${MODULE_KEY} is declared — name the one module that reads them, and move the others behind it`
      );
    }
    return this.result(violations, context);
  }

  private static result(violations: string[], context: LawCheckContext): LawResult {
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        `Read the forwarding headers in one module (a getClientIp(request) function) and declare it in ${MODULE_KEY}`,
        'Take the address the trusted proxy appended (counted from the right), never the leftmost value a client can write',
        `Declare ${NOT_USED_KEY} with the reason when the project uses no client IP`,
      ],
      context
    );
  }

  private static reads(graph: NextModuleGraph, source: TsxSource): HeaderRead[] {
    const ts = source.ts;
    const reads: HeaderRead[] = [];
    const file = graph.relative(source.fileName);
    source.walk(node => {
      if (!ts.isStringLiteralLike(node)) return;
      const header = node.text.toLowerCase();
      const counts = ADDRESS_HEADERS.has(header) || (header === FORWARDED && this.isLookup(ts, node));
      if (counts) reads.push({ file, line: source.lineOf(node), header });
    });
    return reads;
  }

  /** A literal used as a header name: a call argument, an element access key, or a destructured key. */
  private static isLookup(ts: typeof TS, node: TS.Node): boolean {
    const parent = node.parent;
    return (
      (ts.isCallExpression(parent) && parent.arguments.some(arg => arg === node)) ||
      (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) ||
      (ts.isBindingElement(parent) && parent.propertyName === node)
    );
  }
}

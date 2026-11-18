/**
 * Test Server Loopback Address Match
 *
 * A test or perf server bound to 127.0.0.1 only, while the client under test
 * is pointed at `http://localhost:…`, pays for name resolution on every new
 * connection: `localhost` usually resolves to ::1 first, nothing listens
 * there, and where that attempt is not refused at once a browser moves to
 * IPv4 only when its "Happy Eyeballs" fallback timer fires (300 ms in
 * Chromium). A/B deltas from such a harness stay valid; its absolute timings
 * do not.
 *
 * The law reads test and perf files — by directory (tests/, e2e/, perf/,
 * bench/, load-test/, harness/, mocks/, scripts/, …), by name (*test*, *spec*,
 * *e2e*, *perf*, *bench*, *mock*, .env.test, playwright/cypress configs) and
 * the test-like scripts of package.json — for a server bound to the IPv4
 * loopback literal, and for client URLs that name `localhost` on the same
 * port. Each finding names the server's bind and every client that calls it.
 * A file that also binds `::` or `::1` is taken to listen on both families.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { LawBase } from '../law-base';
import { readProjectFiles, type TextFile } from './project-text-files';

const CANDIDATES = ['**/*.{py,js,mjs,cjs,ts,mts,cts,sh,bash,yml,yaml,toml,json,cfg,ini,conf}', '**/.env*', '**/{Makefile,Procfile}'];
const TEST_DIR =
  /(?:^|\/)(?:tests?|__tests__|e2e|perf|performance|bench(?:mark)?s?|load-?tests?|harness|mocks?|fixtures?|cypress|playwright|scripts)\//i;
const TEST_NAME = /(?:^|[._-])(?:tests?|spec|e2e|perf|bench(?:mark)?|load(?:test)?|harness|mock)(?:[._-]|$)/i;
const TEST_CONFIG = /^(?:playwright|cypress|vitest|jest|karma|wdio)\.conf(?:ig)?\./i;
/** A package.json script whose name says it tests, measures or mocks. */
const TEST_SCRIPT_KEY = /^\s*"([^"]*(?:test|e2e|perf|bench|load|mock|harness)[^"]*)"\s*:\s*"/i;

const V4 = String.raw`127\.0\.0\.1`;
const FLAG_BIND = new RegExp(
  String.raw`(?:--host|--bind|--hostname|--listen|-b|-a|-H)(?:=|\s+)["']?(?:tcp://)?${V4}(?::(\d{1,5}))?(?![\d.])`
);
const PROP_BIND = new RegExp(String.raw`\bhost(?:name)?["']?\s*[=:]\s*["']${V4}["']`);
const LISTEN_BIND = new RegExp(String.raw`\.listen\(\s*([^,()]+?)\s*,\s*["']${V4}["']`);
const TUPLE_BIND = new RegExp(String.raw`\(\s*\(\s*["']${V4}["']\s*,\s*([^)]+?)\s*\)`);
const SERVER_WORD = /listen|uvicorn|hypercorn|gunicorn|\.run\(|\bserve|[Ss]erver|\bbind\(/;
const PORT_FLAG = /(?:--port|-p)(?:=|\s+)(\d{1,5})\b|http\.server\s+(\d{1,5})\b/;
/** Port 0 asks the OS for a free port; the client then gets the address at runtime, never from a fixed URL. */
const EPHEMERAL = '0';
const PORT_PROP = /\bport["']?\s*[=:]\s*([\w$.]+)/;
/** The same server also listening on IPv6: `::` (dual-stack) or `::1`. */
const IPV6_BIND =
  /(?:--host|--bind|-b|host(?:name)?["']?\s*[=:])(?:=|\s)*["']?\[?::1?\]?(?=["'\s,)\]]|$)|\.listen\(\s*[^,()]+?\s*,\s*["']::1?["']/m;
/** A localhost URL; its port a literal, or a `${name}` template the same file assigns a number. */
const LOCALHOST_URL = /\b(?:https?|wss?):\/\/localhost(?::(?:(\d{1,5})|\$\{\s*([\w$.]+)\s*\}))?(?![\w.-])/g;

interface Bind {
  rel: string;
  line: number;
  port: string | null;
}
interface Client {
  rel: string;
  line: number;
  url: string;
  /** Null when the port is assembled at runtime and could not be resolved. */
  port: string | null;
}
interface Line {
  text: string;
  number: number;
}

export class TestServerLoopbackAddressMatchLaw extends LawBase {
  static readonly LAW_NAME = 'Test Server Loopback Address Match';

  static check(context: LawCheckContext): LawResult {
    const files = readProjectFiles(context.projectRoot, CANDIDATES).filter(file => this.isTestLike(file.rel));
    const binds = files.flatMap(file => this.binds(file));
    const clients = files.flatMap(file => this.clients(file));
    const violations = binds.flatMap(bind => {
      const calling = clients.filter(client => client.port !== null && (bind.port === null || client.port === bind.port));
      return calling.length === 0 ? [] : [this.finding(bind, calling)];
    });
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'TESTING',
      [
        'Bind the test server dual-stack (host "::"), or to both 127.0.0.1 and ::1, or point the client at the same literal the server binds (http://127.0.0.1:…)',
      ],
      context
    );
    return result.passed ? { ...result, message: this.passMessage(files.length, binds.length) } : result;
  }

  /** A pass says what it read: "compliance verified" over zero files would claim more than was checked. */
  private static passMessage(read: number, binds: number): string {
    if (read === 0) return `${this.LAW_NAME}: 0 test/perf files — nothing to compare`;
    const files = `${read} test/perf file${read === 1 ? '' : 's'} read`;
    return binds === 0
      ? `${this.LAW_NAME}: ${files}, none binds a server to 127.0.0.1 only — nothing to compare`
      : `${this.LAW_NAME}: ${files}, no server bound to 127.0.0.1 only is called through localhost`;
  }

  private static isTestLike(rel: string): boolean {
    const name = rel.split('/').pop() ?? rel;
    return name === 'package.json' || TEST_DIR.test(rel) || TEST_NAME.test(name) || TEST_CONFIG.test(name);
  }

  /** The lines that belong to a test or perf setup: all of them, or a package.json's test-like scripts. */
  private static lines(file: TextFile): Line[] {
    const all = file.content.split(/\r?\n/).map((text, index) => ({ text, number: index + 1 }));
    const isManifest = file.rel === 'package.json' || file.rel.endsWith('/package.json');
    return isManifest ? all.filter(line => TEST_SCRIPT_KEY.test(line.text)) : all;
  }

  private static binds(file: TextFile): Bind[] {
    if (IPV6_BIND.test(file.content)) return [];
    const all = file.content.split(/\r?\n/);
    return this.lines(file).flatMap(({ text, number }) => {
      const port = this.bindPort(text, all, number - 1, file.content);
      return port === undefined || port === EPHEMERAL ? [] : [{ rel: file.rel, line: number, port }];
    });
  }

  /** The port a line binds 127.0.0.1 on: a string, null when it is not a literal, undefined when the line binds nothing. */
  private static bindPort(text: string, all: string[], index: number, content: string): string | null | undefined {
    const flag = FLAG_BIND.exec(text);
    if (flag) {
      const portFlag = PORT_FLAG.exec(text);
      return flag[1] ?? portFlag?.[1] ?? portFlag?.[2] ?? null;
    }
    const listen = LISTEN_BIND.exec(text);
    if (listen) return this.resolvePort(listen[1] ?? '', content);
    const tuple = TUPLE_BIND.exec(text);
    if (tuple && SERVER_WORD.test(text)) return this.resolvePort(tuple[1] ?? '', content);
    if (PROP_BIND.test(text) && SERVER_WORD.test(all.slice(Math.max(0, index - 2), index + 1).join('\n'))) {
      const near = all.slice(Math.max(0, index - 2), index + 3).join('\n');
      const prop = PORT_PROP.exec(near);
      return prop?.[1] ? this.resolvePort(prop[1], content) : null;
    }
    return undefined;
  }

  /** A port expression's number: the literal itself, or the first number an identifier is assigned in the same file. */
  private static resolvePort(expression: string, content: string): string | null {
    const literal = /^\s*(\d{1,5})\s*$/.exec(expression) ?? /\b(\d{2,5})\b/.exec(expression);
    if (literal?.[1]) return literal[1];
    const name = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(expression.trim()) ? (expression.trim().split('.').pop() ?? '') : '';
    if (!name) return null;
    const assigned = new RegExp(String.raw`(?:^|[^\w$.])${name.replace(/\$/g, '\\$')}\s*(?::[^=\n]+)?=\s*([^\n;]*)`, 'm').exec(content);
    return /\b(\d{2,5})\b/.exec(assigned?.[1] ?? '')?.[1] ?? null;
  }

  private static clients(file: TextFile): Client[] {
    return this.lines(file).flatMap(({ text, number }) =>
      [...text.matchAll(LOCALHOST_URL)].map(match => ({
        rel: file.rel,
        line: number,
        url: match[0],
        port: this.clientPort(match, text, file.content),
      }))
    );
  }

  /** A literal port, a resolved `${name}`, the scheme's default when none is written, null when it is built at runtime. */
  private static clientPort(match: RegExpMatchArray, text: string, content: string): string | null {
    if (match[1]) return match[1];
    if (match[2]) return this.resolvePort(match[2], content);
    if (text[(match.index ?? 0) + match[0].length] === ':') return null;
    return /^(?:https|wss):/.test(match[0]) ? '443' : '80';
  }

  private static finding(bind: Bind, calling: Client[]): string {
    const shown = calling
      .slice(0, 5)
      .map(client => `${client.rel}:${client.line} (${client.url})`)
      .join(', ');
    const more = calling.length > 5 ? ` and ${calling.length - 5} more` : '';
    const port = bind.port === null ? '' : ` on port ${bind.port}`;
    return `${bind.rel}:${bind.line}: the test server binds 127.0.0.1 only${port}, while the client calls localhost — ${shown}${more}; localhost usually resolves to ::1 first, so a new connection can wait for the IPv4 fallback (Chromium's timer is 300 ms) and absolute timings are inflated — bind dual-stack (::), bind both addresses, or use the same literal on both sides`;
  }
}

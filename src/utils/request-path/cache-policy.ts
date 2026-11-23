/**
 * The policy of an in-process cache — whether entries expire, whether its
 * size is bounded, whether its backend could not be told — read from a
 * caching decorator or from the expression a container is bound to. See
 * read-caches.ts for the caches it is asked about.
 */

import type { ModuleModel } from './model';

const CACHE_NAME = /cache|memo/i;

/** `functools.lru_cache`, `cachetools.func.ttl_cache`, `async_lru.alru_cache`, `aiocache.cached`, bare or module-qualified. */
const DECORATOR =
  /^(?:(?:functools|cachetools|cachetools\.func|func|async_lru|aiocache)\.)?(lru_cache|cache|ttl_cache|lfu_cache|fifo_cache|rr_cache|alru_cache|cached|cachedmethod)\s*(?:\((.*)\))?$/s;
const NOT_IN_PROCESS =
  /\b(?:Cache\.(?:REDIS|MEMCACHED)|RedisCache|MemcachedCache)\b/;
const TTL_CLASS = /\b(?:TTLCache|TLRUCache)\s*\(/;
const BOUNDED_CLASS =
  /\b(?:TTLCache|TLRUCache|LRUCache|LFUCache|FIFOCache|RRCache|Cache)\s*\(/;
const PLAIN_MAP =
  /^(?:\{\s*\}|dict\(\s*\)|(?:collections\.)?(?:OrderedDict|defaultdict)\(.*\))$/s;

/** What a cache keeps: expiry, a size bound, or a backend not told. */
export interface Policy {
  ttl: boolean;
  bounded: boolean;
  unknown: boolean;
}

const maxsizeNone = (args: string): boolean =>
  /\bmaxsize\s*=\s*None\b/.test(args) || /^\s*None\s*(?:,|$)/.test(args);
const hasTtl = (args: string): boolean => /\bttl\s*=\s*(?!None\b)\S/.test(args);

/** The policy of a cache object expression (`TTLCache(...)`, `{}`), or null when it is not one. */
function objectPolicy(expr: string): Policy | null {
  if (TTL_CLASS.test(expr)) return { ttl: true, bounded: true, unknown: false };
  if (BOUNDED_CLASS.test(expr))
    return { ttl: false, bounded: true, unknown: false };
  if (/^\s*(?:\{\s*\}|dict\(\s*\))\s*$/.test(expr))
    return { ttl: false, bounded: false, unknown: false };
  return null;
}

/** `cached(cache=…)` / `cached(TTLCache(…))` / aiocache `cached(ttl=…)`; null when not in-process. */
function cachedPolicy(
  args: string,
  bindings: ReadonlyMap<string, string>
): Policy | null {
  if (NOT_IN_PROCESS.test(args)) return null;
  const cacheArg = (
    /\bcache\s*=\s*([^,]+)/.exec(args)?.[1] ??
    args.split(',')[0] ??
    ''
  ).trim();
  const direct = objectPolicy(cacheArg);
  if (direct) return direct;
  const bound = bindings.get(cacheArg);
  const viaName = bound !== undefined ? objectPolicy(bound) : null;
  if (viaName) return viaName;
  if (hasTtl(args)) return { ttl: true, bounded: false, unknown: false };
  return { ttl: false, bounded: false, unknown: true };
}

/** The policy of a caching decorator, or null when the decorator is not an in-process cache. */
export function decoratorPolicy(
  decorator: string,
  bindings: ReadonlyMap<string, string>
): Policy | null {
  const m = DECORATOR.exec(decorator.trim());
  if (!m) return null;
  const kind = m[1] as string;
  const args = m[2] ?? '';
  if (kind === 'cache')
    return m[2] === undefined
      ? { ttl: false, bounded: false, unknown: false }
      : null;
  if (kind === 'cached' || kind === 'cachedmethod')
    return cachedPolicy(args, bindings);
  const ttl = kind === 'ttl_cache' || (kind === 'alru_cache' && hasTtl(args));
  return { ttl, bounded: !maxsizeNone(args), unknown: false };
}

/** The policy of a container binding, or null when the binding is not a cache. */
export function containerPolicy(
  name: string,
  expr: string,
  language: ModuleModel['language']
): Policy | null {
  if (language === 'typescript') {
    const m = /^new\s+(Map|LRUCache)\b([\s\S]*)$/.exec(expr.trim());
    if (!m) return null;
    if (m[1] === 'LRUCache')
      return {
        ttl: /\bttl\s*:/.test(m[2] ?? ''),
        bounded: /\b(?:max|maxSize)\s*:/.test(m[2] ?? ''),
        unknown: false,
      };
    return CACHE_NAME.test(name)
      ? { ttl: false, bounded: false, unknown: false }
      : null;
  }
  const cls =
    /^(?:cachetools\.)?(?:TTLCache|TLRUCache|LRUCache|LFUCache|FIFOCache|RRCache)\s*\(/.test(
      expr.trim()
    )
      ? objectPolicy(expr)
      : null;
  if (cls) return cls;
  return PLAIN_MAP.test(expr.trim()) && CACHE_NAME.test(name)
    ? { ttl: false, bounded: false, unknown: false }
    : null;
}

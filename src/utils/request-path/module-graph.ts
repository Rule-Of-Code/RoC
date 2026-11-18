/**
 * Who calls whom, one step deep: resolve a call in one function to the
 * function it runs, in the same module or across one import.
 *
 * Python: `helper(…)` (a function of the module or a `from m import helper`
 * binding), `mod.helper(…)` (`import pkg.mod as mod` / `from pkg import
 * mod`), `self.helper(…)` (a method of the same class). A dotted module is
 * found by its path — `pkg.mod` is `…/pkg/mod.py` or `…/pkg/mod/__init__.py`
 * under any source root — and a relative import (`.mod`, `..pkg.mod`) from
 * the importing file's package.
 *
 * TS/JS: `helper(…)` (a function of the module or a named/default import),
 * `ns.helper(…)` (a namespace import), `this.helper(…)` (a method of the same
 * class). Only relative specifiers are resolved (`./x`, `../x`, with the
 * usual extensions and `index` files); a path alias or a package is not.
 */

import type { ProjectClients } from './data-clients';
import type {
  CallSite,
  FunctionModel,
  ImportBinding,
  ModuleModel,
} from './model';

const TS_SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.mjs',
  '.cjs',
  '/index.ts',
  '/index.tsx',
  '/index.js',
];

export interface ResolvedCall {
  module: ModuleModel;
  fn: FunctionModel;
  /** The call passes the receiver as the first parameter (`self.m(…)`, `obj.m(…)` on a method). */
  boundMethod: boolean;
}

function dirOf(rel: string): string {
  const at = rel.lastIndexOf('/');
  return at < 0 ? '' : rel.slice(0, at);
}

function normalise(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

export class ModuleGraph {
  private readonly byRel = new Map<string, ModuleModel>();
  /** Python modules by every dotted suffix of their path (`a.b.c`, `b.c`, `c`). */
  private readonly byDotted = new Map<string, ModuleModel[]>();

  constructor(
    modules: readonly ModuleModel[],
    /** The database clients the project declares, for the laws that read through the graph. */
    readonly clients: ProjectClients
  ) {
    for (const module of modules) {
      this.byRel.set(module.rel, module);
      if (module.language !== 'python') continue;
      const parts = module.rel
        .replace(/\.py$/, '')
        .replace(/\/__init__$/, '')
        .split('/');
      for (let i = 0; i < parts.length; i++) {
        const key = parts.slice(i).join('.');
        this.byDotted.set(key, [...(this.byDotted.get(key) ?? []), module]);
      }
    }
  }

  /** The module an import specifier names, from the importing module; null when it is not in the project. */
  moduleFor(from: ModuleModel, specifier: string): ModuleModel | null {
    return from.language === 'python'
      ? this.pythonModule(from, specifier)
      : this.tsModule(from, specifier);
  }

  private pythonModule(
    from: ModuleModel,
    specifier: string
  ): ModuleModel | null {
    const dots = /^\.*/.exec(specifier)?.[0].length ?? 0;
    if (dots > 0) {
      let base = dirOf(from.rel);
      for (let i = 1; i < dots; i++) base = dirOf(base);
      const rest = specifier.slice(dots).split('.').filter(Boolean).join('/');
      const path = normalise(`${base}/${rest}`);
      return (
        this.byRel.get(`${path}.py`) ??
        this.byRel.get(`${path}/__init__.py`) ??
        null
      );
    }
    const candidates = this.byDotted.get(specifier) ?? [];
    // A unique match only: two modules ending in the same dotted name are ambiguous.
    return candidates.length === 1 ? (candidates[0] as ModuleModel) : null;
  }

  private tsModule(from: ModuleModel, specifier: string): ModuleModel | null {
    if (!specifier.startsWith('.')) return null;
    const base = normalise(`${dirOf(from.rel)}/${specifier}`);
    const stripped = base.replace(/\.(?:js|mjs|cjs|jsx)$/, '');
    for (const candidate of [base, stripped]) {
      for (const suffix of TS_SUFFIXES) {
        const hit = this.byRel.get(`${candidate}${suffix}`);
        if (hit) return hit;
      }
    }
    return null;
  }

  private topLevel(module: ModuleModel, name: string): FunctionModel | null {
    return module.functions.find(fn => fn.name === name) ?? null;
  }

  private importOf(
    module: ModuleModel,
    local: string
  ): ImportBinding | undefined {
    return module.imports.find(binding => binding.local === local);
  }

  /** `helper(…)`: a function of this module, or one imported by name. */
  private bare(module: ModuleModel, name: string): ResolvedCall | null {
    const own = this.topLevel(module, name);
    if (own) return { module, fn: own, boundMethod: false };
    const binding = this.importOf(module, name);
    if (!binding || binding.imported === null) return null;
    const target = this.moduleFor(module, binding.module);
    const fn = target
      ? this.topLevel(
          target,
          binding.imported === 'default' ? name : binding.imported
        )
      : null;
    return target && fn ? { module: target, fn, boundMethod: false } : null;
  }

  /** `ns.helper(…)`: a function of an imported module. */
  private qualified(
    module: ModuleModel,
    ns: string,
    name: string
  ): ResolvedCall | null {
    const binding = this.importOf(module, ns);
    if (!binding) return null;
    const specifier =
      binding.imported === null || module.language !== 'python'
        ? binding.module
        : `${binding.module}${binding.module.endsWith('.') ? '' : '.'}${binding.imported}`;
    const target = this.moduleFor(module, specifier);
    const fn = target ? this.topLevel(target, name) : null;
    return target && fn ? { module: target, fn, boundMethod: false } : null;
  }

  /** `self.helper(…)` / `this.helper(…)`: a method of the caller's class. */
  private ownMethod(
    module: ModuleModel,
    caller: FunctionModel,
    name: string
  ): ResolvedCall | null {
    const owner = caller.name.includes('.')
      ? caller.name.slice(0, caller.name.lastIndexOf('.'))
      : null;
    if (!owner) return null;
    const fn = this.topLevel(module, `${owner}.${name}`);
    return fn
      ? { module, fn, boundMethod: module.language === 'python' }
      : null;
  }

  /** A string constant of the module, or one it imports by name from a project module. */
  constantFor(module: ModuleModel, name: string): string | null {
    const own = module.constants.get(name);
    if (own !== undefined) return own;
    const binding = this.importOf(module, name);
    if (!binding || binding.imported === null) return null;
    return (
      this.moduleFor(module, binding.module)?.constants.get(binding.imported) ??
      null
    );
  }

  /** The function a call in `caller` runs, one step deep; null when it cannot be told. */
  resolve(
    module: ModuleModel,
    caller: FunctionModel,
    call: CallSite
  ): ResolvedCall | null {
    const links = call.chain;
    if (links.length === 1) return this.bare(module, call.method);
    if (links.length !== 2) return null;
    const head = links[0]?.name ?? '';
    if (head === 'self' || head === 'this')
      return this.ownMethod(module, caller, call.method);
    return this.qualified(module, head, call.method);
  }
}

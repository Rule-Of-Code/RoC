/**
 * Dependency Injection Via Depends
 * FastAPI route handlers should receive their collaborators through `Depends(...)`
 * (the framework's DI, akin to Angular constructor DI) rather than constructing
 * services/repositories inside the handler. Direct instantiation hard-wires
 * dependencies, defeats overriding in tests, and couples the interface layer to
 * concrete infrastructure.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class DependencyInjectionViaDependsLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Dependency Injection Via Depends';
  private static readonly ROUTE = /^\s*@[\w.]+\.(?:get|post|put|patch|delete)\s*\(/;
  private static readonly DEF = /^(\s*)(?:async\s+)?def\s+\w+/;
  // Constructing a collaborator: `X = FooService(`, `BarRepository(`, etc.
  private static readonly INSTANTIATE =
    /\b([A-Z]\w*(?:Service|Repository|Repo|Client|Gateway|UseCase|Handler|Manager))\s*\(/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasFastApi(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, context.config)) {
      const raw = FileUtils.readFileContentSync(file);
      if (!raw || !this.isApiLayerFile(file)) continue;
      const lines = this.stripPython(raw).split('\n');
      const rel = PathOperations.getRelative(projectRoot, file);
      this.collectRouteViolations(lines, rel, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Declare collaborators as parameters with Depends(): svc: OrderService = Depends(get_order_service)',
        'Keep construction/wiring in providers, not inside route handlers (enables test overrides)',
      ],
      context
    );
  }

  /** Flags every route handler in the file that constructs a collaborator directly. */
  private static collectRouteViolations(
    lines: string[],
    rel: string,
    violations: string[]
  ): void {
    for (let i = 0; i < lines.length; i++) {
      if (!this.ROUTE.test(lines[i] ?? '')) continue;
      // Find the handler def (skip stacked decorators).
      let d = i + 1;
      while (d < lines.length && !this.DEF.test(lines[d] ?? '')) d++;
      const defMatch = (lines[d] ?? '').match(this.DEF);
      if (!defMatch) continue;
      const indent = (defMatch[1] ?? '').length;
      this.checkHandlerBody(lines, d, indent, rel, violations);
      i = d; // continue scanning after this handler's def line
    }
  }

  /** Scans the handler body (lines indented deeper than the def) for direct instantiation. */
  private static checkHandlerBody(
    lines: string[],
    defLine: number,
    indent: number,
    rel: string,
    violations: string[]
  ): void {
    for (let j = defLine + 1; j < lines.length; j++) {
      const line = lines[j] ?? '';
      if (line.trim() === '') continue;
      const lineIndent = line.length - line.trimStart().length;
      if (lineIndent <= indent) break;
      if (line.includes('Depends(')) continue; // proper DI line
      const m = line.match(this.INSTANTIATE);
      if (m) {
        violations.push(
          `${rel}:${j + 1}: route handler constructs "${m[1]}(...)" directly — inject it via Depends(...) instead of instantiating in the handler`
        );
        break;
      }
    }
  }
}

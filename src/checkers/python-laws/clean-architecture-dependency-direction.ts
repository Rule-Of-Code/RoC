/**
 * Clean Architecture Dependency Direction
 * Dependencies must point inward: interface → application → domain, with the
 * infrastructure layer implementing inward-facing ports. So:
 *   - domain imports none of application / infrastructure / interface,
 *   - application imports neither infrastructure nor interface,
 *   - infrastructure does not import interface.
 * A violation is an outward/illegal import that couples a core layer to an outer
 * one — the architectural equivalent of an NgRx reducer reaching into a component.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

type Layer = 'domain' | 'application' | 'infrastructure' | 'interface';

export class CleanArchitectureDependencyDirectionLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Clean Architecture Dependency Direction';
  // file-layer → layers it must NOT import (outward dependencies).
  private static readonly FORBIDDEN: Record<Layer, Layer[]> = {
    domain: ['application', 'infrastructure', 'interface'],
    application: ['infrastructure', 'interface'],
    infrastructure: ['interface'],
    interface: [],
  };

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, context.config)) {
      const fileLayer = this.layerOfPath(file);
      if (!fileLayer) continue;
      const forbidden = this.FORBIDDEN[fileLayer];
      if (forbidden.length === 0) continue;

      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const rel = PathOperations.getRelative(projectRoot, file);

      const importLayer = this.findForbiddenImport(this.stripPython(raw), forbidden);
      if (importLayer) {
        violations.push(
          `${rel}: ${fileLayer} layer imports the ${importLayer} layer — dependencies must point inward (${fileLayer} must not depend on ${importLayer})`
        );
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Point dependencies inward: interface → application → domain',
        'Invert outward needs with a port (Protocol/ABC) defined inward and implemented in infrastructure',
      ],
      context
    );
  }

  /** First outward (forbidden) layer the file imports, if any. */
  private static findForbiddenImport(content: string, forbidden: Layer[]): Layer | null {
    for (const line of content.split('\n')) {
      if (!/^\s*(?:from|import)\s/.test(line)) continue;
      const importLayer = this.layerOfImport(line);
      if (importLayer && forbidden.includes(importLayer)) return importLayer;
    }
    return null;
  }
}

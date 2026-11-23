import type * as TS from 'typescript';
import type { RuleOfCodeConfig } from '../../../../types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { loadTypeScript } from '../../../../utils/react/tsx-source';
import {
  type AuthShape,
  mergeAuthShapes,
  readAuthShape,
} from '../../../../utils/security/auth-shape';
import { APIAuthenticationConstants } from '../constants';
import { readApiCodeView } from './api-code-view';

/** Words a file must hold before it is parsed for authentication shapes. */
const AUTH_HINT =
  /auth|authorization|bearer|sign-?in|log-?in|verify|session|token|guard/i;

/** The shape signals that mean the code authenticates (#549). */
function authenticates(shape: AuthShape): boolean {
  return (
    shape.managedSdk ||
    shape.serverSession ||
    shape.signsInOrVerifies ||
    shape.attachesCredentials
  );
}

/** A file whose code authenticates: its text and its shape. */
interface AuthFile {
  content: string;
  shape: AuthShape;
}

/**
 * APIAuthenticationAnalyzer
 *
 * Specialized analyzer for API authentication implementation.
 * Single Responsibility: Authentication service and token handling validation
 *
 * Authentication is recognised by what the code does (#550, with the
 * detector of #549): a managed auth SDK or a session library imported, a
 * sign-in or verify call, a credential attached to requests — in a file of
 * any name. Five exact file names (auth.service.ts, auth.guard.ts, …) made a
 * file called http-auth.ts invisible, and an empty auth.service.ts enough.
 */
export class APIAuthenticationAnalyzer {
  /**
   * `ts` is the parser the files are read with; without it authentication
   * is not judged (the coordinator says so once for the law).
   */
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig,
    ts: typeof TS | null = loadTypeScript(projectRoot)
  ): string[] {
    const violations: string[] = [];
    this.checkFirebaseAuthConfiguration(projectRoot, violations);
    if (!ts) return violations;

    const files = this.authFiles(projectRoot, config, ts);
    if (files.length === 0) {
      violations.push('No authentication service implementation found');
      return violations;
    }
    this.validateAuthContent(
      files.map(file => file.content).join('\n'),
      mergeAuthShapes(files.map(file => file.shape)),
      violations
    );
    return violations;
  }

  /** The files whose code authenticates, whatever they are called. */
  private static authFiles(
    projectRoot: string,
    config: RuleOfCodeConfig,
    ts: typeof TS
  ): AuthFile[] {
    const found: AuthFile[] = [];
    const files = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.ts', '.tsx'],
      config
    );
    for (const file of files) {
      let content: string;
      try {
        content = FileUtils.readFile(file, { encoding: 'utf8' });
      } catch (_error) {
        continue;
      }
      if (!AUTH_HINT.test(content)) continue;
      const view = readApiCodeView(ts, file, content);
      if (!view) continue;
      const shape = readAuthShape(ts, view);
      if (authenticates(shape)) found.push({ content, shape });
    }
    return found;
  }

  /**
   * Validate the combined content of the files that authenticate. A managed
   * SDK refreshes its own tokens (#549), so refresh is not asked of it.
   */
  private static validateAuthContent(
    content: string,
    shape: AuthShape,
    violations: string[]
  ): void {
    if (!APIAuthenticationConstants.hasAuthorizationHandling(content)) {
      violations.push(
        'Authentication: Missing proper Authorization header handling'
      );
    }

    if (
      !shape.managedSdk &&
      !APIAuthenticationConstants.hasTokenRefreshMechanism(content)
    ) {
      violations.push('Authentication: Missing token refresh mechanism');
    }

    if (APIAuthenticationConstants.hasInsecureTokenStorage(content)) {
      violations.push(
        'Authentication: Insecure token storage using localStorage without encryption'
      );
    }
  }

  /**
   * Check Firebase Auth configuration
   * Helper method extracted for complexity reduction
   */
  private static checkFirebaseAuthConfiguration(
    projectRoot: string,
    violations: string[]
  ): void {
    const firebaseConfigPath = PathOperations.join(
      projectRoot,
      'firebase.json'
    );

    if (!FileUtils.exists(firebaseConfigPath)) {
      return;
    }

    try {
      const content = FileUtils.readFile(firebaseConfigPath, {
        encoding: 'utf8',
      });

      if (!content.includes('auth')) {
        violations.push('Firebase Auth not configured in firebase.json');
      }
    } catch (_error) {
      // Continue
    }
  }
}

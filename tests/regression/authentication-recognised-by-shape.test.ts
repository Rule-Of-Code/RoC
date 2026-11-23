/**
 * #549 — Authentication Security recognised authentication only by a few
 * class-name words (`AuthService`, `AuthManager`, `LoginService`, …) and
 * token management only by web storage, `jwt.sign/verify` and the words
 * `TokenManager`, `TokenService`, `refreshToken`, `accessToken`
 * (authentication-checker.ts:72-92).
 *
 * An app that authenticates through a managed SDK behind a provider class,
 * with an interceptor that attaches the token, matched none of them and was
 * told it has no authentication and no token management; an app whose only
 * "authentication" is an empty class named AuthService passed. Renaming a
 * class changed the verdict; changing the security did not.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { AuthenticationSecurityLaw } from '../../src/checkers/security-laws/authentication-security';
import { AuthenticationChecker } from '../../src/checkers/security-laws/authentication/authentication-checker';
import { FileUtils } from '../../src/utils/file-utils';

const config = FileUtils.getMinimalDefaultConfig();
const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function violations(files: Record<string, string>): string[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-549-'));
  made.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'auth-549', version: '1.0.0' })
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return AuthenticationChecker.checkAuthenticationImplementation(dir, config)
    .violations;
}

const NO_AUTH = 'No authentication service implementation found';
const NO_TOKENS = 'No proper token management implementation found';

/** A provider over a managed SDK, and an interceptor that attaches its token. */
const MANAGED_SDK_APP = {
  'src/app/core/session-token-provider.ts': [
    "import { Injectable } from '@angular/core';",
    "import { getAuth, getIdToken } from 'firebase/auth';",
    '',
    "@Injectable({ providedIn: 'root' })",
    'export class SessionTokenProvider {',
    '  async current(): Promise<string | null> {',
    '    const user = getAuth().currentUser;',
    '    return user ? getIdToken(user) : null;',
    '  }',
    '}',
    '',
  ].join('\n'),
  'src/app/core/http-credentials.ts': [
    "import { inject } from '@angular/core';",
    "import { HttpInterceptorFn } from '@angular/common/http';",
    "import { from, switchMap } from 'rxjs';",
    "import { SessionTokenProvider } from './session-token-provider';",
    '',
    'export const httpCredentials: HttpInterceptorFn = (req, next) =>',
    '  from(inject(SessionTokenProvider).current()).pipe(',
    '    switchMap(token =>',
    '      next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req)',
    '    )',
    '  );',
    '',
  ].join('\n'),
};

describe('#549 authentication through a managed SDK is authentication', () => {
  it('a provider over firebase/auth plus an interceptor is an auth implementation', () => {
    expect(violations(MANAGED_SDK_APP)).not.toContain(NO_AUTH);
  });

  it('a token held by the SDK is managed tokens, not "no token management"', () => {
    expect(violations(MANAGED_SDK_APP)).not.toContain(NO_TOKENS);
  });

  it('an Auth0 client behind a differently named class is recognised', () => {
    const v = violations({
      'src/session/identity.ts': [
        "import { createAuth0Client, Auth0Client } from '@auth0/auth0-spa-js';",
        '',
        'export class Identity {',
        '  private client?: Auth0Client;',
        '  async token(): Promise<string> {',
        "    this.client ??= await createAuth0Client({ domain: 'id.local', clientId: 'x' });",
        '    return this.client.getTokenSilently();',
        '  }',
        '}',
        '',
      ].join('\n'),
    });
    expect(v).not.toContain(NO_AUTH);
    expect(v).not.toContain(NO_TOKENS);
  });
});

describe('#549 a class name is not authentication', () => {
  it('an empty class called AuthService does not satisfy the law', () => {
    const v = violations({
      'src/app/auth.service.ts': 'export class AuthService {}\n',
    });
    expect(v).toContain(NO_AUTH);
  });
});

describe('#549 controls (hold on develop and after the fix)', () => {
  it('a project with no authentication at all is still told so', () => {
    expect(
      violations({
        'src/app/math.ts':
          'export const add = (a: number, b: number) => a + b;\n',
      })
    ).toContain(NO_AUTH);
  });

  it('tokens kept in localStorage are still seen as token handling', () => {
    const v = violations({
      'src/app/session.ts': [
        "import jwt from 'jsonwebtoken';",
        "export const keep = (t: string) => localStorage.setItem('token', t);",
        "export const check = (t: string) => jwt.verify(t, 'k');",
        '',
      ].join('\n'),
    });
    expect(v).not.toContain(NO_TOKENS);
  });
});

/** The whole law's findings: authentication, authorization and session. */
function lawViolations(files: Record<string, string>): string[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-561-'));
  made.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'auth-561', version: '1.0.0' })
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return (
    AuthenticationSecurityLaw.check({ projectRoot: dir, config }).violations ??
    []
  );
}

const RBAC = 'No Role-Based Access Control (RBAC) implementation found';
const GUARDS = 'No authorization guards or middleware found';
const TIMEOUT = 'No session timeout implementation found';
const INVALIDATION = 'No proper session invalidation found';

describe('#561 authorization and session by what the code does', () => {
  it('a managed-SDK app without roles gets none of the four word findings', () => {
    const v = lawViolations(MANAGED_SDK_APP);
    expect(v).not.toContain(RBAC);
    expect(v).not.toContain(GUARDS);
    expect(v).not.toContain(TIMEOUT);
    expect(v).not.toContain(INVALIDATION);
    expect(v).not.toContain('No permission-based access control found');
    expect(v).not.toContain('No resource-level authorization found');
  });

  it('an enum named UserRole that nothing enforces does not satisfy RBAC', () => {
    const v = lawViolations({
      ...MANAGED_SDK_APP,
      'src/app/core/user-role.ts':
        "export enum UserRole { Admin = 'admin', Member = 'member' }\n",
    });
    expect(v).toContain(RBAC);
  });

  it('roles enforced by a route guard satisfy RBAC and guards', () => {
    const v = lawViolations({
      ...MANAGED_SDK_APP,
      'src/app/core/admin.guard.ts': [
        "import { CanActivateFn } from '@angular/router';",
        'export interface Member { roles: string[] }',
        'declare const me: () => Member;',
        'const hasRole = (m: Member, r: string) => m.roles.includes(r);',
        "export const adminGuard: CanActivateFn = () => hasRole(me(), 'admin');",
        '',
      ].join('\n'),
    });
    expect(v).not.toContain(RBAC);
    expect(v).not.toContain(GUARDS);
  });

  it('a server session without a timeout or a destroy is still reported (control)', () => {
    const v = lawViolations({
      'src/server.ts': [
        "import express from 'express';",
        "import session from 'express-session';",
        'const app = express();',
        "app.use(session({ secret: process.env.SESSION_SECRET ?? '' }));",
        "app.post('/login', (req, res) => res.json({ ok: true }));",
        '',
      ].join('\n'),
    });
    expect(v).toContain(TIMEOUT);
    expect(v).toContain(INVALIDATION);
  });
});

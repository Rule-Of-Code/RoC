/**
 * #590 — once the security laws read a Next.js app-router project (#574),
 * five older detectors made findings that do not hold for the way such a
 * project is written (cookie sessions, jose JWTs, a middleware guard):
 *   1. `/plaintext.*password/i` took a parameter name (`plainTextPassword`
 *      handed to a bcrypt compare) for a stored plaintext password;
 *   2. jose (`SignJWT`, `jwtVerify`) was not token management;
 *   3. a `middleware.ts` that redirects unauthenticated requests was no guard;
 *   4. re-issuing the session cookie with a new expiry was not a refresh;
 *   5. an Authorization header was asked of a cookie session.
 * Each point has a control where the finding is real and stays.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { AuthenticationSecurityLaw } from '../../src/checkers/security-laws/authentication-security';
import { ApiSecurityStandardsLaw } from '../../src/laws/security/api-security-standards';
import { FileUtils } from '../../src/utils/file-utils';

const config = FileUtils.getMinimalDefaultConfig();
const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-590-'));
  made.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'next-app',
      version: '1.0.0',
      dependencies: { next: '15.0.0', jose: '5.9.0', bcryptjs: '2.4.3' },
    })
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

const authViolations = (files: Record<string, string>): string[] =>
  AuthenticationSecurityLaw.check({ projectRoot: project(files), config })
    .violations ?? [];

const apiViolations = async (
  files: Record<string, string>
): Promise<string[]> =>
  (await ApiSecurityStandardsLaw.check({ projectRoot: project(files), config }))
    .violations ?? [];

/** jose session helpers and a cookie session, as an app-router app writes them. */
const SESSION = [
  "import { SignJWT, jwtVerify } from 'jose';",
  "import { cookies } from 'next/headers';",
  '',
  'const key = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");',
  '',
  'export async function signToken(payload: Record<string, unknown>) {',
  "  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).sign(key);",
  '}',
  '',
  'export async function verifyToken(input: string) {',
  "  const { payload } = await jwtVerify(input, key, { algorithms: ['HS256'] });",
  '  return payload;',
  '}',
  '',
  'export async function setSession(userId: number) {',
  '  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);',
  '  const session = await signToken({ userId, expires: expires.toISOString() });',
  "  (await cookies()).set('session', session, { expires, httpOnly: true, secure: true, sameSite: 'lax' });",
  '}',
  '',
].join('\n');

const PASSWORDS = [
  "import { compare, hash } from 'bcryptjs';",
  '',
  'export const hashPassword = (password: string) => hash(password, 10);',
  'export const comparePasswords = (plainTextPassword: string, hashedPassword: string) =>',
  '  compare(plainTextPassword, hashedPassword);',
  '',
].join('\n');

/** A middleware that redirects without a session and re-issues the cookie. */
const MIDDLEWARE = [
  "import { NextResponse, type NextRequest } from 'next/server';",
  "import { signToken, verifyToken } from './lib/auth/session';",
  '',
  'export async function middleware(request: NextRequest) {',
  "  const session = request.cookies.get('session');",
  "  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {",
  "    return NextResponse.redirect(new URL('/sign-in', request.url));",
  '  }',
  '  const res = NextResponse.next();',
  '  if (session) {',
  '    const parsed = await verifyToken(session.value);',
  '    res.cookies.set({',
  "      name: 'session',",
  '      value: await signToken(parsed),',
  '      httpOnly: true,',
  '      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),',
  '    });',
  '  }',
  '  return res;',
  '}',
  '',
].join('\n');

const NEXT_APP = {
  'lib/auth/session.ts': SESSION,
  'lib/auth/password.ts': PASSWORDS,
  'middleware.ts': MIDDLEWARE,
  'app/sign-in/page.tsx': 'export default function Page() { return null; }\n',
};

/** A bearer API: verifies a token taken from the query, never the header. */
const BEARER_API = {
  'server/index.ts': [
    "import express from 'express';",
    "import jwt from 'jsonwebtoken';",
    'const app = express();',
    "app.get('/orders', (req, res) => {",
    "  jwt.verify(String(req.query.token), process.env.JWT_SECRET ?? '');",
    '  res.json([]);',
    '});',
    'app.listen(3000);',
    '',
  ].join('\n'),
};

describe('#590 1. a parameter name is not a plaintext password', () => {
  it('plainTextPassword handed to bcrypt compare is not insecure handling', () => {
    expect(authViolations(NEXT_APP)).not.toContain(
      'Insecure password handling detected'
    );
  });

  it('a password compared directly is still insecure (control)', () => {
    const v = authViolations({
      ...NEXT_APP,
      'lib/auth/legacy.ts': [
        'export const matches = (user: { password: string }, password: string) =>',
        '  user.password === password;',
        '',
      ].join('\n'),
    });
    expect(v).toContain('Insecure password handling detected');
  });

  it('two form inputs compared to each other are validation, not plaintext storage', () => {
    const v = authViolations({
      ...NEXT_APP,
      'app/settings/actions.ts': [
        'export async function updatePassword(',
        '  currentPassword: string,',
        '  newPassword: string,',
        '  confirmPassword: string',
        ') {',
        '  if (currentPassword === newPassword) {',
        "    return { error: 'New password must be different' };",
        '  }',
        '  if (confirmPassword !== newPassword) {',
        "    return { error: 'Passwords do not match' };",
        '  }',
        '  return { ok: true };',
        '}',
        '',
      ].join('\n'),
    });
    expect(v).not.toContain('Insecure password handling detected');
  });

  it('two fields of one form object compared to each other are validation', () => {
    const v = authViolations({
      ...NEXT_APP,
      'app/sign-up/schema.ts': [
        'export const check = (data: { password: string; confirmPassword: string }) =>',
        '  data.password !== data.confirmPassword;',
        '',
      ].join('\n'),
    });
    expect(v).not.toContain('Insecure password handling detected');
  });

  it('a stored field compared to an input field is still insecure (control)', () => {
    const v = authViolations({
      ...NEXT_APP,
      'lib/auth/legacy.ts': [
        'export const matches = (',
        '  row: { password: string },',
        '  input: { password: string }',
        ') => row.password === input.password;',
        '',
      ].join('\n'),
    });
    expect(v).toContain('Insecure password handling detected');
  });
});

describe('#590 2. jose is token management', () => {
  it('SignJWT / jwtVerify count as token management', () => {
    const v = authViolations({ 'lib/auth/session.ts': SESSION });
    expect(v).not.toContain('No proper token management implementation found');
  });
});

describe('#590 3. a Next.js middleware that redirects without a session is a guard', () => {
  it('middleware.ts redirecting to /sign-in is an authorization guard', () => {
    expect(authViolations(NEXT_APP)).not.toContain(
      'No authorization guards or middleware found'
    );
  });

  it('a middleware that redirects on the locale only is not a guard (control)', () => {
    const v = authViolations({
      'middleware.ts': [
        "import { NextResponse, type NextRequest } from 'next/server';",
        'export function middleware(request: NextRequest) {',
        "  return NextResponse.redirect(new URL('/en', request.url));",
        '}',
        '',
      ].join('\n'),
      'app/page.tsx': 'export default function Page() { return null; }\n',
    });
    expect(v).toContain('No authorization guards or middleware found');
  });
});

describe('#590 4. re-issuing the session cookie is a refresh', () => {
  it('a cookie set again with a new expiry satisfies the refresh check', async () => {
    expect(await apiViolations(NEXT_APP)).not.toContain(
      'Authentication: Missing token refresh mechanism'
    );
  });

  it('a bearer API with no refresh is still told so (control)', async () => {
    expect(await apiViolations(BEARER_API)).toContain(
      'Authentication: Missing token refresh mechanism'
    );
  });
});

describe('#590 5. a cookie session needs no Authorization header', () => {
  it('a cookie-session app is not asked for an Authorization header', async () => {
    expect(await apiViolations(NEXT_APP)).not.toContain(
      'Authentication: Missing proper Authorization header handling'
    );
  });

  it('a bearer API without the header is still told so (control)', async () => {
    expect(await apiViolations(BEARER_API)).toContain(
      'Authentication: Missing proper Authorization header handling'
    );
  });
});

/**
 * Authentication and authorization recognised by what the code does, not by
 * what its classes are called (#549, #561).
 *
 * Authentication Security recognised an auth implementation by the words
 * `AuthService`, `AuthManager`, `LoginService`…, token management by
 * `TokenService` / `accessToken`, guards by a name ending in `Guard`, roles by
 * `UserRole`, sessions by `maxAge` / `expires`. An app that signs in through a
 * managed SDK behind a provider called anything else failed every check; an
 * empty `class AuthService {}` passed one. Here each signal is a shape in the
 * parse:
 *
 * - a module the file imports (a managed auth SDK, a server session library);
 * - a call the code makes (`signInWithPopup(…)`, `jwt.verify(…)`,
 *   `res.status(401)`), by the callee's last name — a declaration
 *   `login() {}` is not a call;
 * - a credential attached to a request (`Authorization` as a header key, or
 *   `headers.set('Authorization', …)`);
 * - a route guard by its contract (`implements CanActivate`, a `CanActivateFn`,
 *   `canActivate: […]`, `@UseGuards(…)`);
 * - a role or permission concept in the code's own identifiers.
 */
import type * as TS from 'typescript';
import type { CodeView } from './code-view';

/** Managed authentication SDKs: the SDK signs in and holds the tokens. */
const MANAGED_AUTH_MODULE =
  /^(?:firebase\/auth|@firebase\/auth|@angular\/fire\/auth|firebase-admin\/auth|@capacitor-firebase\/authentication|@auth0\/[\w.-]+|aws-amplify(?:\/auth)?|@aws-amplify\/auth|amazon-cognito-identity-js|@okta\/[\w.-]+|@azure\/msal-[\w.-]+|@supabase\/(?:supabase-js|auth-js|ssr)|@clerk\/[\w.-]+|next-auth(?:\/[\w.-]+)?|@auth\/[\w.-]+|keycloak-js|keycloak-angular|oidc-client(?:-ts)?|angular-oauth2-oidc|@react-oauth\/google|passport(?:-[\w.-]+)?|@nestjs\/passport|express-openid-connect|lucia|better-auth(?:\/[\w.-]+)?)$/;

/** Server-managed session libraries: the server keeps the session. */
const SERVER_SESSION_MODULE =
  /^(?:express-session|cookie-session|@fastify\/session|@fastify\/secure-session|iron-session|koa-session|connect-redis|@nestjs\/session)$/;

/** Calls that sign a user in or check a credential. */
// `signIn`, `signInWithPopup`, `login`, `logInUser` — not `logInfo`.
const SIGN_IN_CALL =
  /^(?:sign[Ii]n(?:[A-Z]\w*)?|log[Ii]n(?:[A-Z]\w*)?|authenticate(?:[A-Z]\w*)?|getRedirectResult|acquireToken(?:[A-Z]\w*)?)$/;
const VERIFY_CALL =
  /^(?:verify|verifyIdToken|verifySessionCookie|verifyToken|jwtVerify|decodeAndVerify\w*)$/;
/** Calls that read a token an SDK holds. */
const SDK_TOKEN_CALL =
  /^(?:getIdToken|getIdTokenResult|getTokenSilently|getAccessTokenSilently|acquireTokenSilent|fetchAuthSession|getSession|getAccessToken|getToken)$/;
/** Calls that end a sign-in or a session. */
// `signOut`, `logout`, `logOutAll` — not `logOutput`. `destroy` / `regenerate`
// count where a server session library is imported (see the session check).
const SIGN_OUT_CALL =
  /^(?:sign[Oo]ut(?:[A-Z]\w*)?|log[Oo]ut(?:[A-Z]\w*)?|revokeRefreshTokens|destroy|invalidate(?:[A-Z]\w*)?|regenerate)$/;
/** Errors and statuses that refuse a request. */
const REFUSAL_CLASS =
  /^(?:UnauthorizedException|ForbiddenException|UnauthorizedError|ForbiddenError|AuthenticationError|AuthorizationError)$/;
const ROUTE_GUARD_TYPE =
  /^(?:CanActivate|CanActivateChild|CanMatch|CanLoad)(?:Fn)?$/;
const ROUTE_GUARD_KEY = /^(?:canActivate|canActivateChild|canMatch|canLoad)$/;
/** Role and permission concepts, as the code's own identifiers. */
const ROLE_NAME = /^(?:roles?|userRoles?|[a-z]*Roles?|Roles?|[A-Z]\w*Role)$/;
const PERMISSION_NAME =
  /^(?:permissions?|claims|abilit(?:y|ies)|[a-z]*Permissions?|[A-Z]\w*Permission)$/;
/** Calls and decorators that enforce a role or permission. */
const ROLE_CHECK =
  /^(?:hasRole|hasAnyRole|hasAllRoles|checkRole|requireRole|Roles|Role|hasPermission|checkPermission|requirePermission|Permissions|can|cannot|isAllowed|authorize)$/;

/** What one file does, as far as authentication is concerned. */
export interface AuthShape {
  /** Imports a managed auth SDK. */
  managedSdk: boolean;
  /** Imports a server-managed session library. */
  serverSession: boolean;
  /** Calls a sign-in, or verifies a credential. */
  signsInOrVerifies: boolean;
  /** Reads a token an SDK holds. */
  readsSdkToken: boolean;
  /** Attaches a credential to an outgoing request. */
  attachesCredentials: boolean;
  /** Ends a sign-in or a session. */
  signsOut: boolean;
  /** A route guard by its contract, or `@UseGuards(…)`. */
  routeGuard: boolean;
  /** Refuses a request: 401/403, or an unauthorized/forbidden error. */
  refusesRequests: boolean;
  /** Has a role or permission concept in its identifiers. */
  roleConcept: boolean;
  /** Enforces a role or permission (a check call or decorator). */
  roleCheck: boolean;
}

const EMPTY: AuthShape = {
  managedSdk: false,
  serverSession: false,
  signsInOrVerifies: false,
  readsSdkToken: false,
  attachesCredentials: false,
  signsOut: false,
  routeGuard: false,
  refusesRequests: false,
  roleConcept: false,
  roleCheck: false,
};

/** `a.b.c(…)` → `c`; `new X()` → `X`. */
function lastName(ts: typeof TS, expr: TS.Expression): string | null {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return null;
}

function propertyKey(ts: typeof TS, name: TS.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

function stringArg(ts: typeof TS, call: TS.CallExpression, i: number) {
  const arg = call.arguments[i];
  return arg && ts.isStringLiteralLike(arg) ? arg.text : null;
}

function numberArg(ts: typeof TS, call: TS.CallExpression, i: number) {
  const arg = call.arguments[i];
  return arg && ts.isNumericLiteral(arg) ? Number(arg.text) : null;
}

function moduleOf(ts: typeof TS, node: TS.Node): string | null {
  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier))
    return node.moduleSpecifier.text;
  if (
    ts.isCallExpression(node) &&
    (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
  )
    return stringArg(ts, node, 0);
  return null;
}

/** Unauthorized and Forbidden: the statuses that refuse a request. */
const REFUSAL_STATUSES = new Set([401, 403]);

/** What a call's name alone says. */
function readCallName(name: string, s: AuthShape): void {
  if (SIGN_IN_CALL.test(name) || VERIFY_CALL.test(name))
    s.signsInOrVerifies = true;
  if (SDK_TOKEN_CALL.test(name)) s.readsSdkToken = true;
  if (SIGN_OUT_CALL.test(name)) s.signsOut = true;
  if (ROLE_CHECK.test(name)) s.roleCheck = true;
  if (name === 'UseGuards') s.routeGuard = true;
}

/** `headers.set('Authorization', …)` and `res.status(401)`. */
function readCallArguments(
  ts: typeof TS,
  name: string,
  call: TS.CallExpression,
  s: AuthShape
): void {
  if (
    /^(?:set|append|setRequestHeader)$/.test(name) &&
    stringArg(ts, call, 0)?.toLowerCase() === 'authorization'
  )
    s.attachesCredentials = true;
  if (/^(?:status|sendStatus|code)$/.test(name)) {
    const status = numberArg(ts, call, 0);
    if (status !== null && REFUSAL_STATUSES.has(status))
      s.refusesRequests = true;
  }
}

function readCall(ts: typeof TS, call: TS.CallExpression, s: AuthShape): void {
  const name = lastName(ts, call.expression);
  if (!name) return;
  readCallName(name, s);
  readCallArguments(ts, name, call, s);
}

function readModule(ts: typeof TS, node: TS.Node, s: AuthShape): void {
  const mod = moduleOf(ts, node);
  if (mod === null) return;
  if (MANAGED_AUTH_MODULE.test(mod)) s.managedSdk = true;
  if (SERVER_SESSION_MODULE.test(mod)) s.serverSession = true;
}

/** `@Roles(…)` / `@Permissions(…)`, and `new UnauthorizedException()`. */
function readDecoratorOrNew(ts: typeof TS, node: TS.Node, s: AuthShape) {
  if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
    const name = lastName(ts, node.expression.expression);
    if (name && ROLE_CHECK.test(name)) s.roleCheck = true;
  } else if (ts.isNewExpression(node)) {
    const name = lastName(ts, node.expression);
    if (name && REFUSAL_CLASS.test(name)) s.refusesRequests = true;
  }
}

/** `{ Authorization: … }`, `{ canActivate: […] }`, `implements CanActivate`. */
function readKeyOrType(ts: typeof TS, node: TS.Node, s: AuthShape): void {
  if (ts.isPropertyAssignment(node)) {
    const key = propertyKey(ts, node.name);
    if (key?.toLowerCase() === 'authorization') s.attachesCredentials = true;
    if (key && ROUTE_GUARD_KEY.test(key)) s.routeGuard = true;
    return;
  }
  if (ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node)) {
    const ref = ts.isTypeReferenceNode(node) ? node.typeName : node.expression;
    if (ts.isIdentifier(ref) && ROUTE_GUARD_TYPE.test(ref.text))
      s.routeGuard = true;
  }
}

/** The name a node declares or reads, where a role concept can live. */
function conceptName(ts: typeof TS, node: TS.Node): string | null {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (
    (ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) &&
    ts.isIdentifier(node.name)
  )
    return node.name.text;
  if (
    ts.isEnumDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isInterfaceDeclaration(node)
  )
    return node.name.text;
  return null;
}

/** `x.role` / `x?.roles` — a property access that names a role concept. */
function rolePropertyName(ts: typeof TS, node: TS.Node): string | null {
  return ts.isPropertyAccessExpression(node) &&
    isRoleOrPermission(node.name.text)
    ? node.name.text
    : null;
}

/**
 * An inline role check (#574): `user?.role === 'owner'`, `role !== 'admin'`,
 * `user.roles.includes('admin')`. The code enforces the role where it
 * compares it, without a helper named hasRole.
 */
function readInlineRoleCheck(ts: typeof TS, node: TS.Node, s: AuthShape) {
  if (comparesRole(ts, node) || includesRole(ts, node)) s.roleCheck = true;
}

/** `user?.role === 'owner'`, `role !== 'admin'` (either side). */
function comparesRole(ts: typeof TS, node: TS.Node): boolean {
  if (!ts.isBinaryExpression(node)) return false;
  if (!equalityTokens(ts).has(node.operatorToken.kind)) return false;
  return !!(
    rolePropertyName(ts, node.left) || rolePropertyName(ts, node.right)
  );
}

/** `user.roles.includes('admin')`. */
function includesRole(ts: typeof TS, node: TS.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'includes' &&
    !!rolePropertyName(ts, node.expression.expression)
  );
}

/** `===`, `!==`, `==`, `!=`. */
function equalityTokens(ts: typeof TS): ReadonlySet<TS.SyntaxKind> {
  const k = ts.SyntaxKind;
  return new Set([
    k.EqualsEqualsEqualsToken,
    k.ExclamationEqualsEqualsToken,
    k.EqualsEqualsToken,
    k.ExclamationEqualsToken,
  ]);
}

function readNode(ts: typeof TS, node: TS.Node, s: AuthShape): void {
  readModule(ts, node, s);
  if (ts.isCallExpression(node)) readCall(ts, node, s);
  readDecoratorOrNew(ts, node, s);
  readKeyOrType(ts, node, s);
  readInlineRoleCheck(ts, node, s);
  const name = conceptName(ts, node);
  if (name && isRoleOrPermission(name)) s.roleConcept = true;
}

function isRoleOrPermission(name: string): boolean {
  return ROLE_NAME.test(name) || PERMISSION_NAME.test(name);
}

/** The authentication shape of one parsed file. */
export function readAuthShape(ts: typeof TS, view: CodeView): AuthShape {
  const shape: AuthShape = { ...EMPTY };
  const visit = (node: TS.Node): void => {
    readNode(ts, node, shape);
    ts.forEachChild(node, visit);
  };
  visit(view.source);
  return shape;
}

/** The shapes of several files, combined: a signal in any file counts. */
export function mergeAuthShapes(shapes: readonly AuthShape[]): AuthShape {
  const merged: AuthShape = { ...EMPTY };
  for (const shape of shapes)
    for (const key of Object.keys(merged) as (keyof AuthShape)[])
      if (shape[key]) merged[key] = true;
  return merged;
}

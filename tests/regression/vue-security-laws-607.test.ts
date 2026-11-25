/**
 * #607, P4 — five security laws read `.vue` single-file components by their
 * script: No Hostname Gating, Authentication Security, Data Encryption
 * Standards, Environment Security Enforcement and API Security Standards
 * (its authentication check). A Vue project whose login lives in a
 * component's `<script setup>`: each law judges that script, text in the
 * template that looks like code is not code, and none gets the ".vue not
 * read" note.
 */
import { NoHostnameGatingLaw } from '../../src/checkers/fe-architecture-laws/no-hostname-gating';
import { AuthenticationSecurityLaw } from '../../src/checkers/security-laws/authentication-security';
import { DataEncryptionStandardsLaw } from '../../src/checkers/security-laws/data-encryption-standards';
import { EnvironmentSecurityEnforcementLaw } from '../../src/checkers/security-laws/environment-security-enforcement';
import { ApiSecurityStandardsLaw } from '../../src/laws/security/api-security-standards';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const COMPONENT = 'src/components/Login.vue';
const LOGIN = [
  '<template>', //                                                                    1
  "  <p>if (location.hostname === 'demo') https://decoy.myshop.io</p>", //            2
  '</template>', //                                                                   3
  '<script setup lang="ts">', //                                                      4
  "import CryptoJS from 'crypto-js';", //                                             5
  "const API = 'https://api.myshop.io/v1';", //                                       6
  'export async function login(user: string, password: string) {', //                7
  '  const hash = CryptoJS.MD5(password).toString();', //                             8
  "  const res = await fetch(API + '/login', { method: 'POST', body: JSON.stringify({ user, hash }) });", // 9
  '  const { token } = await res.json();', //                                        10
  "  localStorage.setItem('token', token);", //                                      11
  "  return fetch(API + '/me', { headers: { Authorization: 'Bearer ' + token } });", // 12
  '}', //                                                                            13
  "if (location.hostname === 'localhost') console.log('dev');", //                   14
  '</script>', //                                                                    15
  '',
].join('\n');

function vueProject(): string {
  return project({
    'package.json': JSON.stringify({
      name: 'app',
      version: '1.0.0',
      dependencies: { vue: '^3.5.0', 'crypto-js': '^4.2.0' },
      devDependencies: { typescript: '^5.9.3' },
    }),
    'src/main.ts':
      "import { createApp } from 'vue';\nexport const app = createApp;\n",
    [COMPONENT]: LOGIN,
  });
}

async function judge(
  check: (c: LawCheckContext) => LawResult | Promise<LawResult>
): Promise<{ violations: string[]; unread: boolean }> {
  const { value, scope } = await runLawScope(() => check(ctx(vueProject())));
  return {
    violations: value.violations ?? [],
    unread: vueNotReadNote(scope, [COMPONENT]) !== null,
  };
}

describe('#607 P4 security laws read .vue components by their script', () => {
  it('No Hostname Gating: the script line, not the template', async () => {
    const r = await judge(c => NoHostnameGatingLaw.check(c));
    expect(r.violations).toEqual([
      expect.stringMatching(
        /^src[\\/]components[\\/]Login\.vue:14: feature gating via location\.hostname/
      ),
    ]);
    expect(r.unread).toBe(false);
  });

  it('Authentication Security: the login in the component is an authentication service; MD5 of the password is insecure', async () => {
    const r = await judge(c => AuthenticationSecurityLaw.check(c));
    expect(r.violations).not.toContain(
      'No authentication service implementation found'
    );
    expect(r.violations).not.toContain(
      'No proper token management implementation found'
    );
    expect(r.violations).toContain('Insecure password handling detected');
    expect(r.unread).toBe(false);
  });

  it('Data Encryption Standards: MD5 in the script, the token in browser storage', async () => {
    const r = await judge(c => DataEncryptionStandardsLaw.check(c));
    expect(r.violations).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /components[\\/]Login\.vue: Weak encryption algorithm detected: MD5$/
        ),
        expect.stringMatching(
          /components[\\/]Login\.vue: Potential sensitive data in browser storage$/
        ),
      ])
    );
    expect(r.unread).toBe(false);
  });

  it('Environment Security Enforcement: the URL hardcoded in the script, not the one in the template', async () => {
    const r = await judge(c => EnvironmentSecurityEnforcementLaw.check(c));
    const urls = r.violations.filter(v => /myshop\.io/.test(v));
    expect(urls).toEqual([expect.stringContaining('https://api.myshop.io/v1')]);
    expect(r.unread).toBe(false);
  });

  it('API Security Standards: the component authenticates; it stores the token in localStorage and never refreshes it', async () => {
    const r = await judge(c => ApiSecurityStandardsLaw.check(c));
    expect(r.violations).not.toContain(
      'No authentication service implementation found'
    );
    expect(r.violations).toEqual(
      expect.arrayContaining([
        'Authentication: Missing token refresh mechanism',
        'Authentication: Insecure token storage using localStorage without encryption',
      ])
    );
    expect(r.unread).toBe(false);
  });
});

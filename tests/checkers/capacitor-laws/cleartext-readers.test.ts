/**
 * The readers behind Capacitor Android Cleartext Debug Only, tested where
 * they live: the openings of a network security config and the manifests a
 * build script routes a shipped source set to.
 */
import {
  manifestRedirects,
  openings,
} from '../../../src/checkers/capacitor-laws/cleartext-readers';

const GRADLE = 'android/app/build.gradle';

describe('openings', () => {
  it('a base-config that permits cleartext opens every host', () => {
    expect(
      openings(
        '<network-security-config><base-config cleartextTrafficPermitted="true"/></network-security-config>'
      )
    ).toEqual([{ kind: 'base-config', domains: [] }]);
  });

  it('a nested domain-config takes its parent permission; comments are not read', () => {
    const xml = [
      '<network-security-config>',
      '  <!-- <base-config cleartextTrafficPermitted="true"/> -->',
      '  <domain-config cleartextTrafficPermitted="true">',
      '    <domain includeSubdomains="true">localhost</domain>',
      '    <domain-config>',
      '      <domain>10.0.2.2</domain>',
      '    </domain-config>',
      '  </domain-config>',
      '</network-security-config>',
    ].join('\n');
    expect(openings(xml)).toEqual([
      { kind: 'domain-config', domains: ['10.0.2.2'] },
      { kind: 'domain-config', domains: ['localhost'] },
    ]);
  });

  it('a config that permits nothing, and an empty text, open nothing', () => {
    expect(
      openings(
        '<domain-config cleartextTrafficPermitted="false"><domain>example.com</domain></domain-config>'
      )
    ).toEqual([]);
    expect(openings('')).toEqual([]);
  });
});

describe('manifestRedirects', () => {
  it('no build script: nothing redirected, nothing unread', () => {
    expect(manifestRedirects(GRADLE, undefined)).toEqual({
      redirects: [],
      unread: [],
    });
  });

  it('a shipped set routed by a literal path, resolved against the app module', () => {
    const reading = manifestRedirects(
      GRADLE,
      "android {\n  sourceSets.release.manifest.srcFile 'src/shipped/AndroidManifest.xml'\n}\n"
    );
    expect(reading.unread).toEqual([]);
    expect(reading.redirects).toEqual([
      {
        set: 'release',
        file: expect.stringMatching(
          /android[\/]app[\/]src[\/]shipped[\/]AndroidManifest\.xml$/
        ),
      },
    ]);
  });

  it('a debug redirect is ignored; a computed target is reported as unread', () => {
    const reading = manifestRedirects(
      GRADLE,
      [
        'android {',
        '  sourceSets {',
        "    debug { manifest.srcFile 'src/dev/AndroidManifest.xml' }",
        '    main { manifest.srcFile manifestPath }',
        '  }',
        '}',
      ].join('\n')
    );
    expect(reading.redirects).toEqual([]);
    expect(reading.unread).toEqual([{ line: 4, set: 'main' }]);
  });
});

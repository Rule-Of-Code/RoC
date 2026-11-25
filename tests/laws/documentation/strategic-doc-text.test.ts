/**
 * How Strategic Document Updates reads one document, tested where the
 * readers live: quality by sections, the stated version, staleness.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  assessChangelogQuality,
  assessProjectStatusQuality,
  assessReadmeQuality,
  extractVersionFromSource,
  isFileStale,
} from '../../../src/laws/documentation/strategic-doc-text';
import { makeTempDir, removeTempDirs } from '../../helpers/temp-dirs';

describe('document quality', () => {
  it('counts the sections a README has', () => {
    const full = [
      '## Installation',
      '## Usage',
      '## Contributing',
      '## License',
      '## Getting started',
    ].join('\n');
    expect(assessReadmeQuality(full)).toBe('comprehensive');
    expect(assessReadmeQuality('## Usage\n## License\n## API')).toBe('good');
    expect(assessReadmeQuality('## Usage')).toBe('basic');
    expect(assessReadmeQuality('')).toBe('minimal');
  });

  it('reads a changelog by its headers and a status page by its words', () => {
    expect(
      assessChangelogQuality(
        '## [1.2.0]\n### Added\n### Fixed\n### Changed\n### Removed'
      )
    ).toBe('comprehensive');
    expect(assessProjectStatusQuality('Milestone 2 in progress')).toBe('good');
  });
});

describe('extractVersionFromSource', () => {
  it('reads a JSON field or the first pattern match, and nothing else', () => {
    const versions = new Set<string>();
    extractVersionFromSource(
      '{"version":"1.4.0"}',
      { field: 'version' },
      versions
    );
    extractVersionFromSource(
      '## [1.4.0] - today',
      { pattern: /##?\s*\[?(\d+\.\d+\.\d+)\]?/i },
      versions
    );
    extractVersionFromSource(
      'no version here',
      { pattern: /version[:\s]+(\d+\.\d+\.\d+)/i },
      versions
    );
    expect([...versions]).toEqual(['1.4.0']);
  });
});

describe('isFileStale', () => {
  let dir: string;
  beforeEach(() => {
    dir = makeTempDir('strategic-doc-text-');
  });
  afterEach(removeTempDirs);

  it('a file older than the threshold is stale; one without stats counts as old', () => {
    const file = path.join(dir, 'README.md');
    fs.writeFileSync(file, '# readme');
    const old = new Date('2020-01-01T00:00:00Z');
    fs.utimesSync(file, old, old);
    expect(
      isFileStale(file, new Date('2021-01-01T00:00:00Z'), 'README.md')
    ).toBe(true);
    expect(
      isFileStale(file, new Date('2019-01-01T00:00:00Z'), 'README.md')
    ).toBe(false);
    expect(
      isFileStale(path.join(dir, 'missing.md'), new Date(), 'missing.md')
    ).toBe(true);
  });
});

/**
 * A git tag is a REF, not a version string.
 *
 * `release/v1.2.3` carries the version `1.2.3` in its last segment; what comes
 * before it is a namespace the project owns. Gitflow names release tags that
 * way, and deployment triggers are routinely wired to the namespace — a GitHub
 * Actions `on.push.tags: 'release/v*'`, a Cloud Build `tag: ^release/v.*$`.
 *
 * Testing the whole ref against SemVer conflates the two, and the advice that
 * follows ("rename it to v1.2.3") would disconnect a release from the pipeline
 * that deploys it. The namespace is a deployment contract, not a version
 * defect; only the version segment is this project's business to validate.
 */
export class GitTagVersion {
  /**
   * SemVer 2.0.0, without the `v` — the grammar from semver.org, including the
   * no-leading-zeros rule for numeric prerelease identifiers.
   *
   * One copy, because three had accumulated: one per law that judges tags plus
   * one for version strings, in two subtly different dialects. That divergence
   * is how the same defect came to need fixing twice.
   */
  private static readonly SEMVER =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

  /** Is this a SemVer version STRING — no `v`, no namespace, just the version? */
  static isSemVer(version: string): boolean {
    return this.SEMVER.test(version);
  }

  /**
   * The pattern itself, for callers that validate through a generic matcher.
   * Returned as a fresh RegExp so a caller cannot carry `lastIndex` state back
   * into the shared one.
   */
  static semVerPattern(): RegExp {
    return new RegExp(this.SEMVER.source);
  }

  /** The version segment of a tag ref: everything after the last `/`. */
  static versionSegment(tag: string): string {
    const lastSlash = tag.lastIndexOf('/');
    return lastSlash === -1 ? tag : tag.slice(lastSlash + 1);
  }

  /** The version segment with a single leading `v` removed, if present. */
  static versionOf(tag: string): string {
    const segment = this.versionSegment(tag);
    return /^v\d/.test(segment) ? segment.slice(1) : segment;
  }

  /**
   * Does this tag carry a SemVer version, whatever namespace precedes it?
   * `release/v1.2.3`, `releases/1.2.3` and `v1.2.3` all pass; a tag whose
   * version segment is not SemVer still fails.
   */
  static isSemVerTag(tag: string): boolean {
    return this.SEMVER.test(this.versionOf(tag));
  }

  /**
   * Is the VERSION segment v-prefixed? Answered on the segment, not the ref,
   * so `v1.2.3` and `release/v1.2.3` are the same style — which is what a
   * project sees when it moves its tags under a namespace.
   */
  static isVPrefixed(tag: string): boolean {
    return /^v\d/.test(this.versionSegment(tag));
  }
}

/**
 * Reading HTTP headers out of a static host's configuration.
 *
 * Firebase Hosting's `hosting.headers[].headers` is an ARRAY of `{ key, value }`
 * — that is the only shape `firebase deploy` accepts, not a convention a project
 * picked. Analyzers read it as a dictionary (`headers['Cache-Control']`,
 * `'Link' in headers`), which is `undefined` and `false` for every array no
 * matter what it contains: no valid `firebase.json` could satisfy them.
 *
 * One implementation, because the first fix for this shipped in one analyzer
 * while two others kept the same bug.
 */

/**
 * Does a host header entry declare any of `names`?
 *
 * Accepts the array form (Firebase) and the dictionary form other hosts use.
 */
export function declaresAnyHeader(
  headerFields: unknown,
  names: readonly string[]
): boolean {
  if (Array.isArray(headerFields)) {
    return headerFields.some(
      (pair: unknown) =>
        typeof pair === 'object' &&
        pair !== null &&
        names.includes(String((pair as { key?: unknown }).key))
    );
  }

  if (typeof headerFields === 'object' && headerFields !== null) {
    return names.some(name => name in (headerFields as object));
  }

  return false;
}

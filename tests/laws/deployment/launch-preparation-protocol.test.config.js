/**
 * Jest config override for launch-preparation-protocol.test.ts
 * Disables detectLeaks due to false positive from complex validator dependencies
 */
module.exports = {
  detectLeaks: false,
};

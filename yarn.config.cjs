/**
 * @type {import('@yarnpkg/types')}
 */
const { defineConfig } = require('@yarnpkg/types');
const semver = require('semver');

/**
 * Picks the range whose minimum satisfying version is the highest.
 * Falls back to lexicographic ordering only when a range has no
 * resolvable minimum (rare — e.g. tag specifiers like "latest").
 *
 * @param {string[]} ranges
 */
function highestRange(ranges) {
  return [...ranges].sort((a, b) => {
    const minA = semver.minVersion(a);
    const minB = semver.minVersion(b);
    if (minA && minB) return semver.compare(minA, minB);
    if (minA) return 1;
    if (minB) return -1;
    return a.localeCompare(b);
  }).at(-1);
}

/**
 * @param {import('@yarnpkg/types').Yarn.Constraints.Context} ctx
 */
function enforceConsistentVersions({ Yarn }) {
  const byIdent = new Map();

  for (const dep of Yarn.dependencies()) {
    if (dep.type === 'peerDependencies') continue;
    if (dep.range.startsWith('workspace:')) continue;
    if (dep.range.startsWith('patch:')) continue;
    if (dep.range.startsWith('portal:')) continue;
    if (dep.range.startsWith('link:')) continue;

    if (!byIdent.has(dep.ident)) byIdent.set(dep.ident, []);
    byIdent.get(dep.ident).push(dep);
  }

  for (const deps of byIdent.values()) {
    const ranges = new Set(deps.map((d) => d.range));
    if (ranges.size <= 1) continue;

    const expected = highestRange([...ranges]);
    for (const dep of deps) {
      if (dep.range !== expected) {
        dep.update(expected);
      }
    }
  }
}

module.exports = defineConfig({
  async constraints(ctx) {
    enforceConsistentVersions(ctx);
  }
});

/**
 * @type {import('@yarnpkg/types')}
 */
const { defineConfig } = require('@yarnpkg/types');

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

    const expected = [...ranges].sort().at(-1);
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

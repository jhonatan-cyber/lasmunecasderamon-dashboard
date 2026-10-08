// TS 7 owns the project's tsc. These packages call the JavaScript compiler API,
// which Microsoft currently publishes separately as @typescript/typescript6.
// Give them an actual private dependency so pnpm does not replace it with the
// project's native compiler while resolving their legacy TypeScript peer.
const compilerApiTools = new Set([
  'typescript-eslint',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  '@typescript-eslint/project-service',
  '@typescript-eslint/tsconfig-utils',
  '@typescript-eslint/type-utils',
  '@typescript-eslint/typescript-estree',
  '@typescript-eslint/utils',
  'ts-api-utils',
  'eslint-import-resolver-typescript',
  'eslint-plugin-import'
]);
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (compilerApiTools.has(pkg.name)) {
        pkg.dependencies = { ...pkg.dependencies, typescript: 'npm:@typescript/typescript6@6.0.2' };
        if (pkg.peerDependencies) delete pkg.peerDependencies.typescript;
      }
      return pkg;
    }
  }
};

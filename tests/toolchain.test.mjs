import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import path from 'node:path';
import { ESLint } from 'eslint';
import compilerApi from 'typescript-compiler-api';

const require = createRequire(import.meta.url);
test('Next.js and typecheck select the native TypeScript 7 compiler', () => {
  const { getTypeScriptPackageInfo } = require('next/dist/lib/typescript/runTypeScriptCli');
  const compiler = getTypeScriptPackageInfo(process.cwd());
  assert.match(compiler.version, /^7\./);
  assert.equal(compiler.apiPath, undefined);
  assert.match(execFileSync(process.execPath, [compiler.tscPath, '--version'], { encoding: 'utf8' }), new RegExp(compiler.version.replaceAll('.', '\\.')));
  assert.equal(typeof compilerApi.createSourceFile, 'function');
  const toolingRequire = createRequire(require.resolve('typescript-eslint'));
  assert.match(toolingRequire('typescript').version, /^6\./);
});
test('ESLint 10 still enforces React, accessibility, hooks and import rules', async () => {
  assert.match(ESLint.version, /^10\./);
  const lint = new ESLint();
  const [result] = await lint.lintText(`
    import {useState} from 'react';
    export function Component({show}) {
      if (show) useState(0);
      return <div>{[1,2].map(x => <img src={String(x)}/>)}</div>;
    }
  `, { filePath: path.join(process.cwd(), 'components/__toolchain_regression__.tsx') });
  const rules = new Set(result.messages.map(message => message.ruleId));
  for (const rule of ['react/jsx-key', 'jsx-a11y/alt-text', 'react-hooks/rules-of-hooks']) assert.ok(rules.has(rule), `Missing ${rule}`);
  const imports = new ESLint({ overrideConfig: { rules: { 'import/no-unresolved': 'error' } } });
  const [invalidImport] = await imports.lintText("import missing from './does-not-exist'; export default missing;", { filePath: 'components/__toolchain_import__.tsx' });
  assert.ok(invalidImport.messages.some(message => message.ruleId === 'import/no-unresolved'));
});

import { afterAll, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import db from '@/lib/database/db';
import { prepareQuery } from '@/lib/database/postgres.cjs';

function files(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? files(filename) : [filename];
  });
}
afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('PostgreSQL can plan every complete static SQL statement in repositories and API routes', async () => {
  const errors: string[] = [];
  let checked = 0;
  for (const filename of [...files('lib'), ...files('app/api')].filter(file =>
    file.endsWith('.ts')
  )) {
    const source = ts.createSourceFile(
      filename,
      fs.readFileSync(filename, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    const statements: { sql: string; line: number }[] = [];
    function visit(node: ts.Node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        if (
          /^\s*(SELECT\s+|INSERT\s+INTO\s+|UPDATE\s+\w+(?:\s+\w+)?\s+SET\s+|DELETE\s+FROM\s+)/i.test(
            node.text
          )
        ) {
          statements.push({
            sql: node.text,
            line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
          });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    for (const { sql, line } of statements) {
      if (/\b(FROM|WHERE)\s*$/.test(sql.trim())) continue;
      try {
        const prepared = prepareQuery(sql, Array((sql.match(/\?/g) || []).length).fill(null));
        await db.pool.query(`EXPLAIN ${prepared.text}`, prepared.values);
        checked++;
      } catch (error) {
        errors.push(`${filename}:${line}: ${(error as Error).message}`);
      }
    }
  }
  expect(errors).toEqual([]);
  expect(checked).toBeGreaterThan(400);
});

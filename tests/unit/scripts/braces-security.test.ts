// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const braces = createRequire(import.meta.url)('braces');

describe('braces depth guard (GHSA-vfj7-8cjw-p6xm)', () => {
  const malicious = '{'.repeat(4500) + 'x' + '}'.repeat(4500);
  it.each(['compile', 'expand'])('rejects malicious nesting before %s exhausts the stack', mode => {
    expect(() => braces[mode](malicious)).toThrow(SyntaxError);
    expect(() => braces[mode](malicious)).toThrow('maximum depth');
  });
  it('preserves the normal patterns used by lint and build tooling', () => {
    expect(braces.expand('src/{app,lib}/**/*.{ts,tsx}')).toEqual([
      'src/app/**/*.ts',
      'src/app/**/*.tsx',
      'src/lib/**/*.ts',
      'src/lib/**/*.tsx'
    ]);
  });
});

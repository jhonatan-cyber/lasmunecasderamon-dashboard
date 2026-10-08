import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// Vitest 5 uses return type and received value as separate matcher parameters.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Declaration merging requires an interface.
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    T = unknown
  > extends TestingLibraryMatchers<T, R> {}
}

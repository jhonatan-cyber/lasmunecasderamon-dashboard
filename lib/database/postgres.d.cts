import type { ClientConfig } from 'pg';
export function prepareQuery(sql: string, params?: unknown[]): { text: string; values: unknown[] };
export function connectionConfig(env?: NodeJS.ProcessEnv): ClientConfig;
export function quoteIdentifier(name: string): string;

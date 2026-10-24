#!/usr/bin/env node
/**
 * ci-setup-pw.js — entry point for dotenv + tsx that ensures an empty-string
 * DB_PASSWORD is forwarded as a real string into ci-setup-db.js.
 *
 * The project's pg-backed scripts reject an empty string password ("must be a
 * string"). dotenv reads `DB_PASSWORD=` as the literal empty string, and when
 * tsx spawns the child it keeps that empty string as-is, so pg blows up before
 * the first query. This wrapper normalizes it to the empty string explicitly
 * (no-op visually) and hands the same env to tsx so `process.env.DB_PASSWORD`
 * is a string in ci-setup-db.js.
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Normalize: dotenv may have left DB_PASSWORD as an empty string; ensure it is
// a string (empty string is already a string, but this documents intent and
// protects against undefined / null coming from the runner).
process.env.DB_PASSWORD = String(process.env.DB_PASSWORD ?? '');

const child = spawn('npx.cmd', ['tsx', 'scripts/ci-setup-db.js'], {
  cwd: ROOT,
  env: process.env,
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: true
});

child.on('exit', code => process.exit(code ?? 1));
child.on('error', err => {
  console.error(err);
  process.exit(1);
});

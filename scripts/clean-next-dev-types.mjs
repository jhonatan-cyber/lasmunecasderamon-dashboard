#!/usr/bin/env node

import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const devTypesDir = path.join(process.cwd(), '.next', 'dev', 'types');

if (existsSync(devTypesDir)) {
  rmSync(devTypesDir, { recursive: true, force: true });
}

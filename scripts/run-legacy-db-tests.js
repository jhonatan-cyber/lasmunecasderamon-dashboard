/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testsDir = path.resolve(__dirname, '../tests/integration/legacy-db');
const testFiles = fs
  .readdirSync(testsDir)
  .filter(file => file.endsWith('.test.js'))
  .sort();

if (testFiles.length === 0) {
  console.log('No hay tests legacy-db para ejecutar.');
  process.exit(0);
}

for (const file of testFiles) {
  console.log(`${file}`);
  const result = spawnSync(process.execPath, [path.join(testsDir, file)], {
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

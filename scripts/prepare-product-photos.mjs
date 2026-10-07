// Run with: node --conditions=react-server scripts/prepare-product-photos.mjs
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { removeProductBackground } from '../lib/media/product-background.mjs';

const directory = path.join(process.cwd(), 'public', 'img', 'products');
const files = (await readdir(directory)).filter(
  name => name !== 'default.png' && /\.(png|jpe?g|webp)$/i.test(name)
);
let failures = 0;
for (const [index, name] of files.entries()) {
  try {
    await removeProductBackground(await readFile(path.join(directory, name)));
    process.stdout.write(`${index + 1}/${files.length} ${name}\n`);
  } catch (error) {
    failures++;
    console.error(`No se pudo recortar ${name}: ${error.message}`);
  }
}
if (failures) process.exitCode = 1;

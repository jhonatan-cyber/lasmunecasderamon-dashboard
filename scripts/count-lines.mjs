import { readFileSync, readdirSync, statSync } from 'fs';
import { join, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const baseDir = join(__dirname, '..');

const results = [];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('.')) {
      walk(fullPath);
    } else if (entry.name.endsWith('.tsx')) {
      try {
        const content = readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').length;
        if (lines > 300) {
          const relPath = fullPath.replace(baseDir + sep, '').replaceAll('\\', '/');
          results.push({ lines, path: relPath });
        }
      } catch (e) {}
    }
  }
}

walk(join(baseDir, 'components'));

results.sort((a, b) => b.lines - a.lines);
results.forEach(r => console.log(r.lines + ' - ' + r.path));

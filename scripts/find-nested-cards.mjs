// Detects nested card-like JSX elements in .tsx files:
// 1. Same-name nesting: <Card> ... <Card> (direct Card inside Card)
// 2. Cross-name nesting: <Card> ... <ComponentCard|CollapsibleCard|MobileCard|Stats ...>
//    where the inner component renders a Card itself (see CARD_COMPONENTS).
import fs from 'fs';
import path from 'path';

const ROOTS = ['app', 'components'];

// Components that internally render the ui Card (confirm per-file before fixing).
const CARD_COMPONENTS_RE = /^(Card|Cards|.*Card)$/;
// For nesting detection we track any tag whose name ends in "Card" or is "Card..."
const isCardTag = (name) => CARD_COMPONENTS_RE.test(name);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, files);
    else if (entry.name.endsWith('.tsx')) files.push(p);
  }
  return files;
}

// Tokenize JSX-ish: find <Tag ...>, </Tag>, and skip // and /* */ comments and strings crudely.
function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const rel = file.replace(/\\/g, '/');
  const tagStack = []; // { name, line, col }
  const findings = [];
  // crude comment/string stripping for scanning (not exact, good enough for detection)
  let scanSrc = src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length))
    .replace(/'[^'\\\n]*'|"[^"\\\n]*"|`[^`\\]*(\\[\s\S][^`\\]*)*`/g, (m) =>
      m.replace(/[^\n]/g, ' ').replace(/\\./g, '  ')
    );

  // Also map scan positions? Simpler: re-tokenize on stripped text and count newlines.
  const re = /<(\/?)([A-Za-z][A-Za-z0-9.]*)/g;
  let m;
  const lineOf = (idx) => scanSrc.slice(0, idx).split('\n').length;

  // We need to know if <Tag is self-closing like <Card/> — check following chars for '/>' before '>'
  while ((m = re.exec(scanSrc)) !== null) {
    const [, slash, name] = m;
    const idx = m.index;
    const line = lineOf(idx);
    if (!isCardTag(name)) continue;
    // Validate name is likely a component (capital start)
    if (!/^[A-Z]/.test(name)) continue;
    // For imports / type usage etc.: skip lines starting with 'import', 'from', or containing 'from "@/components/ui/card"'
    const lineText = lines[line - 1] || '';
    if (/^\s*(import|from)\b/.test(lineText)) continue;
    if (slash === '/') {
      // closing tag
      // pop the most recent matching opener
      for (let i = tagStack.length - 1; i >= 0; i--) {
        if (tagStack[i].name === name) {
          tagStack.splice(i, 1);
          break;
        }
      }
    } else {
      // check self-closing: find the '>' from idx
      const gt = scanSrc.indexOf('>', idx);
      const between = scanSrc.slice(idx, gt === -1 ? idx + 200 : gt);
      const selfClosing = between.endsWith('/');
      if (selfClosing) continue;
      if (tagStack.length > 0) {
        findings.push({
          file: rel,
          line,
          inner: name,
          outer: tagStack[tagStack.length - 1].name,
          outerLine: tagStack[tagStack.length - 1].line,
          lineText: (lines[line - 1] || '').trim(),
        });
      }
      tagStack.push({ name, line });
    }
  }
  return findings;
}

const allFiles = ROOTS.flatMap((r) => (fs.existsSync(r) ? walk(r) : []));
const results = [];
for (const f of allFiles) {
  try {
    results.push(...scanFile(f));
  } catch (e) {
    console.error('ERR', f, e.message);
  }
}
if (results.length === 0) {
  console.log('NO NESTED CARDS FOUND');
} else {
  for (const r of results) {
    console.log(
      `${r.file}:${r.line}  <${r.inner}> inside <${r.outer}> (opened at line ${r.outerLine})`
    );
    console.log(`    -> ${r.lineText}`);
  }
  console.log(`\nTotal findings: ${results.length} in ${new Set(results.map(r=>r.file)).size} files`);
}

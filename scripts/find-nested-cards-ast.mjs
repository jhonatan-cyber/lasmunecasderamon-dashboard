// AST-based nested-card detector.
// Phase 1: find components defined in the project whose returned JSX root is a
//          card-like tag (Card, CardXxx, CollapsibleCard, *Card) -> "card root components".
// Phase 2: walk all files; whenever a card-like JSX element subtree exists,
//          report any child JSX element (at any depth inside the card) that is also
//          card-like (a Card tag or a component identified in phase 1).
import ts from 'typescript';
import fs from 'fs';
import path from 'path';

const ROOTS = ['app', 'components', 'lib'].filter((r) => fs.existsSync(r));

const isCardName = (n) => {
  const ICONS = new Set(['CreditCard', 'IdCard', 'CardIcon']);
  if (ICONS.has(n)) return false;
  return /^[A-Z]/.test(n) && /Card(\b|$|s\b)/.test(n.replace('.', '.'));
};

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name.endsWith('.tsx')) files.push(p);
  }
  return files;
}

const files = ROOTS.flatMap((r) => walk(r));

// --- Phase 1: collect exported component names that render a Card as their ROOT element ---
const cardRootComponents = new Map(); // component name -> { file }
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  sf.forEachChild((node) => {
    let name = null;
    let body = null;
    if (ts.isFunctionDeclaration(node) && node.name) {
      name = node.name.text;
      body = node.body;
    } else if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || !d.initializer) continue;
        const ini = d.initializer;
        let fn = ini;
        // React.forwardRef wrappers
        if (
          ts.isCallExpression(ini) &&
          ts.isIdentifier(ini.expression) &&
          ini.expression.text.toString().includes('forwardRef') &&
          ini.arguments.length
        ) {
          fn = ini.arguments[findLastArrow(ini)] || ini.arguments[ini.arguments.length - 1];
        }
        if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
          name = d.name.text;
          body = fn.body;
        }
      }
    }
    if (!name || !body) return;
    // get root JSX element of the function body (allow simple returns / expression body)
    let rootJsx = null;
    if (ts.isExpressionStatement(body)) {
    } else if (ts.isParenthesizedExpression(body)) {
      rootJsx = body.expression;
    } else if (ts.isJsxElement(body) || ts.isJsxSelfClosingElement(body)) {
      rootJsx = body;
    } else if (ts.isBlock(body)) {
      // find a return statement with JSX at top depth preferentially
      const returns = [];
      const cb = (n) => {
        if (ts.isReturnStatement(n) && n.expression) returns.push(n.expression);
        if (!ts.isBlock(n)) n.forEachChild(cb);
      };
      body.forEachChild(cb);
      // pick the JSX return (last one usually)
      const jsxRet = returns.filter(
        (r) =>
          ts.isJsxElement(r) ||
          ts.isJsxSelfClosingElement(r) ||
          ts.isJsxFragment(r) ||
          ts.isParenthesizedExpression(r)
      );
      if (!jsxRet.length) return;
      const last = jsxRet[jsxRet.length - 1];
      rootJsx = ts.isParenthesizedExpression(last) ? last.expression : last;
    } else {
      return;
    }
    if (!rootJsx) return;
    const tag = ts.isJsxElement(rootJsx) ? rootJsx.openingElement : rootJsx.elementName ? rootJsx : null;
    if (!tag) return;
    const tagNameNode = ts.isJsxElement(rootJsx) ? rootJsx.openingElement.tagName : rootJsx.tagName;
    const tagText = tagNameNode.getText(sf);
    if (isCardName(tagText)) {
      cardRootComponents.set(name, { file: f.replace(/\\/g, '/') });
    }
  });
}
function findLastArrow(call) {
  for (let i = call.arguments.length - 1; i >= 0; i--) {
    if (ts.isArrowFunction(call.arguments[i])) return i;
  }
  return -1;
}

// --- Phase 1b: components that render a Card ANYWHERE in their returned JSX ---
const cardRenderingComponents = new Map(); // name -> { files: Set }
const cardNamedComponents = new Map(); // name -> { file } (name is *Card*)
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const comps = [];
  sf.forEachChild((node) => {
    if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) comps.push([d.name.text, d.initializer.body]);
      }
    } else if (ts.isFunctionDeclaration(node) && node.name && node.body) comps.push([node.name.text, node.body]);
  });
  // identify card tags used in file for import detection
  const cardTags = new Set();
  const visitTags = (n) => {
    const tn = (ts.isJsxElement(n) ? n.openingElement.tagName : ts.isJsxSelfClosingElement(n) ? n.tagName : null);
    if (tn) {
      const t = tn.getText(sf);
      if (isCardName(t)) cardTags.add(t);
    }
    n.forEachChild(visitTags);
  };
  visitTags(sf);
  for (const [name, body] of comps) {
    if (/Card/.test(name)) cardNamedComponents.set(name, { file: f.replace(/\\/g, '/') });
    let has = false;
    const cb = (n) => {
      const tn = ts.isJsxElement(n) ? n.openingElement.tagName : ts.isJsxSelfClosingElement(n) ? n.tagName : null;
      if (tn && cardTags.has(tn.getText(sf))) has = true;
      if (!ts.isJsxElement(n) && !ts.isJsxSelfClosingElement(n)) n.forEachChild(cb);
    };
    if (body) body.forEachChild(cb);
    if (has) {
      const e = cardRenderingComponents.get(name) || { files: new Set() };
      e.files.add(f.replace(/\\/g, '/'));
      cardRenderingComponents.set(name, e);
    }
  }
}

// --- Phase 2: detect card-like elements nested inside card-like elements ---
function tagOf(el, sf) {
  if (ts.isJsxElement(el)) return el.openingElement.tagName.getText(sf);
  if (ts.isJsxSelfClosingElement(el)) return el.tagName.getText(sf);
  return null;
}
const findings = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  // skip import lines relevance; walk all JSX elements
  const climbExpr = (e0, chain) => {
    const climb = (e) => {
      const ex = ts.isParenthesizedExpression(e) ? e.expression : e;
      if (ts.isConditionalExpression(ex)) {
        climb(ex.whenTrue);
        climb(ex.whenFalse);
      } else if (ts.isJsxFragment(ex)) {
        for (const fc of ex.children) {
          if (ts.isJsxElement(fc) || ts.isJsxSelfClosingElement(fc)) visit(fc, chain);
          else if (ts.isJsxExpression(fc) && fc.expression) climb(fc.expression);
        }
      } else if (ex && (ts.isJsxElement(ex) || ts.isJsxSelfClosingElement(ex))) {
        visit(ex, chain);
      } else if (ex && (ts.isBinaryExpression(ex) || ts.isCallExpression(ex))) {
        const tx = e;
        // find arrow functions inside and descend into their return JSX
        const inner = [];
        const cb = (n) => {
          if (ts.isArrowFunction(n)) inner.push(n);
          if (!ts.isArrowFunction(n)) n.forEachChild(cb);
        };
        tx.forEachChild(cb);
        for (const a of inner) climb(a.body);
      }
    };
    climb(e0);
  };
  const visit = (el, insideCardChain) => {
    const tn = tagOf(el, sf);
    if (!tn) return;
    const isCardHere = isCardName(tn) || cardRootComponents.has(tn) || cardRenderingComponents.has(tn) || cardNamedComponents.has(tn);
    if (ts.isJsxElement(el) || ts.isJsxSelfClosingElement(el)) {
      // div/section with card-ish Tailwind combos inside a Card chain
      const cn = ts.isJsxElement(el) ? el.openingElement : el;
      const cnText = cn.getText(sf);
      const isDivish = /^(div|section)$/i.test(tn);
      if (isDivish && insideCardChain && !insideCardChain.includes(tn)) {
        const m = cnText.match(/className=['"{]([^»]*)/);
        const cls = m ? m[1] : '';
        if (
          /rounded-(lg|xl|2xl|3xl)/.test(cls) &&
          /\bborder\b/.test(cls) &&
          /\bbg-/.test(cls) &&
          !/rounded-full/.test(cls) &&
          !/bg-transparent|bg-muted|bg-accent|bg-amber|bg-red|bg-emerald|bg-green|bg-sky|bg-blue|border-dashed/.test(cls)
        ) {
          findings.push({
            file: f.replace(/\\/g, '/'),
            line: sf.getLineAndCharacterOfPosition(el.getStart(sf)).line + 1,
            tag: `${tn}[cardish]`,
            inside: insideCardChain,
          });
        }
      }
    }
    if (isCardHere && insideCardChain && tn !== insideCardChain.split('>')[0]) {
      findings.push({
        file: f.replace(/\\/g, '/'),
        line: sf.getLineAndCharacterOfPosition(el.getStart(sf)).line + 1,
        tag: tn,
        inside: insideCardChain,
      });
    }
    const childChain = isCardHere ? (insideCardChain ? insideCardChain + '>' + tn : tn) : insideCardChain;
    const children = [];
    if (ts.isJsxElement(el)) {
      children.push(...el.children);
    } else if (ts.isJsxSelfClosingElement(el)) {
    } else if (ts.isJsxExpression?.(el)) {}
    for (const c of children) {
      if (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)) visit(c, childChain);
      else if (ts.isJsxFragment(c)) {
        for (const fc of c.children) {
          if (ts.isJsxElement(fc) || ts.isJsxSelfClosingElement(fc)) visit(fc, childChain);
          else if (ts.isJsxFragment(fc)) {
            for (const fc2 of fc.children) {
              if (ts.isJsxElement(fc2) || ts.isJsxSelfClosingElement(fc2)) visit(fc2, childChain);
            }
          } else if (ts.isJsxExpression(fc) && fc.expression) climbExpr(fc.expression, childChain);
        }
      } else if (ts.isJsxExpression(c) && c.expression) climbExpr(c.expression, childChain);
    }
  };
  const visitTop = (node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) visit(node, null);
    node.forEachChild(visitTop);
  };
  sf.forEachChild(visitTop);
}

if (!findings.length) {
  console.log('NO NESTED CARDS FOUND (AST scan)');
  console.log('\nCard-root components found:', [...cardRootComponents.keys()].join(', ') || '(none)');
} else {
  for (const r of findings) {
    console.log(`${r.file}:${r.line}  <${r.tag}> nested inside <${r.inside}>`);
  }
  console.log(`\nTotal: ${findings.length} findings in ${new Set(findings.map(r => r.file)).size} files`);
}

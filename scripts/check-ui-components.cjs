const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const nativeControls = new Set([
  'input',
  'select',
  'textarea',
  'button',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption'
]);
const violations = [];
let checked = 0;

function checkDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (file.replaceAll('\\', '/') === 'components/ui') continue;
    if (entry.isDirectory()) {
      checkDirectory(file);
    } else if (file.endsWith('.tsx')) {
      checked++;
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );
      let pastDirectives = false;
      const isClient = source.statements.some(
        statement =>
          ts.isExpressionStatement(statement) &&
          ts.isStringLiteral(statement.expression) &&
          statement.expression.text === 'use client'
      );
      for (const statement of source.statements) {
        if (
          !isClient &&
          ts.isImportDeclaration(statement) &&
          ts.isStringLiteral(statement.moduleSpecifier) &&
          statement.moduleSpecifier.text === 'boneyard-js/react'
        ) {
          violations.push(
            `${file}: importa Skeleton desde components/shared/Skeleton para respetar el límite cliente/servidor.`
          );
        }
        if (ts.isExpressionStatement(statement)) {
          let expression = statement.expression;
          while (ts.isParenthesizedExpression(expression)) expression = expression.expression;
          if (
            ts.isStringLiteral(expression) &&
            expression.text === 'use client' &&
            (pastDirectives || expression !== statement.expression)
          ) {
            violations.push(`${file}: coloca 'use client' antes de los imports, sin paréntesis.`);
          }
        }
        if (!(ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)))
          pastDirectives = true;
      }
      function visit(node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(source);
          const value = node.attributes.properties.find(
            attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'value'
          );
          if (
            ['Select', 'FilterSelect', 'NativeSelect', 'OptionSelect'].includes(tag) &&
            value &&
            ts.isJsxAttribute(value) &&
            value.initializer &&
            ts.isJsxExpression(value.initializer) &&
            value.initializer.expression &&
            /^(sortBy|sortOrder|sortField|sortDirection)$/.test(
              value.initializer.expression.getText(source)
            )
          ) {
            const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
            violations.push(
              `${file}:${line + 1}: usa SortSelect para mantener el diseño de ordenación compartido.`
            );
          }
        }
        if (
          (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
          nativeControls.has(node.tagName.getText(source))
        ) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          violations.push(
            `${file}:${line + 1}: usa un componente de components/ui para <${node.tagName.getText(source)}>.`
          );
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
}

for (const directory of ['app', 'components', 'hooks']) checkDirectory(directory);
if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `UI compartida: ${checked} archivos verificados, sin controles HTML fuera de components/ui.`
  );
}

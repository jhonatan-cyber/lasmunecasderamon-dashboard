import ts from 'typescript';

/** Extrae destinos de escrituras SQL y del adaptador BaseRepository. */
export function escriturasDe(fuente) {
  const tablas = new Set();
  const constantes = new Map();
  function recoger(nodo) {
    if (
      (ts.isVariableDeclaration(nodo) || ts.isPropertyDeclaration(nodo)) &&
      nodo.initializer &&
      ts.isStringLiteralLike(nodo.initializer)
    ) {
      constantes.set(nodo.name.getText(fuente), nodo.initializer.text);
    }
    ts.forEachChild(nodo, recoger);
  }
  recoger(fuente);
  function literal(nodo) {
    if (!nodo) return null;
    if (ts.isStringLiteralLike(nodo)) return nodo.text;
    return constantes.get(
      ts.isPropertyAccessExpression(nodo) ? nodo.name.text : nodo.getText(fuente)
    );
  }
  function visitar(nodo) {
    let texto;
    if (ts.isStringLiteralLike(nodo)) texto = nodo.text;
    if (ts.isTemplateExpression(nodo)) {
      texto =
        nodo.head.text +
        nodo.templateSpans
          .map(span => (literal(span.expression) ?? '${dinamico}') + span.literal.text)
          .join('');
    }
    if (texto) {
      // OF corresponde al bloqueo FOR UPDATE OF, no a una escritura.
      const patrones = [
        /\b(?:INSERT\s+INTO|DELETE\s+FROM)\s+(?:public\.)?"?([a-z_][a-z_0-9]*|\$\{dinamico\})/gi,
        /\bUPDATE\s+(?:public\.)?"?([a-z_][a-z_0-9]*|\$\{dinamico\})"?\s+(?:[a-z_][a-z_0-9]*\s+)?SET\b/gi
      ];
      for (const match of patrones.flatMap(patron => [...texto.matchAll(patron)])) {
        const tabla = match[1].toLowerCase();
        if (!['of', 'set'].includes(tabla)) tablas.add(tabla);
      }
    }
    if (
      ts.isCallExpression(nodo) &&
      ts.isPropertyAccessExpression(nodo.expression) &&
      nodo.expression.expression.getText(fuente) === 'BaseRepository' &&
      ['insert', 'update', 'delete'].includes(nodo.expression.name.text)
    ) {
      tablas.add(literal(nodo.arguments[1]) ?? '${dinamico}');
    }
    ts.forEachChild(nodo, visitar);
  }
  visitar(fuente);
  return [...tablas].sort();
}

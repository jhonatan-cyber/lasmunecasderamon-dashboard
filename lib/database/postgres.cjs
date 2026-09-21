const { types } = require('pg');

// Preserve the application's date-only and business wall-clock string contract.
types.setTypeParser(1082, value => value);
types.setTypeParser(1114, value => value);
types.setTypeParser(1700, value => Number(value));
types.setTypeParser(20, value => {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : value;
});

/** Bind repository placeholders without interpreting literals, comments or identifiers. */
function prepareQuery(sql, params = []) {
  const values = [];
  let text = '',
    index = 0,
    nativeParameters = false;
  for (let i = 0; i < sql.length;) {
    const c = sql[i];
    if (c === "'" || c === '"' || c === '`') {
      const quote = c,
        start = i++;
      const escapeString = quote === "'" && /(?:^|[^\w$])[eE]$/.test(text);
      while (i < sql.length) {
        if (escapeString && sql[i] === '\\') {
          i += 2;
          continue;
        }
        if (sql[i++] === quote) {
          if (sql[i] === quote) i++;
          else break;
        }
      }
      const token = sql.slice(start, i);
      text += quote === '`' ? '"' + token.slice(1, -1).replace(/"/g, '""') + '"' : token;
      continue;
    }
    if (sql.slice(i, i + 2) === '--') {
      const end = sql.indexOf('\n', i);
      if (end < 0) {
        text += sql.slice(i);
        break;
      }
      text += sql.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if (sql.slice(i, i + 2) === '/*') {
      let depth = 1,
        end = i + 2;
      while (end < sql.length && depth) {
        if (sql.slice(end, end + 2) === '/*') {
          depth++;
          end += 2;
        } else if (sql.slice(end, end + 2) === '*/') {
          depth--;
          end += 2;
        } else end++;
      }
      text += sql.slice(i, end);
      i = end;
      continue;
    }
    const dollar = c === '$' && /^(\$[a-zA-Z_][\w]*\$|\$\$)/.exec(sql.slice(i));
    if (dollar) {
      const end = sql.indexOf(dollar[0], i + dollar[0].length);
      if (end < 0) throw new Error('Unterminated SQL dollar quote');
      const next = end + dollar[0].length;
      text += sql.slice(i, next);
      i = next;
      continue;
    }
    if (c === '$' && /^\$\d+/.test(sql.slice(i))) nativeParameters = true;
    if (c === '?') {
      if (index >= params.length) throw new Error('Missing SQL parameter');
      const value = params[index++];
      if (Array.isArray(value)) {
        if (!/\bIN\s*\(\s*$/i.test(text) || !/^\s*\)/.test(sql.slice(i + 1))) {
          throw new Error('Array parameters require IN (?)');
        }
        text += value.length
          ? value
              .map(item => {
                values.push(item ?? null);
                return '$' + values.length;
              })
              .join(', ')
          : 'SELECT NULL WHERE FALSE';
      } else {
        values.push(value ?? null);
        text += '$' + values.length;
      }
    } else text += c;
    i++;
  }
  if (nativeParameters && index) throw new Error('Cannot mix SQL placeholder styles');
  if (nativeParameters) return { text, values: params.map(v => v ?? null) };
  if (index !== params.length) throw new Error('Unexpected SQL parameters');
  return { text, values };
}

function connectionConfig(env = process.env) {
  return {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD,
    database: env.DB_NAME || 'lasmunecasderamon',
    connectionTimeoutMillis: 10000,
    options: '-c timezone=America/Santiago'
  };
}

function quoteIdentifier(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

module.exports = { prepareQuery, connectionConfig, quoteIdentifier };

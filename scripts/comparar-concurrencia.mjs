import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const directory = resolve('docs/rendimiento');
const names = ['antes', 'despues', 'despues-repeticion', 'referencia-repeticion'];
const files = names.map(name => resolve(directory, `concurrencia-larga-${name}-2026-10-15.json`));
const runs = files.map(path => {
  let data = JSON.parse(readFileSync(path, 'utf8'));
  if (!data.muestras)
    data = JSON.parse(gunzipSync(readFileSync(resolve(dirname(path), data.muestrasComprimidas))));
  return data;
});
if (
  ![undefined, 'referencia'].includes(runs[0].metadata.formateador) ||
  runs[1].metadata.formateador !== 'actual' ||
  runs[2].metadata.formateador !== 'actual' ||
  runs[3].metadata.formateador !== 'referencia'
)
  throw new Error('Se requiere el orden de variantes A-B-B-A');
const before = [runs[0], runs[3]],
  after = [runs[1], runs[2]];
const pct = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)];
const stats = values => ({
  n: values.length,
  p50: pct(values, 0.5),
  p95: pct(values, 0.95),
  p99: pct(values, 0.99),
  max: Math.max(...values)
});
const statements = {
  caja_compartida: /^UPDATE cajas SET/,
  inventario_compartido: /FROM inventario_presentaciones.*FOR UPDATE/s,
  cliente_compartido: /SELECT saldo FROM clientes.*FOR UPDATE/,
  servicios_caja_compartida: /^UPDATE cajas SET/
};
const requests = (run, caso) =>
  run.muestras.filter(m => m.fase === 'concurrencia' && m.caso === caso);
const batches = (run, caso) => {
  const result = new Map();
  for (const m of requests(run, caso)) {
    if (!result.has(m.lote)) result.set(m.lote, []);
    result.get(m.lote).push(m.ms);
  }
  if (result.size !== run.lotesConcurrentes || [...result.values()].some(g => g.length !== 4))
    throw new Error(`Lotes incompletos: ${caso}`);
  return [...result.values()];
};
let seed = 20261015;
function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}
function bootstrap(caso) {
  const a = before.map(r => batches(r, caso)),
    b = after.map(r => batches(r, caso));
  const sample = groups =>
    groups.flatMap(group =>
      Array.from({ length: group.length }, () => group[Math.floor(random() * group.length)]).flat()
    );
  const differences = [];
  for (let i = 0; i < 2000; i++) differences.push(pct(sample(b), 0.95) - pct(sample(a), 0.95));
  return { replicas: 2000, inferior: pct(differences, 0.025), superior: pct(differences, 0.975) };
}
const normalized = m => m.consultas.map(q => q.sql.replace(/\s+/g, ' ').trim());
function summarize(selected, caso) {
  const samples = selected.flatMap(r => requests(r, caso));
  const statement = samples.map(m => m.consultas.find(q => statements[caso].test(q.sql)));
  if (statement.some(q => !q)) throw new Error(`No se encontró la sentencia de ${caso}`);
  const held = samples.map((m, i) => {
    const commit = m.consultas.find(q => q.sql === 'COMMIT'),
      lock = statement[i];
    return commit.inicio + commit.ms - lock.inicio - lock.ms;
  });
  return {
    totalMs: stats(samples.map(m => m.ms)),
    sentenciaRecursoClienteMs: stats(statement.map(q => q.ms)),
    desdeRespuestaBloqueanteHastaCommitMs: stats(held),
    cpuZonaHorariaMs: stats(samples.map(m => m.cpu.zonaHorariaMs)),
    cpuLogMs: stats(samples.map(m => m.cpu.logMs)),
    esperaObservadaMaxMs: stats(
      samples.map(m => Math.max(0, ...m.esperas.map(e => e.esperaObservadaMs)))
    ),
    solicitudesConBloqueoObservado: samples.filter(m => m.esperas.length).length,
    retrasoMonitorPorLoteMaxMs: stats(
      selected.flatMap(r =>
        r.lotesMedidos.filter(l => l.caso === caso).map(l => l.retrasoMonitorMaxMs)
      )
    ),
    adquirirConexionMs: stats(samples.map(m => m.conexiones.reduce((s, v) => s + v, 0)))
  };
}
const cases = Object.keys(statements).map(caso => {
  const all = runs.flatMap(r => requests(r, caso));
  const signature = JSON.stringify(normalized(all[0]));
  if (all.some(m => m.error || JSON.stringify(normalized(m)) !== signature))
    throw new Error(`Error o cambio de SQL/orden: ${caso}`);
  return {
    caso,
    mismoSqlYOrden: true,
    sqlSha256: createHash('sha256').update(signature).digest('hex'),
    antes: summarize(before, caso),
    despues: summarize(after, caso),
    diferenciaP95DespuesMenosAntesIC95Ms: bootstrap(caso)
  };
});
const report = {
  fechaUTC: new Date().toISOString(),
  orden: 'A-B-B-A',
  metodo:
    'Percentil por rango más próximo. Bootstrap por lotes de 4 solicitudes, estratificado por ejecución; 2000 réplicas, xorshift32 con semilla 20261015. Intervalos descriptivos, sin corregir deriva temporal ni comparaciones múltiples.',
  limite:
    'Ráfagas cerradas de 4 solicitudes con setup y limpieza entre lotes, no carga sostenida ni tasa fija. La edad de pg_locks es una cota observada, no la duración exacta de espera. La ventana hasta COMMIT comienza al recibir la respuesta del bloqueo y no mide todo el tiempo real retenido.',
  ejecuciones: files.map((path, i) => ({
    archivo: basename(path),
    formateador: i === 0 ? 'anterior real' : runs[i].metadata.formateador,
    fechaUTC: runs[i].metadata.fechaUTC,
    lotes: runs[i].lotesConcurrentes,
    concurrencia: Object.keys(statements).map(caso => ({
      caso,
      ms: stats(requests(runs[i], caso).map(m => m.ms))
    }))
  })),
  casos: cases
};
const output = resolve(directory, 'concurrencia-larga-comparacion-2026-10-15.json');
writeFileSync(
  output,
  JSON.stringify(
    report,
    (_, v) => (typeof v === 'number' && !Number.isInteger(v) ? Number(v.toFixed(4)) : v),
    2
  )
);
if (process.argv.includes('--compactar')) {
  for (let i = 0; i < runs.length; i++) {
    const raw = Buffer.from(JSON.stringify(runs[i]));
    const compressed = files[i] + '.gz';
    writeFileSync(compressed, gzipSync(raw, { level: 9 }));
    const { muestras, planes, ...summary } = runs[i];
    writeFileSync(
      files[i],
      JSON.stringify(
        {
          ...summary,
          cantidadMuestras: muestras.length,
          cantidadPlanes: planes.length,
          muestrasComprimidas: basename(compressed),
          muestrasSha256: createHash('sha256').update(raw).digest('hex')
        },
        null,
        2
      )
    );
  }
}
console.table(
  cases.map(c => ({
    caso: c.caso,
    p95Antes: c.antes.totalMs.p95.toFixed(2),
    p95Despues: c.despues.totalMs.p95.toFixed(2),
    icMin: c.diferenciaP95DespuesMenosAntesIC95Ms.inferior.toFixed(2),
    icMax: c.diferenciaP95DespuesMenosAntesIC95Ms.superior.toFixed(2)
  }))
);
console.log(output);

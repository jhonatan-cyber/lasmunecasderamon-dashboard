#!/usr/bin/env node
/**
 * Prueba de los datos de enrolamiento facial ya guardados.
 *
 * Responde a "¿lo que quedó guardado realmente identifica a la persona?" sin
 * depender del lector: extrae el vector de las fotos guardadas en
 * `biometric_plantillas` con el MISMO motor (ONNX MobileFaceNet) que usa
 * `extraerVectorFacialSoftware`, y compara por similitud coseno contra el
 * umbral de coincidencia (`BIOMETRIC_FACE_MATCH_THRESHOLD`, por defecto 0.7).
 *
 * Uso:
 *   node scripts/probar-enrolamiento.cjs                     # lista quién tiene plantillas
 *   node scripts/probar-enrolamiento.cjs --usuario 1002      # por código, RUN, nick o UUID
 *   node scripts/probar-enrolamiento.cjs --usuario 1002 --foto C:\ruta\cara.jpg
 *   node scripts/probar-enrolamiento.cjs --usuario 1002 --contra 1003
 *
 * `--foto` compara una captura NUEVA (la que sacás ahora con el teléfono)
 * contra la plantilla guardada: es la prueba real de reconocimiento.
 * `--contra` compara las plantillas de dos personas: debe dar por debajo del
 * umbral (control negativo).
 */
require('dotenv').config();
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const pg = require('pg');
const sharp = require('sharp');
const postgres = require('../lib/database/postgres.cjs');

const UMBRAL_DEFECTO = 0.7;
const SIZE = 112;
const MODELO = path.join(process.cwd(), '.cache', 'biometric-models', 'face_recognition.onnx');

const args = process.argv.slice(2);
function opcion(nombre) {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const umbral = (() => {
  const v = Number(process.env.BIOMETRIC_FACE_MATCH_THRESHOLD);
  return Number.isFinite(v) && v > 0 && v <= 1 ? v : UMBRAL_DEFECTO;
})();

let sesion = null;

async function vectorDeFoto(foto) {
  if (!sesion) {
    const bytes = await readFile(MODELO);
    const ort = require('onnxruntime-node');
    const session = await ort.InferenceSession.create(bytes, {
      executionProviders: ['cpu'],
      intraOpNumThreads: 1,
      interOpNumThreads: 1
    });
    sesion = { ort, session };
  }
  const { ort, session } = sesion;

  const { data: rgb } = await sharp(foto)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const input = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    input[i] = (rgb[i * 3] - 127.5) / 128.0;
    input[SIZE * SIZE + i] = (rgb[i * 3 + 1] - 127.5) / 128.0;
    input[2 * SIZE * SIZE + i] = (rgb[i * 3 + 2] - 127.5) / 128.0;
  }

  const salida = await session.run({
    [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE])
  });
  const crudo = salida[session.outputNames[0]].data;
  let norma = 0;
  for (let i = 0; i < crudo.length; i++) norma += crudo[i] * crudo[i];
  norma = Math.sqrt(norma) || 1;
  const vector = new Float32Array(crudo.length);
  for (let i = 0; i < crudo.length; i++) vector[i] = crudo[i] / norma;
  return vector;
}

function coseno(a, b) {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let punto = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    punto += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? punto / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function bufferDesdeBase64(datos) {
  const limpio = datos.includes(',') ? datos.slice(datos.indexOf(',') + 1) : datos;
  return Buffer.from(limpio.replace(/\s+/g, ''), 'base64');
}

function porcentaje(n) {
  return `${Math.round(n * 100)}%`;
}

async function cargarUsuarios(cliente, filtro) {
  const base = `SELECT id_usuario, run, nick, nombre, apellido, biometrico_codigo,
                       biometrico_facial, biometrico_huella
                  FROM usuarios`;
  if (!filtro) {
    const { rows } = await cliente.query(
      `${base}
        WHERE EXISTS (
          SELECT 1 FROM biometric_plantillas p
           WHERE p.usuario_id = usuarios.id_usuario AND p.tipo = 'cara'
        )
        ORDER BY nombre, apellido`
    );
    return rows;
  }
  const { rows } = await cliente.query(
    `${base}
      WHERE id_usuario = $1
         OR TRIM(biometrico_codigo) = $2
         OR TRIM(run) = $2
         OR LOWER(TRIM(nick)) = LOWER($2)
      LIMIT 5`,
    [filtro, filtro]
  );
  return rows;
}

async function cargarPlantillas(cliente, usuarioId) {
  const { rows } = await cliente.query(
    `SELECT tipo, datos, vector, fecha_captura
       FROM biometric_plantillas
      WHERE usuario_id = $1 AND tipo = 'cara'
      ORDER BY fecha_captura DESC NULLS LAST`,
    [usuarioId]
  );
  return rows;
}

function nombreUsuario(u) {
  return `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() || u.nick || u.id_usuario;
}

async function probarUsuario(cliente, usuario, fotoExterna) {
  const etiqueta = nombreUsuario(usuario);
  console.log(`\n=== ${etiqueta} (${usuario.run || 'sin RUN'}) ===`);
  console.log(`  id: ${usuario.id_usuario}`);
  console.log(
    `  flags BD: facial=${usuario.biometrico_facial ?? 0} huella=${usuario.biometrico_huella ?? 0}`
  );

  const plantillas = await cargarPlantillas(cliente, usuario.id_usuario);
  if (plantillas.length === 0) {
    console.log('  ✗ sin plantillas faciales guardadas: el enrolamiento no quedó persistido.');
    if (Number(usuario.biometrico_facial) === 1) {
      console.log(
        '    ⚠ la BD marca facial=1 pero no hay plantilla: esa persona nunca va a reconocerse. Repetí el enrolamiento o corregí el flag.'
      );
    }
    return { ok: false };
  }

  console.log(`  plantillas faciales: ${plantillas.length}`);
  const vectores = [];
  for (const [i, p] of plantillas.entries()) {
    const bytes = bufferDesdeBase64(String(p.datos || ''));
    const dimsBd = p.vector ? Math.floor(Buffer.from(p.vector).length / 4) : 0;
    const fecha = p.fecha_captura
      ? new Date(p.fecha_captura).toISOString().slice(0, 16)
      : 'sin fecha';
    console.log(
      `    #${i + 1} ${fecha}  foto ${(bytes.length / 1024).toFixed(0)} KB  ` +
        `vector BD: ${dimsBd ? `${dimsBd} dims` : 'pendiente'}`
    );
    if (bytes.length === 0) continue;
    try {
      const vector = await vectorDeFoto(bytes);
      vectores.push({ indice: i + 1, vector });
      console.log(`      ✓ foto legible — vector de ${vector.length} dimensiones`);
    } catch (e) {
      console.log(`    ✗ no se pudo leer la cara de la plantilla #${i + 1}: ${e.message}`);
    }
  }

  if (vectores.length === 0) {
    console.log(
      '  ✗ ninguna plantilla produjo un vector: la foto guardada no sirve para reconocer.'
    );
    return { ok: false };
  }

  if (vectores.length > 1) {
    console.log('  similitud entre las fotos guardadas:');
    for (let i = 0; i < vectores.length; i++) {
      for (let j = i + 1; j < vectores.length; j++) {
        const s = coseno(vectores[i].vector, vectores[j].vector);
        console.log(
          `    #${vectores[i].indice} vs #${vectores[j].indice}: ${porcentaje(s)}` +
            `${s >= umbral ? ' (coincide)' : ' (por debajo del umbral)'}`
        );
      }
    }
  }

  let resultado = { ok: true };

  if (fotoExterna) {
    let vectorNuevo;
    try {
      vectorNuevo = await vectorDeFoto(await readFile(fotoExterna));
    } catch (e) {
      console.log(`\n  ✗ no se pudo analizar ${fotoExterna}: ${e.message}`);
      return { ok: false };
    }
    const mejor = vectores
      .map(v => ({ indice: v.indice, similitud: coseno(v.vector, vectorNuevo) }))
      .sort((a, b) => b.similitud - a.similitud)[0];
    const coincide = mejor.similitud >= umbral;
    console.log(`\n  foto nueva: ${path.basename(fotoExterna)}`);
    console.log(
      `    mejor coincidencia: plantilla #${mejor.indice} → ${porcentaje(mejor.similitud)} ` +
        `(umbral ${porcentaje(umbral)})`
    );
    console.log(
      coincide
        ? '    ✓ COINCIDE: el enrolamiento guardado reconoce a esta persona.'
        : '    ✗ NO COINCIDE: revisá que sea la misma persona, que la cara esté de frente y bien iluminada. Repetí el enrolamiento si persiste.'
    );
    resultado = { ok: true, coincide, similitud: mejor.similitud };
  } else {
    console.log('\n  Sin --foto no hay prueba de reconocimiento contra una cara nueva.');
    console.log(
      `  Sacá una foto ahora y repetí: node scripts/probar-enrolamiento.cjs --usuario ${
        usuario.biometrico_codigo || usuario.run || usuario.id_usuario
      } --foto ruta/cara.jpg`
    );
  }

  return resultado;
}

async function controlNegativo(cliente, a, b) {
  const pa = await cargarPlantillas(cliente, a.id_usuario);
  const pb = await cargarPlantillas(cliente, b.id_usuario);
  if (!pa.length || !pb.length) {
    console.log('\nControl negativo: falta alguna de las dos plantillas.');
    return;
  }
  const va = await vectorDeFoto(bufferDesdeBase64(String(pa[0].datos || '')));
  const vb = await vectorDeFoto(bufferDesdeBase64(String(pb[0].datos || '')));
  const s = coseno(va, vb);
  console.log(`\nControl negativo: ${nombreUsuario(a)} vs ${nombreUsuario(b)}`);
  console.log(
    `  similitud ${porcentaje(s)} (umbral ${porcentaje(umbral)}) → ` +
      (s < umbral
        ? '✓ por debajo del umbral, no se confunden.'
        : '✗ ¡se parecen demasiado! El umbral no está separando personas.')
  );
}

(async () => {
  const cliente = new pg.Client(postgres.connectionConfig());
  await cliente.connect();
  try {
    const filtro = opcion('usuario');
    const usuarios = await cargarUsuarios(cliente, filtro);

    if (!filtro) {
      console.log(`Umbral de coincidencia: ${porcentaje(umbral)}`);
      console.log(`Personas con plantilla facial guardada: ${usuarios.length}`);
      for (const u of usuarios) {
        const plantillas = await cargarPlantillas(cliente, u.id_usuario);
        console.log(
          `  ${nombreUsuario(u)} — ${u.run || 'sin RUN'} — código ${u.biometrico_codigo || '—'} ` +
            `— ${plantillas.length} plantilla(s)`
        );
      }
      console.log(
        '\nProbá una persona concreta con: --usuario <RUN|código|nick|uuid> [--foto <imagen>]'
      );
      return;
    }

    if (usuarios.length === 0) {
      console.log(`No encontré ninguna persona que coincida con "${filtro}".`);
      process.exitCode = 1;
      return;
    }
    if (usuarios.length > 1) {
      console.log(`"${filtro}" coincide con ${usuarios.length} personas; afino por el primero.`);
    }

    const principal = usuarios[0];
    const r = await probarUsuario(cliente, principal, opcion('foto'));

    const contra = opcion('contra');
    if (contra) {
      const otros = await cargarUsuarios(cliente, contra);
      if (otros[0]) await controlNegativo(cliente, principal, otros[0]);
      else console.log(`\nNo encontré a "${contra}" para el control negativo.`);
    }

    if (r.ok === false) process.exitCode = 1;
  } finally {
    await cliente.end();
  }
})().catch(e => {
  console.error('FALLO:', e.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Reset biométrico completo en el ORDEN SEGURO:
 *
 *   1) Lector  → borra caras/tarjetas/huellas de los códigos de la BD y limpia
 *      sus registros locales de asistencia.
 *   2) BD       → borra asistencias biométricas, records, events y plantillas,
 *      desenrola a todos los usuarios y deja la marca `historico_limpiado_en`
 *      para que el poller no re-importe el histórico del lector.
 *
 * El orden importa: si se limpia la BD con el lector aún lleno, el poller
 * (MAX(rec_no)=0) re-importa todo y dispara la ola de avisos sonoros.
 *
 * Uso:
 *   node scripts/reset-biometrico.cjs              # pide confirmación (SI)
 *   node scripts/reset-biometrico.cjs --yes        # sin confirmación
 *   node scripts/reset-biometrico.cjs --solo-lector
 *   node scripts/reset-biometrico.cjs --solo-bd     # ⚠ sin vaciar el lector
 *   node scripts/reset-biometrico.cjs --forzar     # sigue a BD aunque falle el lector
 */
require('dotenv').config();
const crypto = require('node:crypto');
const readline = require('node:readline');
const pg = require('pg');
const postgres = require('../lib/database/postgres.cjs');

const args = new Set(process.argv.slice(2));
const soloLector = args.has('--solo-lector');
const soloBd = args.has('--solo-bd');
const forzar = args.has('--forzar');
const auto = args.has('--yes');

async function digestFetch(url, usuario, clave, init = {}, intentos = 3) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      return await digestFetch1(url, usuario, clave, init);
    } catch (e) {
      ultimo = e;
    }
  }
  throw ultimo;
}

async function digestFetch1(url, usuario, clave, init) {
  let res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  if (res.status === 401) {
    const header = res.headers.get('www-authenticate') || '';
    await res.body?.cancel().catch(() => {});
    const u = new URL(url);
    const uri = u.pathname + u.search;
    const method = init.method || 'GET';
    const params = {};
    for (const m of header.matchAll(/(\w+)=(?:"([^"]*)"|([^,]*))/g))
      params[m[1].toLowerCase()] = m[2] ?? m[3];
    const md5 = s => crypto.createHash('md5').update(s).digest('hex');
    const ha1 = md5(`${usuario}:${params.realm}:${clave}`);
    const ha2 = md5(`${method}:${uri}`);
    const qop = (params.qop || 'auth').split(',')[0].trim();
    const cnonce = crypto.randomBytes(8).toString('hex');
    const nc = '00000001';
    const response = qop
      ? md5(`${ha1}:${params.nonce}:${nc}:${cnonce}:auth:${ha2}`)
      : md5(`${ha1}:${params.nonce}:${ha2}`);
    let a = `Digest username="${usuario}", realm="${params.realm}", nonce="${params.nonce}", uri="${uri}", algorithm=${params.algorithm || 'MD5'}, response="${response}"`;
    if (qop) a += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    res = await fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: a },
      signal: AbortSignal.timeout(20000)
    });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res;
}

function descifrar(guardado) {
  const partes = guardado.split('.');
  const d = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(process.env.BIOMETRIC_ENCRYPTION_KEY, 'base64'),
    Buffer.from(partes[0], 'base64')
  );
  d.setAuthTag(Buffer.from(partes[1], 'base64'));
  return Buffer.concat([d.update(Buffer.from(partes[2], 'base64')), d.final()]).toString('utf8');
}

async function confirmar() {
  if (auto) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await new Promise(resolve =>
    rl.question('Esto borra TODA la biomética (lector y BD). Escribí SI para continuar: ', resolve)
  );
  rl.close();
  if (respuesta.trim().toUpperCase() !== 'SI') {
    console.log('Cancelado.');
    process.exit(0);
  }
}

async function vaciarLector(codigos) {
  const cliente = new pg.Client(postgres.connectionConfig());
  await cliente.connect();
  const { rows } = await cliente.query(
    'SELECT serial, ip, usuario_equipo, clave_cifrada FROM biometric_devices WHERE revocado_en IS NULL'
  );
  await cliente.end();

  if (rows.length === 0) {
    console.log('No hay lector configurado en la BD; se omite el paso del lector.');
    return true;
  }

  let todoOk = true;
  for (const fila of rows) {
    if (!fila.ip || !fila.usuario_equipo || !fila.clave_cifrada) {
      console.log(`  ✗ ${fila.serial}: sin IP/credenciales; no se pudo vaciar.`);
      todoOk = false;
      continue;
    }
    const clave = descifrar(fila.clave_cifrada);
    const base = `http://${fila.ip}`;
    const get = ruta => digestFetch(`${base}${ruta}`, fila.usuario_equipo, clave);
    const post = (ruta, cuerpo) =>
      digestFetch(`${base}${ruta}`, fila.usuario_equipo, clave, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
      });

    console.log(`\nLector ${fila.serial} (${fila.ip}):`);
    const probar = async fn => {
      try {
        await fn();
        return true;
      } catch {
        return false;
      }
    };
    try {
      const inicio = await get('/cgi-bin/FaceInfoManager.cgi?action=startFind');
      const carasAntes = Number(/"Total"\s*:\s*"?(\d+)"?/.exec(await inicio.text())?.[1] ?? 0);
      console.log(`  caras antes: ${carasAntes}`);

      if (codigos.length > 0) {
        const primero = codigos[0];
        const soporta = {
          tarjeta: await probar(() =>
            get(
              `/cgi-bin/recordUpdater.cgi?action=remove&name=AccessControlCard&UserID=${encodeURIComponent(primero)}`
            )
          ),
          cara: await probar(() =>
            post('/cgi-bin/FaceInfoManager.cgi?action=delete', { UserID: primero })
          ),
          huella: await probar(() =>
            post('/cgi-bin/FingerPrintManager.cgi?action=delete', { UserID: primero })
          )
        };
        if (soporta.tarjeta || soporta.cara || soporta.huella) {
          let borrados = 0;
          const fallidos = [];
          for (const codigo of codigos) {
            let ok = false;
            if (soporta.tarjeta)
              ok =
                (await probar(() =>
                  get(
                    `/cgi-bin/recordUpdater.cgi?action=remove&name=AccessControlCard&UserID=${encodeURIComponent(codigo)}`
                  )
                )) || ok;
            if (soporta.cara)
              ok =
                (await probar(() =>
                  post('/cgi-bin/FaceInfoManager.cgi?action=delete', { UserID: codigo })
                )) || ok;
            if (soporta.huella)
              ok =
                (await probar(() =>
                  post('/cgi-bin/FingerPrintManager.cgi?action=delete', { UserID: codigo })
                )) || ok;
            if (ok) borrados++;
            else fallidos.push(codigo);
          }
          console.log(
            `  borrado individual: ${borrados}/${codigos.length}${fallidos.length ? ` (falló: ${fallidos.join(', ')})` : ''}`
          );
        } else {
          console.log(
            '  firmware sin borrado individual (remove/delete → 400/501); se limpia por clear de tablas'
          );
        }
      }

      for (const nombre of ['AccessControlCard', 'AccessControlCardRec']) {
        const r = await get(`/cgi-bin/recordUpdater.cgi?action=clear&name=${nombre}`);
        const texto = (await r.text()).trim();
        if (!texto.includes('OK')) {
          console.log(`  ✗ clear ${nombre}: ${texto.substring(0, 120)}`);
          todoOk = false;
        } else {
          console.log(`  clear ${nombre}: OK`);
        }
      }

      const fin = await get('/cgi-bin/FaceInfoManager.cgi?action=startFind');
      const carasDespues = Number(/"Total"\s*:\s*"?(\d+)"?/.exec(await fin.text())?.[1] ?? 0);
      console.log(`  caras después: ${carasDespues}`);
      if (carasDespues > 0) {
        console.log(
          '  ⚠ quedan caras; este firmware no permite borrarlas por CGI (borrálas desde la web del lector).'
        );
      }

      const cards = await get(
        '/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCard&count=10&offset=0'
      );
      const found = Number(/found=(\d+)/.exec(await cards.text())?.[1] ?? 0);
      if (found > 0) console.log(`  ⚠ quedan ${found} tarjetas en el lector.`);
    } catch (e) {
      console.log(`  ✗ lector inaccesible o rechazó: ${e.message}`);
      todoOk = false;
    }
  }
  return todoOk;
}

async function vaciarBd() {
  const cliente = new pg.Client(postgres.connectionConfig());
  await cliente.connect();
  try {
    await cliente.query('BEGIN');
    const corte = await cliente.query(
      `UPDATE biometric_devices SET historico_limpiado_en = NOW() - interval '5 minutes'`
    );
    const asistencias = await cliente.query(`DELETE FROM asistencias WHERE origen = 'biometrico'`);
    const records = await cliente.query('DELETE FROM biometric_device_records');
    const events = await cliente.query('DELETE FROM biometric_events');
    const plantillas = await cliente.query('DELETE FROM biometric_plantillas');
    const usuarios = await cliente.query(
      `UPDATE usuarios SET biometrico_facial = 0, biometrico_huella = 0
        WHERE biometrico_facial = 1 OR biometrico_huella = 1`
    );
    await cliente.query('COMMIT');
    console.log('\nBD:');
    console.log(`  corte (historico_limpiado_en) en ${corte.rowCount} lector(es)`);
    console.log(`  asistencias biométricas borradas: ${asistencias.rowCount}`);
    console.log(`  records borrados: ${records.rowCount}`);
    console.log(`  events borrados: ${events.rowCount}`);
    console.log(`  plantillas borradas: ${plantillas.rowCount}`);
    console.log(`  usuarios desenrolados: ${usuarios.rowCount}`);
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    await cliente.end();
  }
}

(async () => {
  await confirmar();

  const cliente = new pg.Client(postgres.connectionConfig());
  await cliente.connect();
  const { rows: usuarios } = await cliente.query(
    `SELECT biometrico_codigo FROM usuarios
      WHERE biometrico_codigo IS NOT NULL AND TRIM(biometrico_codigo) <> ''`
  );
  await cliente.end();
  const codigos = [...new Set(usuarios.map(u => String(u.biometrico_codigo).trim()))];
  console.log(`Códigos biométricos en la BD: ${codigos.length}`);

  let lectorOk = true;
  if (!soloBd) {
    lectorOk = await vaciarLector(codigos);
    if (!lectorOk && !forzar) {
      console.error(
        '\n✗ El lector no quedó vacío: NO se toca la BD (si se limpiara ahora, el poller re-importaría el histórico). Reintentá o usá --forzar.'
      );
      process.exit(1);
    }
  } else {
    console.log('\n⚠ --solo-bd: la BD se limpia sin vaciar el lector (riesgo de re-importación).');
  }

  if (!soloLector) {
    await vaciarBd();
  }

  console.log('\nLISTO. Sistema biométrico en cero (lector → BD, en ese orden).');
  process.exit(0);
})().catch(e => {
  console.error('FALLO:', e.message);
  process.exit(1);
});

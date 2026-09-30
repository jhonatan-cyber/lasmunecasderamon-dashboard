import { execFile } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';

/**
 * Re-encontrar el lector cuando el DHCP le cambia la IP.
 *
 * El terminal está en DHCP: una renovación de concesión o un cambio de red WiFi
 * y la IP guardada en `biometric_devices.ip` ya no es la del equipo. La
 * identidad no cambia (es el serial), solo "dónde está", así que acá se resuelve
 * eso con lo único estable que tenemos: la MAC.
 *
 * El método es local y no requiere privilegios:
 *   1) barrer la subred con un TCP connect al puerto 80 (eso además puebla la
 *      tabla de vecinos/ARP con la MAC de cada host vivo),
 *   2) leer `arp -a` (Windows) o `ip neigh` (Linux) y quedarse con las IPs
 *      cuya MAC coincida con la registrada,
 *   3) confirmar cada candidata con el serial del equipo antes de aceptarla:
 *      un tercero que se quede con la IP vieja NUNCA pasa esa prueba.
 *
 * Ninguna función de red corre al importar el módulo: todo es bajo demanda.
 */

export interface Vecino {
  ip: string;
  mac: string;
}

/** `E0-2E-FE-DC-E1-0B` / `e0.2e.fe.dc.e1.0b` → `e0:2e:fe:dc:e1:0b`. */
export function normalizarMac(valor?: string | null): string | null {
  if (!valor) return null;
  const limpio = valor
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '');
  if (limpio.length !== 12) return null;
  return (limpio.match(/.{2}/g) ?? []).join(':');
}

/** Campo `mac` de la fila (separado por comas) → lista normalizada. */
export function macsDe(campo?: string | null): string[] {
  if (!campo) return [];
  return campo
    .split(',')
    .map(normalizarMac)
    .filter((mac): mac is string => Boolean(mac));
}

export function coincideMac(
  campo: string | null | undefined,
  mac: string | null | undefined
): boolean {
  const objetivo = normalizarMac(mac);
  if (!objetivo) return false;
  return macsDe(campo).includes(objetivo);
}

/** Unicast local: descarta broadcast (ff:…), multicast (primer octeto impar) y vacías. */
function macUtil(mac: string | null): mac is string {
  if (!mac) return false;
  if (mac === 'ff:ff:ff:ff:ff:ff') return false;
  return parseInt(mac.slice(0, 2), 16) % 2 === 0;
}

/**
 * `arp -a` de Windows (separador de MAC con guiones, salida localizada):
 *   Interfaz: 192.168.0.2 --- 0x8
 *     192.168.0.33     e0-2e-fe-dc-e1-0b     dinámico
 */
export function parsearVecinosWindows(salida: string): Vecino[] {
  const out: Vecino[] = [];
  for (const linea of salida.split(/\r?\n/)) {
    const hit = /(\d{1,3}(?:\.\d{1,3}){3})\s+((?:[0-9a-f]{2}[-:]){5}[0-9a-f]{2})/i.exec(linea);
    if (!hit) continue;
    const mac = normalizarMac(hit[2]);
    if (!macUtil(mac)) continue;
    out.push({ ip: hit[1], mac: mac as string });
  }
  return out;
}

/** `ip -o neigh`: `192.168.0.33 dev wlan0 lladdr e0:2e:fe:dc:e1:0b REACHABLE`. */
export function parsearVecinosLinux(salida: string): Vecino[] {
  const out: Vecino[] = [];
  for (const linea of salida.split(/\r?\n/)) {
    const hit =
      /(\d{1,3}(?:\.\d{1,3}){3})\s+(?:dev\s+\S+\s+)?(?:lladdr\s+)?((?:[0-9a-f]{2}:){5}[0-9a-f]{2})/i.exec(
        linea
      );
    if (!hit) continue;
    const mac = normalizarMac(hit[2]);
    if (!macUtil(mac)) continue;
    out.push({ ip: hit[1], mac: mac as string });
  }
  return out;
}

/** Tabla de vecinos (ARP) del sistema. Nunca lanza: sin tabla no hay descubrimiento. */
export async function leerVecinos(): Promise<Vecino[]> {
  const esWindows = process.platform === 'win32';
  const comando = esWindows ? 'arp' : 'ip';
  const args = esWindows ? ['-a'] : ['-o', 'neigh'];
  const salida = await new Promise<string>(resolve => {
    execFile(
      comando,
      args,
      { timeout: 6000, windowsHide: true, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' },
      (error, stdout) => resolve(error && !stdout ? '' : String(stdout ?? ''))
    );
  });
  return esWindows ? parsearVecinosWindows(salida) : parsearVecinosLinux(salida);
}

/** MAC de una IP en la tabla ARP local (null si no está). */
export async function macDeTabla(ip: string): Promise<string | null> {
  const vecinos = await leerVecinos().catch(() => [] as Vecino[]);
  return vecinos.find(vecino => vecino.ip === ip)?.mac ?? null;
}

export function ipAEntero(ip: string): number | null {
  const partes = ip.split('.');
  if (partes.length !== 4) return null;
  let entero = 0;
  for (const parte of partes) {
    const n = Number(parte);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    entero = (entero << 8) | n;
  }
  return entero >>> 0;
}

export function enteroAIp(entero: number): string {
  return [(entero >>> 24) & 255, (entero >>> 16) & 255, (entero >>> 8) & 255, entero & 255].join(
    '.'
  );
}

export interface Red {
  nombre: string;
  ipv4: string;
  netmask: string;
}

export interface RangoIp {
  base: string;
  ips: string[];
  /** Tamaño real de la red (2^(32-máscara)), aunque `ips` venga recortado. */
  tamano: number;
}

/**
 * Hosts de cada red local (sin broadcast ni red). Las redes demasiado grandes
 * se recortan a `limite` hosts: en una oficina un /16 no se barre entero.
 */
export function rangosDeRed(redes: Red[], limite = 1024): RangoIp[] {
  const rangos: RangoIp[] = [];
  const vistas = new Set<string>();

  for (const red of redes) {
    const ip = ipAEntero(red.ipv4);
    const mascara = ipAEntero(red.netmask);
    if (ip === null || mascara === null) continue;

    const tamano = (~mascara >>> 0) + 1;
    if (tamano < 4) continue; // /31 y /32 no tienen hosts que barrer
    const inicio = (ip & mascara) >>> 0;
    const clave = `${inicio}-${tamano}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);

    const cantidad = Math.min(tamano - 2, limite);
    const ips: string[] = [];
    for (let n = 1; n <= cantidad; n++) {
      ips.push(enteroAIp((inicio + n) >>> 0));
    }
    rangos.push({ base: enteroAIp(inicio), ips, tamano });
  }
  return rangos;
}

/** Redes IPv4 no internas de esta máquina (todas las tarjetas activas). */
export function redesActuales(limite = 1024): RangoIp[] {
  const interfaces: Red[] = [];
  for (const [nombre, direcciones] of Object.entries(os.networkInterfaces())) {
    for (const direccion of direcciones ?? []) {
      // family es 'IPv4'/'IPv6' en los typings actuales y 4/6 en los viejos.
      const familia = String(direccion.family);
      if ((familia === 'IPv4' || familia === '4') && !direccion.internal) {
        interfaces.push({ nombre, ipv4: direccion.address, netmask: direccion.netmask });
      }
    }
  }
  const rangos = rangosDeRed(interfaces, limite);
  const porBase = new Map<string, RangoIp>();
  for (const rango of rangos) {
    const previo = porBase.get(rango.base);
    porBase.set(rango.base, previo ? { ...previo, ips: [...previo.ips, ...rango.ips] } : rango);
  }
  return [...porBase.values()];
}

/**
 * IPs a probar: si tenemos la IP anterior (aunque sea vieja) y cae dentro de
 * alguna de nuestras redes, se barre SOLO esa; si ya no pertenece a ninguna
 * (cambiamos de red) se barren todas.
 */
export function ipsCandidatas(
  opciones: { cercaDe?: string | null; limite?: number } = {}
): string[] {
  const redes = redesActuales(opciones.limite ?? 1024);
  const anterior = opciones.cercaDe ? ipAEntero(opciones.cercaDe) : null;
  if (anterior !== null) {
    for (const red of redes) {
      const base = ipAEntero(red.base);
      if (base === null) continue;
      if (anterior >= base && anterior < base + red.tamano) return red.ips;
    }
  }
  return redes.flatMap(red => red.ips);
}

/** TCP connect corto al puerto HTTP del lector: barato y además puebla el ARP. */
export function sondearPuerto(host: string, puerto = 80, timeoutMs = 400): Promise<boolean> {
  return new Promise(resolve => {
    if (!net.isIP(host)) return resolve(false);
    const socket = net.connect({ host, port: puerto });
    let cerrado = false;
    const terminar = (vivo: boolean) => {
      if (cerrado) return;
      cerrado = true;
      socket.destroy();
      resolve(vivo);
    };
    socket.setTimeout(timeoutMs, () => terminar(false));
    socket.once('connect', () => terminar(true));
    socket.once('error', () => terminar(false));
  });
}

/** Barrido en paralelo: devuelve las IPs que responden. */
export async function barrerPuerto(
  ips: string[],
  opciones: { puerto?: number; timeoutMs?: number; concurrencia?: number } = {}
): Promise<string[]> {
  const { puerto = 80, timeoutMs = 400, concurrencia = 64 } = opciones;
  const vivas: string[] = [];
  let indice = 0;
  const trabajador = async () => {
    while (indice < ips.length) {
      const ip = ips[indice++];
      if (await sondearPuerto(ip, puerto, timeoutMs)) vivas.push(ip);
    }
  };
  const cantidad = Math.max(1, Math.min(concurrencia, ips.length));
  await Promise.all(Array.from({ length: cantidad }, trabajador));
  return vivas;
}

/** IPs vivas cuya MAC está en la lista registrada (con respaldo: si el sondeo no la vio, la ARP igual sirve). */
export function candidatosPorMac(parametros: {
  vecinos: Vecino[];
  vivas: string[];
  macs: string[];
}): string[] {
  const buscadas = new Set(macsDe(parametros.macs.join(',')));
  if (buscadas.size === 0) return [];
  const porMac = parametros.vecinos
    .filter(vecino => buscadas.has(vecino.mac))
    .map(vecino => vecino.ip);
  const vivas = new Set(parametros.vivas);
  const preferidos = porMac.filter(ip => vivas.has(ip));
  const unicos = [...new Set(preferidos.length ? preferidos : porMac)];
  return unicos;
}

export interface OperacionesDescubrimiento {
  sondear?: (ip: string) => Promise<boolean>;
  vecinos?: () => Promise<Vecino[]>;
  /** IPs a barrer (por omisión: las redes locales de esta máquina). */
  candidatas?: () => string[];
  /** Barrido completo (por omisión: TCP a cada IP candidata). */
  barrido?: (ips: string[]) => Promise<string[]>;
  /** Devuelve el serial del equipo que responde en esa IP, o null si no es él. */
  serial?: (ip: string) => Promise<string | null>;
}

/**
 * Busca en la red el equipo con esas MACs y devuelve su IP NUEVA.
 *
 * El serial es la última palabra: sin eso, actualizar la IP podría apuntar al
 * equipo equivocado. `limiteSerial` acota cuántas IPs se confirman una por una
 * para que un barrido grande no se dispare en tiempo.
 */
export async function buscarEquipoPorMac(opciones: {
  macs: string[];
  ipActual?: string | null;
  limiteSerial?: number;
  ops?: OperacionesDescubrimiento;
}): Promise<{ ip: string; verificada: boolean } | null> {
  const { macs, ipActual = null, limiteSerial = 40, ops = {} } = opciones;

  const sondear = ops.sondear ?? ((ip: string) => sondearPuerto(ip, 80, 400));
  const vecinos = ops.vecinos ?? leerVecinos;
  const serial = ops.serial;

  const candidatas = ops.candidatas ? ops.candidatas() : ipsCandidatas({ cercaDe: ipActual });
  const vivas = ops.barrido
    ? await ops.barrido(candidatas).catch(() => [] as string[])
    : await barrerPuerto(candidatas, { concurrencia: 64 }).catch(() => [] as string[]);
  const tabla = await vecinos().catch(() => [] as Vecino[]);

  let objetivos = candidatosPorMac({ vecinos: tabla, vivas, macs });
  if (objetivos.length === 0) {
    // Sin MAC registrada (fila vieja) o no aparece en la tabla: confirmamos por
    // serial sobre lo poco que responde, que en la red de un local es corto.
    objetivos = vivas.slice(0, limiteSerial);
  }
  if (ipActual && !objetivos.includes(ipActual) && (await sondear(ipActual).catch(() => false))) {
    objetivos = [ipActual, ...objetivos];
  }
  objetivos = objetivos.slice(0, limiteSerial);

  for (const ip of objetivos) {
    if (!serial) return { ip, verificada: false };
    const reportado = await serial(ip).catch(() => null);
    if (reportado) return { ip, verificada: true };
  }
  return null;
}

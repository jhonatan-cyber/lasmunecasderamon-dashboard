import { query } from '@/lib/database/db';
import {
  credencialesDeFila,
  verificarConexion
} from '@/modules/asistencia/biometrico/deviceClient';
import {
  capturarMacs,
  descubrirIpDispositivo,
  equipoResponde,
  guardarMac
} from '@/modules/asistencia/biometrico/ipDiscovery';
import logger from '@/lib/utils/logger';

const INTERVALO_DEFECTO_MS = 5 * 60_000;

let timer: NodeJS.Timeout | null = null;
let enVuelo = false;

function habilitado(): boolean {
  const flag = (process.env.BIOMETRIC_IP_WATCH ?? '').toLowerCase();
  return !(flag === 'off' || flag === '0' || flag === 'false');
}

export function intervaloVigilanciaIp(): number {
  const crudo = Number(process.env.BIOMETRIC_IP_WATCH_MS);
  return Number.isFinite(crudo) && crudo >= 30_000 ? crudo : INTERVALO_DEFECTO_MS;
}

export async function vigilarUnaVez(): Promise<void> {
  const equipos = await query<
    { id: string; serial: string; ip: string; usuario_equipo: string; clave_cifrada: string }[]
  >(
    `SELECT id, serial, ip, usuario_equipo, clave_cifrada
       FROM biometric_devices
      WHERE revocado_en IS NULL
        AND ip IS NOT NULL
        AND usuario_equipo IS NOT NULL
        AND clave_cifrada IS NOT NULL`
  );

  for (const equipo of equipos) {
    try {
      const credenciales = credencialesDeFila(equipo);
      if (!credenciales) continue;

      let serialOk = false;
      if (await equipoResponde(equipo.ip)) {
        try {
          const info = await verificarConexion(credenciales);
          serialOk = info.serial.toUpperCase() === equipo.serial.toUpperCase();
        } catch {
          serialOk = false;
        }
      }

      if (serialOk) {
        const macs = await capturarMacs(credenciales);
        await guardarMac(equipo.id, macs);
        continue;
      }

      logger.warn('[biometric-ipwatch] Equipo inaccesible en su IP; re-buscando', {
        dispositivoId: equipo.id,
        serial: equipo.serial,
        ip: equipo.ip
      });
      const resultado = await descubrirIpDispositivo(equipo.id, { forzar: true });
      if (resultado.ok) {
        logger.info('[biometric-ipwatch] Resuelto', {
          dispositivoId: equipo.id,
          cambio: resultado.cambio,
          ip: resultado.ipNueva,
          mensaje: resultado.mensaje
        });
      } else {
        logger.warn('[biometric-ipwatch] No se pudo re-encontrar el equipo', {
          dispositivoId: equipo.id,
          mensaje: resultado.mensaje
        });
      }
    } catch (error) {
      logger.warn('[biometric-ipwatch] Ciclo fallido para un equipo', {
        dispositivoId: equipo.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export function arrancarVigilanteIp(): void {
  if (timer || !habilitado()) return;
  const arrancar = () => {
    if (enVuelo) return;
    enVuelo = true;
    void vigilarUnaVez()
      .catch(error => {
        logger.warn('[biometric-ipwatch] Ciclo fallido', {
          error: error instanceof Error ? error.message : String(error)
        });
      })
      .finally(() => {
        enVuelo = false;
      });
  };
  timer = setInterval(arrancar, intervaloVigilanciaIp());
  timer.unref?.();
  logger.info('[biometric-ipwatch] Vigilante de IP encendido', {
    intervaloMs: intervaloVigilanciaIp()
  });
}

export function detenerVigilanteIp(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

export function vigilanteCorriendo(): boolean {
  return timer !== null;
}

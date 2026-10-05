'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { playScanSound, prepareScanSound } from '@/lib/utils/audioUtils';
import type { DevolucionEnvaseResultado } from '@/modules/inventario/contracts';

/** Texto corto del motivo por el que un escaneo no se aceptó. */
export const MOTIVO_ENVASE: Record<string, string> = {
  no_es_nuestro: 'No es nuestro',
  no_esta_vacia: 'No está vacío',
  ya_devuelto: 'Ya entregado',
  venta_entera: 'Se vendió entera',
  no_entregado: 'El bar no lo entregó',
  ya_confirmado: 'Ya confirmado'
};

/**
 * Un escaneo del lote en curso. `ok` es true/false cuando el servidor ya lo
 * verificó y null mientras esté en cola local sin verificar (sin conexión).
 */
export interface EscaneoEnvase {
  id: string;
  codigo: string;
  ok: boolean | null;
  motivo: string | null;
  mensaje: string;
  hora: string;
}

interface UseContainerScanOptions {
  /** Endpoint del paso: entrega del bar o confirmación del almacén. */
  endpoint: string;
  /** Se llama con retardo tras un escaneo aceptado, para refrescar el historial. */
  onAceptado?: () => void;
  /** Espera para agrupar ráfagas de escaneos en un solo refresco del historial. */
  refrescoMs?: number;
}

const CLAVE_SONIDO = 'envases_aviso_sonoro';
/** Cuántos escaneos de la sesión se conservan; la cola pendiente nunca se recorta. */
const MAXIMO_SESION = 50;

/**
 * Clave propia por paso. No se comparte con `offline_request_queue`
 * (lib/utils/offlineStore.ts) porque la cola genérica solo limpia el ítem al
 * recibir 2xx y no devuelve el diagnóstico, y aquí cada escaneo necesita su
 * veredicto para los contadores del lote.
 */
const claveColaDe = (endpoint: string) =>
  `envases_cola_escaneos_${endpoint.replace(/[^a-zA-Z0-9]+/g, '_')}`;

/** Clave de localStorage donde un paso guarda su cola pendiente. */
export const claveColaDeEscaneos = claveColaDe;

/** Solo se reintenta lo que puede mejorar con el tiempo (red o servidor caído). */
const esFalloTransitorio = (status: number | null) =>
  status === null || status >= 500 || status === 408 || status === 429;

/** La cola guardada se recupera aunque la página se cierre a mitad del lote. */
const leerCola = (clave: string): EscaneoEnvase[] => {
  if (typeof window === 'undefined') return [];
  try {
    const guardado = JSON.parse(window.localStorage.getItem(clave) || '[]');
    if (!Array.isArray(guardado)) return [];
    return guardado.flatMap((item: any) =>
      item && typeof item.id === 'string' && typeof item.codigo === 'string'
        ? [
            {
              id: item.id,
              codigo: item.codigo,
              ok: null,
              motivo: null,
              mensaje: typeof item.mensaje === 'string' ? item.mensaje : '',
              hora: typeof item.hora === 'string' ? item.hora : ''
            }
          ]
        : []
    );
  } catch {
    return []; // dato corrupto: se arranca sin cola en vez de romper la página
  }
};

type Envio =
  | { tipo: 'resultado'; resultado: DevolucionEnvaseResultado }
  | { tipo: 'transitorio' }
  | { tipo: 'error' };

/**
 * Escaneo continuo del control de envases con modo offline.
 *
 * En línea, cada lectura se verifica al instante (aceptado/rechazado) y suena
 * distinto. Sin conexión la lectura **no se pierde**: queda en cola local
 * (localStorage, por paso) con un tercer tono, se cuenta como "en cola" y se
 * verifica sola al reconectar —o al pulsar reintentar— devolviendo a cada
 * escaneo su veredicto y sus contadores. Nunca se descarta una lectura
 * pendiente, ni al limpiar el lote ni al recortar la lista.
 */
export function useContainerScan({
  endpoint,
  onAceptado,
  refrescoMs = 1200
}: UseContainerScanOptions) {
  const [sesion, setSesion] = useState<EscaneoEnvase[]>([]);
  const [resultado, setResultado] = useState<DevolucionEnvaseResultado | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [sonido, setSonido] = useState(true);

  const sesionRef = useRef<EscaneoEnvase[]>([]);
  const enCurso = useRef(false);
  const sincronizandoRef = useRef(false);
  const refresco = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutivo = useRef(0);
  // Prefijo estable y puro de esta sesión: evita chocar con los ids guardados
  // en la cola de una sesión anterior (Math.random está prohibido en render).
  const sesionId = useId();
  const cargada = useRef(false);
  const claveCola = useMemo(() => claveColaDe(endpoint), [endpoint]);

  /** Recorta los resueltos más antiguos; la cola pendiente no se pierde nunca. */
  const recortar = useCallback((lista: EscaneoEnvase[]): EscaneoEnvase[] => {
    if (lista.length <= MAXIMO_SESION) return lista;
    const excedente = lista.length - MAXIMO_SESION;
    const aQuitar = new Set<string>();
    for (let i = lista.length - 1; i >= 0 && aQuitar.size < excedente; i--) {
      if (lista[i].ok !== null) aQuitar.add(lista[i].id);
    }
    if (aQuitar.size === 0) return lista; // todo es cola: no se descarta nada
    return lista.filter(e => e.ok === null || !aQuitar.has(e.id));
  }, []);

  const aplicarSesion = useCallback(
    (siguiente: EscaneoEnvase[]) => {
      const recortada = recortar(siguiente);
      sesionRef.current = recortada;
      setSesion(recortada);
    },
    [recortar]
  );

  const programarRefresco = useCallback(() => {
    if (!onAceptado) return;
    if (refresco.current) clearTimeout(refresco.current);
    refresco.current = setTimeout(() => {
      refresco.current = null;
      onAceptado();
    }, refrescoMs);
  }, [onAceptado, refrescoMs]);

  /** POST de un código; dice si hubo veredicto, si habría que reintentar o si es un error. */
  const enviar = useCallback(
    async (codigo: string): Promise<Envio> => {
      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo })
        });
      } catch {
        return { tipo: 'transitorio' };
      }

      const cuerpo = await res.json().catch(() => null);
      if (!res.ok) {
        if (esFalloTransitorio(res.status)) return { tipo: 'transitorio' };
        toast.error(cuerpo?.message || 'No se pudo registrar el escaneo');
        return { tipo: 'error' };
      }
      if (!cuerpo?.data) {
        toast.error(cuerpo?.message || 'Respuesta inesperada del servidor');
        return { tipo: 'error' };
      }
      return { tipo: 'resultado', resultado: cuerpo.data as DevolucionEnvaseResultado };
    },
    [endpoint]
  );

  /**
   * Vuelve a intentar la cola en orden de escaneo y le asigna a cada ítem su
   * veredicto. Se detiene en el primer fallo de red para no mezclar el orden ni
   * descartar nada: lo que quede pendiente se reintenta en el próximo trigger.
   */
  const sincronizar = useCallback(async (): Promise<boolean> => {
    if (sincronizandoRef.current) return false;
    // La sesión va de lo más reciente a lo más antiguo; la cola se reintenta en
    // orden cronológico para que el primer veredicto sea el de la primera lectura.
    const pendientes = sesionRef.current.filter(e => e.ok === null).reverse();
    if (pendientes.length === 0) return false;

    sincronizandoRef.current = true;
    setSincronizando(true);
    try {
      let resueltos = 0;
      let rechazados = 0;
      for (const pendiente of pendientes) {
        const envio = await enviar(pendiente.codigo);
        if (envio.tipo !== 'resultado') break;
        const ok = Boolean(envio.resultado.ok);
        resueltos++;
        if (!ok) rechazados++;
        aplicarSesion(
          sesionRef.current.map(e =>
            e.id === pendiente.id
              ? {
                  ...e,
                  ok,
                  motivo: envio.resultado.ok ? null : envio.resultado.motivo,
                  mensaje: envio.resultado.mensaje
                }
              : e
          )
        );
      }

      if (resueltos === 0) {
        toast.error('No se pudo sincronizar la cola de envases. Se reintentará.');
        return false;
      }

      programarRefresco();
      const restantes = sesionRef.current.filter(e => e.ok === null).length;
      const partes = `${resueltos - rechazados} aceptado(s), ${rechazados} rechazado(s)`;
      const mensaje = `Cola sincronizada: ${partes}.${restantes ? ` Quedan ${restantes} pendientes.` : ''}`;
      if (rechazados > 0) toast.error(mensaje);
      else toast.success(mensaje);
      return true;
    } finally {
      sincronizandoRef.current = false;
      setSincronizando(false);
    }
  }, [enviar, aplicarSesion, programarRefresco]);
  const nuevoId = useCallback(
    (codigo: string) => `${sesionId}-${codigo}-${++consecutivo.current}`,
    [sesionId]
  );

  /**
   * Procesa un código escaneado. Devuelve false si lo ignoró (código vacío, ya
   * había un escaneo en curso o un error del cliente), para que el llamador no
   * borre el campo; devuelve true tanto si se verificó como si quedó en cola,
   * porque el código ya quedó registrado.
   */
  const escanear = useCallback(
    async (valor: string): Promise<boolean> => {
      // Igual que el servidor: el código se compara mayúsculas y sin espacios.
      const codigo = valor.trim().toUpperCase();
      if (!codigo || enCurso.current) return false;
      enCurso.current = true;
      setEscaneando(true);
      prepareScanSound();
      try {
        const hora = new Date().toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        const envio = await enviar(codigo);

        if (envio.tipo === 'transitorio') {
          const yaEnCola = sesionRef.current.some(e => e.ok === null && e.codigo === codigo);
          if (yaEnCola) {
            // Mismo envase re-escaneado sin conexión: ya está guardado; duplicarlo
            // haría que al sincronizar el segundo pasara por rechazo.
            if (sonido) playScanSound('cola');
            return true;
          }
          const habiaCola = sesionRef.current.some(e => e.ok === null);
          aplicarSesion([
            {
              id: nuevoId(codigo),
              codigo,
              ok: null,
              motivo: null,
              mensaje: 'Guardado localmente: se verificará al reconectar.',
              hora
            },
            ...sesionRef.current
          ]);
          if (sonido) playScanSound('cola');
          if (!habiaCola) {
            toast.error('Sin conexión: el escaneo quedó guardado y se verificará al reconectar.');
          }
          return true;
        }

        if (envio.tipo === 'error') return false;

        const { resultado: veredicto } = envio;
        const ok = Boolean(veredicto.ok);
        setResultado(veredicto);
        if (sonido) playScanSound(ok ? 'aceptado' : 'rechazado');
        aplicarSesion([
          {
            id: nuevoId(codigo),
            codigo,
            ok,
            motivo: veredicto.ok ? null : veredicto.motivo,
            mensaje: veredicto.mensaje,
            hora
          },
          ...sesionRef.current
        ]);
        if (ok) programarRefresco();
        // Si la red acaba de responder y queda cola, es el momento de drenarla.
        if (sesionRef.current.some(e => e.ok === null)) void sincronizar();
        return true;
      } finally {
        enCurso.current = false;
        setEscaneando(false);
      }
    },
    [enviar, sonido, aplicarSesion, nuevoId, programarRefresco, sincronizar]
  );

  /** Reinicia el conteo del lote; los pendientes de sincronizar se conservan. */
  const limpiar = useCallback(() => {
    aplicarSesion(sesionRef.current.filter(e => e.ok === null));
    setResultado(null);
  }, [aplicarSesion]);

  const alternarSonido = useCallback(() => {
    setSonido(previo => {
      const siguiente = !previo;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CLAVE_SONIDO, siguiente ? 'on' : 'off');
      }
      if (siguiente) prepareScanSound();
      return siguiente;
    });
  }, []);

  // Al montar (post-hidratación) se recupera la cola y se escucha la reconexión.
  useEffect(() => {
    if (typeof window === 'undefined' || cargada.current) return;
    cargada.current = true;

    const guardada = leerCola(claveCola);
    if (guardada.length) aplicarSesion(guardada);
    setSonido(window.localStorage.getItem(CLAVE_SONIDO) !== 'off');

    const alReconectar = () => void sincronizar();
    window.addEventListener('online', alReconectar);
    if (guardada.length) void sincronizar();

    return () => {
      window.removeEventListener('online', alReconectar);
      if (refresco.current) clearTimeout(refresco.current);
    };
  }, [claveCola, aplicarSesion, sincronizar]);

  // La cola pendiente se persiste en cada cambio; los resueltos no se guardan.
  useEffect(() => {
    if (typeof window === 'undefined' || !cargada.current) return;
    try {
      const cola = sesion.filter(e => e.ok === null);
      window.localStorage.setItem(claveCola, JSON.stringify(cola));
    } catch {
      // sin espacio o almacenamiento bloqueado: la cola sigue en memoria
    }
  }, [sesion, claveCola]);

  const aceptados = useMemo(() => sesion.filter(e => e.ok === true).length, [sesion]);
  const rechazados = useMemo(() => sesion.filter(e => e.ok === false).length, [sesion]);

  return {
    escanear,
    escaneando,
    resultado,
    sesion,
    aceptados,
    rechazados,
    enCola: sesion.length - aceptados - rechazados,
    sincronizando,
    sincronizar,
    limpiar,
    sonido,
    alternarSonido
  };
}

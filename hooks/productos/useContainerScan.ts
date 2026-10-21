'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { playScanSound, prepareScanSound } from '@/lib/utils/audioUtils';
import type { DevolucionEnvaseResultado } from '@/modules/inventario/contracts';

export const MOTIVO_ENVASE: Record<string, string> = {
  no_es_nuestro: 'No es nuestro',
  no_esta_vacia: 'No está vacío',
  ya_devuelto: 'Ya entregado',
  venta_entera: 'Se vendió entera',
  no_entregado: 'El bar no lo entregó',
  ya_confirmado: 'Ya confirmado'
};

export interface EscaneoEnvase {
  id: string;
  codigo: string;
  ok: boolean | null;
  motivo: string | null;
  mensaje: string;
  hora: string;
}

interface UseContainerScanOptions {
  endpoint: string;
  onAceptado?: () => void;
  refrescoMs?: number;
}

const CLAVE_SONIDO = 'envases_aviso_sonoro';
const MAXIMO_SESION = 50;
const claveColaDe = (endpoint: string) =>
  `envases_cola_escaneos_${endpoint.replace(/[^a-zA-Z0-9]+/g, '_')}`;

export const claveColaDeEscaneos = claveColaDe;

const esFalloTransitorio = (status: number | null) =>
  status === null || status >= 500 || status === 408 || status === 429;

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
    return [];
  }
};

type Envio =
  | { tipo: 'resultado'; resultado: DevolucionEnvaseResultado }
  | { tipo: 'transitorio' }
  | { tipo: 'error' };

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
  const sesionId = useId();
  const cargada = useRef(false);
  const claveCola = useMemo(() => claveColaDe(endpoint), [endpoint]);
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

  const sincronizar = useCallback(async (): Promise<boolean> => {
    if (sincronizandoRef.current) return false;
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

  const escanear = useCallback(
    async (valor: string): Promise<boolean> => {
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
        if (sesionRef.current.some(e => e.ok === null)) void sincronizar();
        return true;
      } finally {
        enCurso.current = false;
        setEscaneando(false);
      }
    },
    [enviar, sonido, aplicarSesion, nuevoId, programarRefresco, sincronizar]
  );

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

  useEffect(() => {
    if (typeof window === 'undefined' || !cargada.current) return;
    try {
      const cola = sesion.filter(e => e.ok === null);
      window.localStorage.setItem(claveCola, JSON.stringify(cola));
    } catch {}
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

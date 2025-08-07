import { useState, useEffect, useCallback } from "react";
import { PropinaResumen, PropinaDetalle } from "@/types/propina";

// Hook para obtener resumen de tips
export const useTipsResumen = () => {
  const [tips, setTips] = useState<PropinaResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTips = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tips?tipo=resumen");
      if (!response.ok) {
        throw new Error("Error al cargar tips");
      }
      const data = await response.json();
      if (data.success) {
        setTips(data.data);
      } else {
        throw new Error(data.message || "Error al cargar tips");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTips();
  }, []);

  return {
    tips,
    loading,
    error,
    getTips,
  };
};

// Hook para obtener detalle de tips de un usuario
export function useTipsDetalle(usuarioId?: number) {
  const [detalles, setDetalles] = useState<PropinaDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetalles = useCallback(async (id?: number) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tips?tipo=detalle&usuario_id=${id}`);
      if (!response.ok) {
        throw new Error(`Error al cargar detalles: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setDetalles(data.data);
      } else {
        throw new Error(data.message || "Error al cargar detalles");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch cuando cambia el usuarioId
  useEffect(() => {
    if (usuarioId) {
      fetchDetalles(usuarioId);
    }
  }, [usuarioId, fetchDetalles]);

  return {
    detalles,
    loading,
    error,
    fetchDetalles,
    setDetalles,
  };
}

// Hook consolidado que proporciona ambas funcionalidades
export const useTips = () => {
  const [resumen, setResumen] = useState<PropinaResumen[]>([]);
  const [detalles, setDetalles] = useState<PropinaDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getResumen = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tips?tipo=resumen");
      if (!response.ok) {
        throw new Error("Error al cargar resumen de tips");
      }
      const data = await response.json();
      if (data.success) {
        setResumen(data.data);
      } else {
        throw new Error(data.message || "Error al cargar resumen de tips");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const getDetalles = async (usuarioId: number) => {
    if (!usuarioId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tips?tipo=detalle&usuario_id=${usuarioId}`);
      if (!response.ok) {
        throw new Error(`Error al cargar detalles: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setDetalles(data.data);
      } else {
        throw new Error(data.message || "Error al cargar detalles");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const registrarTip = async (ventaId: number, monto: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ venta_id: ventaId, monto }),
      });
      
      if (!response.ok) {
        throw new Error("Error al registrar tip");
      }
      
      const data = await response.json();
      if (data.success) {
        // Recargar el resumen después de registrar
        await getResumen();
        return data;
      } else {
        throw new Error(data.message || "Error al registrar tip");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    resumen,
    detalles,
    loading,
    error,
    getResumen,
    getDetalles,
    registrarTip,
  };
}; 
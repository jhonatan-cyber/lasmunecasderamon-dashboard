import { useState, useEffect } from 'react';

export interface Retiro {
    id_retiro: number;
    id_caja: number;
    monto: number;
    motivo: string;
    usuario_id: number;
    fecha_retiro: string;
    usuario_nombre?: string;
}

export function useRetiros(idCaja: number | null) {
    const [retiros, setRetiros] = useState<Retiro[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!idCaja) {
            setRetiros([]);
            return;
        }

        const fetchRetiros = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/cashregister/retiros?id_caja=${idCaja}`);
                const result = await response.json();

                if (result.success) {
                    setRetiros(result.data || []);
                } else {
                    setError(result.message || 'Error al obtener retiros');
                }
            } catch (err) {
                setError('Error al cargar retiros');
                console.error('Error fetching retiros:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRetiros();
    }, [idCaja]);

    return { retiros, loading, error };
}

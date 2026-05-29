'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import logger from '@/lib/utils/logger';

interface ServicioAnfitrionasContextType {
  anfitrionasActualizadas: Record<number, string>; // servicioId -> anfitrionas_nombres
  actualizarAnfitrionas: (servicioId: number, anfitrionas: string) => void;
  obtenerAnfitrionas: (servicioId: number) => string | null;
}

const ServicioAnfitrionasContext = createContext<ServicioAnfitrionasContextType | undefined>(
  undefined
);

export const useServicioAnfitrionas = () => {
  const context = useContext(ServicioAnfitrionasContext);
  if (!context) {
    throw new Error('useServicioAnfitrionas debe ser usado dentro de ServicioAnfitrionasProvider');
  }
  return context;
};

export const ServicioAnfitrionasProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [anfitrionasActualizadas, setAnfitrionasActualizadas] = useState<Record<number, string>>(
    {}
  );

  const actualizarAnfitrionas = useCallback((servicioId: number, anfitrionas: string) => {
    logger.info('🔄 Actualizando anfitrionas en contexto global', { servicioId, anfitrionas });
    setAnfitrionasActualizadas(prev => {
      const newState = {
        ...prev,
        [servicioId]: anfitrionas
      };
      return newState;
    });
  }, []);

  const obtenerAnfitrionas = useCallback(
    (servicioId: number) => {
      const result = anfitrionasActualizadas[servicioId] || null;
      return result;
    },
    [anfitrionasActualizadas]
  );

  // Memoizar el valor del contexto
  const contextValue = useMemo(
    () => ({
      anfitrionasActualizadas,
      actualizarAnfitrionas,
      obtenerAnfitrionas
    }),
    [anfitrionasActualizadas, actualizarAnfitrionas, obtenerAnfitrionas]
  );

  return (
    <ServicioAnfitrionasContext.Provider value={contextValue}>
      {children}
    </ServicioAnfitrionasContext.Provider>
  );
};

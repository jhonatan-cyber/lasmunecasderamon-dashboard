/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';

export const useSwaggerWarnings = () => {
  useEffect(() => {
    // Guardar las funciones originales
    const originalError = console.error;
    const originalWarn = console.warn;

    // Función para filtrar warnings específicos de Swagger UI
    const filterSwaggerWarnings = (args: any[]) => {
      const message = args[0];
      if (typeof message === 'string') {
        const swaggerWarnings = [
          'UNSAFE_componentWillReceiveProps',
          'ModelCollapse',
          'OperationContainer',
          'componentWillReceiveProps',
          'componentWillUpdate',
          'UNSAFE_',
          'Warning: Using UNSAFE_',
          'Warning: componentWillReceiveProps',
          'Warning: componentWillUpdate'
        ];

        return !swaggerWarnings.some(warning => message.includes(warning));
      }
      return true;
    };

    // Sobrescribir console.error
    console.error = (...args) => {
      if (filterSwaggerWarnings(args)) {
        originalError.apply(console, args);
      }
    };

    // Sobrescribir console.warn
    console.warn = (...args) => {
      if (filterSwaggerWarnings(args)) {
        originalWarn.apply(console, args);
      }
    };

    // Cleanup: restaurar las funciones originales
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []); // Solo ejecutar una vez al montar el componente
};


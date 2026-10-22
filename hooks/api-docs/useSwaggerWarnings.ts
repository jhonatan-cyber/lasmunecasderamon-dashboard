'use client';

import { useEffect } from 'react';

export const useSwaggerWarnings = () => {
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

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

    console.error = (...args) => {
      if (filterSwaggerWarnings(args)) {
        originalError.apply(console, args);
      }
    };

    console.warn = (...args) => {
      if (filterSwaggerWarnings(args)) {
        originalWarn.apply(console, args);
      }
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
};

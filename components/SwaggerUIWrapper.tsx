'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Importar Swagger UI dinámicamente
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <div className="p-8 text-center">Cargando documentación...</div>,
});

// Importar estilos
import 'swagger-ui-react/swagger-ui.css';

interface SwaggerUIWrapperProps {
  url: string;
  options?: any;
}

export default function SwaggerUIWrapper({ url, options = {} }: SwaggerUIWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Suprimir warnings de React Strict Mode para Swagger UI
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args[0];
      if (
        typeof message === 'string' &&
        (message.includes('UNSAFE_componentWillReceiveProps') ||
         message.includes('componentWillReceiveProps') ||
         message.includes('ModelCollapse') ||
         message.includes('OperationContainer'))
      ) {
        return; // Suprimir estos warnings específicos
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  const defaultOptions = {
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 1,
    displayRequestDuration: true,
    displayOperationId: false,
    filter: false, // Deshabilitar filtro para mostrar todos los módulos
    showExtensions: false,
    showCommonExtensions: false,
    tryItOutEnabled: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    validatorUrl: null,
    // Configuración adicional para asegurar que todos los módulos se muestren
    deepLinking: true,
    persistAuthorization: true,
    requestInterceptor: (request: any) => {
      // Agregar token de autenticación si está disponible
      const token = localStorage.getItem('token');
      if (token) {
        request.headers.Authorization = `Bearer ${token}`;
      }
      return request;
    },
    responseInterceptor: (response: any) => {
      // Log de respuestas para debugging
      console.log('API Response:', response);
      return response;
    },
    ...options,
  };

  return (
    <div ref={containerRef}>
      <SwaggerUI url={url} {...defaultOptions} />
    </div>
  );
} 
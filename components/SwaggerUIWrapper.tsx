'use client';

import React, { useEffect, useRef } from 'react';
import SwaggerUI from 'swagger-ui-react';
import { swaggerConfig } from '@/app/api-docs/swagger-config';

interface SwaggerUIWrapperProps {
  url: string;
  className?: string;
}

export const SwaggerUIWrapper: React.FC<SwaggerUIWrapperProps> = ({ 
  url, 
  className = '' 
}) => {
  const swaggerRef = useRef<HTMLDivElement>(null);
  const swaggerProps = swaggerConfig as React.ComponentProps<typeof SwaggerUI>;

  useEffect(() => {
    // Limpiar cualquier instancia previa de Swagger UI
    if (swaggerRef.current) {
      const existingSwagger = swaggerRef.current.querySelector('.swagger-ui');
      if (existingSwagger) {
        existingSwagger.remove();
      }
    }
  }, [url]);

  return (
    <div ref={swaggerRef} className={className}>
      <SwaggerUI
        url={url}
        {...swaggerProps}
      />
    </div>
  );
};


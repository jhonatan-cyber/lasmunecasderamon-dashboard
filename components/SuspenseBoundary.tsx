'use client';

import { Suspense, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

/**
 * Componente que combina Suspense y ErrorBoundary
 * para manejar tanto estados de carga como errores
 */
export function SuspenseBoundary({ 
  children, 
  fallback, 
  errorFallback 
}: SuspenseBoundaryProps) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Wrapper específico para componentes de datos
 */
export function DataBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode; 
  fallback: ReactNode;
}) {
  return (
    <SuspenseBoundary fallback={fallback}>
      {children}
    </SuspenseBoundary>
  );
}

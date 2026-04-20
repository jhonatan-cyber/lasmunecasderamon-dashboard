'use client';

import { Suspense, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

export function SuspenseBoundary({ children, fallback, errorFallback }: SuspenseBoundaryProps) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export function DataBoundary({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  return <SuspenseBoundary fallback={fallback}>{children}</SuspenseBoundary>;
}

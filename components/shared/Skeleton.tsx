'use client';

// Wrapper around boneyard-js Skeleton that makes `children` optional,
// fixing TS2741 errors in loading.tsx files that use this component
// without passing children.
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';

interface SkeletonProps {
  name: string;
  loading: boolean;
  children?: React.ReactNode;
}

export function Skeleton({ name, loading, children }: SkeletonProps) {
  return (
    <BoneyardSkeleton name={name} loading={loading}>
      {children ?? null}
    </BoneyardSkeleton>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface PrefetchLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
  prefetch?: boolean;
  critical?: boolean; // Para rutas críticas que se deben precargar inmediatamente
}

/**
 * Link optimizado con prefetch inteligente
 * - prefetch={true}: Precarga en hover (default de Next.js)
 * - critical={true}: Precarga inmediatamente al montar el componente
 */
export function PrefetchLink({
  href,
  children,
  className,
  onClick,
  title,
  prefetch = true,
  critical = false,
}: PrefetchLinkProps) {
  const router = useRouter();
  const hasPreloaded = useRef(false);

  // Precargar rutas críticas inmediatamente
  useEffect(() => {
    if (critical && !hasPreloaded.current && typeof window !== 'undefined') {
      hasPreloaded.current = true;
      // Usar prefetch del router para precargar la ruta
      router.prefetch(href);
    }
  }, [critical, href, router]);

  return (
    <Link
      href={href}
      className={className}
      onClick={onClick}
      title={title}
      prefetch={prefetch}
    >
      {children}
    </Link>
  );
}

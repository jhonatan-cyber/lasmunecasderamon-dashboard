'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { registerBonesForRoute } from '../../bones/registry';

/**
 * BonesRegistry — registra los skeletons de boneyard-js bajo demanda.
 * Escucha cambios de ruta y carga solo los .bones.json necesarios para la
 * página actual, en lugar de cargar los 15 archivos estáticamente.
 *
 * Debe vivir en un Client Component porque boneyard-js/react usa useRef internamente.
 */
export default function BonesRegistry() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      registerBonesForRoute(pathname)
    }
  }, [pathname])

  return null
}

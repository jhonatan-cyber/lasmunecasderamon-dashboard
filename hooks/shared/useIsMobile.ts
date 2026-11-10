'use client';

import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 639px)';

/** `true` bajo el breakpoint `sm` de Tailwind. Arranca en `false` para no romper la hidratación. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}

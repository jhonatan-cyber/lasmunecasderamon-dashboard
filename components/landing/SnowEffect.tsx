'use client';

import { useEffect, useState } from 'react';

export default function SnowEffect() {
  const [snowCount, setSnowCount] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateSnowCount = () => {
      if (reducedMotion.matches) {
        setSnowCount(0);
        return;
      }
      setSnowCount(media.matches ? 18 : 50);
    };

    updateSnowCount();
    media.addEventListener('change', updateSnowCount);
    reducedMotion.addEventListener('change', updateSnowCount);

    return () => {
      media.removeEventListener('change', updateSnowCount);
      reducedMotion.removeEventListener('change', updateSnowCount);
    };
  }, []);

  if (snowCount === 0) return null;

  return (
    <div aria-hidden='true' className='fixed inset-0 z-0 overflow-hidden pointer-events-none'>
      {[...Array(snowCount)].map((_, i) => {
        const isGold = i % 2 === 0;
        const left = (i * 5.3) % 100;
        const animationDuration = 8 + (i % 6) + ((i * 11) % 20) / 10;
        const animationDelay = ((i * 7) % 60) / 10;
        const size = 2 + ((i * 3) % 15) / 10;
        const opacity = 0.2 + ((i * 4) % 50) / 100;

        return (
          <div
            key={`snow-${i}`}
            className='absolute rounded-full'
            style={{
              left: `${left}%`,
              top: '-20px',
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: isGold ? '#F59E0B' : '#E5E7EB',
              opacity: Number.isFinite(opacity) ? opacity : 0.5,
              animation: `landing-fall ${animationDuration}s linear infinite`,
              animationDelay: `${animationDelay}s`,
              boxShadow: isGold
                ? `0 0 ${size * 2}px rgba(245, 158, 11, 0.4)`
                : `0 0 ${size * 2}px rgba(229, 231, 235, 0.3)`
            }}
          />
        );
      })}
    </div>
  );
}

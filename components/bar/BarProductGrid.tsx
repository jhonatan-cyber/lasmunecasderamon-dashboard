'use client';

import { useEffect, useRef, useState } from 'react';
import { BarCard } from '@/components/bar/BarCard';
import type { BarStockItem } from '@/components/bar/transfer/transferOptions';

/** Columnas independientes: abrir una tarjeta solo desplaza su propia columna. */
export function BarProductGrid({ items }: { items: BarStockItem[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const update = () => {
      const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 16;
      const width = element.getBoundingClientRect().width;
      setColumnCount(Math.max(1, Math.floor((width + gap) / (250 + gap))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={container}
      className='gap-4 sm:gap-5'
      style={{ display: 'flex', alignItems: 'flex-start' }}
    >
      {Array.from({ length: columnCount }, (_, column) => (
        <div
          key={column}
          data-product-column={column}
          className='gap-4 sm:gap-5'
          style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0%', minWidth: 0 }}
        >
          {items.map((item, index) =>
            index % columnCount === column ? (
              <BarCard key={item.id} item={item} entranceIndex={index} />
            ) : null
          )}
        </div>
      ))}
    </div>
  );
}

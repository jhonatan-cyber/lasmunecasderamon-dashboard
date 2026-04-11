/* eslint-disable react-hooks/incompatible-library */
'use client';

import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualGridProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  columns?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  className?: string;
  gap?: number;
}

export function VirtualGrid<T>({
  items,
  estimateSize = 200,
  overscan = 5,
  columns = 3,
  renderItem,
  keyExtractor,
  className = '',
  gap = 4
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowCount = Math.ceil(items.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: index => `row-${index}`
  });

  const gridItems = useMemo(() => {
    const rows: React.ReactNode[] = [];

    virtualizer.getVirtualItems().forEach(virtualRow => {
      const startIndex = virtualRow.index * columns;
      const rowItems = items.slice(startIndex, startIndex + columns);

      rows.push(
        <div
          key={virtualRow.key}
          className={`grid gap-${gap} grid-cols-${columns}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`
          }}
        >
          {rowItems.map((item, idx) => (
            <div key={keyExtractor(item)}>{renderItem(item, startIndex + idx)}</div>
          ))}
        </div>
      );
    });

    return rows;
  }, [virtualizer, items, columns, renderItem, keyExtractor, gap]);

  return (
    <div
      ref={parentRef}
      className={`relative w-full h-full overflow-auto ${className}`}
      style={{ height: '600px' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {gridItems}
      </div>
    </div>
  );
}

interface VirtualListProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  className?: string;
  containerClassName?: string;
}

export function VirtualList<T>({
  items,
  estimateSize = 60,
  overscan = 10,
  renderItem,
  keyExtractor,
  className = '',
  containerClassName = ''
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: index => keyExtractor(items[index])
  });

  return (
    <div ref={parentRef} className={`relative w-full overflow-auto ${containerClassName}`}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={keyExtractor(items[virtualRow.index])}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

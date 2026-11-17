'use client';

import { useState } from 'react';
import { FloorplanTable } from './types';

interface TableProps {
  data: FloorplanTable;
  onClick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

const statusColors: Record<string, string> = {
  available: '#4caf50',
  occupied: '#f44336',
  reserved: '#ff9800'
};

export function Table({ data, onClick, onHover }: TableProps) {
  const [hovered, setHovered] = useState(false);

  const { width, height } = data.dimensions;
  const { x, y } = data.position;
  const tableHeight = 0.15;

  const color = data.status ? statusColors[data.status] || '#8d6e63' : '#8d6e63';

  const handlePointerOver = () => {
    setHovered(true);
    onHover?.(data.id);
  };

  const handlePointerOut = () => {
    setHovered(false);
    onHover?.(null);
  };

  const handleClick = () => {
    onClick?.(data.id);
  };

  if (data.isRound) {
    const radius = Math.min(width, height) / 2;
    return (
      <group position={[x, 0, y]}>
        <mesh
          position={[0, tableHeight / 2, 0]}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <cylinderGeometry args={[radius, radius, tableHeight, 32]} />
          <meshStandardMaterial color={hovered ? '#a1887f' : color} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[x, 0, y]}>
      <mesh
        position={[0, tableHeight / 2, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[width, tableHeight, height]} />
        <meshStandardMaterial color={hovered ? '#a1887f' : color} />
      </mesh>
    </group>
  );
}

export default Table;

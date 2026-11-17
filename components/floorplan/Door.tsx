'use client';

import { useState } from 'react';
import { FloorplanDoor } from './types';

interface DoorProps {
  data: FloorplanDoor;
  onClick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

export function Door({ data, onClick, onHover }: DoorProps) {
  const [hovered, setHovered] = useState(false);

  const { x, y } = data.position;
  const width = data.width || 1;
  const rotation = data.rotation || 0;
  const doorHeight = 0.15;

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

  return (
    <group position={[x, 0, y]} rotation={[0, rotation, 0]}>
      {/* Puerta */}
      <mesh
        position={[0, doorHeight / 2, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[width, doorHeight, 0.08]} />
        <meshStandardMaterial color={hovered ? '#8d6e63' : '#5d4037'} />
      </mesh>

      {/* Marco */}
      <mesh position={[-width / 2, doorHeight / 2, 0]}>
        <boxGeometry args={[0.05, doorHeight, 0.1]} />
        <meshStandardMaterial color='#424242' />
      </mesh>
      <mesh position={[width / 2, doorHeight / 2, 0]}>
        <boxGeometry args={[0.05, doorHeight, 0.1]} />
        <meshStandardMaterial color='#424242' />
      </mesh>
      <mesh position={[0, doorHeight / 2, -width / 2]}>
        <boxGeometry args={[width + 0.1, doorHeight, 0.05]} />
        <meshStandardMaterial color='#424242' />
      </mesh>
    </group>
  );
}

export default Door;

'use client';

import { useState } from 'react';
import { FloorplanChair } from './types';

interface ChairProps {
  data: FloorplanChair;
  onClick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

export function Chair({ data, onClick, onHover }: ChairProps) {
  const [hovered, setHovered] = useState(false);

  const { x, y } = data.position;
  const rotation = data.rotation || 0;
  const chairSize = 0.4;
  const chairHeight = 0.1;

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
      {/* Asiento */}
      <mesh
        position={[0, chairHeight / 2, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[chairSize, chairHeight, chairSize]} />
        <meshStandardMaterial color={hovered ? '#757575' : '#616161'} />
      </mesh>

      {/* Respaldo */}
      <mesh position={[0, chairHeight + 0.15, -chairSize / 2 + 0.05]}>
        <boxGeometry args={[chairSize, 0.3, 0.05]} />
        <meshStandardMaterial color={hovered ? '#757575' : '#616161'} />
      </mesh>

      {/* Patas */}
      <Leg position={[-chairSize / 2 + 0.05, 0, -chairSize / 2 + 0.05]} height={chairHeight} />
      <Leg position={[chairSize / 2 - 0.05, 0, -chairSize / 2 + 0.05]} height={chairHeight} />
      <Leg position={[-chairSize / 2 + 0.05, 0, chairSize / 2 - 0.05]} height={chairHeight} />
      <Leg position={[chairSize / 2 - 0.05, 0, chairSize / 2 - 0.05]} height={chairHeight} />
    </group>
  );
}

function Leg({ position, height }: { position: [number, number, number]; height: number }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.02, 0.02, height, 8]} />
      <meshStandardMaterial color='#424242' />
    </mesh>
  );
}

export default Chair;

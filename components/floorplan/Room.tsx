'use client';

import { useRef, useState } from 'react';
import { Mesh } from 'three';
import { FloorplanRoom, FloorplanStyle } from './types';

interface RoomProps {
  data: FloorplanRoom;
  onClick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

const defaultStyle: FloorplanStyle = {
  fillColor: '#f0f0f0',
  strokeColor: '#333',
  wallColor: '#333',
  wallThickness: 0.2,
  opacity: 0.8
};

export function Room({ data, onClick, onHover }: RoomProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const style = { ...defaultStyle, ...data.style };
  const { width, height } = data.dimensions;
  const { x, y } = data.position;

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
    <group position={[x, 0, y]}>
      <mesh
        ref={meshRef}
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color={hovered ? '#e0e0e0' : style.fillColor || '#f0f0f0'}
          opacity={style.opacity ?? 0.8}
          transparent
        />
      </mesh>

      {/* Paredes */}
      <WallSegment
        start={[-width / 2, 0, -height / 2]}
        end={[width / 2, 0, -height / 2]}
        style={style}
      />
      <WallSegment
        start={[width / 2, 0, -height / 2]}
        end={[width / 2, 0, height / 2]}
        style={style}
      />
      <WallSegment
        start={[width / 2, 0, height / 2]}
        end={[-width / 2, 0, height / 2]}
        style={style}
      />
      <WallSegment
        start={[-width / 2, 0, height / 2]}
        end={[-width / 2, 0, -height / 2]}
        style={style}
      />
    </group>
  );
}

function WallSegment({
  start,
  end,
  style
}: {
  start: [number, number, number];
  end: [number, number, number];
  style: FloorplanStyle;
}) {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    0.1,
    (start[2] + end[2]) / 2
  ];
  const rotation = Math.atan2(dx, dz);

  const thickness = style.wallThickness || 0.2;
  const wallHeight = 0.2;

  return (
    <mesh position={midpoint} rotation={[0, rotation, 0]}>
      <boxGeometry args={[thickness, wallHeight, length]} />
      <meshStandardMaterial color={style.wallColor || '#333'} />
    </mesh>
  );
}

export default Room;

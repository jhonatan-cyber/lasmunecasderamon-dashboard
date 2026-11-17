'use client';

import { Text } from '@react-three/drei';
import { FloorplanLabel } from './types';

interface LabelProps {
  data: FloorplanLabel;
}

export function Label({ data }: LabelProps) {
  const { text } = data;
  const { x, y } = data.position;
  const style = data.style || {};
  const fontSize = style.fontSize || 0.3;
  const color = style.color || '#333';
  const backgroundColor = style.backgroundColor || 'transparent';

  return (
    <group position={[x, 0.5, y]}>
      {backgroundColor !== 'transparent' && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[text.length * fontSize * 0.6, fontSize * 1.4]} />
          <meshBasicMaterial color={backgroundColor} opacity={0.8} transparent />
        </mesh>
      )}
      <Text
        position={[0, 0, 0]}
        fontSize={fontSize}
        color={color}
        anchorX='center'
        anchorY='middle'
        outlineWidth={0.02}
        outlineColor='#ffffff'
      >
        {text}
      </Text>
    </group>
  );
}

export default Label;

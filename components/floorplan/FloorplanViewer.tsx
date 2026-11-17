'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { FloorplanConfig, FloorplanElement } from './types';
import { Room } from './Room';
import { Table } from './Table';
import { Chair } from './Chair';
import { Door } from './Door';
import { Label } from './Label';

interface FloorplanViewerProps {
  config: FloorplanConfig;
}

function ElementRenderer({
  element,
  config
}: {
  element: FloorplanElement;
  config: FloorplanConfig;
}) {
  const handleClick = (id: string) => {
    config.onElementClick?.(element);
  };

  const handleHover = (id: string | null) => {
    if (id) {
      config.onElementHover?.(element);
    } else {
      config.onElementHover?.(null);
    }
  };

  switch (element.type) {
    case 'room':
      return <Room data={element.data} onClick={handleClick} onHover={handleHover} />;
    case 'table':
      return <Table data={element.data} onClick={handleClick} onHover={handleHover} />;
    case 'chair':
      return <Chair data={element.data} onClick={handleClick} onHover={handleHover} />;
    case 'door':
      return <Door data={element.data} onClick={handleClick} onHover={handleHover} />;
    case 'label':
      return <Label data={element.data} />;
    default:
      return null;
  }
}

export function FloorplanViewer({ config }: FloorplanViewerProps) {
  const cameraPosition = config.camera?.position || [0, 15, 15];
  const ambientIntensity = config.lights?.ambientIntensity ?? 0.6;
  const directionalIntensity = config.lights?.directionalIntensity ?? 0.8;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: cameraPosition, fov: 50, near: 0.1, far: 1000 }}
        style={{ background: '#fafafa' }}
      >
        {/* Iluminación */}
        <ambientLight intensity={ambientIntensity} />
        <directionalLight position={[10, 10, 5]} intensity={directionalIntensity} castShadow />
        <hemisphereLight args={['#ffffff', '#444444', 0.4]} />

        {/* Grid de referencia */}
        <Grid
          infiniteGrid
          fadeDistance={50}
          fadeStrength={5}
          cellSize={1}
          cellThickness={0.5}
          sectionSize={5}
          sectionThickness={1}
          sectionColor='#aaaaaa'
          cellColor='#cccccc'
        />

        {/* Elementos del plano */}
        <group>
          {config.elements.map((element, index) => (
            <ElementRenderer
              key={`${element.type}-${element.data.id}-${index}`}
              element={element}
              config={config}
            />
          ))}
        </group>

        {/* Controles de cámara */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2 - 0.1}
          minZoom={0.5}
          maxZoom={5}
        />
      </Canvas>
    </div>
  );
}

export default FloorplanViewer;

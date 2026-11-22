'use client';

import { useState } from 'react';
import { FloorplanViewer, FloorplanConfig } from '@/components/floorplan';

// Datos de ejemplo: plano de un club nocturno
const sampleConfig: FloorplanConfig = {
  elements: [
    // Zona principal - Pista de baile
    {
      type: 'room',
      data: {
        id: 'pista-baile',
        name: 'Pista de Baile',
        position: { x: 0, y: 0 },
        dimensions: { width: 14, height: 12 },
        style: {
          fillColor: '#1a1a2e',
          wallColor: '#e91e63',
          wallThickness: 0.3
        }
      }
    },
    // Habitación VIP 1
    {
      type: 'room',
      data: {
        id: 'vip-1',
        name: 'VIP 1',
        position: { x: -10, y: -3 },
        dimensions: { width: 5, height: 5 },
        style: {
          fillColor: '#2e1a1a',
          wallColor: '#ffd740',
          wallThickness: 0.3
        }
      }
    },
    // Habitación VIP 2
    {
      type: 'room',
      data: {
        id: 'vip-2',
        name: 'VIP 2',
        position: { x: -10, y: 4 },
        dimensions: { width: 5, height: 5 },
        style: {
          fillColor: '#2e1a1a',
          wallColor: '#ffd740',
          wallThickness: 0.3
        }
      }
    },
    // Habitación VIP 3
    {
      type: 'room',
      data: {
        id: 'vip-3',
        name: 'VIP 3',
        position: { x: 10, y: -3 },
        dimensions: { width: 5, height: 5 },
        style: {
          fillColor: '#2e1a1a',
          wallColor: '#ffd740',
          wallThickness: 0.3
        }
      }
    },
    // Barra de DJ
    {
      type: 'room',
      data: {
        id: 'dj-booth',
        name: 'DJ Booth',
        position: { x: 0, y: -8 },
        dimensions: { width: 6, height: 3 },
        style: {
          fillColor: '#0d0d0d',
          wallColor: '#9c27b0',
          wallThickness: 0.3
        }
      }
    },
    // Barra principal
    {
      type: 'room',
      data: {
        id: 'barra-principal',
        name: 'Barra Principal',
        position: { x: 10, y: 4 },
        dimensions: { width: 5, height: 6 },
        style: {
          fillColor: '#1a2e1a',
          wallColor: '#4caf50',
          wallThickness: 0.3
        }
      }
    },
    // Baños
    {
      type: 'room',
      data: {
        id: 'banos',
        name: 'Baños',
        position: { x: 10, y: -8 },
        dimensions: { width: 4, height: 4 },
        style: {
          fillColor: '#1a1a2e',
          wallColor: '#7b1fa2',
          wallThickness: 0.3
        }
      }
    },
    // Mesas en VIP 1 - Botella Service
    {
      type: 'table',
      data: {
        id: 'vip1-mesa-1',
        name: 'VIP 1 - Mesa 1',
        position: { x: -10, y: -3 },
        dimensions: { width: 1.5, height: 1 },
        isRound: false,
        status: 'available'
      }
    },
    // Mesas en VIP 2 - Botella Service
    {
      type: 'table',
      data: {
        id: 'vip2-mesa-1',
        name: 'VIP 2 - Mesa 1',
        position: { x: -10, y: 4 },
        dimensions: { width: 1.5, height: 1 },
        isRound: false,
        status: 'occupied'
      }
    },
    // Mesas en VIP 3 - Botella Service
    {
      type: 'table',
      data: {
        id: 'vip3-mesa-1',
        name: 'VIP 3 - Mesa 1',
        position: { x: 10, y: -3 },
        dimensions: { width: 1.2, height: 1.2 },
        isRound: true,
        status: 'reserved'
      }
    },
    // Mesas en pista de baile
    {
      type: 'table',
      data: {
        id: 'pista-mesa-1',
        name: 'Pista - Mesa 1',
        position: { x: -4, y: -2 },
        dimensions: { width: 1.5, height: 1 },
        isRound: false,
        status: 'available'
      }
    },
    {
      type: 'table',
      data: {
        id: 'pista-mesa-2',
        name: 'Pista - Mesa 2',
        position: { x: 4, y: -2 },
        dimensions: { width: 1.5, height: 1 },
        isRound: false,
        status: 'occupied'
      }
    },
    {
      type: 'table',
      data: {
        id: 'pista-mesa-3',
        name: 'Pista - Mesa 3',
        position: { x: 0, y: 3 },
        dimensions: { width: 1.5, height: 1 },
        isRound: false,
        status: 'available'
      }
    },
    // Sillas en VIP 1
    {
      type: 'chair',
      data: { id: 'vip1-chair-1', position: { x: -11, y: -3.8 }, rotation: 0 }
    },
    {
      type: 'chair',
      data: { id: 'vip1-chair-2', position: { x: -9, y: -3.8 }, rotation: Math.PI }
    },
    {
      type: 'chair',
      data: { id: 'vip1-chair-3', position: { x: -11, y: -2.2 }, rotation: Math.PI / 2 }
    },
    {
      type: 'chair',
      data: { id: 'vip1-chair-4', position: { x: -9, y: -2.2 }, rotation: -Math.PI / 2 }
    },
    // Sillas en VIP 2
    {
      type: 'chair',
      data: { id: 'vip2-chair-1', position: { x: -11, y: 3.2 }, rotation: 0 }
    },
    {
      type: 'chair',
      data: { id: 'vip2-chair-2', position: { x: -9, y: 3.2 }, rotation: Math.PI }
    },
    {
      type: 'chair',
      data: { id: 'vip2-chair-3', position: { x: -11, y: 4.8 }, rotation: Math.PI / 2 }
    },
    {
      type: 'chair',
      data: { id: 'vip2-chair-4', position: { x: -9, y: 4.8 }, rotation: -Math.PI / 2 }
    },
    // Sillas en VIP 3
    {
      type: 'chair',
      data: { id: 'vip3-chair-1', position: { x: 9, y: -3.8 }, rotation: 0 }
    },
    {
      type: 'chair',
      data: { id: 'vip3-chair-2', position: { x: 11, y: -3.8 }, rotation: Math.PI }
    },
    // Sillas en pista
    {
      type: 'chair',
      data: { id: 'pista-chair-1', position: { x: -4, y: -3.2 }, rotation: 0 }
    },
    {
      type: 'chair',
      data: { id: 'pista-chair-2', position: { x: -4, y: -0.8 }, rotation: Math.PI }
    },
    {
      type: 'chair',
      data: { id: 'pista-chair-3', position: { x: 4, y: -3.2 }, rotation: 0 }
    },
    {
      type: 'chair',
      data: { id: 'pista-chair-4', position: { x: 4, y: -0.8 }, rotation: Math.PI }
    },
    {
      type: 'chair',
      data: { id: 'pista-chair-5', position: { x: 0, y: 1.8 }, rotation: Math.PI / 2 }
    },
    {
      type: 'chair',
      data: { id: 'pista-chair-6', position: { x: 0, y: 4.2 }, rotation: -Math.PI / 2 }
    },
    // Puertas
    {
      type: 'door',
      data: {
        id: 'entrada-principal',
        position: { x: 0, y: -9 },
        width: 2,
        rotation: 0
      }
    },
    {
      type: 'door',
      data: {
        id: 'puerta-vip-1',
        position: { x: -7.5, y: -3 },
        width: 1.2,
        rotation: Math.PI / 2
      }
    },
    {
      type: 'door',
      data: {
        id: 'puerta-vip-2',
        position: { x: -7.5, y: 4 },
        width: 1.2,
        rotation: Math.PI / 2
      }
    },
    {
      type: 'door',
      data: {
        id: 'puerta-vip-3',
        position: { x: 7.5, y: -3 },
        width: 1.2,
        rotation: Math.PI / 2
      }
    },
    {
      type: 'door',
      data: {
        id: 'puerta-banos',
        position: { x: 10, y: -6 },
        width: 1,
        rotation: 0
      }
    },
    // Etiquetas
    {
      type: 'label',
      data: {
        id: 'label-pista',
        text: 'Pista de Baile',
        position: { x: 0, y: 0, z: 0.5 },
        style: {
          fontSize: 0.6,
          color: '#e91e63',
          backgroundColor: 'transparent'
        }
      }
    },
    {
      type: 'label',
      data: {
        id: 'label-vip1',
        text: 'VIP 1',
        position: { x: -10, y: -3, z: 0.5 },
        style: {
          fontSize: 0.4,
          color: '#ffd740',
          backgroundColor: 'transparent'
        }
      }
    },
    {
      type: 'label',
      data: {
        id: 'label-vip2',
        text: 'VIP 2',
        position: { x: -10, y: 4, z: 0.5 },
        style: {
          fontSize: 0.4,
          color: '#ffd740',
          backgroundColor: 'transparent'
        }
      }
    },
    {
      type: 'label',
      data: {
        id: 'label-vip3',
        text: 'VIP 3',
        position: { x: 10, y: -3, z: 0.5 },
        style: {
          fontSize: 0.4,
          color: '#ffd740',
          backgroundColor: 'transparent'
        }
      }
    },
    {
      type: 'label',
      data: {
        id: 'label-dj',
        text: 'DJ Booth',
        position: { x: 0, y: -8, z: 0.5 },
        style: {
          fontSize: 0.4,
          color: '#9c27b0',
          backgroundColor: 'transparent'
        }
      }
    },
    {
      type: 'label',
      data: {
        id: 'label-barra',
        text: 'Barra Principal',
        position: { x: 10, y: 4, z: 0.5 },
        style: {
          fontSize: 0.4,
          color: '#4caf50',
          backgroundColor: 'transparent'
        }
      }
    },
    {
      type: 'label',
      data: {
        id: 'label-banos',
        text: 'Baños',
        position: { x: 10, y: -8, z: 0.5 },
        style: {
          fontSize: 0.4,
          color: '#7b1fa2',
          backgroundColor: 'transparent'
        }
      }
    }
  ],
  camera: {
    position: [0, 22, 22],
    zoom: 0.8
  },
  lights: {
    ambientIntensity: 0.5,
    directionalIntensity: 0.7
  },
  onElementClick: element => {
    console.warn('Elemento clickeado:', element);
  },
  onElementHover: element => {
    if (element) {
      console.warn('Elemento en hover:', element);
    }
  }
};

export default function FloorplanTestPage() {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const configWithSelection: FloorplanConfig = {
    ...sampleConfig,
    onElementClick: element => {
      setSelectedElement(element.data.id);
      sampleConfig.onElementClick?.(element);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          background: '#1a237e',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Plano de Pisos - Prueba</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem' }}>
            Elemento seleccionado: {selectedElement || 'Ninguno'}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#4caf50'
              }}
              title='Disponible'
            />
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#f44336'
              }}
              title='Ocupado'
            />
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#ff9800'
              }}
              title='Reservado'
            />
          </div>
        </div>
      </div>

      {/* Canvas del plano */}
      <div style={{ flex: 1, position: 'relative' }}>
        <FloorplanViewer config={configWithSelection} />
      </div>

      {/* Instrucciones */}
      <div
        style={{
          padding: '12px 24px',
          background: '#f5f5f5',
          borderTop: '1px solid #e0e0e0',
          fontSize: '0.85rem',
          color: '#666'
        }}
      >
        <strong>Instrucciones:</strong> Arrastra para rotar · Scroll para zoom · Clic derecho para
        mover · Clic en un elemento para seleccionarlo
      </div>
    </div>
  );
}

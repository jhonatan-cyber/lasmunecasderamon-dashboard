export interface FloorplanPosition {
  x: number;
  y: number;
  z?: number;
}

export interface FloorplanDimensions {
  width: number;
  height: number;
  depth?: number;
}

export interface FloorplanStyle {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  wallColor?: string;
  wallThickness?: number;
  opacity?: number;
}

export interface FloorplanRoom {
  id: string;
  name: string;
  position: FloorplanPosition;
  dimensions: FloorplanDimensions;
  style?: FloorplanStyle;
  children?: FloorplanElement[];
}

export interface FloorplanTable {
  id: string;
  name?: string;
  position: FloorplanPosition;
  dimensions: FloorplanDimensions;
  style?: FloorplanStyle;
  isRound?: boolean;
  status?: 'available' | 'occupied' | 'reserved';
}

export interface FloorplanChair {
  id: string;
  position: FloorplanPosition;
  rotation?: number;
  style?: FloorplanStyle;
}

export interface FloorplanWall {
  id: string;
  start: FloorplanPosition;
  end: FloorplanPosition;
  style?: FloorplanStyle;
}

export interface FloorplanDoor {
  id: string;
  position: FloorplanPosition;
  width?: number;
  rotation?: number;
  style?: FloorplanStyle;
}

export interface FloorplanLabel {
  id: string;
  text: string;
  position: FloorplanPosition;
  style?: {
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
  };
}

export type FloorplanElement =
  | { type: 'room'; data: FloorplanRoom }
  | { type: 'table'; data: FloorplanTable }
  | { type: 'chair'; data: FloorplanChair }
  | { type: 'wall'; data: FloorplanWall }
  | { type: 'door'; data: FloorplanDoor }
  | { type: 'label'; data: FloorplanLabel };

export interface FloorplanConfig {
  elements: FloorplanElement[];
  camera?: {
    position?: [number, number, number];
    zoom?: number;
    fov?: number;
  };
  lights?: {
    ambientIntensity?: number;
    directionalIntensity?: number;
  };
  onElementClick?: (element: FloorplanElement) => void;
  onElementHover?: (element: FloorplanElement | null) => void;
}

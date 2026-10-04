export type BiometricMetodo = 'huella' | 'cara' | 'tarjeta' | 'clave' | 'otro';
export interface BiometricEvent {
  codigo: string;
  fechaDispositivo: string | null;
  metodo: BiometricMetodo;
  raw: string;
  recordId?: string;
}

export type BiometricMarca = 'zkteco' | 'dahua';

export interface BiometricDevice {
  id: string;
  nombre: string;
  marca: BiometricMarca;
  serial: string;
}

export type BiometricResultado =
  'registrado' | 'duplicado' | 'fuera_ventana' | 'sin_usuario' | 'usuario_inactivo';

/** Modalidad con la que la persona se verificó en el equipo. */
export type BiometricMetodo = 'huella' | 'cara' | 'tarjeta' | 'clave' | 'otro';

/** Evento normalizado: lo que producen los adapters y consume el registro de asistencia. */
export interface BiometricEvent {
  /** Código de la persona en el equipo (PIN / UserID). */
  codigo: string;
  /** Hora local reportada por el equipo (`YYYY-MM-DD HH:mm:ss`) si el protocolo la trae. */
  fechaDispositivo: string | null;
  metodo: BiometricMetodo;
  /** Fila cruda original, para la auditoría. */
  raw: string;
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

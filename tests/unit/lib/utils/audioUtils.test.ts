import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Oscilador simulado con las llamadas que le hace el módulo. */
interface OsciladorFalso {
  type: string;
  frequency: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

class AudioContextFalso {
  static creados: AudioContextFalso[] = [];

  state = 'suspended';
  currentTime = 5;
  destination = { nodo: 'salida' };
  osciladores: OsciladorFalso[] = [];
  resume = vi.fn(async () => {
    this.state = 'running';
  });

  constructor() {
    AudioContextFalso.creados.push(this);
  }

  createOscillator(): OsciladorFalso {
    const oscilador: OsciladorFalso = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };
    this.osciladores.push(oscilador);
    return oscilador;
  }

  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn()
    };
  }
}

/** Cada prueba carga el módulo de cero: guarda un único contexto de audio. */
const cargarAudioUtils = async () => {
  vi.resetModules();
  return await import('@/lib/utils/audioUtils');
};

const instalarAudioContext = () => {
  (window as unknown as { AudioContext: unknown }).AudioContext = AudioContextFalso;
};

describe('aviso sonoro del escaneo de envases', () => {
  beforeEach(() => {
    AudioContextFalso.creados = [];
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  afterEach(() => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  it('sin Web Audio no rompe: el control sigue funcionando en silencio', async () => {
    const { playScanSound, prepareScanSound } = await cargarAudioUtils();

    expect(() => playScanSound('aceptado')).not.toThrow();
    expect(() => prepareScanSound()).not.toThrow();
  });

  it('los tres casos suenan distinto: aceptado, rechazado y en cola', async () => {
    instalarAudioContext();
    const { playScanSound } = await cargarAudioUtils();

    playScanSound('aceptado');
    playScanSound('rechazado');
    playScanSound('cola');

    const [contexto] = AudioContextFalso.creados;
    expect(contexto.osciladores).toHaveLength(3);
    const [aceptado, rechazado, cola] = contexto.osciladores;

    // Aceptado: seno agudo y corto, sin caída.
    expect(aceptado.type).toBe('sine');
    expect(aceptado.frequency.setValueAtTime).toHaveBeenCalledWith(1180, 5);
    expect(aceptado.frequency.exponentialRampToValueAtTime).not.toHaveBeenCalled();
    expect(aceptado.stop).toHaveBeenCalledWith(expect.closeTo(5.18, 6));

    // Rechazado: cuadrada grave que baja de frecuencia y dura más.
    expect(rechazado.type).toBe('square');
    expect(rechazado.frequency.setValueAtTime).toHaveBeenCalledWith(240, 5);
    expect(rechazado.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(150, 5.28);
    expect(rechazado.stop).toHaveBeenCalledWith(expect.closeTo(5.32, 6));

    // En cola: tono medio con dos pulsos, sin subir ni bajar.
    expect(cola.type).toBe('triangle');
    expect(cola.frequency.setValueAtTime).toHaveBeenCalledWith(700, 5);
    expect(cola.frequency.exponentialRampToValueAtTime).not.toHaveBeenCalled();
    expect(cola.stop).toHaveBeenCalledWith(expect.closeTo(5.22, 6));

    // Ninguno de los tres comparte su configuración con los otros.
    expect(new Set([aceptado.type, rechazado.type, cola.type]).size).toBe(3);
    expect(
      new Set([aceptado, rechazado, cola].map(o => o.frequency.setValueAtTime.mock.calls[0][0]))
        .size
    ).toBe(3);
  });

  it('reutiliza el mismo contexto y lo reanuda en el gesto del usuario', async () => {
    instalarAudioContext();
    const { playScanSound, prepareScanSound } = await cargarAudioUtils();

    prepareScanSound();
    playScanSound('aceptado');
    playScanSound('rechazado');
    playScanSound('cola');

    expect(AudioContextFalso.creados).toHaveLength(1);
    const [contexto] = AudioContextFalso.creados;
    expect(contexto.resume).toHaveBeenCalled();
    expect(contexto.osciladores).toHaveLength(3);
  });
});

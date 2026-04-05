import { signal, batch } from '@preact/signals-react';
import { calculateRemainingTime } from '../utils/timeUtils';

export interface TimerData {
  id: string;
  servicioId: string;
  roomId: string;
  roomName: string;
  duration: number; // en minutos
  startTime: Date;
  servicioCode: string;
  clienteNombre: string;
  isActive: boolean;
  isPaused: boolean;
  isTemporary?: boolean;
  tipoTransaccion?: 'servicio' | 'venta' | 'cuenta';
  anfitrionas?: string;
  onExpire?: (instance: TimerInstance) => void;
}

/**
 * Instancia de un Timer que utiliza Signals para reactividad atómica.
 * Todas las propiedades mutables son Signals para evitar recrear la instancia.
 */
export class TimerInstance {
  readonly id: string;
  readonly servicioId: string;
  readonly isTemporary: boolean;

  // Signals para todas las propiedades que pueden cambiar
  readonly roomId = signal('');
  readonly roomName = signal('');
  readonly servicioCode = signal('');
  readonly clienteNombre = signal('');
  readonly duration = signal(0);
  readonly startTime = signal(new Date());
  readonly tipoTransaccion = signal<'servicio' | 'venta' | 'cuenta'>('servicio');
  readonly anfitrionas = signal('');
  readonly onExpire: ((instance: TimerInstance) => void) | undefined;

  // Signals para valores de estado y tiempo
  readonly remainingSeconds = signal(0);
  readonly isActive = signal(false);
  readonly isPaused = signal(false);

  constructor(data: TimerData, initialSeconds: number) {
    this.id = data.id;
    this.servicioId = data.servicioId;
    this.isTemporary = !!data.isTemporary;

    this.onExpire = data.onExpire;

    batch(() => {
      this.roomId.value = data.roomId;
      this.roomName.value = data.roomName;
      this.servicioCode.value = data.servicioCode;
      this.clienteNombre.value = data.clienteNombre;
      this.duration.value = data.duration;
      this.startTime.value = data.startTime;
      this.tipoTransaccion.value = data.tipoTransaccion || 'servicio';
      this.anfitrionas.value = data.anfitrionas || '';

      this.remainingSeconds.value = initialSeconds;
      this.isActive.value = data.isActive && initialSeconds > 0;
      this.isPaused.value = data.isPaused;
    });
  }

  /**
   * Actualiza el tiempo restante basado en el offset del servidor.
   */
  update(serverOffset: number) {
    if (this.isPaused.value || !this.isActive.value) return;

    const now = new Date(Date.now() + serverOffset);
    const start = this.startTime.peek();

    // Calculamos la vida útil real en el cliente.
    // Si el timer acaba de ser creado o sincronizado, lifeSpanSeconds será pequeño.
    const lifeSpanSeconds = Math.floor((Date.now() - start.getTime()) / 1000);

    // Usamos el helper centralizado para consistencia
    const remaining = calculateRemainingTime(
      {
        startTime: start,
        duration: this.duration.peek(),
        isPaused: this.isPaused.value,
        remainingTime: this.remainingSeconds.peek()
      },
      serverOffset
    );

    // Si el cálculo da 0 o menos
    if (remaining <= 0) {
      // CRÍTICO: Solo protegemos timers muy nuevos (menos de 15s de vida)
      // que no deberían expirar aún por error de sincronización.
      // Si ya ha corrido por más de 15s, simplemente expiramos.
      const isVeryNew = lifeSpanSeconds <= 15;
      const hasValidDuration = this.duration.peek() > 0;

      if (!isVeryNew || !hasValidDuration) {
        // Timer ya tiene suficiente vida o no tiene duración válida -> EXPIRAR
        console.warn(
          `[TimerInstance] EXPIRACIÓN id:${this.id} (${this.roomName.peek()}) - lifeSpan:${lifeSpanSeconds}s, dur:${this.duration.peek()}m, remaining:${remaining}s, offset:${serverOffset}ms`
        );

        // Atómicamente marcamos como 0 e inactivo para que el evento se dispare una sola vez
        batch(() => {
          this.remainingSeconds.value = 0;
          this.isActive.value = false;
        });

        // SOLO dispara si realmente expiró
        if (this.onExpire) this.onExpire(this);
        if (globalOnExpire) globalOnExpire(this);
      } else {
        // Timer muy nuevo que dice expirar -> PROTEGER
        // Esto es solo para cuando se acaba de crear/sincronizar y el offset del servidor aún no se estabiliza
        const originalSeconds = this.duration.peek() * 60;
        if (this.remainingSeconds.peek() !== originalSeconds && originalSeconds > 0) {
          console.log(
            `[TimerInstance] Protegiendo timer NUEVO id:${this.id} (${this.roomName.peek()}) - restoring to ${originalSeconds}s. Calculado: ${remaining}s`
          );
          this.remainingSeconds.value = originalSeconds;
        }
      }
    } else {
      // SOLO actualizamos si es distinto para evitar ciclos reactivos innecesarios.
      if (this.remainingSeconds.peek() !== remaining) {
        this.remainingSeconds.value = remaining;
      }
    }
  }

  /**
   * Actualización parcial de datos sin recrear la instancia.
   */
  patch(data: Partial<TimerData>) {
    batch(() => {
      if (data.roomId !== undefined) this.roomId.value = data.roomId;
      if (data.roomName !== undefined) this.roomName.value = data.roomName;
      if (data.servicioCode !== undefined) this.servicioCode.value = data.servicioCode;
      if (data.clienteNombre !== undefined) this.clienteNombre.value = data.clienteNombre;
      if (data.duration !== undefined) this.duration.value = data.duration;
      if (data.startTime !== undefined) this.startTime.value = data.startTime;
      if (data.tipoTransaccion !== undefined) this.tipoTransaccion.value = data.tipoTransaccion;
      if (data.anfitrionas !== undefined) this.anfitrionas.value = data.anfitrionas;
      if (data.isActive !== undefined) this.isActive.value = data.isActive;
      if (data.isPaused !== undefined) this.isPaused.value = data.isPaused;
    });
  }

  /**
   * Representación plana para compatibilidad con lógica antigua.
   */
  toPlainObject(): TimerData & { remainingTime: number } {
    return {
      id: this.id,
      servicioId: this.servicioId,
      roomId: this.roomId.peek(),
      roomName: this.roomName.peek(),
      duration: this.duration.peek(),
      startTime: this.startTime.peek(),
      servicioCode: this.servicioCode.peek(),
      clienteNombre: this.clienteNombre.peek(),
      isActive: this.isActive.peek(),
      isPaused: this.isPaused.peek(),
      remainingTime: this.remainingSeconds.peek(),
      isTemporary: this.isTemporary,
      tipoTransaccion: this.tipoTransaccion.peek(),
      anfitrionas: this.anfitrionas.peek()
    };
  }
}

// Callback global para que el UI (Context) se entere cuando algo expira
let globalOnExpire: ((t: TimerInstance) => void) | null = null;
export const setGlobalExpirationHandler = (cb: (t: TimerInstance) => void) => {
  globalOnExpire = cb;
};

// Store Global reactivo
export const activeTimers = signal<TimerInstance[]>([]);
export const serverOffsetSignal = signal(0);

// Un solo loop central para todos los timers del sistema
let tickInterval: NodeJS.Timeout | null = null;
let tickCount = 0;

export const startGlobalTimerLoop = () => {
  if (tickInterval) return;

  console.log('[timerStore] Starting global timer loop');
  
  tickInterval = setInterval(() => {
    tickCount++;
    const currentOffset = serverOffsetSignal.peek();
    const timers = activeTimers.peek();

    // Debug cada 10 ticks (cada 10 segundos)
    if (tickCount % 10 === 0) {
      console.log('[timerStore] Tick', tickCount, 'timers:', timers.length, 'offset:', currentOffset);
      timers.forEach(t => {
        console.log('  -', t.servicioId, 'remaining:', t.remainingSeconds.peek(), 'active:', t.isActive.peek());
      });
    }

    batch(() => {
      timers.forEach(t => t.update(currentOffset));
    });
  }, 1000);
};

export const stopGlobalTimerLoop = () => {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
};

/**
 * HELPER: Sincroniza el array de timers con el store de signals.
 */
export const syncTimersWithSignals = (plainTimers: any[]) => {
  batch(() => {
    const currentMap = new Map(activeTimers.peek().map(t => [t.servicioId, t]));
    const newList: TimerInstance[] = [];

    plainTimers.forEach(pt => {
      let instance = currentMap.get(pt.servicioId);

      if (!instance) {
        const initialRem =
          pt.remainingTime ?? calculateRemainingTime(pt, serverOffsetSignal.peek());
        instance = new TimerInstance(pt, initialRem);
      } else {
        // Actualizar datos atómicamente si vienen de afuera (ej. SSE)
        instance.patch(pt);
      }

      newList.push(instance);
    });

    activeTimers.value = newList;
  });
};

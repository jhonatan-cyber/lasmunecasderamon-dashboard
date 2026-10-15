import { signal, batch } from '@preact/signals-react';
import { calculateRemainingTime } from '../utils/timeUtils';

export interface TimerData {
  id: string;
  servicioId: string;
  roomId: string;
  roomName: string;
  duration: number;
  startTime: Date;
  expiresAt?: string;
  servicioCode: string;
  clienteNombre: string;
  isActive: boolean;
  isPaused: boolean;
  isTemporary?: boolean;
  datosTemporales?: any;
  tipoTransaccion?: 'servicio' | 'venta' | 'cuenta';
  anfitrionas?: string;
  onExpire?: (instance: TimerInstance) => void;
}

export class TimerInstance {
  readonly id: string;
  readonly servicioId: string;
  readonly isTemporary: boolean;
  readonly roomId = signal('');
  readonly roomName = signal('');
  readonly servicioCode = signal('');
  readonly clienteNombre = signal('');
  readonly duration = signal(0);
  readonly startTime = signal(new Date());
  readonly expiresAt = signal<string | undefined>(undefined);
  readonly tipoTransaccion = signal<'servicio' | 'venta' | 'cuenta'>('servicio');
  readonly anfitrionas = signal('');
  readonly datosTemporales = signal<any>(undefined);
  onExpire: ((instance: TimerInstance) => void) | undefined;
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
      this.expiresAt.value = data.expiresAt;
      this.tipoTransaccion.value = data.tipoTransaccion || 'servicio';
      this.anfitrionas.value = data.anfitrionas || '';
      this.datosTemporales.value = data.datosTemporales;

      this.remainingSeconds.value = initialSeconds;
      this.isActive.value = data.isActive && initialSeconds > 0;
      this.isPaused.value = data.isPaused;
    });
  }

  update(serverOffset: number) {
    if (this.isPaused.value || !this.isActive.value) return;

    const remaining = calculateRemainingTime(
      {
        startTime: this.startTime.peek(),
        expiresAt: this.expiresAt.peek(),
        duration: this.duration.peek(),
        isPaused: this.isPaused.value,
        remainingTime: this.remainingSeconds.peek()
      },
      serverOffset
    );

    if (remaining <= 0) {
      batch(() => {
        this.remainingSeconds.value = 0;
        this.isActive.value = false;
      });
      if (this.onExpire) this.onExpire(this);
      if (globalOnExpire) globalOnExpire(this);
    } else {
      if (this.remainingSeconds.peek() !== remaining) {
        this.remainingSeconds.value = remaining;
      }
    }
  }

  patch(data: Partial<TimerData>) {
    batch(() => {
      if (data.roomId !== undefined) this.roomId.value = data.roomId;
      if (data.roomName !== undefined) this.roomName.value = data.roomName;
      if (data.servicioCode !== undefined) this.servicioCode.value = data.servicioCode;
      if (data.clienteNombre !== undefined) this.clienteNombre.value = data.clienteNombre;
      if (data.duration !== undefined) this.duration.value = data.duration;
      if (data.startTime !== undefined) this.startTime.value = data.startTime;
      if (data.expiresAt !== undefined) this.expiresAt.value = data.expiresAt;
      if (data.tipoTransaccion !== undefined) this.tipoTransaccion.value = data.tipoTransaccion;
      if (data.anfitrionas !== undefined) this.anfitrionas.value = data.anfitrionas;
      if (data.datosTemporales !== undefined) this.datosTemporales.value = data.datosTemporales;
      if (data.isActive !== undefined) this.isActive.value = data.isActive;
      if (data.isPaused !== undefined) this.isPaused.value = data.isPaused;
    });
  }

  toPlainObject(): TimerData & { remainingTime: number } {
    return {
      id: this.id,
      servicioId: this.servicioId,
      roomId: this.roomId.peek(),
      roomName: this.roomName.peek(),
      duration: this.duration.peek(),
      startTime: this.startTime.peek(),
      expiresAt: this.expiresAt.peek(),
      servicioCode: this.servicioCode.peek(),
      clienteNombre: this.clienteNombre.peek(),
      isActive: this.isActive.peek(),
      isPaused: this.isPaused.peek(),
      remainingTime: this.remainingSeconds.peek(),
      isTemporary: this.isTemporary,
      datosTemporales: this.datosTemporales.peek(),
      tipoTransaccion: this.tipoTransaccion.peek(),
      anfitrionas: this.anfitrionas.peek()
    };
  }
}

let globalOnExpire: ((t: TimerInstance) => void) | null = null;
export const setGlobalExpirationHandler = (cb: (t: TimerInstance) => void) => {
  globalOnExpire = cb;
};

export const activeTimers = signal<TimerInstance[]>([]);
export const serverOffsetSignal = signal(0);

let tickInterval: NodeJS.Timeout | null = null;
let tickCount = 0;

export const startGlobalTimerLoop = () => {
  if (tickInterval) return;

  tickInterval = setInterval(() => {
    tickCount++;
    const currentOffset = serverOffsetSignal.peek();
    const timers = activeTimers.peek();

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
        instance.patch(pt);
      }

      newList.push(instance);
    });

    activeTimers.value = newList;
  });
};

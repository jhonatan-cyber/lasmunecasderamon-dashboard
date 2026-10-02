export function crearLecturaPorAviso(
  signal: AbortSignal,
  leer: () => Promise<unknown>,
  onError: (error: unknown) => void
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let pending = false;
  let followup = false;
  const schedule = (delay: number) => {
    if (!signal.aborted && !timer) timer = setTimeout(() => void run(), delay);
  };
  const run = async () => {
    timer = undefined;
    if (signal.aborted) return;
    running = true;
    pending = false;
    try {
      await leer();
    } catch (error) {
      onError(error);
    } finally {
      running = false;
      if (pending || followup) {
        followup = false;
        schedule(1000);
      }
    }
  };
  signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return () => {
    if (signal.aborted) return;
    pending = true;
    followup = true;
    if (!running) schedule(100);
  };
}

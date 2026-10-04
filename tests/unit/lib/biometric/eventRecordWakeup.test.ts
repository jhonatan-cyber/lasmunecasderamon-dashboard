// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearLecturaPorAviso } from '@/modules/asistencia/biometrico/eventRecordWakeup';
afterEach(() => vi.useRealTimers());
describe('SDK record wakeup', () => {
  it('coalesces bursts, retries once after persistence and stops on abort', async () => {
    vi.useFakeTimers();
    const abort = new AbortController();
    const read = vi.fn().mockResolvedValue({});
    const wake = crearLecturaPorAviso(abort.signal, read, vi.fn());
    for (let i = 0; i < 20; i++) wake();
    await vi.advanceTimersByTimeAsync(100);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(read).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(read).toHaveBeenCalledTimes(2);
    wake();
    abort.abort();
    await vi.advanceTimersByTimeAsync(2000);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('does not overlap reads if another event arrives while reading', async () => {
    vi.useFakeTimers();
    const abort = new AbortController();
    let done!: () => void;
    const read = vi.fn(
      () =>
        new Promise<void>(resolve => {
          done = resolve;
        })
    );
    const wake = crearLecturaPorAviso(abort.signal, read, vi.fn());
    wake();
    await vi.advanceTimersByTimeAsync(100);
    wake();
    await vi.advanceTimersByTimeAsync(2000);
    expect(read).toHaveBeenCalledTimes(1);
    done();
    await vi.advanceTimersByTimeAsync(1000);
    expect(read).toHaveBeenCalledTimes(2);
    abort.abort();
    done();
  });
});

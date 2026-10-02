import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBiometricPreview } from '@/hooks/useBiometricPreview';

describe('useBiometricPreview', () => {
  const fetchMock = vi.fn();
  let stream: ReadableStreamDefaultController<Uint8Array>;
  function sendFrame() {
    stream.enqueue(new TextEncoder().encode('--frame\r\nContent-length: 3\r\n\r\nabc\r\n'));
  }
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset().mockImplementation((_url, options) => {
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          stream = c;
          options.signal.addEventListener('abort', () => {
            try {
              c.close();
            } catch {}
          });
        }
      });
      return Promise.resolve({ ok: true, body });
    });
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = vi.fn(() => 'blob:camera');
        static revokeObjectURL = vi.fn();
      }
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('receives many frames on one connection and closes it when paused or dismissed', async () => {
    const { result, rerender, unmount } = renderHook(
      ({ open, live }) => useBiometricPreview('reader', open, live),
      { initialProps: { open: true, live: true } }
    );
    await act(async () => {
      sendFrame();
      sendFrame();
    });
    expect(result.current.src).toBe('blob:camera');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    const signal = fetchMock.mock.calls[0][1].signal;
    await act(async () => rerender({ open: true, live: false }));
    expect(signal.aborted).toBe(true);
    expect(result.current.src).toBe('blob:camera');
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => rerender({ open: true, live: true }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => rerender({ open: false, live: true }));
    expect(fetchMock.mock.calls[1][1].signal.aborted).toBe(true);
    expect(result.current.src).toBeUndefined();
    unmount();
  });

  it('reconnects after the continuous stream closes', async () => {
    const { result, unmount } = renderHook(() => useBiometricPreview('reader', true, true));
    await act(async () => {
      stream.close();
    });
    expect(result.current.failed).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      sendFrame();
    });
    expect(result.current.failed).toBe(false);
    unmount();
  });
});

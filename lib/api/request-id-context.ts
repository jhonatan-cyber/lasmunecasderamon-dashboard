import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequestId, setRequestIdContextProvider } from '@/lib/utils/request-id-context';

interface RequestIdContext {
  requestId: string | null;
}

const requestIdStorage = new AsyncLocalStorage<RequestIdContext>();

setRequestIdContextProvider({
  getRequestId: () => requestIdStorage.getStore()?.requestId,
  setRequestId: requestId => {
    const context = requestIdStorage.getStore();
    if (!context) return false;

    context.requestId = requestId;
    return true;
  }
});

export function runWithRequestId<T>(
  incomingRequestId: string | null,
  callback: (requestId: string) => T
): T {
  const requestId = incomingRequestId || createRequestId();
  return requestIdStorage.run({ requestId }, () => callback(requestId));
}

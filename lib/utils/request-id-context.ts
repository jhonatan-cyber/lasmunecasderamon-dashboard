interface RequestIdContextProvider {
  getRequestId(): string | null | undefined;
  setRequestId(requestId: string | null): boolean;
}

let requestIdContextProvider: RequestIdContextProvider | null = null;

export function setRequestIdContextProvider(provider: RequestIdContextProvider): void {
  requestIdContextProvider = provider;
}

export function getRequestIdFromContext(): string | null | undefined {
  return requestIdContextProvider?.getRequestId();
}

export function setRequestIdInContext(requestId: string | null): boolean {
  return requestIdContextProvider?.setRequestId(requestId) ?? false;
}

export function createRequestId(): string {
  if (typeof window === 'undefined') {
    try {
      const { randomBytes } = require('crypto');
      return `req_${randomBytes(8).toString('hex')}`;
    } catch {
      return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

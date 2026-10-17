import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
// Las entradas públicas cargan autenticación; estas credenciales son exclusivas del entorno de pruebas.
process.env.JWT_SECRET ??= 'unit-test-secret-59a048d28576c31e';
process.env.JWT_REFRESH_SECRET ??= 'unit-test-refresh-68fe2975b0a1c43d';

/**
 * Mock completo del logger para los tests que no lo simulan por su cuenta:
 * evita fallos parciales («default.info is not a function») en helpers que
 * registran por consola o reportan a Sentry (lib/utils/logger.ts).
 */
const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  captureException: vi.fn()
};
vi.mock('@/lib/utils/logger', () => ({
  default: loggerMock,
  logger: loggerMock
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    isPreview: false
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useServerInsertedHTML: () => {},
  Router: {
    events: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  }
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => ({ src, alt, ...props }) as any
}));

vi.mock('next/font/google', () => ({
  Inter: () => ({
    className: 'inter',
    variable: '--font-inter'
  })
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn()
  })),
  QueryClient: vi.fn().mockImplementation(() => ({
    setDefaultOptions: vi.fn(),
    clear: vi.fn()
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn()
  })
}));

global.window =
  global.window ||
  ({
    location: { href: 'http://localhost:3000' },
    localStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    },
    sessionStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  } as any);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn()
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

/**
 * jsdom no implementa EventSource y `lib/utils/SSEManager.ts` lo usa al montar
 * componentes de empresa; sin este stub los tests de listado revientan al
 * suscribirse. Stub inerte: instancia, registra y permite `close()`, pero no
 * abre ni dispara errores (evita bucles de reconexión de 5 s en los tests).
 */
if (typeof global.EventSource === 'undefined') {
  class EventSourceStub implements Partial<EventSource> {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 2;

    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;

    readyState = 0;
    url: string;
    withCredentials = false;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    constructor(url: string) {
      this.url = url;
    }

    close() {
      this.readyState = 2;
    }

    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean {
      return false;
    }
  }

  (global as any).EventSource = EventSourceStub;
}

if (typeof window !== 'undefined' && typeof window.HTMLElement !== 'undefined') {
  (window as any).Notification = {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted')
  };

  // jsdom no implementa pointer capture ni scrollIntoView: los necesita Radix (Select, ecc.).
  // La guarda por `window.HTMLElement` importa: los archivos con
  // `// @vitest-environment node` corren con el shim de `window` de más arriba, que
  // no tiene HTMLElement, y sin ella reventaban todos al cargar.
  const proto = window.HTMLElement.prototype as any;
  proto.hasPointerCapture = proto.hasPointerCapture || vi.fn(() => false);
  proto.setPointerCapture = proto.setPointerCapture || vi.fn();
  proto.releasePointerCapture = proto.releasePointerCapture || vi.fn();
  proto.scrollIntoView = proto.scrollIntoView || vi.fn();
}

Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

afterEach(() => {
  vi.clearAllMocks();
});

/**
 * Vitest Setup - Configuración global para tests unitarios
 *
 * Proporciona:
 * - Mocks de Next.js
 * - Mocks de React Query
 * - Mocks de Redis
 * - Extensiones de expect
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock de Next.js
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

// Mock de React Query
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

// Mock de cookies
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn()
  })
}));

// Mock de window
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

// Mock de matchMedia
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

// Mock de IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn()
}));

// Mock de ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock de Notifications API
if (typeof window !== 'undefined') {
  (window as any).Notification = {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted')
  };
}

// Mock de navigator
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Cleanup después de cada test
afterEach(() => {
  vi.clearAllMocks();
});

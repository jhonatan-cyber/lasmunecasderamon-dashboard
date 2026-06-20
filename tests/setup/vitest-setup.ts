import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

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

if (typeof window !== 'undefined') {
  (window as any).Notification = {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted')
  };
}

Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

afterEach(() => {
  vi.clearAllMocks();
});

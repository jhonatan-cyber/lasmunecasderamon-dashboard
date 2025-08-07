import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Mock data for tests
export const mockUsers = [
  {
    id_usuario: 1,
    username: 'admin',
    email: 'admin@test.com',
    rol: 'admin',
    estado: 1,
    fecha_creacion: '2024-01-01',
  },
  {
    id_usuario: 2,
    username: 'waiter',
    email: 'waiter@test.com',
    rol: 'waiter',
    estado: 1,
    fecha_creacion: '2024-01-02',
  },
]

export const mockSales = [
  {
    id_venta: 1,
    total: 150.00,
    fecha: '2024-01-01',
    estado: 'completada',
    usuario_id: 1,
  },
  {
    id_venta: 2,
    total: 75.50,
    fecha: '2024-01-02',
    estado: 'pendiente',
    usuario_id: 2,
  },
]

export const mockProducts = [
  {
    id_producto: 1,
    nombre: 'Producto 1',
    precio: 25.00,
    descripcion: 'Descripción del producto 1',
    categoria_id: 1,
    estado: 1,
  },
  {
    id_producto: 2,
    nombre: 'Producto 2',
    precio: 30.00,
    descripcion: 'Descripción del producto 2',
    categoria_id: 1,
    estado: 1,
  },
]

// Mock API responses
export const mockApiResponses = {
  users: {
    success: true,
    data: mockUsers,
    count: mockUsers.length,
  },
  sales: {
    success: true,
    data: mockSales,
    count: mockSales.length,
  },
  products: {
    success: true,
    data: mockProducts,
    count: mockProducts.length,
  },
}

// Helper functions for testing
export const createMockQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

export const mockFetch = (response: any, status = 200) => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: status === 200,
      status,
      json: () => Promise.resolve(response),
    })
  )
} 
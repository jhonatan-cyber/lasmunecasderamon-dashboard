import { toast } from 'sonner';

/**
 * Estructura de respuesta estandarizada que manejamos en el backend.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  errors?: Array<{ path: string; message: string }>;
}

/**
 * Cliente API tipado para el frontend.
 * Maneja automáticamente las notificaciones de error y el parsing de JSON.
 */
export class ApiClient {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;
    
    // Inyectar headers por defecto
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const result: ApiResponse<T> = await response.json();

      // Manejo de códigos de estado HTTP
      if (!response.ok) {
        // 1. Sesión expirada (401)
        if (response.status === 401) {
          toast.error('Sesión expirada. Por favor, reingresa.');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return result;
        }

        // 2. Errores de negociación/permisos (403)
        if (response.status === 403) {
          toast.warning('No tienes permisos suficientes.');
          return result;
        }

        // 3. Otros errores (400, 500, etc.)
        if (!result.success) {
          const errorMessage = result.message || 'Error inesperado en el servidor';
          
          // Si hay errores de validación de Zod, los mostramos detalladamente
          if (result.errors?.length) {
            result.errors.forEach(err => toast.error(`${err.path}: ${err.message}`));
          } else {
            toast.error(errorMessage);
          }
        }
      } else if (result.success && result.message && options.method !== 'GET') {
        // Notificaciones de éxito para mutaciones (POST, PUT, DELETE)
        toast.success(result.message);
      }

      return result;
    } catch (error) {
      console.error('API_CLIENT_ERROR:', error);
      toast.error('Error de conexión con el servidor.');
      return { success: false, message: 'Connection Error' };
    }
  }

  static get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  static post<T>(endpoint: string, body: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static put<T>(endpoint: string, body: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  static patch<T>(endpoint: string, body: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  static delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Helper para peticiones que usan FormData (imágenes/archivos)
   */
  static async multipart<T>(endpoint: string, formData: FormData, method: 'POST' | 'PUT' = 'POST') {
    return this.request<T>(endpoint, {
      method,
      body: formData,
      // IMPORTANTE: Al enviar FormData NO hay que setear el Content-Type manualmente
      headers: {}, 
    });
  }
}

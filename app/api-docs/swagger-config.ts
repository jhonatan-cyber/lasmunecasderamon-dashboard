// Configuración para suprimir warnings de React Strict Mode en Swagger UI
export const swaggerConfig = {
  // Configuración básica
  url: '/api/swagger',
  docExpansion: 'list' as const,
  defaultModelsExpandDepth: 2,
  defaultModelExpandDepth: 2,
  displayOperationId: false,
  displayRequestDuration: true,
  filter: true,
  showExtensions: false,
  showCommonExtensions: false,
  tryItOutEnabled: true,
  supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'] as const,
  plugins: [],
  layout: 'BaseLayout' as const,
  deepLinking: true,
  defaultModelRendering: 'example' as const,
  validatorUrl: null,
  withCredentials: true,

  // Interceptores
  requestInterceptor: (request: any) => {
    if (!request.headers) {
      request.headers = {};
    }
    request.headers['Content-Type'] = 'application/json';
    return request;
  },

  responseInterceptor: (response: any) => {
    return response;
  },

  // Callback simple
  onComplete: (system: any) => {
    console.log('Swagger UI cargado completamente');
  }
};

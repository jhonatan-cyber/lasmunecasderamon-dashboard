type SwaggerRequest = {
  headers?: Record<string, string>;
};

type SwaggerResponse = {
  status?: number;
};

export const swaggerConfig = {
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
  requestInterceptor: (request: SwaggerRequest) => {
    if (!request.headers) {
      request.headers = {};
    }

    request.headers['Content-Type'] = 'application/json';
    return request;
  },
  responseInterceptor: (response: SwaggerResponse) => response,
  onComplete: () => undefined,
};

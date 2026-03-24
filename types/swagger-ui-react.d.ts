declare module 'swagger-ui-react' {
  import { ComponentType } from 'react';

  type SwaggerSpec = Record<string, unknown>;

  interface SwaggerUIProps {
    url?: string;
    spec?: SwaggerSpec;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    displayOperationId?: boolean;
    displayRequestDuration?: boolean;
    filter?: boolean | string;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    tryItOutEnabled?: boolean;
    supportedSubmitMethods?: readonly string[];
    plugins?: readonly unknown[];
    layout?: string;
    deepLinking?: boolean;
    defaultModelRendering?: 'example' | 'model';
    validatorUrl?: string | null;
    withCredentials?: boolean;
    requestInterceptor?: (request: Record<string, unknown>) => Record<string, unknown>;
    responseInterceptor?: (response: Record<string, unknown>) => Record<string, unknown>;
    onComplete?: () => void;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}

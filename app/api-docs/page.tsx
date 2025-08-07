'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Key, Shield, BookOpen } from 'lucide-react';
import SwaggerUIWrapper from '@/components/SwaggerUIWrapper';

export default function ApiDocsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Documentación de API</h1>
        <p className="text-muted-foreground">
          Documentación completa de todas las APIs del sistema Admin Dashboard
        </p>
      </div>

      {/* Información sobre autenticación */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Acceso Público:</strong> Esta documentación es accesible sin autenticación. 
          Para probar las APIs protegidas, primero obtén un token JWT haciendo login en el sistema.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            API Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SwaggerUIWrapper url="/api/docs" />
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-4 w-4" />
              Autenticación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Para probar APIs protegidas:
            </p>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Hacer login en el sistema</li>
              <li>2. Copia el token JWT</li>
              <li>3. Haz clic en "Authorize" en Swagger UI</li>
              <li>4. Pega el token con formato: <code>Bearer tu-token</code></li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Rate Limiting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Las APIs tienen límites de velocidad configurados para prevenir abuso:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• API general: 10 req/s</li>
              <li>• Login: 5 req/min</li>
              <li>• APIs sensibles: 2 req/min</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Errores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Todos los errores siguen un formato estándar con códigos de estado HTTP:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• 400: Datos inválidos</li>
              <li>• 401: No autorizado</li>
              <li>• 403: Sin permisos</li>
              <li>• 429: Demasiadas peticiones</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>¿Cómo obtener un token JWT?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Hacer Login</h4>
                <p className="text-sm text-muted-foreground">
                  Ve a la página de login del sistema y autentícate con tus credenciales.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">2. Obtener Token</h4>
                <p className="text-sm text-muted-foreground">
                  Después del login exitoso, el token JWT se almacena automáticamente en el navegador.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">3. Usar en Swagger UI</h4>
                <p className="text-sm text-muted-foreground">
                  Haz clic en el botón "Authorize" (🔒) en la parte superior de Swagger UI y 
                  ingresa el token con el formato: <code>Bearer tu-token-jwt</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
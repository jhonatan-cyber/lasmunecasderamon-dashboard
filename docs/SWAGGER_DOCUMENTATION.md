# 📚 Documentación con Swagger/OpenAPI

## Resumen de Implementación

Este documento describe la implementación completa de documentación de APIs usando Swagger/OpenAPI en el sistema Admin Dashboard.

## 🎯 Características Implementadas

### 1. Configuración Base de Swagger
- **Archivo:** `lib/swagger.ts`
- **Especificación:** OpenAPI 3.0.0
- **Schemas:** Definidos para User, Sale, Product, Client
- **Seguridad:** JWT Bearer Token
- **Servidores:** Desarrollo y producción

### 2. Endpoints Documentados

#### Autenticación
- **POST /api/login** - Autenticación de usuarios
- Documentación completa con ejemplos
- Manejo de errores detallado
- Rate limiting documentado

#### Usuarios
- **GET /api/users-secure** - Listar usuarios
- **POST /api/users-secure** - Crear usuario
- Parámetros de paginación
- Filtros por rol y búsqueda

#### Ventas
- **GET /api/ventas** - Listar ventas
- **POST /api/ventas** - Crear venta
- Filtros por estado
- Estructura de productos

### 3. Interfaz de Usuario
- **Página:** `/api-docs` - **ACCESO PÚBLICO**
- **Componente:** Swagger UI React
- **Características:**
  - Interfaz interactiva
  - Pruebas de API en tiempo real
  - Autenticación automática
  - Filtros y búsqueda
  - **No requiere login para acceder**

## 🛠️ Configuración Técnica

### Dependencias Instaladas
```bash
npm install swagger-jsdoc swagger-ui-react @types/swagger-jsdoc @types/swagger-ui-react
```

### Estructura de Archivos
```
lib/
├── swagger.ts              # Configuración base
pages/
├── api/
│   ├── docs.ts            # Endpoint para Swagger JSON (público)
│   ├── login.ts           # API con documentación
│   ├── users-secure.ts    # API con documentación
│   └── ventas.ts          # API con documentación
app/
└── api-docs/
    └── page.tsx           # Página de documentación (pública)
```

## 🔓 Acceso Público

### Características de Seguridad
- ✅ **Documentación pública** - Accesible sin autenticación
- ✅ **APIs protegidas** - Requieren token JWT para uso
- ✅ **CORS habilitado** - Para acceso desde cualquier origen
- ✅ **Cache configurado** - Mejora el rendimiento

### Headers de Seguridad
```typescript
// En pages/api/docs.ts
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET');
res.setHeader('Cache-Control', 'public, max-age=3600');
```

## 📋 Schemas Definidos

### User Schema
```yaml
User:
  type: object
  properties:
    id_usuario: { type: integer, example: 1 }
    username: { type: string, example: 'admin' }
    email: { type: string, format: email }
    rol: { type: string, enum: ['administrador', 'cajero', 'garzon', 'anfitriona'] }
    estado: { type: integer, example: 1 }
    fecha_creacion: { type: string, format: date-time }
  required: ['username', 'email', 'rol']
```

### Sale Schema
```yaml
Sale:
  type: object
  properties:
    id_venta: { type: integer, example: 1 }
    total: { type: number, format: float, example: 150.00 }
    fecha: { type: string, format: date-time }
    estado: { type: string, enum: ['pendiente', 'completada', 'cancelada'] }
    usuario_id: { type: integer, example: 1 }
  required: ['total', 'estado']
```

### Error Schema
```yaml
Error:
  type: object
  properties:
    success: { type: boolean, example: false }
    message: { type: string, example: 'Error message' }
    code: { type: string, example: 'VALIDATION_ERROR' }
```

## 🔐 Seguridad

### JWT Bearer Token
```yaml
securitySchemes:
  bearerAuth:
    type: http
    scheme: bearer
    bearerFormat: JWT
```

### Autenticación para APIs
- **Documentación:** Acceso público
- **APIs protegidas:** Requieren token JWT
- **Rate limiting:** Configurado para prevenir abuso

## 🎨 Interfaz de Usuario

### Características de Swagger UI
- **DocExpansion:** "list" - Muestra todos los endpoints
- **TryItOut:** Habilitado para pruebas en tiempo real
- **RequestInterceptor:** Agrega token automáticamente
- **ResponseInterceptor:** Log de respuestas para debugging
- **Filter:** Búsqueda de endpoints
- **Extensions:** Muestra extensiones personalizadas

### Configuración React
```typescript
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <div>Cargando documentación...</div>,
});
```

## 📝 Cómo Documentar Nuevas APIs

### 1. Agregar Documentación Swagger
```typescript
/**
 * @swagger
 * /api/nuevo-endpoint:
 *   get:
 *     summary: Descripción corta
 *     description: Descripción detallada
 *     tags: [Categoría]
 *     parameters:
 *       - in: query
 *         name: parametro
 *         schema:
 *           type: string
 *         description: Descripción del parámetro
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SchemaName'
 */
```

### 2. Definir Nuevos Schemas
```typescript
// En lib/swagger.ts
schemas: {
  NuevoSchema: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      nombre: { type: 'string', example: 'Ejemplo' },
    },
    required: ['nombre'],
  },
}
```

### 3. Agregar Tags
```typescript
// En la documentación de cada API
tags: [NuevaCategoria]
```

## 🚀 Uso de la Documentación

### Acceso a la Documentación
1. **URL:** `http://localhost:3000/api-docs` - **SIN AUTENTICACIÓN**
2. **Endpoint JSON:** `http://localhost:3000/api/docs` - **SIN AUTENTICACIÓN**
3. **Sidebar:** Enlace "API Docs" en el menú lateral

### Funcionalidades Disponibles
- **Explorar APIs:** Navegar por todos los endpoints
- **Probar APIs:** Ejecutar requests directamente
- **Ver Schemas:** Examinar estructuras de datos
- **Autenticación:** Configurar token JWT (opcional)
- **Filtrar:** Buscar endpoints específicos

### Autenticación en Swagger UI (Opcional)
1. Hacer clic en "Authorize" (🔒)
2. Ingresar token JWT: `Bearer tu-token-aqui`
3. Hacer clic en "Authorize"
4. Probar endpoints protegidos

## 📊 Métricas de Documentación

### Cobertura Actual
- ✅ **Login API:** 100% documentado
- ✅ **Users API:** 100% documentado
- ✅ **Sales API:** 100% documentado
- 🔄 **Otras APIs:** En progreso

### Calidad de Documentación
- **Ejemplos:** Incluidos para todos los endpoints
- **Errores:** Documentados con códigos específicos
- **Validación:** Schemas con tipos correctos
- **Seguridad:** Autenticación documentada
- **Acceso:** Público sin restricciones

## 🔧 Configuración Avanzada

### Personalización de Swagger UI
```typescript
<SwaggerUI
  url="/api/docs"
  docExpansion="list"
  defaultModelsExpandDepth={2}
  displayRequestDuration={true}
  filter={true}
  tryItOutEnabled={true}
  requestInterceptor={(request) => {
    // Personalización de requests
    return request;
  }}
/>
```

### Configuración de Producción
```typescript
// En next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/docs',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ];
  },
};
```

## 📈 Beneficios Implementados

### Para Desarrolladores
- **Documentación Interactiva:** Probar APIs directamente
- **Ejemplos Claros:** Código de ejemplo para cada endpoint
- **Validación Automática:** Schemas validan requests/responses
- **Autenticación Integrada:** Token JWT automático
- **Acceso Público:** Sin necesidad de login

### Para el Proyecto
- **Mantenibilidad:** Documentación siempre actualizada
- **Onboarding:** Nuevos desarrolladores pueden entender APIs rápidamente
- **Testing:** Swagger UI como herramienta de testing
- **API First:** Diseño centrado en APIs
- **Transparencia:** APIs completamente documentadas

### Para Clientes/Stakeholders
- **Transparencia:** APIs completamente documentadas
- **Integración:** Fácil integración con otros sistemas
- **Soporte:** Documentación clara para soporte técnico
- **Acceso Libre:** Sin barreras de autenticación

## 🔄 Próximos Pasos

### Mejoras Planificadas
1. **Documentar todas las APIs** restantes
2. **Agregar más ejemplos** de uso
3. **Implementar versionado** de APIs
4. **Agregar métricas** de uso de APIs
5. **Integrar con CI/CD** para validación automática

### Nuevas Funcionalidades
- **Exportar documentación** a PDF/HTML
- **Generar SDKs** automáticamente
- **Métricas de uso** de APIs
- **Validación automática** de requests

## 📚 Referencias

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI React](https://github.com/swagger-api/swagger-ui-react)
- [Swagger JSDoc](https://github.com/Surnet/swagger-jsdoc)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

**Nota:** Esta implementación proporciona una base sólida para la documentación de APIs que puede expandirse según las necesidades específicas del proyecto. La documentación es de acceso público para facilitar el desarrollo y la integración. 
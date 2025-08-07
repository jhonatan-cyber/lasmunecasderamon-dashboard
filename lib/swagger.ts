import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Admin Dashboard API',
      version: '1.0.0',
      description: 'API para el sistema de administración de dashboard',
      contact: {
        name: 'API Support',
        email: 'support@admin-dashboard.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
      {
        url: 'http://localhost:3001',
        description: 'Servidor de desarrollo (puerto alternativo)',
      },
      {
        url: 'https://api.admin-dashboard.com',
        description: 'Servidor de producción',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // Usuario
        User: {
          type: 'object',
          properties: {
            id_usuario: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'admin' },
            email: { type: 'string', format: 'email', example: 'admin@example.com' },
            rol: { 
              type: 'string', 
              enum: ['admin', 'manager', 'cashier', 'waiter'],
              example: 'admin'
            },
            estado: { type: 'integer', example: 1 },
            fecha_creacion: { type: 'string', format: 'date-time' },
          },
          required: ['username', 'email', 'rol'],
        },
        
        // Venta
        Sale: {
          type: 'object',
          properties: {
            id_venta: { type: 'integer', example: 1 },
            total: { type: 'number', format: 'float', example: 150.00 },
            fecha: { type: 'string', format: 'date-time' },
            estado: { 
              type: 'string', 
              enum: ['pendiente', 'completada', 'cancelada'],
              example: 'completada'
            },
            usuario_id: { type: 'integer', example: 1 },
          },
          required: ['total', 'estado'],
        },
        
        // Resumen de Ventas
        SalesSummary: {
          type: 'object',
          properties: {
            resumen_general: {
              type: 'object',
              properties: {
                total_ventas: { type: 'integer', example: 50 },
                total_ventas_monto: { type: 'number', format: 'float', example: 7500.00 },
                total_efectivo: { type: 'number', format: 'float', example: 3000.00 },
                total_tarjeta: { type: 'number', format: 'float', example: 2500.00 },
                total_transferencia: { type: 'number', format: 'float', example: 2000.00 },
                total_propinas: { type: 'number', format: 'float', example: 750.00 },
                promedio_venta: { type: 'number', format: 'float', example: 150.00 }
              }
            },
            resumen_metodos_pago: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  metodo_pago: { type: 'string', example: 'efectivo' },
                  cantidad: { type: 'integer', example: 20 },
                  total_monto: { type: 'number', format: 'float', example: 3000.00 }
                }
              }
            }
          }
        },
        
        // Producto
        Product: {
          type: 'object',
          properties: {
            id_producto: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Cerveza' },
            precio: { type: 'number', format: 'float', example: 5.00 },
            categoria: { type: 'string', example: 'Bebidas' },
            stock: { type: 'integer', example: 100 },
            estado: { type: 'integer', example: 1 },
          },
          required: ['nombre', 'precio', 'categoria'],
        },
        
        // Categoría
        Category: {
          type: 'object',
          properties: {
            id_categoria: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Bebidas' },
            descripcion: { type: 'string', example: 'Categoría de bebidas' },
            estado: { type: 'integer', example: 1 },
          },
          required: ['nombre'],
        },
        
        // Habitación
        Room: {
          type: 'object',
          properties: {
            id_habitacion: { type: 'integer', example: 1 },
            numero: { type: 'string', example: '101' },
            tipo: { 
              type: 'string', 
              enum: ['individual', 'doble', 'suite'],
              example: 'doble'
            },
            precio: { type: 'number', format: 'float', example: 150.00 },
            descripcion: { type: 'string', example: 'Habitación con vista al mar' },
            capacidad: { type: 'integer', example: 2 },
            estado: { 
              type: 'string', 
              enum: ['disponible', 'ocupada', 'mantenimiento'],
              example: 'disponible'
            },
            fecha_creacion: { type: 'string', format: 'date-time' },
          },
          required: ['numero', 'tipo', 'precio'],
        },
        
        // Caja
        CashRegister: {
          type: 'object',
          properties: {
            id_caja: { type: 'integer', example: 1 },
            fecha_apertura: { type: 'string', format: 'date-time' },
            usuario_id_apertura: { type: 'integer', example: 1 },
            monto_apertura: { type: 'number', format: 'float', example: 1000.00 },
            ventas: { type: 'number', format: 'float', example: 2500.00 },
            efectivo: { type: 'number', format: 'float', example: 1500.00 },
            tarjeta: { type: 'number', format: 'float', example: 800.00 },
            transferencia: { type: 'number', format: 'float', example: 200.00 },
            servicios: { type: 'number', format: 'float', example: 300.00 },
            devoluciones: { type: 'number', format: 'float', example: 50.00 },
            iva: { type: 'number', format: 'float', example: 400.00 },
            propina: { type: 'number', format: 'float', example: 200.00 },
            anticipo: { type: 'number', format: 'float', example: 100.00 },
            comision: { type: 'number', format: 'float', example: 150.00 },
            monto_cierre: { type: 'number', format: 'float', example: 3000.00 },
            usuario_id_cierre: { type: 'integer', example: 1 },
            fecha_cierre: { type: 'string', format: 'date-time' },
            estado: { type: 'integer', example: 1 },
            cajero_nombre: { type: 'string', example: 'Juan Pérez' },
            cajero_cierre_nombre: { type: 'string', example: 'María García' },
          },
          required: ['usuario_id_apertura', 'monto_apertura'],
        },
        
        // Resumen de Caja
        CashRegisterSummary: {
          type: 'object',
          properties: {
            total_ventas: { type: 'number', format: 'float', example: 15000.00 },
            total_efectivo: { type: 'number', format: 'float', example: 8000.00 },
            total_tarjeta: { type: 'number', format: 'float', example: 5000.00 },
            total_transferencia: { type: 'number', format: 'float', example: 2000.00 },
            total_servicios: { type: 'number', format: 'float', example: 1500.00 },
            total_devoluciones: { type: 'number', format: 'float', example: 300.00 },
            total_iva: { type: 'number', format: 'float', example: 2000.00 },
            total_propina: { type: 'number', format: 'float', example: 1000.00 },
            total_anticipo: { type: 'number', format: 'float', example: 500.00 },
            cajas_abiertas: { type: 'integer', example: 2 },
            cajas_cerradas: { type: 'integer', example: 5 },
          },
        },
        
        // Error Response
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
          },
        },
        
        // Success Response
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string', example: 'Operation successful' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './pages/api/**/*.ts',
    './pages/api/**/*.js',
  ],
};

export const swaggerSpec = swaggerJSDoc(options); 
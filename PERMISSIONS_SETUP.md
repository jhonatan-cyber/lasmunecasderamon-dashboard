# Configuración del Sistema de Permisos

## Descripción

Se ha implementado un sistema completo de permisos y roles-permisos que incluye:

- **Tablas de base de datos**: `permissions` y `role_permissions`
- **API endpoints**: Para gestionar permisos y roles-permisos
- **Componentes UI**: Para gestionar permisos de forma visual
- **Hooks**: Para manejar la lógica de permisos

## Estructura de Archivos

```
├── database/migrations/
│   ├── 001_create_permissions_table.sql
│   └── 002_create_role_permissions_table.sql
├── pages/api/
│   ├── permissions/index.ts
│   └── roles/[id]/permissions.ts
├── hooks/
│   └── usePermissions.ts
├── components/
│   ├── roles/PermissionsPanel.tsx
│   └── permissions/PermissionsManager.tsx
├── app/
│   └── permissions/page.tsx
└── scripts/
    └── run-migrations.js
```

## Instalación

### 1. Configurar Base de Datos

Primero, asegúrate de tener las variables de entorno configuradas. Crea un archivo `.env` en la raíz del proyecto:

```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=admin_dashboard
DB_PORT=3306
```

### 2. Ejecutar Migraciones

#### Opción A: Usando el script de migraciones
```bash
npm run migrate
```

#### Opción B: Ejecutar manualmente en MySQL
```bash
mysql -u root -p admin_dashboard < database/setup_permissions.sql
```

Este comando ejecutará automáticamente:
- Creación de la tabla `permissions` con permisos predefinidos
- Creación de la tabla `role_permissions` para la relación muchos a muchos

### 2. Permisos Predefinidos

El sistema incluye permisos predefinidos para todos los módulos:

#### Módulos Disponibles:
- **users**: Ver, crear, editar, eliminar, activar, desactivar usuarios
- **roles**: Ver, crear, editar, eliminar, activar, desactivar roles, gestionar permisos
- **sales**: Ver, crear, editar, eliminar ventas, reportes
- **products**: Ver, crear, editar, eliminar productos
- **categories**: Ver, crear, editar, eliminar categorías
- **rooms**: Ver, crear, editar, eliminar habitaciones
- **cash_register**: Ver, abrir, cerrar caja, reportes
- **orders**: Ver, crear, editar, eliminar, procesar pedidos
- **services**: Ver, crear, editar, eliminar servicios
- **tips**: Ver, crear, editar, eliminar, distribuir propinas
- **settings**: Ver, editar configuración
- **reports**: Ver, exportar reportes

## Uso

### 1. Gestión de Permisos

Accede a `/permissions` para:
- Ver todos los permisos organizados por módulo
- Crear nuevos permisos
- Ver estadísticas del sistema de permisos

### 2. Gestión de Roles-Permisos

En la página de roles (`/roles`):
- Selecciona un rol para ver sus permisos actuales
- Marca/desmarca permisos usando checkboxes
- Usa "Todos" o "Ninguno" para seleccionar/deseleccionar todos los permisos de un módulo
- Guarda los cambios con el botón "Guardar"

### 3. API Endpoints

#### Obtener todos los permisos:
```bash
GET /api/permissions
```

#### Crear nuevo permiso:
```bash
POST /api/permissions
{
  "name": "users.export",
  "description": "Exportar usuarios",
  "module": "users",
  "action": "export"
}
```

#### Obtener permisos de un rol:
```bash
GET /api/roles/{roleId}/permissions
```

#### Actualizar permisos de un rol:
```bash
PUT /api/roles/{roleId}/permissions
{
  "permissions": [1, 2, 3, 4]
}
```

## Funcionalidades

### 1. PermissionsPanel
- Muestra permisos organizados por módulo
- Permite seleccionar/deseleccionar permisos individuales
- Botones para seleccionar/deseleccionar todos los permisos de un módulo
- Contador de permisos seleccionados
- Guardado automático de cambios

### 2. PermissionsManager
- Vista completa de todos los permisos
- Creación de nuevos permisos
- Estadísticas del sistema
- Organización por módulos

### 3. Hook usePermissions
- Gestión de estado de permisos
- Funciones para CRUD de permisos
- Agrupación de permisos por módulo
- Manejo de errores

## Roles Predefinidos Sugeridos

### Admin
- Todos los permisos del sistema

### Manager
- users.view, users.edit
- roles.view, roles.edit
- sales.*
- products.*
- categories.*
- rooms.*
- cash_register.view, cash_register.reports
- orders.*
- services.*
- tips.*
- settings.view
- reports.*

### Cashier
- sales.view, sales.create, sales.edit
- cash_register.view, cash_register.open, cash_register.close
- orders.view, orders.process
- tips.view, tips.create

### Waiter
- orders.view, orders.create
- services.view, services.create
- tips.view

## Notas Importantes

1. **Seguridad**: Los permisos deben ser verificados en el backend antes de permitir cualquier acción
2. **Performance**: Los permisos se cargan una vez y se cachean en el frontend
3. **Escalabilidad**: El sistema permite agregar nuevos módulos y permisos fácilmente
4. **Compatibilidad**: Funciona con el sistema de roles existente

## Próximos Pasos

1. Implementar verificación de permisos en el backend
2. Agregar middleware para verificar permisos en rutas protegidas
3. Crear componentes de autorización reutilizables
4. Implementar cache de permisos para mejor performance
5. Agregar auditoría de cambios de permisos 
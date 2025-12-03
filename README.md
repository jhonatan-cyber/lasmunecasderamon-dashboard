# 🎭 Las Muñecas de Ramón - Sistema de Gestión

Sistema integral de administración para nightclub, desarrollado con Next.js 15, TypeScript y MySQL.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos](#-requisitos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API](#-api)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contribución](#-contribución)

## ✨ Características

### Módulos Principales

- 🏦 **Gestión de Cajas**: Control completo de cajas registradoras con retiros y cierres
- 💰 **Ventas**: Sistema POS para ventas de productos
- 🎯 **Servicios**: Gestión de servicios privados y salas VIP
- 👥 **Personal**: Control de asistencias, horas extras, propinas y comisiones
- 📊 **Reportes**: Reportes detallados de ventas, servicios y finanzas
- 🏠 **Salas Privadas**: Gestión de reservas y disponibilidad
- 📦 **Inventario**: Control de productos y categorías
- 👤 **Clientes**: Base de datos de clientes
- 🌐 **Landing Page**: Página pública premium con animaciones

### Características Técnicas

- ✅ Autenticación con JWT
- ✅ Control de roles y permisos
- ✅ Validación con Zod
- ✅ UI moderna con shadcn/ui
- ✅ Responsive design
- ✅ Dark mode ready
- ✅ API RESTful
- ✅ TypeScript strict mode
- ✅ Optimistic updates
- ✅ Real-time notifications

## 🛠️ Tecnologías

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui + Radix UI
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **State**: React Query (TanStack Query)
- **Notifications**: Sonner

### Backend
- **Runtime**: Node.js
- **Database**: MySQL 8.0
- **ORM**: mysql2 (raw queries)
- **Validation**: Zod
- **Auth**: JWT + bcrypt
- **File Upload**: Formidable

### DevOps
- **Language**: TypeScript 5
- **Package Manager**: npm
- **Linting**: ESLint
- **Formatting**: Prettier
- **Git Hooks**: Husky
- **Testing**: Jest + Testing Library

## 📦 Requisitos

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 9.0.0

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/lasmunecasderamon.git
cd lasmunecasderamon/admin-dashboard
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
nano .env
```

### 4. Configurar la base de datos

```bash
# Importar el esquema de base de datos
mysql -u root -p < database/schema.sql

# Ejecutar migraciones (si existen)
npm run migrate
```

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de Datos
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=nuwesoft

# JWT
JWT_SECRET=tu_secret_key_super_seguro
JWT_EXPIRES_IN=7d

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password

# Twilio (opcional)
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Configuración de MySQL

```sql
CREATE DATABASE nuwesoft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nuwesoft;

-- Importar schema
SOURCE database/schema.sql;

-- Crear usuario (opcional)
CREATE USER 'nuwesoft_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON nuwesoft.* TO 'nuwesoft_user'@'localhost';
FLUSH PRIVILEGES;
```

## 📖 Uso

### Acceso al Sistema

1. **Landing Page**: `http://localhost:3000/landing`
2. **Dashboard**: `http://localhost:3000/dashboard`
3. **Login**: `http://localhost:3000/login`

### Usuarios por Defecto

```
Administrador:
- Usuario: admin
- Contraseña: admin123

Cajero:
- Usuario: cajero
- Contraseña: cajero123
```

### Módulos Disponibles

#### 1. Cajas (`/cash-register`)
- Abrir/cerrar cajas
- Retirar dinero
- Ver historial de retiros
- Resumen financiero

#### 2. Ventas (`/sales`)
- Crear ventas
- Anular ventas
- Ver historial
- Reportes

#### 3. Servicios (`/services`)
- Gestionar servicios
- Asignar anfitrionas
- Control de comisiones

#### 4. Personal
- Asistencias (`/attendance`)
- Horas extras (`/overtime`)
- Propinas (`/tips`)
- Anticipos (`/advances`)
- Comisiones (`/commissions`)

#### 5. Inventario
- Productos (`/products`)
- Categorías (`/categories`)

#### 6. Reportes (`/reports`)
- Ventas por período
- Servicios por anfitriona
- Cierre de caja
- Exportar a PDF/Excel

## 📁 Estructura del Proyecto

```
admin-dashboard/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes (deprecado, usar pages/api)
│   ├── cash-register/        # Módulo de cajas
│   ├── dashboard/            # Dashboard principal
│   ├── landing/              # Landing page
│   ├── login/                # Autenticación
│   ├── sales/                # Ventas
│   └── ...                   # Otros módulos
├── components/               # Componentes React
│   ├── caja/                 # Componentes de cajas
│   ├── landing/              # Componentes del landing
│   ├── shared/               # Componentes compartidos
│   └── ui/                   # shadcn/ui components
├── contexts/                 # React Contexts
├── hooks/                    # Custom Hooks
│   ├── useCashRegister.ts
│   ├── useRetiros.ts
│   └── ...
├── lib/                      # Utilidades
│   ├── db.ts                 # Conexión a BD
│   ├── auth.ts               # Autenticación
│   └── formatters.ts         # Formateadores
├── pages/                    # Pages Router (APIs)
│   └── api/                  # API Endpoints
│       ├── cashregister/
│       ├── sales/
│       └── ...
├── public/                   # Assets estáticos
├── scripts/                  # Scripts de utilidad
├── sql/                      # Scripts SQL
├── types/                    # TypeScript types
└── docs/                     # Documentación

```

## 🔌 API

### Endpoints Principales

#### Autenticación
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

#### Cajas
```
GET    /api/cashregister          # Listar cajas
POST   /api/cashregister          # Crear caja
PUT    /api/cashregister          # Actualizar caja
PATCH  /api/cashregister          # Cerrar caja
DELETE /api/cashregister?id=:id   # Eliminar caja
POST   /api/cashregister/retiro   # Retirar dinero
GET    /api/cashregister/retiros?id_caja=:id  # Historial de retiros
```

#### Ventas
```
GET    /api/sales                 # Listar ventas
POST   /api/sales                 # Crear venta
PUT    /api/sales                 # Actualizar venta
DELETE /api/sales?id=:id          # Anular venta
```

### Formato de Respuesta

```typescript
// Éxito
{
  "success": true,
  "data": { ... },
  "message": "Operación exitosa"
}

// Error
{
  "success": false,
  "message": "Descripción del error",
  "errors": [ ... ]  // Opcional
}
```

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests unitarios
npm test

# Tests en modo watch
npm run test:watch

# Coverage
npm run test:coverage

# Tests CI
npm run test:ci
```

### Estructura de Tests

```
__tests__/
├── hooks/
│   └── useCashRegister.test.ts
├── components/
│   └── CajaCard.test.tsx
└── api/
    └── cashregister.test.ts
```

## 🚢 Deployment

### Producción

```bash
# Build
npm run build

# Start
npm start
```

### Variables de Entorno en Producción

Asegúrate de configurar todas las variables de entorno en tu plataforma de hosting:

- Vercel: Settings > Environment Variables
- Railway: Variables tab
- Heroku: Config Vars

### Recomendaciones

1. **Base de Datos**: Usar PlanetScale o Supabase
2. **Hosting**: Vercel o Railway
3. **CDN**: Cloudflare
4. **Monitoring**: Sentry + Vercel Analytics
5. **Backups**: Automatizar backups diarios

## 🤝 Contribución

### Workflow

1. Fork el proyecto
2. Crear una rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

### Estándares de Código

- Usar TypeScript strict mode
- Seguir convenciones de ESLint
- Formatear con Prettier
- Escribir tests para nuevas features
- Documentar funciones complejas

### Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: agregar módulo de retiros
fix: corregir cálculo de comisiones
docs: actualizar README
style: formatear código
refactor: mejorar performance de queries
test: agregar tests para cajas
chore: actualizar dependencias
```

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👥 Equipo

- **Desarrollador Principal**: Jhonatan
- **Cliente**: Las Muñecas de Ramón

## 📞 Soporte

Para soporte técnico:
- Email: soporte@lasmunecasderamon.com
- WhatsApp: +56 9 8790 4824

## 📚 Documentación Adicional

- [Análisis y Mejoras](./docs/ANALISIS_Y_MEJORAS.md)
- [Retiro de Dinero](./docs/RETIRO_DINERO_CAJA.md)
- [API Documentation](./app/api-docs)

---

**Última actualización**: Noviembre 2025
**Versión**: 1.0.0

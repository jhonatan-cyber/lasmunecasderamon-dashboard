# 🔧 Guía de Troubleshooting - Admin Dashboard

## Problemas Comunes y Soluciones

### 1. Error: "No autorizado" / "Token no proporcionado"

**Síntomas:**
- Error 401 en endpoints protegidos
- Mensaje "No autorizado" en la consola

**Causas posibles:**
- Token JWT no se está enviando correctamente
- Token expirado o inválido
- Middleware de autenticación mal configurado

**Soluciones:**

1. **Verificar el endpoint de login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu-email@ejemplo.com","password":"tu-password"}'
```

2. **Verificar que el token se genere correctamente:**
```javascript
// El token debe contener: id, username, email, role
const token = jwt.sign({
  id: user.id_usuario,
  username: user.nombre,
  email: user.email,
  role: user.rol
}, JWT_SECRET);
```

3. **Verificar que el token se envíe en headers:**
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### 2. Error: "Error interno del servidor" (500)

**Síntomas:**
- Error 500 en endpoints
- Mensajes de error en logs del servidor

**Causas posibles:**
- Problemas en consultas SQL
- Tablas de base de datos no existen
- Variables de entorno incorrectas

**Soluciones:**

1. **Verificar la base de datos:**
```bash
cd admin-dashboard
npm run check-db
```

2. **Verificar variables de entorno:**
```bash
# Crear archivo .env en admin-dashboard/
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu-password
DB_NAME=admin_dashboard
JWT_SECRET=tu-secret-key
```

3. **Verificar que las tablas existan:**
```sql
SHOW TABLES;
DESCRIBE usuarios;
DESCRIBE asistencias;
DESCRIBE anticipos;
```

### 3. Error de CORS

**Síntomas:**
- Error de CORS en el navegador
- Requests bloqueados desde la app React Native

**Soluciones:**

1. **Verificar configuración CORS en middleware.ts:**
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.0.100:3000',
  'http://192.168.0.100:8081', // Expo dev server
  'exp://192.168.0.100:8081',  // Expo
];
```

2. **Verificar que los endpoints estén en PUBLIC_PATHS:**
```javascript
const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/me",
  // ... otros endpoints públicos
];
```

### 4. Error: "Credenciales inválidas"

**Síntomas:**
- Error 401 en login
- Mensaje "Credenciales inválidas"

**Soluciones:**

1. **Verificar que el usuario existe:**
```sql
SELECT * FROM usuarios WHERE email = 'tu-email@ejemplo.com';
```

2. **Verificar que la contraseña esté hasheada:**
```javascript
// La contraseña debe estar hasheada con bcrypt
const isValidPassword = await bcrypt.compare(password, user.password);
```

3. **Crear un usuario de prueba:**
```sql
INSERT INTO usuarios (email, password, nombre, rol, estado) 
VALUES ('test@test.com', '$2a$10$...', 'Usuario Test', 'garzon', 1);
```

### 5. Error: "Tabla no existe"

**Síntomas:**
- Error SQL en consultas
- Mensajes de "Table doesn't exist"

**Soluciones:**

1. **Ejecutar migraciones:**
```bash
cd admin-dashboard
npm run migrate
```

2. **Verificar estructura de tablas:**
```bash
npm run check-db
```

3. **Crear tablas manualmente si es necesario:**
```sql
-- Ejemplo para tabla usuarios
CREATE TABLE usuarios (
  id_usuario INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  rol VARCHAR(50) DEFAULT 'garzon',
  estado TINYINT DEFAULT 1
);
```

## Comandos de Diagnóstico

### Verificar Estado del Sistema

```bash
# 1. Verificar base de datos
npm run check-db

# 2. Verificar endpoints
curl -X GET http://localhost:3000/api/auth/me

# 3. Verificar CORS
curl -X OPTIONS http://localhost:3000/api/auth/me \
  -H "Origin: http://localhost:8081"

# 4. Verificar logs del servidor
npm run dev
```

### Verificar Configuración

```bash
# 1. Variables de entorno
echo $DB_HOST
echo $DB_USER
echo $DB_NAME

# 2. Puerto del servidor
netstat -an | grep 3000

# 3. Proceso de Node.js
ps aux | grep node
```

## Logs Útiles

### Habilitar Logs Detallados

```javascript
// En development, agregar logs
if (process.env.NODE_ENV === 'development') {
  console.log('Request:', req.method, req.url);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
}
```

### Verificar Logs de Error

```bash
# Logs del servidor Next.js
npm run dev

# Logs de MySQL
sudo tail -f /var/log/mysql/error.log

# Logs de la aplicación
tail -f logs/combined.log
```

## Contacto y Soporte

Si los problemas persisten:

1. **Verificar logs completos**
2. **Revisar configuración de red**
3. **Verificar firewall y antivirus**
4. **Comprobar versiones de dependencias**

### Información Útil para Debug

- Versión de Node.js: `node --version`
- Versión de MySQL: `mysql --version`
- Versión de Next.js: Ver en package.json
- Sistema operativo: `uname -a`
- Memoria disponible: `free -h`
- Espacio en disco: `df -h`

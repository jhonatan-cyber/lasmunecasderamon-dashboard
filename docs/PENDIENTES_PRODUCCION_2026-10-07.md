# Revisión de producción — 7 de octubre de 2026

Se verificó GitHub y se realizó una inspección SSH de solo lectura del VPS
195.200.4.245, validando la huella ED25519 confirmada desde la consola del proveedor.
No se instalaron servicios, modificaron bases de datos ni activó el deploy.

## GitHub

- Entorno `production` creado.
- Secrets presentes: `SSH_HOST`, `SSH_USERNAME`, `SSH_PASSWORD`,
  `SSH_FINGERPRINT`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_API_URL`.
- Variable `SSH_PORT=22` presente.
- `NEXT_PUBLIC_SOCKET_URL` no es necesario para el código actual: no se encontraron
  consumidores en la aplicación.
- Falta `ENABLE_PRODUCTION_DEPLOY=true`, que debe establecerse únicamente después
  de preparar el VPS y verificar el CI.
- Los workflows corregidos siguen locales; GitHub conserva el deploy antiguo,
  que no declara el environment `production`. Publicar juntos los cambios del
  workflow, scripts, configuraciones de tests y dependencias revisadas.
- Último CI de main: fallos en cobertura, pruebas PostgreSQL y auditoría de seguridad.
  El último job E2E exitoso no demuestra que todos los recorridos se ejecutaran:
  el workflow antiguo permite omitir pruebas cuando no hay contraseña de tests.
- CodeQL: el servicio informa que code scanning no está habilitado. Revisar la
  disponibilidad del plan antes de exigir ese check.
- La API de protección de main devolvió 403 indicando que el repositorio privado
  requiere GitHub Pro o visibilidad pública para esa función. No se modificó su
  visibilidad ni el plan.

## VPS

| Elemento | Resultado |
| --- | --- |
| Node | v26.10.0; el workflow preparado exige Node 24 |
| pnpm | No disponible en PATH del usuario root |
| PM2 | No disponible en PATH del usuario root |
| PostgreSQL | Instalado y activo; escucha en loopback:5432 |
| Redis | Instalado y activo; escucha en loopback:6379 |
| Nginx | Instalado y activo; solo sitio default, puerto 80 |
| Directorio de deploy | `/var/www/lasmunecasderamon` no existe |
| `.env` del deploy | No existe |
| Dashboard en puerto 3000 | No responde; puerto no aparece escuchando |
| NetSDK Linux predeterminado | `/opt/SmartPSSLite` no existe |

Instalar Node 24, pnpm 10.30.3 y PM2; preparar la base/usuario de la aplicación
(que PostgreSQL esté activo no demuestra que la base del dashboard esté creada),
el directorio del deploy, permisos y archivo `.env`.

## Variables del VPS

Estos valores pertenecen al `.env` del servidor; el workflow nuevo lo preserva.
No hace falta duplicar las credenciales PostgreSQL o JWT en GitHub.

```dotenv
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=lasmunecasderamon
DB_USER=<usuario dedicado de la app>
DB_PASSWORD=<contraseña del usuario de PostgreSQL>
JWT_SECRET=<valor aleatorio de al menos 64 caracteres>
JWT_REFRESH_SECRET=<otro valor aleatorio independiente de al menos 64 caracteres>
REDIS_URL=redis://127.0.0.1:6379
NEXT_PUBLIC_BASE_URL=https://dashboard.xn--lasmuecasderamon-bub.com
NEXT_PUBLIC_API_URL=https://dashboard.xn--lasmuecasderamon-bub.com/api
BASE_URL=https://dashboard.xn--lasmuecasderamon-bub.com
BIOMETRIC_ENCRYPTION_KEY=<32 bytes aleatorios codificados en base64>
```

`BIOMETRIC_ENCRYPTION_KEY` se utiliza para guardar credenciales del lector cifradas.
Si se trasladan datos con credenciales ya cifradas, conservar la clave que las
cifró; una nueva clave no permite descifrarlas. JWT debe pasar la validación de
entropía del proyecto, además de la longitud mínima.

Opcionales según módulos utilizados: configuración Twilio, `KIOSK_DEVICE_SECRET`,
`DAHUA_SDK_DIR` y `BIOMETRIC_EVENTS_SDK`. No habilitar `SKIP_JWT_VALIDATION` ni
`SKIP_RATE_LIMIT` en producción. No copiar las credenciales ficticias de CI al VPS.

## Dominio y lector

El DNS público resuelve a IP de Cloudflare; esto no permite verificar desde DNS
que el origen configurado sea este VPS. Confirmar el origen en Cloudflare,
configurar Nginx con el dominio y proxy hacia 127.0.0.1:3000, y configurar HTTPS
en el origen antes de validar el acceso público.

El lector local en 192.168.0.10 necesita una conexión de red desde el VPS al local
(por ejemplo, VPN) si el dashboard de producción debe comunicarse directamente
con él. No se comprobó conectividad con el lector desde este VPS.

## Orden pendiente

1. Preparar runtime, base de datos, directorio y `.env` del VPS.
2. Configurar dominio, Nginx y HTTPS del origen.
3. Publicar los cambios revisados y obtener CI exitoso en main.
4. Activar `ENABLE_PRODUCTION_DEPLOY` y comprobar el primer despliegue.

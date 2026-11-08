# Revisión de producción — 7 de octubre de 2026

> **Actualización — 8 de noviembre de 2026.** El VPS `195.200.4.245` fue
> reemplazado por `2.24.203.52` (`srv2103521`). Las secciones _VPS_, _Dominio y
> lector_ y _Orden pendiente_ se reverificaron contra el servidor actual en esa
> fecha; el resto del documento se conserva como instantánea de la revisión
> original.

Se verificó GitHub y se realizó una inspección SSH de solo lectura del VPS
`2.24.203.52`, validando la huella ED25519 confirmada desde la consola del
proveedor. No se instalaron servicios, modificaron bases de datos ni activó el
deploy.

## GitHub

- Entorno `production` creado.
- Secrets presentes: `SSH_HOST`, `SSH_USERNAME`, `SSH_PASSWORD`,
  `SSH_FINGERPRINT`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_API_URL`.
- Variable `SSH_PORT=22` presente.
- `NEXT_PUBLIC_SOCKET_URL` no es necesario para el código actual: no se
  encontraron consumidores en la aplicación.
- Falta `ENABLE_PRODUCTION_DEPLOY=true`, que debe establecerse únicamente
  después de preparar el VPS y verificar el CI.
- Los workflows corregidos siguen locales; GitHub conserva el deploy antiguo,
  que no declara el environment `production`. Publicar juntos los cambios del
  workflow, scripts, configuraciones de tests y dependencias revisadas.
- Último CI de main: fallos en cobertura, pruebas PostgreSQL y auditoría de
  seguridad. El último job E2E exitoso no demuestra que todos los recorridos se
  ejecutaran: el workflow antiguo permite omitir pruebas cuando no hay
  contraseña de tests.
- CodeQL: el servicio informa que code scanning no está habilitado. Revisar la
  disponibilidad del plan antes de exigir ese check.
- La API de protección de main devolvió 403 indicando que el repositorio privado
  requiere GitHub Pro o visibilidad pública para esa función. No se modificó su
  visibilidad ni el plan.

## VPS

| Elemento                    | Resultado                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Node                        | v24.22.1, coincide con el Node 24 que exige el workflow                                                             |
| pnpm                        | 10.30.3 en PATH del usuario root                                                                                    |
| PM2                         | No instalado; el servicio lo gestiona systemd, no PM2                                                               |
| PostgreSQL                  | Instalado y activo; escucha en loopback:5432; base `lasmunecasderamon` creada y migrada (115 migraciones)           |
| Redis                       | Instalado y activo; escucha en loopback:6379                                                                        |
| Nginx                       | Instalado y activo; sitio `dashboard-lasmunecasderamon` en 80/443 con proxy a 127.0.0.1:3000                        |
| Directorio de deploy        | `/var/www/lasmunecasderamon-dashboard` existe; unidad systemd `lasmunecasderamon-dashboard.service` como `www-data` |
| `.env` del deploy           | Existe, con permisos `640 root:www-data`                                                                            |
| Dashboard en puerto 3000    | Responde en 127.0.0.1:3000                                                                                          |
| NetSDK Linux predeterminado | `/opt/SmartPSSLite` no existe                                                                                       |

Runtime, base de datos, directorio y `.env` ya están preparados. PM2 no hace
falta: el servicio lo gestiona systemd. La base aplica 115 migraciones, por lo
que el esquema está al día con `main`.

## Variables del VPS

Estos valores pertenecen al `.env` del servidor; el workflow nuevo lo preserva.
No hace falta duplicar las credenciales PostgreSQL o JWT en GitHub.

```dotenv
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=lasmunecasderamon
DB_USER=postgres
DB_PASSWORD=<contraseña del usuario de PostgreSQL>
JWT_SECRET=<valor aleatorio de al menos 64 caracteres>
JWT_REFRESH_SECRET=<otro valor aleatorio independiente de al menos 64 caracteres>
REDIS_URL=redis://127.0.0.1:6379
NEXT_PUBLIC_BASE_URL=https://dashboard.xn--lasmuecasderamon-bub.com
NEXT_PUBLIC_API_URL=https://dashboard.xn--lasmuecasderamon-bub.com/api
BASE_URL=https://dashboard.xn--lasmuecasderamon-bub.com
BIOMETRIC_ENCRYPTION_KEY=<32 bytes aleatorios codificados en base64>
```

`BIOMETRIC_ENCRYPTION_KEY` se utiliza para guardar credenciales del lector
cifradas. Si se trasladan datos con credenciales ya cifradas, conservar la clave
que las cifró; una nueva clave no permite descifrarlas. JWT debe pasar la
validación de entropía del proyecto, además de la longitud mínima.

Opcionales según módulos utilizados: configuración Twilio,
`KIOSK_DEVICE_SECRET`, `DAHUA_SDK_DIR` y `BIOMETRIC_EVENTS_SDK`. No habilitar
`SKIP_JWT_VALIDATION` ni `SKIP_RATE_LIMIT` en producción. No copiar las
credenciales ficticias de CI al VPS.

## Dominio y lector

El DNS público resuelve a IP de Cloudflare. Se confirmó que el origen es este
VPS: Nginx sirve `dashboard.xn--lasmuecasderamon-bub.com` en los puertos 80 y
443 con proxy hacia `127.0.0.1:3000`, y HTTPS en el origen usa el certificado de
`/etc/ssl/dashboard-origin/`.

El lector local en 192.168.0.10 necesita una conexión de red desde el VPS al
local (por ejemplo, VPN) si el dashboard de producción debe comunicarse
directamente con él. No se comprobó conectividad con el lector desde este VPS.

## Orden pendiente

1. ~~Preparar runtime, base de datos, directorio y `.env` del VPS.~~ Hecho.
2. ~~Configurar dominio, Nginx y HTTPS del origen.~~ Hecho.
3. Publicar los cambios revisados y obtener CI exitoso en main.
4. Activar `ENABLE_PRODUCTION_DEPLOY` y comprobar el primer despliegue.

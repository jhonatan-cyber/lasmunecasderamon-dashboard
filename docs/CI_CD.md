# CI/CD del dashboard

El CI ejecuta lint completo, límites de arquitectura, TypeScript, pruebas unitarias,
cobertura, PostgreSQL, Redis, migraciones, paridad de esquema, Playwright, MCP y
auditoría de dependencias en PR y push a main/master. Node 24 y pnpm del
packageManager; instalaciones con lockfile congelado. Las pruebas usan servicios
efímeros y credenciales ficticias; no requieren secretos de producción.

La base `lasmunecasderamon_test` solo es aceptada por los runners con `CI=true`
y host local. El seed de autenticación elimina el cambio obligatorio de contraseña
del administrador ficticio para ejecutar los recorridos de Playwright.

## Activación en GitHub

1. Iniciar sesión mediante `gh auth login` y publicar los cambios revisados.
2. Crear el environment `production` en el repositorio. Limitarlo a `main` y
   configurar revisores si el plan de GitHub lo permite.
3. Configurar los secretos de `production`:
   - `SSH_HOST`, `SSH_USERNAME`, `SSH_FINGERPRINT` (huella SHA256 del servidor).
   - `SSH_PRIVATE_KEY` o `SSH_PASSWORD` para la conexión autorizada.
   - `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_API_URL` y, si se utiliza,
     `NEXT_PUBLIC_SOCKET_URL`: URLs públicas de producción, definidas al compilar.
4. Variable de repositorio `SSH_PORT` opcional, por defecto 22.
5. Preparar el VPS y finalmente establecer la variable de repositorio
   `ENABLE_PRODUCTION_DEPLOY=true`.
6. En protección de `main`, exigir los checks del CI y CodeQL cuando esté disponible.
   El deployment se ejecuta después de un push a main cuyo CI haya terminado bien;
   rechaza PR, forks y commits que ya no sean la punta de main.

## Preparación del VPS

- Linux, Node 24, pnpm 10.30.3, systemd, Nginx y curl disponibles en PATH para el usuario SSH.
- Permisos de escritura sobre `/var/www/lasmunecasderamon-dashboard`.
- Archivo `/var/www/lasmunecasderamon-dashboard/.env` con las variables reales de la app,
  PostgreSQL, Redis, JWT y lector. El workflow lo conserva; no lo genera ni copia
  secretos de GitHub al archivo.
- PostgreSQL y Redis disponibles para la app; backup de PostgreSQL previo a la
  primera activación y antes de migraciones incompatibles.
- Si se usa NetSDK, instalar las bibliotecas Linux en `DAHUA_SDK_DIR` del servidor.
- Proxy inverso apuntando al puerto 3000. El nombre del servicio systemd es
  `lasmunecasderamon-dashboard`.

## Despliegue y recuperación

Cada commit se instala en `releases/<sha>`, con scripts completos y sus dependencias
de migración. Se conservan fotos en `shared/img/users` y `shared/img/products`, y
logs en `shared/logs`. Las migraciones se ejecutan antes de detener la versión actual.
Solo se reinicia el servicio systemd del dashboard; los otros servicios continúan.

Se comprueba `/api/health`, incluyendo estado sano de PostgreSQL. Si el arranque
falla, se intenta volver a la versión previa. `current` cambia después de superar
la comprobación. La recuperación de código **no revierte migraciones**: los cambios
de esquema deben ser compatibles con la versión anterior. No hay garantía de cero
interrupción, ya que ambas versiones utilizan el mismo puerto.

No se borran automáticamente versiones anteriores. Un SHA ya instalado se rechaza
para no sobrescribirlo; ante un fallo, revisar esa versión y publicar un commit nuevo.
Los errores se consultan en GitHub Actions; este workflow no envía WhatsApp.

## Verificación local realizada

- actionlint 1.7.12 sobre CI, deploy y CodeQL: sin errores.
- Instalación de comprobación con `--frozen-lockfile --lockfile-only --ignore-scripts`.
- Validación sintáctica Bash del script de despliegue y lint de los archivos cambiados.
- TypeScript (`pnpm typecheck`): correcto.
- Guardas de integración: rechazan host remoto, base de producción y la base de CI
  cuando `CI` no está habilitado.

La ejecución completa en runners Linux y el despliegue real requieren publicar los
cambios y configurar el acceso al repositorio/VPS. GitHub CLI no tenía sesión
iniciada al preparar esta configuración.

Referencias: [seguridad de workflow_run](https://docs.github.com/en/actions/reference/security/secure-use),
[SSH action](https://github.com/appleboy/ssh-action).

## Acceso privado desde el VPS

Se configuró una deploy key SSH de solo lectura dedicada a este repositorio.
La clave privada permanece en /root/.ssh/lasmunecas_dashboard_deploy y el repo
usa core.sshCommand con verificación estricta de las claves públicas de GitHub.
La excepción safe.directory está limitada a /var/www/lasmunecasderamon-dashboard.
El repositorio pertenece a www-data; la excepción permite operarlo como root.

El deploy utiliza scripts/deploy/dashboard.service para Next.js en el puerto
loopback 3000. La plantilla scripts/deploy/dashboard.nginx.conf define el proxy
HTTP; revisar la configuración HTTPS existente antes de instalarla.
El servicio requiere Node 24 en /usr/local/bin o /usr/bin, disponible para www-data.

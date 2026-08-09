# SECRETS-ROTATION — Credenciales expuestas en el historial git

**Fecha del hallazgo:** 2026-08-09 **Repositorio afectado:**
`lasmunecasderamon-dashboard` (origin:
`github.com/jhonatan-cyber/lasmunecasderamon-dashboard`) **Estado:** historial
purgado y **force-push completado** (2026-08-09, rama `main`reescrita a
`bfbf9d0`), repo local re-sincronizado; **contraseña de BD rotada (2026-08-09,
doble contraseña con `RETAIN CURRENT PASSWORD`, sin downtime)**; **rotación de
Twilio pendiente** (obligatoria). Espejo canónico:
`.dev/git-history-backup-current.git` (el viejo quedó en
`.dev/git-history-backup-stale-2026-08-09.git`, **NO usar**).

> ⚠️ La purga del historial NO revoca nada: cualquiera que haya tenido acceso al
> historial (colaboradores, forks, copias) puede tener los secretos. **Rotar es
> obligatorio**, sin importar la purga.

---

## 1. Qué quedó expuesto (sin valores)

| #   | Credencial                                                                 | Dónde estaba                                                                                                                                                   | Severidad                                                    |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | **Contraseña de BD MySQL** (valor `[REDACTADO]` / variante `[REDACTADO]+`) | `scripts/db_test.js`, `docker-compose.yml`, scripts de diagnóstico `scripts/check-*`, `test_db*.js`, `pages/api/test-connection.ts`, `tests/e2e/smoke.spec.ts` | 🔴 Alta                                                      |
| 2   | **Host de BD de producción** (valor `[REDACTADO]`) + usuario `[REDACTADO]` | mismos archivos + `scripts/backfill-anticipo-historial.mjs`, `.github/workflows/deploy.yml`                                                                    | 🟠 Media                                                     |
| 3   | **Twilio Auth Token**                                                      | `.env` / `.env.local` (commiteados en el pasado)                                                                                                               | 🔴 Alta                                                      |
| 4   | **Twilio Account SID**                                                     | `.env` / `.env.local`                                                                                                                                          | 🟠 Media                                                     |
| 5   | Números WhatsApp (Twilio + admin)                                          | `.env` / `.env.local`                                                                                                                                          | 🟡 Baja                                                      |
| 6   | `DB_USER` / `DB_NAME` / `NEXT_PUBLIC_API_URL`                              | `.env` / `.env.local`                                                                                                                                          | 🟡 Baja (no credenciales, pero contexto útil para atacantes) |

## 2. Checklist de rotación (en orden)

### Paso 0 — Confirmar visibilidad del repo

- [x] Verificado (2026-08-09): el repo es **PRIVADO** (la API de GitHub responde
      404 sin auth). Baja la exposición, pero igual hay que rotar: asumir que
      cualquiera con acceso (colaboradores, forks, copias) pudo copiar el
      historial.
- [x] Revisar **forks** (0 forks en GitHub) y quién tiene acceso de colaborador;
      asumir que el historial se copió.

### Paso 1 — Rotar la contraseña de la BD

- [x] Generar una contraseña nueva (fuerte, `openssl rand -base64 24`).
- [x] Cambiar la contraseña del usuario de la app (`nuwesoft`@`%`, @`localhost`,
      @`127.0.0.1`) en MySQL 8.4 de producción con
      `ALTER USER ... IDENTIFIED BY     <nueva> RETAIN CURRENT PASSWORD` (doble
      contraseña → sin downtime).
- [ ] Rotar `root@localhost` de la BD (solo accesible en el servidor por SSH /
      panel del hosting) — **pendiente**.
- [x] Actualizar el `.env` local (NO commitear) y el secreto del CI/CD
      `DB_PASSWORD` (vía `gh secret set`).
- [x] Confirmar que la app sigue conectando tras el deploy (health check +
      conectividad a la BD; no se creó una venta de prueba en producción para
      evitar datos sucios).

### Paso 2 — Rotar Twilio

- [ ] Entrar a Twilio Console → **Settings → API keys & tokens**.
- [ ] **Rotar el Auth Token** (Live credentials) y regenerar el SID si la
      consola lo permite.
- [ ] Actualizar el `.env` local y el secreto de CI/CD (`TWILIO_AUTH_TOKEN`).
- [ ] Si se usa Twilio Verify/WhatsApp, probar un envío real.

### Paso 3 — Verificar el código actual

- [ ] `grep -rn "<DB_PASSWORD_LEAK>\|<DB_HOST_LEAK>" . --exclude-dir=node_modules --exclude-dir=.git`
      → **0 resultados** (en el árbol actual).
- [ ] Confirmar que ningún script actual tiene credenciales hardcodeadas (todos
      deben leer de env vars).

### Paso 4 — Aplicar la purga del historial

- [x] **Force-push completado** (2026-08-09): `84f7dc9...bfbf9d0 main` (forced
      update). Espejo canónico `.dev/git-history-backup-current.git`: 262
      commits, 0 secretos en 14.189 blobs, árbol del tip **idéntico** al de
      `origin/main`.
- [x] **Repo local re-sincronizado**:
      `git fetch origin && git reset --hard     origin/main` → `main` =
      `bfbf9d0` (working tree limpio, nada que preservar).
- [ ] **Colaboradores**: cada clone debe re-clonar (o
      `git fetch origin &&     git reset --hard origin/main`) — el historial
      nuevo NO es compatible con el viejo (los hashes de TODOS los commits
      cambiaron).
- [ ] GitHub: en _Settings → Danger Zone_ considerar **bloquear force-push** y
      activar protección de rama `main` después de la purga.

## 3. Qué se ejecutó (2026-08-09) y cómo reproducir

### Ejecutado

```bash
# 0. Fix previo (commit 84f7dc9, push normal): el batch remoto (tailwind-v4)
#    había reintroducido los valores como fallback en
#    scripts/run-index-migration.mjs (+ un split roto que rompía el script).
# 1. Espejo fresco con el historial COMPLETO (262 commits):
cd .dev
git clone --mirror https://github.com/jhonatan-cyber/lasmunecasderamon-dashboard.git git-history-backup-current.git
cd git-history-backup-current.git
python ../tools/git-filter-repo --replace-text ../tools/replace-secrets.txt
# 2. Verificación: 262 commits; árbol del tip IDÉNTICO al de origin/main;
#    escaneo de blobs (cat-file --batch sobre todos los blobs) = 0 secretos.
# 3. Force-push (solo existe la rama main; 0 tags):
git remote add origin https://github.com/jhonatan-cyber/lasmunecasderamon-dashboard.git
git push --force origin main        # 84f7dc9...bfbf9d0 main (forced update)
# 4. Re-sync del repo local de trabajo:
git fetch origin && git reset --hard origin/main
```

### Reproducir desde cero (si hiciera falta re-purgar)

1. `git clone --mirror <origin-url> /tmp/purge.git` (historial completo).
2. `cd /tmp/purge.git && python <ruta-a-git-filter-repo> --replace-text <ruta-a-replace-secrets.txt>`.
3. Verificar (igual que arriba) y `git push --force origin <rama>`.

> ⚠️ El force-push rompe los clones existentes: cada colaborador debe hacer
> `git fetch origin && git reset --hard origin/main` (o re-clonar) y re-aplicar
> cualquier rama propia sobre el historial nuevo.
>
> El espejo viejo `.dev/git-history-backup-stale-2026-08-09.git` estaba
> **desactualizado** (254 commits, sin el trabajo reciente) — NO usarlo.
>
> El historial de la app móvil (`lasmunecasderamon-app`) fue revisado con
> `git log -S`: **0 ocurrencias** de los valores filtrados → no requiere purga.

## 4. Prevención a futuro

- [ ] `.env` / `.env.local` ya están en `.gitignore` — **verificar con**
      `git ls-files .env*` (debe estar vacío).
- [ ] Agregar un **pre-commit hook** o un escaneo en CI que falle si aparecen
      patrones de secretos (`gitleaks`, `trufflehog`, o un grep simple de los
      patrones `<DB_PASSWORD_LEAK>|<DB_HOST_LEAK>|TWILIO_AUTH_TOKEN`).
- [ ] Nunca commitear scripts con credenciales hardcodeadas: todo por variables
      de entorno.

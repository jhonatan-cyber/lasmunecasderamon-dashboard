# SECRETS-ROTATION — Credenciales expuestas en el historial git

**Fecha del hallazgo:** 2026-08-09 **Repositorio afectado:**
`lasmunecasderamon-dashboard` (origin:
`github.com/jhonatan-cyber/lasmunecasderamon-dashboard`) **Estado:** historial
purgado en espejo local (`.dev/git-history-backup.git`), **push pendiente** +
**rotación pendiente**.

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

- [ ] Verificar si el repo en GitHub es **público o privado** (GitHub → Settings
      → General → Danger Zone → _Change repository visibility_). Si fue público
      en algún momento, asumir exposición total.
- [ ] Revisar **forks** y quién tiene acceso de colaborador; asumir que el
      historial se copió.

### Paso 1 — Rotar la contraseña de la BD

- [ ] Generar una contraseña nueva (fuerte, p. ej. `openssl rand -base64 24`).
- [ ] Cambiar la contraseña en MySQL/MariaDB de producción para el usuario de la
      app y `root` (y en el panel del hosting si aplica).
- [ ] Actualizar el `.env` local (NO commitear) y los secretos del CI/CD (GitHub
      → Settings → Secrets: `DB_PASSWORD`).
- [ ] Confirmar que la app sigue conectando (login + una venta de prueba).

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

- [ ] Revisar el espejo purgado: `.dev/git-history-backup.git` (historial
      reescrito, 0 secretos verificado).
- [ ] **Force-push** del historial reescrito (ver abajo) y **coordinarse** con
      quien tenga clones: cada colaborador debe re-clonar (o `git fetch` +
      `git rebase`) — el historial nuevo NO es compatible con el viejo.
- [ ] GitHub: en _Settings → Danger Zone_ considerar **bloquear force-push** y
      activar protección de rama `main` después de la purga.

## 3. Comandos para aplicar la purga

El espejo purgado ya está listo y verificado. Para publicarlo:

```bash
# 1. Desde el espejo purgado, apuntar al remote real
cd .dev/git-history-backup.git
git remote add origin https://github.com/jhonatan-cyber/lasmunecasderamon-dashboard.git

# 2. Force-push de TODAS las ramas (¡reescribe el historial remoto!)
git push --force --all origin
git push --force --tags origin

# 3. En el repo local de trabajo: re-sincronizar sin perder cambios sin commitear
#    (los cambios actuales del working tree se preservan; el .git se reemplaza)
git stash push -u -m "antes-de-purga"
git fetch origin
git checkout main
git reset --hard origin/main
git stash pop
```

> ⚠️ El force-push rompe los clones existentes: cada colaborador debe hacer
> `git fetch origin && git reset --hard origin/main` (o re-clonar) y re-aplicar
> cualquier rama propia sobre el historial nuevo.

## 4. Prevención a futuro

- [ ] `.env` / `.env.local` ya están en `.gitignore` — **verificar con**
      `git ls-files .env*` (debe estar vacío).
- [ ] Agregar un **pre-commit hook** o un escaneo en CI que falle si aparecen
      patrones de secretos (`gitleaks`, `trufflehog`, o un grep simple de los
      patrones `<DB_PASSWORD_LEAK>|<DB_HOST_LEAK>|TWILIO_AUTH_TOKEN`).
- [ ] Nunca commitear scripts con credenciales hardcodeadas: todo por variables
      de entorno.

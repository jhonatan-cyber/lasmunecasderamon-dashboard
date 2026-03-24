# Las Munecas de Ramon Web

Aplicacion `Next.js 16` que combina el sitio publico y el panel operativo interno.

## Scripts principales

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm audit:web:quality
corepack pnpm audit:web:quality:json
corepack pnpm audit:web:quality:ci
corepack pnpm test:e2e:smoke
```

## Calidad y validaciones

- `lint`: revisa el codigo con ESLint compatible con Next 16.
- `typecheck`: expone deuda de TypeScript sin ocultarla dentro del build.
- `audit:web:quality`: ejecuta el skill local `@web-quality-audit` y devuelve un reporte Markdown con hallazgos por severidad.
- `audit:web:quality:json`: genera la misma auditoria en JSON para CI, artifacts y automatizaciones.
- `audit:web:quality:ci`: usa umbrales por categoria para bloquear hallazgos `high` de `Accessibility`, `SEO` y `Best Practices`.
- `test:e2e:smoke`: valida landing, login y pagina legal publica.
- `build`: compila la app con chequeo de tipos y limpia artefactos corruptos de `.next/dev/types` antes de producir el build.

## Skill local `@web-quality-audit`

Este repo incluye un skill local en [SKILL.md](D:/DEV/lasmuñecasderamon.com/lasmunecasderamon/.agents/skills/web-quality-audit/SKILL.md). No forma parte del catalogo global de la sesion; se usa dentro de este proyecto.

Usalo cuando necesites una revision web enfocada en:

- Performance
- Accessibility
- SEO
- Best Practices

Contrato esperado al invocarlo con prompts como `usa @web-quality-audit`:

1. inspeccionar el repo y los artefactos publicos;
2. ejecutar el runner si hay build disponible;
3. devolver hallazgos en `Critical`, `High`, `Medium` y `Low`;
4. cerrar con prioridades concretas de correccion.

Salidas esperadas:

- Markdown legible para terminal o review humano.
- JSON estructurado para CI y artifacts.
- Umbrales configurables por severidad global o por categoria, por ejemplo `Accessibility:high,SEO:high,Best Practices:high`.

## Variables y entorno

- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- variables de base de datos/Twilio usadas en deploy

## Flujo recomendado

1. Ejecutar `corepack pnpm lint`.
2. Ejecutar `corepack pnpm typecheck` y revisar errores conocidos.
3. Ejecutar `corepack pnpm test:e2e:smoke`.
4. Ejecutar `corepack pnpm audit:web:quality`.
5. Ejecutar `corepack pnpm build` antes de desplegar.

## Checklist manual de release

- Revisar landing en movil y desktop.
- Validar login y redireccion protegida.
- Confirmar `robots.txt`, `sitemap.xml` y `manifest.json`.
- Verificar modo oscuro, focus visible y `prefers-reduced-motion`.
- Revisar el artifact de `web-quality-audit` en CI si hubo nuevos hallazgos.
- Tomar en serio cualquier `high` de `Accessibility`, `SEO` o `Best Practices`, porque ahora pueden bloquear CI.

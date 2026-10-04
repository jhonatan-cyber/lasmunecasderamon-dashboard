# Fase 0 — Validación complementaria reproducible

Fecha: 2026-10-04.

## Referencia y alcance

Código de aplicación: `4f399cc698563892b98f642580bd54fd7cb5ada2`, en un worktree
separado (`fase0-validacion-4f399cc6`). El árbol principal tenía una migración
de Asistencia sin confirmar y no se usó para certificar resultados.

Esta referencia complementa la línea base histórica de `532a780a`. No
reconstruye retroactivamente las comprobaciones que se omitieron antes del
piloto. Los cambios sobre la referencia afectan únicamente al harness de
pruebas: fixtures sintéticos, puerto E2E configurable y medición de latencia.
Las implementaciones de negocio son las del commit indicado.

## Entorno

- Windows, AMD Ryzen 5 7520U, aproximadamente 8 GB de RAM.
- Node.js 24.20.0, Next.js 16.3.5 y Playwright 1.61.1.
- Dependencias instaladas con
  `pnpm install --offline --frozen-lockfile --ignore-scripts`.
- PostgreSQL 18.6 local; esquema y semilla del repositorio, migraciones 001–057.
- Integración/E2E: `lmr_fase0_4f399cc6_test`.
- Rendimiento: `lmr_fase0_perf_4f399cc6_test`, creada por separado.
- Redis local, base lógica 14; sin credenciales de servicios externos.
- E2E usa `http://localhost:3107`, sin reutilizar el servidor de desarrollo.

## Comprobaciones ejecutadas

| Comprobación                             | Resultado                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm lint:full`                         | Código 0; 0 errores y 1 warning preexistente en `instrumentation.ts:22` (`no-console`). |
| `pnpm typecheck`                         | Código 0; sin errores.                                                                  |
| `pnpm test:unit --maxWorkers=2`          | Código 0; 1702 aprobadas, 2 omitidas; 177 archivos aprobados y 2 omitidos.              |
| `pnpm test:postgres`                     | Código 0; 156 aprobadas en 15 archivos.                                                 |
| `pnpm test:integration:all`              | Código 0 tras preparar fixtures; 33 scripts legacy y los 9 flujos aprobados.            |
| `pnpm build`                             | Código 0; compilación, tipos, generación de páginas y service worker completados.       |
| `node scripts/arquitectura/limites.mjs`  | Código 0; 26 excepciones heredadas vigentes, sin nuevas ni obsoletas.                   |
| Medición repetida del fixture PostgreSQL | Ocho corridas completas: una descartada y siete medidas; diez flujos por corrida.       |

Las dos unitarias omitidas son `audioReal.test.ts` y `clockReal.test.ts`,
dependientes de equipos físicos. No equivalen a cobertura del hardware.

La primera ejecución de integración con la semilla estándar falló en cuatro
scripts legacy (`refunds`, `tip_repository`, `ventas_stats_repository` y
`withdrawal_repository`) y dos flujos (`cuentas_flow` y `orders_full_flow`) por
falta de datos. Se repitió con cliente, caja, habitación y cajero sintéticos y
pasó completa, sin modificar código de negocio ni relajar aserciones. El fixture
queda versionado para evitar depender de datos de una base personal.

Las primeras ejecuciones simultáneas de lint, tipos, unitarias y build se
interrumpieron por presión de memoria. No se contaron como comprobaciones
aprobadas; se repitieron lint, tipos y build en serie y las unitarias con dos
workers. Los resultados de rendimiento se obtuvieron sin otras suites ni build
ejecutándose simultáneamente.

## Preparación reproducible

Crear un worktree del commit indicado e instalar el lockfile. Aplicar los
cambios del harness de esta entrega. Configurar un `.env` local con `DB_HOST`,
`DB_PORT`, `DB_USER`, `DB_PASSWORD` y una base exclusiva cuyo nombre cumpla
`lmr_fase0_<referencia>_test`. No copiar configuraciones de equipos biométricos
ni credenciales de mensajería. Configurar secretos JWT locales aleatorios,
`TEST_USER=fase0_admin`, una `TEST_PASSWORD` de prueba y `REDIS_URL` local.

```powershell
node scripts/arquitectura/preparar-fase0.cjs
pnpm lint:full
pnpm typecheck
pnpm test:unit --maxWorkers=2
pnpm test:postgres
pnpm test:integration:all
pnpm build
$env:E2E_BASE_URL = 'http://localhost:3107'
$env:CI = '1'
node --require dotenv/config node_modules/@playwright/test/cli.js test --config playwright.config.ts
```

El fixture exige una base local con el prefijo anterior; prepara administrador,
cajero, cliente, caja abierta y habitación. No modifica usuarios de otras bases.
Las pruebas legacy comparten estado y no deben ejecutarse en paralelo.

Para medir, usar otra base nueva con la semilla estándar, sin ejecutar antes
integración. El medidor exige una base local terminada en `_test`:

```powershell
$env:DB_NAME = 'lmr_fase0_perf_4f399cc6_test'
node scripts/db-dev.js
$env:BASELINE_POOL_WARM = '4'
$env:BASELINE_RUNS = '7'
node scripts/arquitectura/medir-flujos.mjs
```

## Método de medición

Una corrida completa descartada y siete corridas medidas, en procesos nuevos y
en serie. No se ejecutaron build ni otras suites simultáneamente durante la
referencia final. Cada fixture restaura sus datos al terminar.

La duración se toma con `performance.now()` alrededor del caso de uso: excluye
preparación, calentamiento y limpieza; incluye trabajo de aplicación, commit e
invalidaciones esperadas. No es latencia HTTP ni tiempo puro del motor
PostgreSQL. La suma SQL observada por el cliente puede superar la duración del
flujo cuando hay consultas paralelas. Se conservan mediana, mínimo, máximo y
muestras crudas; los tiempos no son un umbral de CI.

Se mantienen los techos fijos de consultas existentes. Las conexiones se
retienen durante el calentamiento para asegurar cuatro clientes distintos: dos
`SELECT 1` secuenciales reutilizaban una sola conexión. El cobro pasa de una a
dos conexiones y la anulación puede llegar a cuatro; el contador anterior
incluía esos handshakes en el tiempo SQL al expandirse un pool ya iniciado. El
cambio se limita al calentamiento del test, sin alterar el pool de producción.

Los procesos son nuevos en cada corrida: la duración conserva inicializaciones
propias del caso de uso, además de las cachés que el fixture calienta
explícitamente. La referencia describe ese escenario concreto, no toda la carga
de producción.

## Resultados de latencia

| Flujo                               | Consultas | Mediana (ms) | Mínimo (ms) | Máximo (ms) |
| ----------------------------------- | --------: | -----------: | ----------: | ----------: |
| horas extras: listar                |         1 |        11.33 |       10.03 |       23.67 |
| horas extras: crear                 |         2 |       105.41 |      100.97 |      129.28 |
| cobro de cuenta con venta           |        15 |       140.34 |      137.24 |      169.31 |
| inventario: consumo sin existencias |         2 |         4.10 |        3.69 |        4.53 |
| anulación: solicitar                |         2 |         4.34 |        3.96 |        4.59 |
| anulación: aprobar parcial          |        32 |        82.57 |       74.67 |       90.50 |
| biometría: evento que registra      |         6 |        22.30 |       19.92 |       26.15 |
| biometría: evento duplicado         |         4 |         7.15 |        6.96 |        8.21 |
| anticipos: listar                   |         2 |         7.69 |        6.89 |       10.27 |
| anticipos: crear                    |         5 |        14.27 |       13.74 |       16.56 |

Evidencia: [siete corridas con cuatro conexiones](FASE0_TIEMPOS.json) y
[control con una conexión](FASE0_TIEMPOS_UNA_CONEXION.json).

En las siete corridas finales todos los flujos mantuvieron cuatro conexiones
antes y después. El conteo fue idéntico en todas las muestras. La consulta de
caja que antes aparecía como lenta dejó de incluir la expansión del pool; esto
explica ese artefacto sin atribuirlo a un índice faltante. No se afirma que la
duración completa del cobro sea únicamente tiempo de base de datos.

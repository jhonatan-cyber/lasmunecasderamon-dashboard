# Fase 1 — Contratos y restricciones

Fecha: 2026-10-03 Estado: implementada, en su alcance reducido.

## Qué entrega

| Entregable (§7, Fase 1)            | Estado                                              |
| ---------------------------------- | --------------------------------------------------- |
| Control automático de dependencias | `pnpm arquitectura:limites`                         |
| Registro de excepciones heredadas  | `docs/arquitectura/excepciones.json` — 26 entradas  |
| Contrato transaccional opaco       | `lib/transaccion/contrato.ts`                       |
| Integrado en CI                    | paso _Architecture boundaries_, antes del typecheck |
| Verificado que falla               | sí, en las tres formas de importar                  |

## La puerta

`scripts/arquitectura/limites.mjs` resuelve el mismo grafo de imports que el
diagnóstico — alias `@/`, rutas relativas e `import()` dinámico — y aplica
cuatro reglas del §5:

1. **`ui-no-infraestructura`**: `components/`, `hooks/` y la UI de `app/` no
   importan el driver ni los repositorios.
2. **`negocio-sin-framework`**: `lib/business/` no importa `next/server`.
3. **`modulos-sin-workflows`**: nadie fuera de `workflows/` importa
   `workflows/`.
4. **`sin-ciclos`**: el grafo entre dominios no tiene ciclos.

Sale con **código 1** si aparece una dependencia prohibida nueva, y también si
una excepción registrada deja de aplicar. Lo segundo importa: una deuda pagada y
no anotada es deuda que vuelve, y el control obliga a cerrar la ficha.

### Que falla de verdad

No basta con que el código exista. Se introdujo una dependencia prohibida a
propósito en `components/bar/BarCard.tsx` y se comprobó que la puerta rechaza
con código 1, primero por alias y después por `import()` dinámico:

```
✗ Dependencias prohibidas nuevas:
  [ui-no-infraestructura] components/bar/BarCard.tsx
      importa @/lib/database/db   (§5 — la UI y los hooks consumen HTTP y contratos de cliente)
```

`tests/unit/scripts/limites-arquitectura.test.ts` fija ese comportamiento con
las tres vías de importación sobre un repositorio de prueba.

## Las 26 excepciones heredadas

Viven en `docs/arquitectura/excepciones.json` y cada una tiene **motivo,
responsable y condición de eliminación**, que es lo que el §7 exige.

| Regla                   | Entradas | Qué es                                                                                        |
| ----------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `ui-no-infraestructura` | 4        | Bar, el panel de devoluciones de envases y el escáner importan tipos de `InventoryRepository` |
| `sin-ciclos`            | 22       | Las aristas de los 6 ciclos heredados                                                         |

Ninguna es silenciosa: si el archivo deja de violar la regla, la puerta falla
hasta que se borre la excepción.

## El contrato transaccional

`lib/transaccion/contrato.ts` implementa el §6. Hoy el código usa
`TransactionQuery`, que es una función `(sql, params) => rows`: quien la recibe
ejecuta lo que quiera sobre cualquier tabla, y por eso es imposible garantizar
que nadie escriba tablas ajenas aunque se reorganice todo.

`UnidadDeTrabajo` expone operaciones con nombre y un identificador. **No expone
SQL**, y un test lo comprueba: si alguien añade `trx`, `query` o `client` al
contexto, la aserción deja de compilar.

### Lo que este contrato todavía no puede hacer

**Un contrato opaco no escribe dentro de la transacción por sí solo.** Que un
módulo escriba usando la unidad es trabajo de su repositorio, y ningún módulo ha
sido migrado todavía. Se constató al escribir el test: un `INSERT` hecho desde
fuera de la unidad no se revierte, porque fue por el pool general.

Podría haberlo resuelto exponiendo la vía de escritura, pero eso sería
reintroducir el mismo `TransactionQuery` con otro nombre. Se prefirió dejarlo
explícito: la atomicidad extremo a extremo la cubre hoy `withTransaction`,
verificada en `tests/postgres/cobro-con-venta.test.ts`, y el contrato nuevo se
probará de verdad cuando el primer módulo migrado (Fase 2) pase por él.

### Un bug que encontró el test

`enUnaUnidad` marcaba la unidad como cerrada sólo en el camino feliz. Después de
un fallo quedaba reportándose **abierta**, y quien la usara podría lanzar
notificaciones sobre una transacción que ya había revertido — justo lo que el §6
prohíbe. Ahora se cierra en `finally`.

## Por qué no se creó `modules/`

El §5 propone `modules/`, `workflows/` y `shared/`. No se crean todavía.

Doce dominios declarados con **un solo módulo migrado** es el escenario donde se
construyen interfaces vacías que nadie usa, y el propio plan lo dice: _«no es
necesario crear carpetas vacías ni interfaces sin uso»_.

La regla sí está puesta, que es lo urgente: sin ella, cada fase posterior mueve
archivos sin red y el daño se descubre en la Fase 5. La estructura aparece
cuando haya código que la ocupe.

## Qué sigue

- **Fase 2**: migrar Horas extras detrás de este contrato. Con 1 consulta al
  listar y 2 al crear, es el piloto más barato y valida el patrón.
- Las 4 excepciones de UI se resolvieron en la **Fase 4**: `contracts.ts` de
  inventario existe y la UI importa desde él.
- Los 6 ciclos se rompen en las **Fases 3 y 5**, subiendo la coordinación a
  `workflows/`.

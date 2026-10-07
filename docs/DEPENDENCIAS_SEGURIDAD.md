# Seguridad de dependencias

El CI bloquea vulnerabilidades altas y críticas tanto de producción como de
desarrollo. Next.js, Axios, Sharp, fast-uri, undici, source-map-js y tinypool se
actualizan a versiones con correcciones publicadas.

## braces — CVE-2026-93687

El proveedor no publicó una versión corregida de braces 3.0.3. Se aplica
mediante `patchedDependencies` el archivo `patches/braces@3.0.3.patch`, que
limita a 128 la profundidad de los contenedores del AST antes de los recorridos
recursivos. Los tests `braces-security.test.ts` comprueban el rechazo de
entradas de 4.500 niveles sin agotar la pila y que los patrones normales de lint
continúan funcionando.

La excepción `auditConfig.ignoreCves` se limita a CVE-2026-93687 porque el audit
del registro ve la versión original, sin conocer el parche local. Los demás
avisos siguen bloqueando el CI. Retirar parche y excepción cuando exista una
versión oficial corregida.

Referencias:
[aviso del proveedor](https://github.com/micromatch/braces/issues/70),
[advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

Los overrides respetan la versión principal de brace-expansion: imponer v1 a
todas las dependencias rompe consumidores de versiones nuevas y el reporte de
cobertura.

# Actualizaciones de dependencias

Las actualizaciones menores se verifican con TypeScript, compilación, pruebas
unitarias, integración y navegador antes de integrarse. Recharts 3.10 necesita
un tipo común para los datos mensuales y semanales y permite valores ausentes en
el tooltip.

Las actualizaciones mayores de Dependabot se proponen por dependencia. Vitest y
su proveedor de cobertura se agrupan porque deben utilizar la misma versión.

## Versiones que deben conservarse

| Dependencia | Versión compatible | Motivo para aplazar el salto mayor                                                                                                             |
| ----------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript  | 5.9                | typescript-eslint rechaza TypeScript 7. El control de arquitectura y las pruebas SQL usan la API del compilador, ausente en esa actualización. |
| @types/node | 24                 | El VPS, el CI y el entorno de desarrollo utilizan Node 24. Declaraciones de Node 26 permitirían APIs que ese servidor no ofrece.               |

ESLint debe mantenerse en la versión 9: los plugins de React, accesibilidad e
imports incluidos por eslint-config-next 16.4.0 todavía excluyen ESLint 10 de
sus peer dependencies.

Vitest y coverage-v8 permanecen en 3.2.7 por decisión del propietario. Los
issues de migración a TypeScript 7, ESLint 10 y Vitest 5 están cerrados como no
planificados. Los umbrales de cobertura se mantienen.

## Actualizaciones compatibles de octubre de 2026

Radix se actualiza dentro de sus versiones principales existentes; Next.js,
eslint-config-next y bundle-analyzer se mantienen juntos en 16.4.0. Playwright
se actualiza a 1.64.0. Estas actualizaciones no cambian los contratos de la
aplicación ni las migraciones de base de datos.

Los overrides fijan los parches de DOMPurify 3.4.16, fast-uri 3.1.8,
serialize-javascript 7.0.5 y brace-expansion 1.1.21. No se fuerzan saltos
mayores en dependencias transitivas para silenciar la auditoría.

La auditoría conserva avisos de uuid (dependencia de ExcelJS), sprintf-js
(dependencia de Swagger UI, sin versión corregida publicada) y Vitest/mocker. La
corrección de Vitest requiere otra versión principal y no tiene backport a la
versión 3. El proyecto ejecuta las pruebas unitarias en jsdom; no habilita el
servidor de navegador ni los plugins mockerPlugin/interceptorPlugin del aviso.
Conservar Vitest 3 no equivale a una auditoría sin vulnerabilidades.

Referencias:
[DOMPurify](https://github.com/cure53/DOMPurify/releases/tag/3.4.16),
[fast-uri](https://github.com/fastify/fast-uri/security/advisories/GHSA-hrr3-gc8f-f4qj),
[Vitest](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) y
[sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).

Dependabot sigue actualizando parches y versiones menores de estas dependencias.
Antes de retirar estas excepciones, hay que validar el soporte de
typescript-eslint, la API del compilador, el control de arquitectura, las
pruebas SQL y el runtime del VPS.

## Validación de actualizaciones mayores

Las dependencias de ejecución (temas, iconos, Expo Push, Redis y Twilio) se
revisan separadamente de las herramientas de desarrollo. El CI debe pasar
completo en cada PR. Las pruebas de WhatsApp simulan el transporte y verifican
firmas; no envían mensajes reales. La migración de herramientas mantiene
TypeScript 5 y Vitest 3, actualiza los hooks de Husky y registra los matchers
del DOM mediante la entrada específica para Vitest de jest-dom.

La cobertura mantiene los mismos umbrales, proveedor y alcance anterior:
archivos ejecutados de lib, hooks, modules y workflows.

Guías oficiales: [migración de Vitest](https://vitest.dev/guide/migration/) y
[configuración de Husky](https://typicode.github.io/husky/get-started.html).

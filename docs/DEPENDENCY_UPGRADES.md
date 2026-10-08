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
imports incluidos por eslint-config-next 16.3.8 todavía excluyen ESLint 10 de
sus peer dependencies.

Vitest y coverage-v8 permanecen en 3.2.7. La migración a 5.0.3 pasa las 1.855
pruebas, pero registra 41,24% de cobertura de ramas frente al mínimo de 62%. El
trabajo preparado y la comparación pendiente se conservan en el
[issue #41](https://github.com/jhonatan-cyber/lasmunecasderamon-dashboard/issues/41).

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

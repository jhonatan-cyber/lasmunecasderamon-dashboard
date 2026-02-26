# 🤖 Instrucciones para Agentes de Gemini AI

Este documento establece las normativas, estándares arquitectónicos y flujos de trabajo estrictos que **todos los agentes de AI (Gemini)** deben seguir al interactuar con el código de este proyecto.

---

## 🏗️ 1. Arquitectura y Mejores Prácticas del Stack

El proyecto utiliza un stack moderno (Next.js App Router, React 19, Tailwind CSS, Radix UI, TanStack Query, Zustand, React Hook Form, Zod y MySQL2). Se exige el cumplimiento de las siguientes directrices:

### 1.1 Next.js y Renderizado
- **Server Components Primero:** Utiliza Server Components por defecto para maximizar el rendimiento y el SEO.
- **Client Components Aislados:** Restringe el uso de la directiva `'use client'` al nodo más bajo posible del árbol de componentes. Úsala únicamente donde la interactividad (manejo de estado, eventos como `onClick` o hooks de React) sea estrictamente necesaria.

### 1.2 Formularios y Validaciones
- **Stack Obligatorio:** Integra siempre `react-hook-form` junto con `@hookform/resolvers/zod` y `zod`.
- **Prohibido:** No manejes los estados de los inputs manualmente usando `useState` (salvo casos aislados, como un simple input de búsqueda independiente).

### 1.3 Fetching de Datos y Estado Global
- **Datos Asíncronos (Servidor):** Usa `@tanstack/react-query`. Todo proceso asíncrono desde el cliente (llamadas a la API vía fetch/axios, mutaciones, carga de listados) debe implementarse a través de hooks como `useQuery` o `useMutation`.
- **Estado Global (Cliente):** Usa `zustand` para gestionar y compartir estados síncronos entre componentes cuando el *prop-drilling* sea complejo o ineficiente.
- **Prohibido:** Queda completamente prohibido el uso de `useEffect` para hidratación primaria de datos o peticiones `fetch` crudas en componentes del lado cliente.

### 1.4 Diseño, UI y Componentes
- **Estándar de Estilos:** Emplea exclusívamente **Tailwind CSS**. Queda prohibido el uso de CSS en línea clásico (ej. `style={{ ... }}`).
- **Composición de Clases:** Utiliza la utilidad `cn()` (una abstracción sobre `clsx` y `tailwind-merge`) para construir o mezclar clases CSS dinámicamente sin conflictos.
- **Primitivas Accesibles:** Mantén la filosofía basada en el ecosistema `@radix-ui` (o componentes estilo *shadcn/ui*). No reinventes elementos complejos (como modales, selectores o dropdowns) utilizando divs puros; aprovecha la base accesible ya instalada.

### 1.5 Base de Datos (MySQL2) y Seguridad
- **Cero Inyección SQL:** Es inaceptable introducir vulnerabilidades de inyección SQL.
- **Prohibido:** Nunca concatenes ni interpoles variables de forma directa en un string SQL (ej. ❌ `SELECT * FROM users WHERE id = ${id}`).
- **Obligatorio:** Emplea rigurosamente **Consultas Preparadas (Prepared Statements)**, enviando los valores dinámicos como un arreglo paralelo (ej. ✅ `db.execute('SELECT * FROM users WHERE id = ?', [id])`).

---

## 💻 2. Calidad de Código y Sintaxis

- **Sintaxis de Vanguardia:** Prioriza siempre las características más modernas de TypeScript, JavaScript y Next.js. Evita implementaciones obsoletas (como react-class-components).
- **TypeScript Estricto:** **No uses `any` bajo ninguna circunstancia**. Implementa un tipado fuerte utilizando `interface` o `type` para props, respuestas de API y variables de estado. Cuando no conozcas el tipo con certeza estructural, emplea `unknown` y realiza las validaciones (*type guards*) pertinentes.
- **Clean Code:** Escribe código modularizado, autodocumentado y altamente legible. Respeta las convenciones ya establecidas de nombrado (ej., `camelCase` para utilidades, `PascalCase` para componentes React).

---

## 🧠 3. Flujo de Trabajo con Context7 MCP Server

Para asegurar la implementación de código moderno sin alucinaciones de APIs depreciadas, es obligatorio consultar el servidor MCP de **Context7** limitándose a un máximo de 3 consultas por tarea:

1. **Evita Adivinar:** Si tienes dudas documentales sobre versiones recientes de React, Next, Tailwind u otras dependencias, no asumas las reglas del código.
2. **Resuelve el ID:** Ejecuta la herramienta `resolve-library-id` pasando el nombre del producto (ej. "Next.js App Router") para obtener la identificación de Context7 obligatoria (ej. `/vercel/next.js`).
3. **Consulta Exacta:** Emplea `query-docs` utilizando el ID devuelto junto con un query técnico conciso, solicitando ejemplos o clarificación de uso de la versión vigente.

---

## 🛠️ 4. Empleo Estricto de los "Skills" Locales

Este monorepo posee directrices arquitectónicas hiper-especializadas guardadas como **Skills** localizados en la carpeta oculta `.agents` de las aplicaciones (ej. `d:\DEV\lasmuñecasderamon.com\lasmunecasderamon\.agents\skills\`).

1. **Detección Previa:** Antes de proponer código o implementar refactorizaciones complejas (diseño de vistas, componentes UI, etc), **detente y verifica** de tus instrucciones de sistema local si existe un *skill* que trate sobre el tema (ej. `ui-ux-pro-max`).
2. **Lectura Obligatoria:** Si encuentras un *skill* relacionado, utiliza obligatoriamente la herramienta local `view_file` para leer su archivo interior `SKILL.md` **por completo** antes de contestar o crear archivos.
3. **Ejecución Fiel:** Adáptate y aplica fiel y estrictamente los lineamientos que el modelo interno del *skill* te imponga para la resolución de la tarea del usuario.

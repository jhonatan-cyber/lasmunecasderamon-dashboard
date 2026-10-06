# MCP del dashboard

## Instalar en otra computadora

Requiere Node.js 20 o superior con npm y un cliente compatible con MCP por
stdio. Para usar el dashboard remoto no necesitas clonar el repositorio ni
instalar pnpm. El dashboard debe ser accesible desde esa computadora.

Copia `lasmunecas-mcp-0.1.0.tgz` a la computadora. En PowerShell, instala en una
carpeta propia usando la ruta absoluta del archivo recibido:

```powershell
npm install --prefix C:/MCP/lasmunecas --omit=dev --ignore-scripts C:/Descargas/lasmunecas-mcp-0.1.0.tgz
```

La instalación descarga las dependencias de npm; requiere acceso a internet. El
paquete ya incluye el JavaScript compilado. En macOS o Linux puedes elegir una
carpeta como `$HOME/mcp/lasmunecas` y adaptar las rutas del ejemplo.

Configura tu cliente siguiendo `mcp-config.example.json`: ejecuta `node` con la
ruta absoluta a `C:/MCP/lasmunecas/node_modules/lasmunecas-mcp/dist/index.js`.
Si el cliente no encuentra Node.js, usa la ruta absoluta al ejecutable. El
formato de configuración depende del cliente; el ejemplo usa `mcpServers`.
Reemplaza la URL y las credenciales por las del dashboard que quieres utilizar.
Puedes agregar `MCP_CODIGO` si tu rol exige código del turno.

Reinicia la conexión MCP del cliente y ejecuta `verificar_conexion`. En modo
remoto aparecen 12 herramientas: consultas y cobro. Las operaciones conservan
los permisos del usuario y el cobro requiere confirmación explícita.

Para actualizar, instala el nuevo `.tgz` en la misma carpeta y reinicia la
conexión. Para quitar el paquete:

```powershell
npm uninstall --prefix C:/MCP/lasmunecas lasmunecas-mcp
```

Después elimina la entrada del MCP en tu cliente.

## Preparar una distribución

Desde la raíz del repositorio:

```sh
pnpm --filter lasmunecas-mcp install --frozen-lockfile
pnpm --dir mcp build
pnpm --dir mcp test
```

Desde `mcp`, genera y comprueba el archivo distribuible:

```sh
npm pack --pack-destination releases
npm run test:package -- releases/lasmunecas-mcp-0.1.0.tgz
```

Crea la carpeta `releases` antes de empaquetar si todavía no existe. `prepack`
compila automáticamente; solo se incluyen `dist`, documentación, configuración
de ejemplo y metadatos. El paquete sigue siendo privado y no se publica en un
registro. Al cambiar la versión, adapta el nombre del archivo.

## Herramientas de desarrollo

Se desactivan por defecto. Para habilitarlas, configura `MCP_ENABLE_DEV_TOOLS=1`
y `MCP_REPO_ROOT` con la ruta absoluta al repositorio del dashboard, con sus
dependencias instaladas. Aparecerán 16 herramientas. Si falta `MCP_REPO_ROOT`,
el servidor rechaza el arranque en este modo.

Configura el cliente MCP para ejecutar `node` con la ruta absoluta a
`mcp/dist/index.js`. El transporte es stdio; los mensajes de arranque van a
stderr.

Variables de entorno del proceso MCP:

| Variable                    | Uso                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `MCP_BASE_URL`              | Dirección del dashboard; por defecto `http://127.0.0.1:3000`.                             |
| `MCP_EMAIL`, `MCP_PASSWORD` | Credenciales de un usuario del dashboard. Sus permisos se aplican a las herramientas.     |
| `MCP_CODIGO`                | Código del turno cuando el rol lo requiere.                                               |
| `MCP_TIMEOUT_MS`            | Tiempo máximo de una petición; por defecto 20000 ms.                                      |
| `MCP_REPO_ROOT`             | Ruta absoluta del repositorio; obligatoria cuando se habilitan comandos de desarrollo.    |
| `MCP_ENABLE_DEV_TOOLS`      | `1` habilita comandos de desarrollo y requiere `MCP_REPO_ROOT`; desactivados por defecto. |

Guarda las credenciales en la configuración privada del cliente, sin incluirlas
en el repositorio.

Ejecuta `verificar_conexion` para comprobar ping y autenticación por separado.
Devuelve texto JSON y `structuredContent` con `destino`, `ok`, `ping` y
`autenticacion`. Si alguna comprobación falla, marca `isError: true` y conserva
el resultado de la otra. Los errores incluyen un código, el estado HTTP cuando
existe y un mensaje con el siguiente paso: conexión rechazada, error de red,
timeout, credenciales faltantes o inválidas, código de turno requerido, permisos
insuficientes o respuesta inválida.

Las pruebas usan un backend simulado y comandos en un directorio temporal. No
necesitan credenciales, un dashboard en ejecución ni operaciones de cobro.
Cubren diagnóstico, renovación y rotación de tokens, y resultados de comandos
mediante el protocolo MCP real. Para comprobar el repositorio y la conexión
configurada, ejecuta `node smoke.mjs` desde `mcp`.

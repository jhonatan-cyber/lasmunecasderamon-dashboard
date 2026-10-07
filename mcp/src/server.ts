import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as consultas from './tools/consultas.js';
import * as operaciones from './tools/operaciones.js';
import * as desarrollo from './tools/desarrollo.js';
import * as solicitudes from './tools/solicitudes.js';
import { exigirAdministrador } from './admin.js';
import { fallo } from './formato.js';

type Herramienta = {
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  outputSchema?: z.ZodTypeAny;
  annotations?: any;
  // `any` a propósito: cada familia devuelve su propio sobre de resultado y el
  // SDK valida el tipo exacto en tiempo de compilación con genéricos propios.
  execute: (args: any) => Promise<any>;
};

export function crearServidor({ escritura = true, herramientasDev = false } = {}) {
  const server = new McpServer({ name: 'lasmunecas-dashboard', version: '0.2.0' });
  const familias: Record<string, Herramienta> = {
    ...consultas.herramientas,
    ...solicitudes.consultas,
    ...(escritura ? operaciones.herramientas : {}),
    ...(escritura ? solicitudes.operaciones : {}),
    ...(herramientasDev ? desarrollo.herramientas : {})
  };
  for (const [nombre, herramienta] of Object.entries(familias)) {
    server.registerTool(
      nombre,
      {
        description: herramienta.description,
        inputSchema: herramienta.inputSchema,
        // Con outputSchema el SDK exige structuredContent en cada resultado
        // exitoso y valida el sobre: sin él, el cliente sólo recibe texto.
        ...(herramienta.outputSchema ? { outputSchema: herramienta.outputSchema } : {}),
        ...('annotations' in herramienta ? { annotations: herramienta.annotations } : {})
      },
      async (args: any) => {
        try {
          await exigirAdministrador();
          return await herramienta.execute(args);
        } catch (error) {
          return fallo(error);
        }
      }
    );
  }
  return server;
}

#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as consultas from './tools/consultas.js';
import * as operaciones from './tools/operaciones.js';
import * as desarrollo from './tools/desarrollo.js';
import { config } from './config.js';

process.on('uncaughtException', error => {
  console.error('[lasmunecas-mcp] excepción no capturada:', error);
});
process.on('unhandledRejection', motivo => {
  console.error('[lasmunecas-mcp] promesa rechazada sin manejar:', motivo);
});

const server = new McpServer({ name: 'lasmunecas-dashboard', version: '0.1.0' });

const familias = {
  ...consultas.herramientas,
  ...operaciones.herramientas,
  ...(config.desarrollo ? desarrollo.herramientas : {})
};

for (const [nombre, herramienta] of Object.entries(familias)) {
  const h = herramienta as any;
  server.registerTool(
    nombre,
    { description: h.description, inputSchema: h.inputSchema },
    h.execute
  );
}

console.error(`[lasmunecas-mcp] ${Object.keys(familias).length} herramientas registradas`);

await server.connect(new StdioServerTransport());
console.error('[lasmunecas-mcp] conectado por stdio');

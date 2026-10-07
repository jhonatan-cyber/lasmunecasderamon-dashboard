#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { crearServidor } from './server.js';
import { config } from './config.js';
import { exigirAdministrador } from './admin.js';

process.on('uncaughtException', error => {
  console.error('[lasmunecas-mcp] excepción no capturada:', error);
});
process.on('unhandledRejection', motivo => {
  console.error('[lasmunecas-mcp] promesa rechazada sin manejar:', motivo);
});

const server = crearServidor({ herramientasDev: config.desarrollo });

try {
  await exigirAdministrador();
  await server.connect(new StdioServerTransport());
  console.error('[lasmunecas-mcp] conectado por stdio');
} catch (error) {
  console.error('[lasmunecas-mcp]', error instanceof Error ? error.message : 'No se pudo autorizar la conexión');
  process.exitCode = 1;
}

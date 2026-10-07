import { api, ApiError } from './api-client.js';

/** Consultar el perfil actual, nunca confiar en el rol guardado en el JWT. */
export function validarAdministrador(perfil: unknown) {
  const respuesta = perfil as {
    user?: { id?: string; role?: string };
    data?: { id?: string; role?: string };
    role?: string;
  };
  const usuario = respuesta?.user ?? respuesta?.data ?? respuesta;
  if (usuario?.role?.toLowerCase() !== 'administrador') {
    throw new ApiError(
      'Este MCP es exclusivo para administradores.',
      403,
      undefined,
      'SOLO_ADMINISTRADOR'
    );
  }
  return usuario;
}

export async function exigirAdministrador() {
  return validarAdministrador(await api('GET', '/api/mcp/admin/session'));
}

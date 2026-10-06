const MAX_CARACTERES = 20_000;

export function acotar(valor: unknown, max = MAX_CARACTERES): string {
  const texto = typeof valor === 'string' ? valor : JSON.stringify(valor, null, 2);
  if (texto.length <= max) return texto;
  return texto.slice(0, max) + `\n… [truncado: ${texto.length - max} caracteres más]`;
}

export function ok(texto: string) {
  return { content: [{ type: 'text' as const, text: texto }] };
}

export function fallo(error: unknown) {
  const mensaje = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Error: ${mensaje}` }],
    isError: true as const
  };
}

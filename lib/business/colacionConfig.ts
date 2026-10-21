export interface AcompanamientoColacion {
  /** Bebidas analcohólicas que incluye la colación; 0 = sin acompañamiento. */
  unidades: number;
  /** Ml por acompañamiento; null si la configuración no lo define. */
  ml: number | null;
}

type OpcionConAcompanamiento = {
  acompanamiento?: { unidades?: number | null } | null;
  acompanamiento_colacion?: { unidades?: number | null; ml?: number | null } | null;
};

/**
 * Acompañamiento de una colación. La configuración propia
 * (`acompanamiento_colacion`, que se guarda al transferir) manda, incluso con
 * `unidades: 0`; si no existe se hereda el de las bebidas incluidas por
 * botella, que es como se configuraba antes. La UI y el servidor usan la misma
 * regla para que el catálogo y el registro no diverjan.
 */
export function acompanamientoDeColacion(
  opcion?: OpcionConAcompanamiento | null
): AcompanamientoColacion {
  const propio = opcion?.acompanamiento_colacion;
  const unidades = Math.floor(
    Number(propio ? (propio.unidades ?? 0) : (opcion?.acompanamiento?.unidades ?? 0))
  );
  const ml = Math.floor(Number(propio?.ml ?? 0));
  return {
    unidades: Number.isFinite(unidades) ? Math.max(0, unidades) : 0,
    ml: ml > 0 ? ml : null
  };
}

type OpcionConMlColacion = {
  ml_colacion?: number | null;
};

/** Ml configurados para la colación en la opción botella; null si no los define. */
export function mlColacionConfigurado(opcion?: OpcionConMlColacion | null): number | null {
  const valor = opcion?.ml_colacion;
  if (valor === undefined || valor === null) return null;
  const ml = Math.floor(Number(valor));
  return Number.isFinite(ml) && ml > 0 ? ml : null;
}

/**
 * Ml que entrega una colación: la configuración de la opción botella y, si no
 * la hay, la capacidad de la botella. Es la única cuenta de ml de colación:
 * la UI y el servidor la comparten para que lo que se registra sea lo mismo que
 * lo que se muestra y lo que se descuenta del bar.
 */
export function mlDeColacion(
  opcion?: OpcionConMlColacion | null,
  mlBotella?: number | null
): number {
  const configurado = mlColacionConfigurado(opcion);
  if (configurado !== null) return configurado;
  const capacidad = Math.floor(Number(mlBotella ?? 0));
  return Number.isFinite(capacidad) && capacidad > 0 ? capacidad : 0;
}

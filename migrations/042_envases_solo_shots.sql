-- 042) los envases devueltos son solo de botellas servidas por shots ------------
-- El control de envases (032/033) existió para botellas que el bar abre y sirve
-- por shots: el envase vacío vuelve a almacén para reponerlo. Una botella que se
-- vendió entera se entrega cerrada al cliente: su envase nunca pasa por el bar y
-- no debe entrar al circuito bar → almacén.
--
-- El problema era que 'vendida' no distinguía los dos caminos: la botella entera
-- y la vaciada por shots quedaban idénticas (estado 'vendida', ml_restante 0), así
-- que el escaneo de devolución aceptaba cualquiera.
--
-- abierta_por_shots: true si esta unidad fue servida al menos una vez por ml
-- (un shot cliente o de anfitriona descontó contenido de la botella). Con ella,
-- la verificación de la devolución exige estado 'vendida' + abierta_por_shots:
-- la vaciada por shots es el único envase que vuelve.
ALTER TABLE inventario_unidades
  ADD COLUMN IF NOT EXISTS abierta_por_shots boolean NOT NULL DEFAULT false;

-- Las unidades históricas ya vendidas no se pueden reclasificar con certeza
-- (no hay traza de si fueron por shots), así que quedan como están: la marca
-- default false las trata como venta entera, el criterio conservador.

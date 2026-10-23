/**
 * Fecha `YYYY-MM-DD` a partir de una columna `date` de PostgreSQL.
 *
 * El driver entrega las columnas `date` como `Date` (medianoche local), así que
 * `String(valor).slice(0, 10)` devolvía "Thu Jan 15" y rompía los inputs date y
 * cualquier comparación de fechas. Con un `Date` se formatea con los getters
 * locales (la medianoche local es el día que se guardó) y con texto se recorta
 * el prefijo ISO.
 *
 * Vive fuera de `formatters` a propósito: los repositorios de servidor la usan
 * sin arrastrar el resto de los formateadores (y sus mocks de zona horaria).
 */
export const formatFechaISO = (value: string | Date | null | undefined): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const anio = value.getFullYear();
    const mes = String(value.getMonth() + 1).padStart(2, '0');
    const dia = String(value.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  return match ? match[0] : null;
};

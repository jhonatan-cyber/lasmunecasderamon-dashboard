/**
 * Servicio centralizado para manejo de zonas horarias.
 * Detecta automáticamente la región si no está configurada.
 */

export const getSystemTimezone = (): string => {
  // 1. Prioridad: Variable de entorno configurada por el usuario
  // 2. Prioridad: Zona horaria detectada del sistema (Servidor/PC)
  // 3. Fallback: America/La_Paz (por defecto histórico del proyecto)
  return (
    process.env.BUSINESS_TIMEZONE || 
    Intl.DateTimeFormat().resolvedOptions().timeZone || 
    'America/La_Paz'
  );
};

/**
 * Obtiene el desfase (offset) para SQL (ej: +04:00) de forma dinámica.
 */
export const getSQLTimezoneOffset = (): string => {
  // Si el usuario fijó un DB_TZ en el .env, lo respetamos (ej: para forzar UTC)
  if (process.env.DB_TZ) {
    return process.env.DB_TZ === 'Z' ? '+00:00' : process.env.DB_TZ;
  }

  try {
    const tz = getSystemTimezone();
    const now = new Date();
    
    // Obtenemos la hora en formato ISO para la zona horaria destino
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const getVal = (type: string) => parts.find(p => p.type === type)?.value || '0';
    
    // Construimos una fecha "local" asumiendo que el texto generado es UTC para comparar desfase
    const localDateText = `${getVal('year')}-${getVal('month')}-${getVal('day')}T${getVal('hour')}:${getVal('minute')}:${getVal('second')}Z`;
    const localDate = new Date(localDateText);
    
    // Fecha actual real en UTC
    const utcDate = new Date(now.toISOString());
    
    // Diferencia en minutos
    const diffMinutes = Math.round((localDate.getTime() - utcDate.getTime()) / 60000);
    
    const sign = diffMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(diffMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error detectando offset SQL, usando +00:00:', error);
    return '+00:00';
  }
};

export type WhatsAppSolicitudAction =
  | 'si'
  | 'no'
  | 'confirmar'
  | 'rechazar'
  | 'confirmo'
  | 'rechazo'
  | 'aprobar';

export function normalizeWhatsAppMessage(body: string) {
  return body.toLowerCase().trim();
}

export function parseSolicitudResponseCommand(message: string) {
  const match = message.match(/^(\d+)\s+(si|no|confirmar|rechazar|confirmo|rechazo|aprobar)$/i);
  if (!match) return null;

  return {
    index: Number(match[1]) - 1,
    action: match[2].toLowerCase() as WhatsAppSolicitudAction
  };
}

export function parseAnticipoCommand(message: string) {
  const match = message.match(/^(aprobar|rechazar)\s+([a-f\d-]+)$/i);
  if (!match) return null;

  return {
    action: match[1].toLowerCase() as 'aprobar' | 'rechazar',
    anticipoId: match[2]
  };
}

export function parseGratificacionCommand(message: string) {
  const match = message.match(/^(aprobar|rechazar)\s+gratificacion\s+([a-f\d-]+)$/i);
  if (!match) return null;

  return {
    action: match[1].toLowerCase() as 'aprobar' | 'rechazar',
    gratificacionId: match[2]
  };
}

export function isApprovalAction(action: WhatsAppSolicitudAction) {
  return action === 'si' || action === 'confirmar' || action === 'confirmo' || action === 'aprobar';
}

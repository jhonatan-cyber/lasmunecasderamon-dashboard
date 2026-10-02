-- 055) Verificación remota: el servidor decide la puerta (Fase C)
--
-- Con RemoteCheck activo el equipo no abre por su cuenta: manda la captura
-- (codigo 0x64 "requiere identificacion de la plataforma") y espera hasta
-- RemoteDetail.TimeOut=15 s. Si el servidor identifica a alguien con la foto
-- (1:N de la Fase B) responde con el CGI oficial:
--
--   GET /cgi-bin/accessControl.cgi?action=openDoor&channel=1&UserID=<codigo>&Type=Remote
--
-- Sin coincidencia no se responde nada y la puerta queda cerrada
-- (RemoteDetail.TimeOutDoorStatus=Close).
--
-- El habilitador es por equipo y arranca apagado: hasta que no se encienda en
-- la BD nadie entra por esta via.

ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS verificacion_remota smallint NOT NULL DEFAULT 0;

COMMENT ON COLUMN biometric_devices.verificacion_remota IS
  '1 = el servidor evalua las capturas del equipo y responde openDoor dentro del timeout.';

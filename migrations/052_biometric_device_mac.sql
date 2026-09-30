-- 052) MAC del equipo biométrico: la IP del lector no es estable
--
-- El terminal está en DHCP: si se renueva la concesión, se reinicia el router o
-- el local cambia de red WiFi, la IP guardada en `biometric_devices.ip` deja de
-- apuntar al equipo y se caen el stream en vivo, el poller, el snapshot y el
-- enrolamiento (la identidad NO se toca: sigue siendo el serial).
--
-- Con la MAC registrada el sistema puede re-encontrar el equipo él solo: barre
-- la subred, mira la tabla de vecinos (ARP), filtra por la MAC del terminal y
-- confirma con el serial antes de escribir la IP nueva. La MAC se captura sola
-- cada vez que se prueba la conexión (tabla ARP local + config de red Dahua).
ALTER TABLE biometric_devices
  ADD COLUMN IF NOT EXISTS mac varchar(64);

COMMENT ON COLUMN biometric_devices.mac IS
  'MAC(s) del equipo separadas por coma. Se captura al probar la conexión y se usa para re-encontrar su IP si el DHCP la cambia.';

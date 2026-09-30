-- 046) Credenciales de Twilio editables desde Configuraciones
--
-- El Account SID, el Auth Token, el número que envía y el número del administrador
-- vivían solo en el `.env`: cambiarlos exigía editar el archivo y reiniciar (y en
-- prod, volver a desplegar). Ahora se editan en Configuraciones → WhatsApp.
--
-- La columna `valor` queda vacía a propósito: un valor vacío significa "usa la
-- variable de entorno", así el `.env` sigue siendo el default y la salida de
-- emergencia si algo queda mal guardado acá. Solo manda lo que se guarde en la base.
--
-- `admin_whatsapp` ya existe (categoría `sistema`); el `INSERT` de abajo solo
-- asegura las tres claves nuevas.

INSERT INTO configuraciones (id, clave, valor, descripcion, categoria, tipo, fecha_crea, fecha_mod) VALUES
(gen_random_uuid()::text, 'twilio_account_sid', '', 'Account SID de Twilio', 'integraciones', 'text', now(), NULL),
(gen_random_uuid()::text, 'twilio_auth_token', '', 'Auth Token de Twilio', 'integraciones', 'text', now(), NULL),
(gen_random_uuid()::text, 'twilio_whatsapp_number', '', 'Número de WhatsApp que envía (origen)', 'integraciones', 'text', now(), NULL)
ON CONFLICT (clave) DO NOTHING;

-- Si `admin_whatsapp` no existiera en una base recién creada, va acompañada de las
-- demás para que la pestaña muestre los cuatro campos.
INSERT INTO configuraciones (id, clave, valor, descripcion, categoria, tipo, fecha_crea, fecha_mod) VALUES
(gen_random_uuid()::text, 'admin_whatsapp', '', 'WhatsApp del administrador (notificaciones internas)', 'sistema', 'text', now(), NULL)
ON CONFLICT (clave) DO NOTHING;

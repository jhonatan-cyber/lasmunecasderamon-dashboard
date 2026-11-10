-- 118) "Covers" en los permisos de entradas -----------------------------------
-- El término visible para la bebida incluida en la entrada es "cover", no
-- "cortesía". Los permisos se muestran en Configuración → Permisos, así que el
-- nombre y la descripción sembrados por la 097/106 también cambian.
UPDATE permissions
   SET name = 'Entregar covers',
       description = 'Entregar en la barra la bebida de una entrada (cover o adicional)',
       updated_at = now()
 WHERE module = 'entradas' AND action = 'deliver' AND deleted_at IS NULL;

UPDATE permissions
   SET description = 'Cobrar la entrada en la puerta y dejar el cover pendiente',
       updated_at = now()
 WHERE module = 'entradas' AND action = 'create' AND deleted_at IS NULL;

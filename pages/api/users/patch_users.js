const fs = require('fs');
const path = require('path');

const filePath = 'd:/DEV/lasmuñecasderamon.com/lasmunecasderamon/pages/api/users/index.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetQuery = "`SELECT u.*, r.nombre as rol_nombre, r.id_rol FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE r.nombre = 'anfitriona'`";
const replacementQuery = "`SELECT u.*, r.nombre as rol_nombre, r.id_rol, (SELECT COUNT(*) FROM servicios s INNER JOIN servicios_usuarios su ON s.id_servicio = su.servicio_id WHERE su.usuario_id = u.id_usuario AND s.estado = 1) as en_servicio, (SELECT h.nombre FROM servicios s INNER JOIN servicios_usuarios su ON s.id_servicio = su.servicio_id INNER JOIN habitaciones h ON s.habitacion_id = h.id_habitacion WHERE su.usuario_id = u.id_usuario AND s.estado = 1 LIMIT 1) as habitacion_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE r.nombre = 'anfitriona'`";

content = content.replace(targetQuery, replacementQuery);
content = content.replace("anfitrionasData.map(mapUserFromDB)", "anfitrionasData.map((row) => ({ ...mapUserFromDB(row), estado_servicio: row.en_servicio > 0 ? 1 : 0, habitacion_nombre: row.habitacion_nombre || null }))");

fs.writeFileSync(filePath, content);
console.log('Parchado correctamente');

const mysql = require('mysql2/promise');
async function run() {
    console.log("Connecting...");
    const connection = await mysql.createConnection({
        host: '195.200.4.245',
        user: 'nuwesoft',
        password: 'Ancasi96nuwe',
        database: 'lasmunecasderamon'
    });
    console.log("Executing sql_mode fix...");
    await connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));");
    try {
        console.log("Executing main query...");
        const [rows] = await connection.execute(`
            SELECT
                S.id_servicio, 
                S.codigo, 
                S.tiempo, 
                S.fecha_crea, 
                S.precio_servicio, 
                S.precio_habitacion,
                S.total,
                S.metodo_pago,
                COALESCE(USER_COM.comision, 0) as comision_usuario,
                H.nombre AS habitacion, 
                GROUP_CONCAT(DISTINCT 
                CASE 
                    WHEN U.nick IS NOT NULL AND U.nick != '' THEN U.nick
                    ELSE CONCAT(U.nombre, ' ', U.apellido)
                END 
                SEPARATOR ', '
                ) AS anfitriona,
                CONCAT(CL.nombre, ' ', CL.apellido) AS cliente, 
                CASE 
                WHEN SS.id_solicitud IS NOT NULL THEN
                    CASE 
                    WHEN SS.solicitado_por = SS.procesado_por THEN CONCAT(U_SOL.nombre, ' ', U_SOL.apellido)
                    ELSE CONCAT(U_SOL.nombre, ' ', U_SOL.apellido, ' / ', U_PROC.nombre, ' ', U_PROC.apellido)
                    END
                ELSE CONCAT(C_USER.nombre, ' ', C_USER.apellido)
                END AS creado_por,
                S.estado
            FROM servicios S
            INNER JOIN habitaciones H ON H.id_habitacion = S.habitacion_id
            LEFT JOIN clientes CL ON CL.id_cliente = S.cliente_id
            INNER JOIN detalle_servicios DS ON DS.servicio_id = S.id_servicio
            INNER JOIN usuarios U ON U.id_usuario = DS.usuario_id
            LEFT JOIN usuarios C_USER ON C_USER.id_usuario = S.created_by
            LEFT JOIN solicitudes_servicios SS ON SS.codigo = S.codigo
            LEFT JOIN usuarios U_SOL ON U_SOL.id_usuario = SS.solicitado_por
            LEFT JOIN usuarios U_PROC ON U_PROC.id_usuario = SS.procesado_por
            LEFT JOIN (
                SELECT C.servicio_id, DC.comision 
                FROM comisiones C 
                INNER JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision 
                WHERE DC.usuario_id = ?
            ) AS USER_COM ON USER_COM.servicio_id = S.id_servicio
            WHERE S.id_servicio IN (
                SELECT servicio_id FROM detalle_servicios WHERE usuario_id = ?
            )
            GROUP BY S.id_servicio
            ORDER BY S.fecha_crea DESC
        `, [5, 5]);
        console.log("SUCCESS, rows:", rows.length);
    } catch (e) {
        console.error("ERROR", e);
    }
    await connection.end();
}
run();

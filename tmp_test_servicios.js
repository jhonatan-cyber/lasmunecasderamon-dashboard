const mysql = require('mysql2/promise');

async function test() {
    const connection = await mysql.createConnection({
        host: '195.200.4.245',
        user: 'nuwesoft',
        password: 'Ancasi96nuwe',
        database: 'lasmunecasderamon'
    });

    try {
        console.log("Testing Query for user 5...");
        const userId = 5;
        const start = Date.now();
        const q = `
      SELECT
        S.id_servicio, 
        S.codigo, 
        S.tiempo, 
        S.fecha_crea, 
        S.precio_servicio, 
        S.precio_habitacion,
        S.total,
        S.metodo_pago,
        MAX(COALESCE(USER_COM.comision, 0)) as comision_usuario,
        MAX(COALESCE(USER_COM.pago_estado, 1)) as pago_estado,
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
          WHEN MAX(SS.id_solicitud) IS NOT NULL THEN
             CASE 
               WHEN MAX(SS.solicitado_por) = MAX(SS.procesado_por) THEN MAX(CONCAT(U_SOL.nombre, ' ', U_SOL.apellido))
               ELSE CONCAT(MAX(U_SOL.nombre), ' ', MAX(U_SOL.apellido), ' / ', MAX(U_PROC.nombre), ' ', MAX(U_PROC.apellido))
             END
          ELSE CONCAT(MAX(C_USER.nombre), ' ', MAX(C_USER.apellido))
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
        SELECT C.servicio_id, DC.comision, DC.estado as pago_estado
        FROM comisiones C 
        INNER JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision 
        WHERE DC.usuario_id = 1
    ) AS USER_COM ON USER_COM.servicio_id = S.id_servicio
    WHERE S.id_servicio IN (
        SELECT servicio_id FROM detalle_servicios WHERE usuario_id = 1
    )
    GROUP BY S.id_servicio, S.codigo, S.tiempo, S.fecha_crea, S.precio_servicio, S.precio_habitacion, S.total, S.metodo_pago, H.nombre, CL.nombre, CL.apellido, S.estado
    ORDER BY S.fecha_crea DESC
    LIMIT 10
    `;
        const [rows] = await connection.query(q);
        const end = Date.now();
        console.log(`Success! Rows: ${rows.length} Time: ${end - start}ms`);
    } catch (err) {
        console.error("Error detected:", err.message);
    } finally {
        await connection.end();
    }
}

test();

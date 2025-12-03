import { readFileSync } from 'fs';
import { join } from 'path';
import mysql from 'mysql2/promise';

async function runSQLScript() {
    let connection;

    try {
        console.log('🔄 Conectando a la base de datos...');

        // Crear conexión
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'nuwesoft',
            port: parseInt(process.env.DB_PORT || '3307'),
            multipleStatements: true // Permitir múltiples statements
        });

        console.log('✅ Conectado a la base de datos');

        // Leer el archivo SQL
        const sqlFilePath = join(process.cwd(), 'sql', 'create_retiros_caja_table.sql');
        console.log(`📄 Leyendo archivo: ${sqlFilePath}`);

        const sqlScript = readFileSync(sqlFilePath, 'utf8');

        // Ejecutar el script
        console.log('🔄 Ejecutando script SQL...');
        await connection.query(sqlScript);

        console.log('✅ Script ejecutado exitosamente');
        console.log('✅ Tabla "retiros_caja" creada correctamente');

        // Verificar que la tabla existe
        const [tables] = await connection.query(
            "SHOW TABLES LIKE 'retiros_caja'"
        );

        if (Array.isArray(tables) && tables.length > 0) {
            console.log('✅ Verificación: Tabla "retiros_caja" existe');

            // Mostrar estructura de la tabla
            const [columns] = await connection.query(
                "DESCRIBE retiros_caja"
            );

            console.log('\n📋 Estructura de la tabla:');
            console.table(columns);
        } else {
            console.warn('⚠️  No se pudo verificar la creación de la tabla');
        }

    } catch (error) {
        console.error('❌ Error al ejecutar el script SQL:');
        console.error(error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar el script
runSQLScript()
    .then(() => {
        console.log('\n✨ Proceso completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error fatal:', error);
        process.exit(1);
    });

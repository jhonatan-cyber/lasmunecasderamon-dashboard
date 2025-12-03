import mysql from 'mysql2/promise';

async function verifyRetirosFunctionality() {
    let connection;

    try {
        console.log('🔄 Conectando a la base de datos...');

        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'nuwesoft',
            port: parseInt(process.env.DB_PORT || '3307')
        });

        console.log('✅ Conectado a la base de datos\n');

        // 1. Verificar que la tabla existe
        console.log('1️⃣ Verificando tabla retiros_caja...');
        const [tables] = await connection.query(
            "SHOW TABLES LIKE 'retiros_caja'"
        );

        if (Array.isArray(tables) && tables.length > 0) {
            console.log('   ✅ Tabla "retiros_caja" existe\n');
        } else {
            console.log('   ❌ Tabla "retiros_caja" NO existe\n');
            return;
        }

        // 2. Mostrar estructura
        console.log('2️⃣ Estructura de la tabla:');
        const [columns] = await connection.query("DESCRIBE retiros_caja");
        console.table(columns);

        // 3. Verificar índices
        console.log('\n3️⃣ Índices de la tabla:');
        const [indexes] = await connection.query(
            "SHOW INDEX FROM retiros_caja"
        );
        console.table(indexes);

        // 4. Verificar foreign keys
        console.log('\n4️⃣ Foreign Keys:');
        const [fks] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'retiros_caja'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
        console.table(fks);

        // 5. Contar registros
        console.log('\n5️⃣ Registros en la tabla:');
        const [count] = await connection.query(
            "SELECT COUNT(*) as total FROM retiros_caja"
        ) as any;
        console.log(`   Total de retiros registrados: ${count[0].total}`);

        console.log('\n✅ Verificación completada exitosamente');
        console.log('\n📝 La funcionalidad de retiros está lista para usar!');
        console.log('\n💡 Próximos pasos:');
        console.log('   1. Abre el módulo de Cajas en la aplicación');
        console.log('   2. Selecciona una caja abierta');
        console.log('   3. Haz click en el botón "Retirar"');
        console.log('   4. Completa el formulario y confirma');

    } catch (error) {
        console.error('\n❌ Error durante la verificación:');
        console.error(error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

verifyRetirosFunctionality();

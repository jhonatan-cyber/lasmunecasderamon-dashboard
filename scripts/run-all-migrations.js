const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Lista de migraciones a ejecutar en orden
const MIGRATIONS = [
    {
        name: 'migration_add_comision_anfitriona',
        file: 'sql/migration_add_comision_anfitriona.sql',
        check: async (connection, dbName) => {
            const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'habitaciones' 
        AND COLUMN_NAME = 'comision_anfitriona'
        AND TABLE_SCHEMA = ?
      `, [dbName]);
            return columns.length > 0;
        }
    },
    {
        name: 'migration_hostess_assignment',
        file: 'sql/migration_hostess_assignment.sql',
        check: async (connection, dbName) => {
            const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'detalle_pedidos' 
        AND COLUMN_NAME = 'hostess_id'
        AND TABLE_SCHEMA = ?
      `, [dbName]);
            return columns.length > 0;
        }
    },
    {
        name: 'add_hostess_id_columns',
        file: 'sql/add_hostess_id_columns.sql',
        check: async (connection, dbName) => {
            // Check if already applied (this migration may overlap with hostess_assignment)
            const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'detalle_ventas' 
        AND COLUMN_NAME = 'hostess_id'
        AND TABLE_SCHEMA = ?
      `, [dbName]);
            return columns.length > 0;
        }
    },
    {
        name: 'create_retiros_caja_table',
        file: 'sql/create_retiros_caja_table.sql',
        check: async (connection, dbName) => {
            const [tables] = await connection.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'retiros_caja'
        AND TABLE_SCHEMA = ?
      `, [dbName]);
            return tables.length > 0;
        }
    },
    {
        name: 'create_detalle_pedidos_anfitrionas',
        file: 'sql/create_detalle_pedidos_anfitrionas.sql',
        check: async (connection, dbName) => {
            const [tables] = await connection.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'detalle_pedidos_anfitrionas'
        AND TABLE_SCHEMA = ?
      `, [dbName]);
            return tables.length > 0;
        }
    }
];

async function runMigrations() {
    let connection;
    const dbName = process.env.DB_NAME || 'nuwesoft';

    try {
        console.log('🔄 Conectando a la base de datos...');
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   Port: ${process.env.DB_PORT || '3306'}`);
        console.log(`   Database: ${dbName}`);

        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName,
            port: parseInt(process.env.DB_PORT || '3306'),
            multipleStatements: true
        });

        console.log('✅ Conectado a la base de datos\n');

        let migrationsRun = 0;
        let migrationsSkipped = 0;

        for (const migration of MIGRATIONS) {
            console.log(`📋 Verificando migración: ${migration.name}`);

            try {
                const alreadyApplied = await migration.check(connection, dbName);

                if (alreadyApplied) {
                    console.log(`   ⏭️  Ya aplicada, saltando...\n`);
                    migrationsSkipped++;
                    continue;
                }

                const sqlPath = path.join(__dirname, '..', migration.file);

                if (!fs.existsSync(sqlPath)) {
                    console.log(`   ⚠️  Archivo no encontrado: ${migration.file}\n`);
                    continue;
                }

                const sqlContent = fs.readFileSync(sqlPath, 'utf8');

                console.log(`   🔄 Ejecutando migración...`);
                await connection.query(sqlContent);
                console.log(`   ✅ Migración ejecutada exitosamente\n`);
                migrationsRun++;

            } catch (migrationError) {
                console.error(`   ❌ Error en migración ${migration.name}:`, migrationError.message);
                // Continue with other migrations
            }
        }

        console.log('═'.repeat(50));
        console.log(`📊 Resumen:`);
        console.log(`   ✅ Migraciones ejecutadas: ${migrationsRun}`);
        console.log(`   ⏭️  Migraciones saltadas: ${migrationsSkipped}`);
        console.log('═'.repeat(50));

    } catch (error) {
        console.error('❌ Error al conectar a la base de datos:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

runMigrations();

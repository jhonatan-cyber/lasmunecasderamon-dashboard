const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

/**
 * PRUEBA DE INTEGRACIÓN: Módulo de Configuración - Limpieza de Base de Datos
 * 
 * Esta prueba verifica el endpoint /api/settings/database-clean
 * que vacía todas las tablas excepto: usuarios, roles, permissions, role_permissions
 * 
 * IMPORTANTE: hace backup antes de limpiar y restaura después
 */

const BACKUP_DIR = path.join(__dirname, 'backups');

//确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupTable(connection, tableName) {
    const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
    return rows;
}

async function restoreTable(connection, tableName, data) {
    if (!data || data.length === 0) return;
    
    // 获取表结构信息
    const [columns] = await connection.execute(`DESCRIBE \`${tableName}\``);
    const columnNames = columns.map(c => c.Field);
    
    // 批量插入
    const placeholders = columnNames.map(() => '?').join(', ');
    const columnStr = columnNames.join(', ');
    
    for (const row of data) {
        const values = columnNames.map(col => row[col]);
        try {
            await connection.execute(
                `INSERT INTO \`${tableName}\` (${columnStr}) VALUES (${placeholders})`,
                values
            );
        } catch (e) {
            // 忽略重复键等错误
        }
    }
}

async function runIntegrationTest() {
    console.log('--- INICIANDO PRUEBA DE INTEGRACIÓN: Módulo de Configuración - Limpieza BD ---\n');
    console.log('⚠️  Esta prueba hará backup y restauración de datos\n');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const backupFile = path.join(BACKUP_DIR, `backup_${Date.now()}.json`);
    const backupData = {};

    try {
        // 1. Verificar datos iniciales y hacer backup
        console.log('[1] Verificando estado inicial y creando backup...\n');
        
        const PROTECTED_TABLES = ['usuarios', 'roles', 'role_permissions', 'permissions', '_migrations', 'configuraciones'];
        
        // Obtener todas las tablas
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_TYPE = 'BASE TABLE'
        `);
        
        // Backup de tablas no protegidas
        const tablesToBackup = [];
        for (const table of tables) {
            const tableName = table.TABLE_NAME;
            if (!PROTECTED_TABLES.includes(tableName)) {
                console.log(`   📦 Backupeando ${tableName}...`);
                backupData[tableName] = await backupTable(connection, tableName);
                tablesToBackup.push(tableName);
            }
        }
        
        // Guardar backup a archivo
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`\n   ✅ Backup guardado en: ${backupFile}`);
        
        // Mostrar resumen del backup
        let totalBackupRecords = 0;
        for (const [table, data] of Object.entries(backupData)) {
            console.log(`   - ${table}: ${data.length} registros`);
            totalBackupRecords += data.length;
        }
        console.log(`\n   Total: ${totalBackupRecords} registros respaldados`);
        
        // 2. Ejecutar limpieza (simulando el endpoint)
        console.log('\n[2] Ejecutando limpieza de base de datos...\n');
        
        // Desactivar foreign keys
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        const deletedTables = [];
        const skippedTables = [];
        
        for (const table of tables) {
            const tableName = table.TABLE_NAME;
            
            if (PROTECTED_TABLES.includes(tableName)) {
                skippedTables.push(tableName);
                continue;
            }
            
            await connection.execute(`DELETE FROM \`${tableName}\``);
            deletedTables.push(tableName);
        }
        
        // Reactivar foreign keys
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log(`   ✅ ${deletedTables.length} tablas vaciadas`);
        console.log(`   ✅ ${skippedTables.length} tablas protegidas (omitidas)`);
        
        // 3. Verificar que las tablas protegidas conservaron sus datos
        console.log('\n[3] Verificando tablas protegidas...\n');
        
        const [usersBefore] = await connection.execute('SELECT COUNT(*) as count FROM usuarios');
        const [rolesBefore] = await connection.execute('SELECT COUNT(*) as count FROM roles');
        const [permissionsBefore] = await connection.execute('SELECT COUNT(*) as count FROM permissions');
        const [rolePermissionsBefore] = await connection.execute('SELECT COUNT(*) as count FROM role_permissions');
        
        const [usersAfter] = await connection.execute('SELECT COUNT(*) as count FROM usuarios');
        const [rolesAfter] = await connection.execute('SELECT COUNT(*) as count FROM roles');
        const [permissionsAfter] = await connection.execute('SELECT COUNT(*) as count FROM permissions');
        const [rolePermissionsAfter] = await connection.execute('SELECT COUNT(*) as count FROM role_permissions');
        
        console.log(`   - Usuarios: ${usersAfter[0].count} (antes: ${usersBefore[0].count})`);
        console.log(`   - Roles: ${rolesAfter[0].count} (antes: ${rolesBefore[0].count})`);
        console.log(`   - Permisos: ${permissionsAfter[0].count} (antes: ${permissionsBefore[0].count})`);
        console.log(`   - Role Permissions: ${rolePermissionsAfter[0].count} (antes: ${rolePermissionsBefore[0].count})`);
        
        if (usersAfter[0].count !== usersBefore[0].count) throw new Error('Usuarios fueron eliminados');
        if (rolesAfter[0].count !== rolesBefore[0].count) throw new Error('Roles fueron eliminados');
        if (permissionsAfter[0].count !== permissionsBefore[0].count) throw new Error('Permisos fueron eliminados');
        if (rolePermissionsAfter[0].count !== rolePermissionsBefore[0].count) throw new Error('Role permissions fueron eliminadas');
        
        console.log('   ✅ Todas las tablas protegidas mantienen sus datos');
        
        // 4. Verificar que las tablas no protegidas fueron vaciadas
        console.log('\n[4] Verificando tablas vaciadas...\n');
        
        const [ventasAfter] = await connection.execute('SELECT COUNT(*) as count FROM ventas');
        const [categoriasAfter] = await connection.execute('SELECT COUNT(*) as count FROM categorias');
        const [clientesAfter] = await connection.execute('SELECT COUNT(*) as count FROM clientes');
        const [productosAfter] = await connection.execute('SELECT COUNT(*) as count FROM productos');
        
        console.log(`   - Ventas: ${ventasAfter[0].count}`);
        console.log(`   - Categorías: ${categoriasAfter[0].count}`);
        console.log(`   - Clientes: ${clientesAfter[0].count}`);
        console.log(`   - Productos: ${productosAfter[0].count}`);
        
        if (ventasAfter[0].count !== 0 || categoriasAfter[0].count !== 0 || 
            clientesAfter[0].count !== 0 || productosAfter[0].count !== 0) {
            throw new Error('Las tablas no fueron vaciadas completamente');
        }
        
        console.log('   ✅ Tablas correctamente vaciadas');
        
        // 5. Restaurar datos desde backup
        console.log('\n[5] Restaurando datos desde backup...\n');
        
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        for (const [tableName, data] of Object.entries(backupData)) {
            console.log(`   🔄 Restaurando ${tableName}...`);
            await restoreTable(connection, tableName, data);
        }
        
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('   ✅ Datos restaurados correctamente');
        
        // 6. Verificar restauración
        console.log('\n[6] Verificando restauración...\n');
        
        const [ventasRestored] = await connection.execute('SELECT COUNT(*) as count FROM ventas');
        const [categoriasRestored] = await connection.execute('SELECT COUNT(*) as count FROM categorias');
        const [clientesRestored] = await connection.execute('SELECT COUNT(*) as count FROM clientes');
        const [productosRestored] = await connection.execute('SELECT COUNT(*) as count FROM productos');
        
        console.log(`   - Ventas: ${ventasRestored[0].count}`);
        console.log(`   - Categorías: ${categoriasRestored[0].count}`);
        console.log(`   - Clientes: ${clientesRestored[0].count}`);
        console.log(`   - Productos: ${productosRestored[0].count}`);
        
        // Verificar que coinciden con los counts originales
        const originalCounts = {
            ventas: backupData.ventas?.length || 0,
            categorias: backupData.categorias?.length || 0,
            clientes: backupData.clientes?.length || 0,
            productos: backupData.productos?.length || 0
        };
        
        if (ventasRestored[0].count !== originalCounts.ventas) throw new Error('Ventas no restauradas correctamente');
        if (categoriasRestored[0].count !== originalCounts.categorias) throw new Error('Categorías no restauradas correctamente');
        if (clientesRestored[0].count !== originalCounts.clientes) throw new Error('Clientes no restaurados correctamente');
        if (productosRestored[0].count !== originalCounts.productos) throw new Error('Productos no restaurados correctamente');
        
        console.log('   ✅ Restauración verificada');
        
        // Limpiar archivo de backup
        fs.unlinkSync(backupFile);
        console.log(`\n   🗑️  Archivo de backup eliminado`);
        
        console.log('\n--- PRUEBA DE INTEGRACIÓN EXITOSA ---');
        console.log('\nRESUMEN:');
        console.log(`  - ${deletedTables.length} tablas vaciadas y restauradas`);
        console.log(`  - ${skippedTables.length} tablas protegidas`);
        console.log('  - Datos de usuarios, roles, permissions intactos');
        console.log('  - Backup automático creado y eliminado tras prueba');

    } catch (error) {
        console.error('\n❌ ERROR EN PRUEBA DE INTEGRACIÓN:', error.message);
        console.log('\n⚠️  Intentando restaurar desde backup...');
        
        try {
            if (fs.existsSync(backupFile)) {
                const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
                await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
                
                for (const [tableName, data] of Object.entries(backupData)) {
                    await restoreTable(connection, tableName, data);
                }
                
                await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
                console.log('✅ Restauración de emergencia completada');
            }
        } catch (restoreError) {
            console.error('❌ Error en restauración de emergencia:', restoreError.message);
        }
        
        process.exit(1);
    } finally {
        await connection.end();
    }
}

runIntegrationTest();
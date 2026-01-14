#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function auditStoredProcedures() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuwesoft',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🔍 Auditando Stored Procedures...\n');

    // Obtener todos los stored procedures
    const [procedures] = await connection.query(`
      SELECT ROUTINE_NAME 
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA = DATABASE() 
      AND ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY ROUTINE_NAME
    `);

    if (procedures.length === 0) {
      console.log('❌ No se encontraron stored procedures');
      await connection.end();
      return;
    }

    console.log(`📊 Se encontraron ${procedures.length} stored procedures:\n`);
    procedures.forEach((p, i) => {
      console.log(`${i + 1}. ${p.ROUTINE_NAME}`);
    });

    console.log('\n🔎 Buscando uso en el código...\n');

    // Leer archivos TypeScript/JavaScript del proyecto
    const projectPath = path.join(__dirname, '..');
    const usageMap = new Map();

    procedures.forEach(p => {
      usageMap.set(p.ROUTINE_NAME, { count: 0, files: [] });
    });

    // Función recursiva para buscar en archivos
    function searchInFiles(dir) {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        // Ignorar node_modules y .next
        if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'uploads' || file === 'public') {
          return;
        }

        if (stat.isDirectory()) {
          searchInFiles(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            procedures.forEach(proc => {
              const procName = proc.ROUTINE_NAME;
              // Buscar CALL procedure_name o 'procedure_name' o "procedure_name"
              const regex = new RegExp(`(CALL\\s+${procName}|['"]${procName}['"]|\\b${procName}\\b)`, 'gi');
              const matches = content.match(regex);
              
              if (matches) {
                const usage = usageMap.get(procName);
                usage.count += matches.length;
                if (!usage.files.includes(filePath)) {
                  usage.files.push(filePath);
                }
              }
            });
          } catch (e) {
            // Ignorar errores de lectura
          }
        }
      });
    }

    searchInFiles(projectPath);

    // Separar usados y no usados
    const used = [];
    const unused = [];

    usageMap.forEach((value, key) => {
      if (value.count > 0) {
        used.push({ name: key, ...value });
      } else {
        unused.push({ name: key, ...value });
      }
    });

    // Mostrar resultados
    console.log('✅ PROCEDURES USADOS:\n');
    if (used.length === 0) {
      console.log('   Ninguno encontrado en el código\n');
    } else {
      used.forEach(proc => {
        console.log(`📌 ${proc.name}`);
        console.log(`   Menciones: ${proc.count}`);
        console.log(`   Archivos:`);
        proc.files.forEach(file => {
          console.log(`     - ${file.replace(projectPath, '.')}`);
        });
        console.log('');
      });
    }

    console.log('\n❌ PROCEDURES NO USADOS:\n');
    if (unused.length === 0) {
      console.log('   Todos los procedures están siendo usados ✅\n');
    } else {
      unused.forEach((proc, i) => {
        console.log(`${i + 1}. ${proc.name}`);
      });
      console.log(`\n⚠️  Total: ${unused.length} procedures no usados`);
    }

    console.log('\n📊 RESUMEN:');
    console.log(`   Total de procedures: ${procedures.length}`);
    console.log(`   Usados: ${used.length}`);
    console.log(`   No usados: ${unused.length}`);
    console.log(`   Porcentaje de uso: ${((used.length / procedures.length) * 100).toFixed(2)}%`);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await connection.end();
    process.exit(1);
  }
}

auditStoredProcedures();

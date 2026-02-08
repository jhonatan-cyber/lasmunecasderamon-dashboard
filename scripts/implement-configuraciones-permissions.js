const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno manualmente
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
}

loadEnv();

async function implementConfiguracionesPermissions() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('🔧 IMPLEMENTANDO MÓDULO CONFIGURACIONES');
    console.log('=' .repeat(60));
    console.log('📋 Especificación: Solo permiso listar (acceso al módulo)');

    // 1. VERIFICAR PERMISOS ACTUALES DE CONFIGURACIONES
    console.log('\n📋 1. Permisos actuales del módulo configuraciones:');
    
    const [currentPerms] = await connection.query(
      "SELECT id, name, description, action FROM permissions WHERE module = 'configuraciones' ORDER BY action"
    );

    if (currentPerms.length === 0) {
      console.log('  ✗ No hay permisos para el módulo configuraciones');
    } else {
      currentPerms.forEach(perm => {
        console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
      });
    }

    // 2. DEFINIR NUEVO PERMISO SEGÚN ESPECIFICACIÓN
    console.log('\n🎯 2. Definiendo nuevo permiso según especificación:');
    
    const newPermissions = [
      {
        name: 'listar_configuraciones',
        description: 'Acceso al módulo de configuraciones',
        action: 'listar'
      }
    ];

    console.log('Nuevo permiso a crear:');
    newPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    // 3. ELIMINAR PERMISOS ANTIGUOS DEL MÓDULO CONFIGURACIONES
    console.log('\n🗑️ 3. Eliminando permisos antiguos del módulo configuraciones...');
    
    const [deletedCount] = await connection.query(
      "DELETE FROM permissions WHERE module = 'configuraciones'"
    );
    
    console.log(`  ✓ Eliminados ${deletedCount.affectedRows} permisos antiguos`);

    // 4. CREAR NUEVO PERMISO
    console.log('\n➕ 4. Creando nuevo permiso...');
    
    let createdCount = 0;
    for (const perm of newPermissions) {
      try {
        await connection.query(
          `INSERT INTO permissions (name, description, module, action) 
           VALUES (?, ?, 'configuraciones', ?)`,
          [perm.name, perm.description, perm.action]
        );
        console.log(`  ✓ Creado: ${perm.name}`);
        createdCount++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`  ⚠️  Ya existe: ${perm.name}`);
        } else {
          console.log(`  ✗ Error creando ${perm.name}: ${error.message}`);
        }
      }
    }

    console.log(`\n  ✓ Total creados: ${createdCount} permisos`);

    // 5. OBTENER ID DEL NUEVO PERMISO
    console.log('\n🔍 5. Obteniendo ID del nuevo permiso...');
    
    const [newPermsWithIds] = await connection.query(
      "SELECT id, name, action FROM permissions WHERE module = 'configuraciones' ORDER BY action"
    );

    const permMap = {};
    newPermsWithIds.forEach(perm => {
      permMap[perm.action] = perm.id;
      console.log(`  - ${perm.action}: ID ${perm.id} (${perm.name})`);
    });

    // 6. ASIGNAR PERMISOS A ROLES (LÓGICA DE NEGOCIO)
    console.log('\n👥 6. Asignando permisos a roles...');
    
    // Obtener roles
    const [roles] = await connection.query("SELECT id_rol, nombre FROM roles ORDER BY nombre");
    
    for (const role of roles) {
      let permissionsToAssign = [];
      
      switch (role.nombre.toLowerCase()) {
        case 'administrador':
          // Administrador: acceso al módulo (pero tiene acceso completo por rol)
          permissionsToAssign = Object.values(permMap);
          console.log(`  📋 Administrador: acceso al módulo (${permissionsToAssign.length} permiso)`);
          break;
          
        case 'cajero':
          // Cajero: necesita acceso a configuraciones para su trabajo
          permissionsToAssign = Object.values(permMap);
          console.log(`  💰 Cajero: acceso al módulo (${permissionsToAssign.length} permiso)`);
          break;
          
        case 'anfitriona':
          // Anfitriona: necesita acceso a configuraciones para gestión
          permissionsToAssign = Object.values(permMap);
          console.log(`  🏠 Anfitriona: acceso al módulo (${permissionsToAssign.length} permiso)`);
          break;
          
        case 'garzon':
          // Garzón: acceso a configuraciones para ver sus propias configuraciones
          permissionsToAssign = Object.values(permMap);
          console.log(`  🍽️ Garzón: acceso al módulo (${permissionsToAssign.length} permiso)`);
          break;
          
        default:
          console.log(`  ❓ Rol desconocido: ${role.nombre} - sin permisos asignados`);
          continue;
      }

      // Eliminar asignaciones anteriores para este rol en el módulo configuraciones
      await connection.query(`
        DELETE rp FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ? AND p.module = 'configuraciones'
      `, [role.id_rol]);

      // Asignar nuevos permisos
      if (permissionsToAssign.length > 0) {
        for (const permId of permissionsToAssign) {
          if (permId) {
            await connection.query(
              "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
              [role.id_rol, permId]
            );
          }
        }
      }
    }

    // 7. VERIFICACIÓN FINAL
    console.log('\n✅ 7. Verificación final del módulo configuraciones...');
    
    const [finalPerms] = await connection.query(`
      SELECT p.name, p.action, p.description,
             GROUP_CONCAT(r.nombre) as roles
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id_rol
      WHERE p.module = 'configuraciones'
      GROUP BY p.id
      ORDER BY p.action
    `);

    console.log('\nPermisos finales del módulo configuraciones:');
    finalPerms.forEach(perm => {
      const roles = perm.roles ? perm.roles.split(',') : ['Sin asignar'];
      console.log(`  📋 ${perm.action}: ${perm.name}`);
      console.log(`     📝 ${perm.description}`);
      console.log(`     👥 Roles: ${roles.join(', ')}`);
      console.log('');
    });

    // 8. ESTADÍSTICAS
    const [stats] = await connection.query(`
      SELECT 
        COUNT(*) as total_permisos,
        COUNT(DISTINCT p.action) as acciones_unicas,
        COUNT(DISTINCT rp.role_id) as roles_con_permisos
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE p.module = 'configuraciones'
    `);

    const statistics = stats[0];
    console.log('\n📊 Estadísticas del módulo configuraciones:');
    console.log(`  - Total permisos: ${statistics.total_permisos}`);
    console.log(`  - Acciones únicas: ${statistics.acciones_unicas}`);
    console.log(`  - Roles con permisos: ${statistics.roles_con_permisos}`);

    console.log('\n🎯 Implementación simple y directa:');
    console.log('  1️⃣  Acceso al módulo → listar_configuraciones');
    console.log('  2️⃣  Una vez dentro del módulo, el usuario puede navegar libremente');
    console.log('  3️⃣  Sin restricciones adicionales dentro del módulo');

    console.log('\n🔐 Implementación de libertad interna:');
    console.log('  - Muchas opciones de configuración diferentes');
    console.log('  - Flexibilidad completa para el usuario');
    console.log('  - Control solo a nivel de entrada');

    console.log('\n✅ Refinamiento del módulo configuraciones completado exitosamente');

    // 9. GENERAR CÓDIGO DE EJEMPLO PARA FRONTEND
    console.log('\n📝 9. Generando código de ejemplo para frontend...');
    
    const frontendCode = `
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { toast } from 'sonner';

export default function Configuraciones() {
  const [isLoading, setIsLoading] = useState(false);
  const [configuraciones, setConfiguraciones] = useState([]);
  const [error, setError] = useState(null);

  const fetchConfiguraciones = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener configuraciones');
      }

      setConfiguraciones(data.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al cargar configuraciones';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSaveConfiguracion = useCallback(async (configData) => {
    try {
      setError(null);

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar configuración');
      }

      toast.success('Configuración guardada exitosamente');
      fetchConfiguraciones();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar configuración';
      toast.error(message);
    }
  }, [fetchConfiguraciones]);

  if (isLoading) return <div>Cargando configuraciones...</div>;
  if (error) return <div>Error al cargar las configuraciones: {error}</div>;

  return (
    <PermissionGuard module="configuraciones" action="listar">
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
          <div className='flex flex-col'>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Configuraciones</h1>
            <p className='text-sm sm:text-base text-gray-600'>Gestiona todas las configuraciones del sistema.</p>
          </div>
          <div className='flex flex-col sm:flex-row gap-2 items-stretch sm:items-center'>
            <Button
              onClick={fetchConfiguraciones}
              size='sm'
              variant='outline'
              className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
            >
              Actualizar
            </Button>
          </div>
        </div>

        <div className='mt-4 sm:mt-6'>
          <div className='bg-white rounded-lg shadow'>
            <div className='p-6'>
              <h2 className='text-lg font-semibold mb-4'>Configuraciones del Sistema</h2>
              
              <div className='space-y-6'>
                <div className='border-b pb-4'>
                  <h3 className='text-md font-medium mb-2'>Información General</h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Nombre del Negocio</label>
                      <input
                        type='text'
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        placeholder='Nombre del negocio'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Email de Contacto</label>
                      <input
                        type='email'
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        placeholder='email@ejemplo.com'
                      />
                    </div>
                  </div>
                </div>

                <div className='border-b pb-4'>
                  <h3 className='text-md font-medium mb-2'>Configuración de Pagos</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Habilitar pagos con tarjeta</span>
                      </label>
                    </div>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Habilitar pagos con transferencia</span>
                      </label>
                    </div>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Habilitar pagos con efectivo</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className='border-b pb-4'>
                  <h3 className='text-md font-medium mb-2'>Notificaciones</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Notificaciones por email</span>
                      </label>
                    </div>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Notificaciones SMS</span>
                      </label>
                    </div>
                    <div>
                      <label className='flex items-center space-x-2'>
                        <input type='checkbox' className='rounded' />
                        <span className='text-sm'>Notificaciones push</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className='pb-4'>
                  <h3 className='text-md font-medium mb-2'>Configuración de Impuestos</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>IVA (%)</label>
                      <input
                        type='number'
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        placeholder='19'
                        min='0'
                        max='100'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Retención (%)</label>
                      <input
                        type='number'
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        placeholder='10'
                        min='0'
                        max='100'
                      />
                    </div>
                  </div>
                </div>

                <div className='pt-4'>
                  <Button
                    onClick={() => handleSaveConfiguracion({})}
                    size='lg'
                    className='w-full bg-black text-white rounded-full hover:scale-105 transition-all duration-200'
                  >
                    Guardar Configuraciones
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-red-600'>{error}</p>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
`;

    // Escribir el código de ejemplo
    fs.writeFileSync(path.join(__dirname, '../configuraciones-example.tsx'), frontendCode);
    console.log('  ✅ Código de ejemplo generado: configuraciones-example.tsx');

    // 10. GENERAR CÓDIGO DE EJEMPLO PARA BACKEND
    console.log('\n🔧 10. Generando código de ejemplo para backend...');
    
    const backendCode = `
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db';

// Función para verificar permisos
const checkPermission = async (req: NextApiRequest, module: string, action: string): Promise<boolean> => {
  try {
    // Obtener el usuario actual desde la sesión o token
    const user = (req as any).user;
    
    // Si es administrador, tiene acceso a todo
    if (user?.role?.toLowerCase() === 'administrador') {
      return true;
    }

    // Obtener el rol del usuario
    if (!user?.roleId) {
      return false;
    }

    // Consultar si el usuario tiene el permiso específico
    const [permissionCheck] = await query(\`
      SELECT COUNT(*) as has_permission 
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND p.module = ? AND p.action = ?
    \`, [user.roleId, module, action]);

    return permissionCheck[0].has_permission > 0;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Verificar permiso para listar configuraciones
    const hasPermission = await checkPermission(req, 'configuraciones', 'listar');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a las configuraciones'
      });
    }

    // Obtener configuraciones
    const configuraciones = (await query(
      'SELECT * FROM configuraciones ORDER BY categoria, nombre'
    )) as any[];

    return res.status(200).json({
      success: true,
      data: configuraciones
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener configuraciones',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Verificar permiso para editar configuraciones
    const hasPermission = await checkPermission(req, 'configuraciones', 'editar');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar configuraciones'
      });
    }

    const { configuraciones } = req.body;

    // Validar datos
    if (!configuraciones || !Array.isArray(configuraciones)) {
      return res.status(400).json({
        success: false,
        message: 'Configuraciones inválidas'
      });
    }

    // Actualizar configuraciones
    for (const config of configuraciones) {
      await query(
        'UPDATE configuraciones SET valor = ?, actualizado_en = NOW() WHERE id = ?',
        [config.valor, config.id]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Configuraciones actualizadas exitosamente'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar configuraciones',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return await handleGet(req, res);
    case 'PUT':
      return await handlePut(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ success: false, message: \`Método \${req.method} no permitido\` });
  }
}

export default withAuth(handler);
`;

    // Escribir el código de ejemplo
    fs.writeFileSync(path.join(__dirname, '../configuraciones-api-example.ts'), backendCode);
    console.log('  ✅ Código de ejemplo generado: configuraciones-api-example.ts');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

implementConfiguracionesPermissions();

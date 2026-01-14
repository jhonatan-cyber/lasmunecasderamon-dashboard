const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedAnfitrionas() {
  console.log('=== CREANDO SEED DE 5 ANFITRIONAS ===\n');
  
  const config = {
    host: '127.0.0.1',
    user: 'nuwesoft',
    password: '***REMOVED***',
    database: 'lasmunecasderamon',
    port: 3306
  };

  const connection = await mysql.createConnection(config);

  try {
    // Datos de las 5 anfitrionas
    const anfitrionas = [
      {
        run: '11111111',
        nick: 'anfitriona1',
        nombre: 'María',
        apellido: 'González',
        direccion: 'Calle Principal 123',
        telefono: '70000001',
        estado_civil: 'Soltero/a',
        afp: 'AFP por defecto',
        aporte: 500,
        sueldo: 3000,
        descuento: 100,
        email: 'maria@lasmuñecasderamon.com',
        foto: 'default.png'
      },
      {
        run: '22222222',
        nick: 'anfitriona2',
        nombre: 'Carolina',
        apellido: 'López',
        direccion: 'Avenida Secundaria 456',
        telefono: '70000002',
        estado_civil: 'Soltero/a',
        afp: 'AFP por defecto',
        aporte: 500,
        sueldo: 3000,
        descuento: 100,
        email: 'carolina@lasmuñecasderamon.com',
        foto: 'default.png'
      },
      {
        run: '33333333',
        nick: 'anfitriona3',
        nombre: 'Rosa',
        apellido: 'Martínez',
        direccion: 'Calle Tercera 789',
        telefono: '70000003',
        estado_civil: 'Casado/a',
        afp: 'AFP por defecto',
        aporte: 500,
        sueldo: 3500,
        descuento: 150,
        email: 'rosa@lasmuñecasderamon.com',
        foto: 'default.png'
      },
      {
        run: '44444444',
        nick: 'anfitriona4',
        nombre: 'Alejandra',
        apellido: 'García',
        direccion: 'Avenida Cuarta 321',
        telefono: '70000004',
        estado_civil: 'Soltero/a',
        afp: 'AFP por defecto',
        aporte: 500,
        sueldo: 3000,
        descuento: 100,
        email: 'alejandra@lasmuñecasderamon.com',
        foto: 'default.png'
      },
      {
        run: '55555555',
        nick: 'anfitriona5',
        nombre: 'Daniela',
        apellido: 'Rodríguez',
        direccion: 'Calle Quinta 654',
        telefono: '70000005',
        estado_civil: 'Casado/a',
        afp: 'AFP por defecto',
        aporte: 500,
        sueldo: 3500,
        descuento: 150,
        email: 'daniela@lasmuñecasderamon.com',
        foto: 'default.png'
      }
    ];

    console.log('Creando anfitrionas...\n');
    
    for (const anfitriona of anfitrionas) {
      try {
        // Hashear el password (CI del usuario)
        const passwordHash = await bcrypt.hash(anfitriona.run, 10);
        
        // Verificar si el usuario ya existe
        const [existing] = await connection.query(
          'SELECT id_usuario FROM usuarios WHERE run = ?',
          [anfitriona.run]
        );
        
        if (existing.length > 0) {
          console.log(`⚠️  Usuario con CI ${anfitriona.run} ya existe (ID: ${existing[0].id_usuario})`);
          continue;
        }

        // Insertar el nuevo usuario
        const [result] = await connection.query(
          `INSERT INTO usuarios (
            run, nick, nombre, apellido, direccion, telefono, 
            estado_civil, afp, aporte, sueldo, descuento, email, 
            password, rol_id, foto, estado, fecha_crea
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            anfitriona.run,
            anfitriona.nick,
            anfitriona.nombre,
            anfitriona.apellido,
            anfitriona.direccion,
            anfitriona.telefono,
            anfitriona.estado_civil,
            anfitriona.afp,
            anfitriona.aporte,
            anfitriona.sueldo,
            anfitriona.descuento,
            anfitriona.email,
            passwordHash,
            3, // rol_id para anfitriona
            anfitriona.foto,
            1  // estado activo
          ]
        );

        console.log(`✅ Anfitriona creada: ${anfitriona.nombre} ${anfitriona.apellido}`);
        console.log(`   - ID: ${result.insertId}`);
        console.log(`   - Nick: ${anfitriona.nick}`);
        console.log(`   - CI: ${anfitriona.run}`);
        console.log(`   - Password: ${anfitriona.run} (hasheado)`);
        console.log();
      } catch (error) {
        console.error(`❌ Error creando anfitriona ${anfitriona.nombre}:`, error.message);
      }
    }

    console.log('--- VERIFICAR ANFITRIONAS CREADAS ---');
    const [newAnfitrionas] = await connection.query(
      'SELECT id_usuario, run, nick, nombre, apellido, rol_id FROM usuarios WHERE rol_id = 3 ORDER BY id_usuario DESC LIMIT 5'
    );
    console.log('\nÚltimas 5 anfitrionas:');
    console.log(JSON.stringify(newAnfitrionas, null, 2));

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await connection.end();
    console.log('\n=== FIN DEL SEED ===');
  }
}

seedAnfitrionas().catch(console.error);

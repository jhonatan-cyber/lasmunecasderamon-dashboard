import { query, generateUUID } from '@/lib/db';
import { getUsersList, getAnfitrionas } from '@/lib/procedures';
import { UserCreateSchema, UserUpdateSchema } from '@/lib/schemas';
import bcrypt from 'bcryptjs';

export class UserRepository {
  private static mapUserFromDB(row: any) {
    return {
      ...row,
      id: row.id_usuario,
      name: row.nombre,
      lastName: row.apellido,
      phone: row.telefono,
      address: row.direccion,
      maritalStatus: row.estado_civil,
      role: row.rol_nombre,
      roleId: row.id_rol,
      salary: row.sueldo,
      contributions: row.aporte,
      discount: row.descuento,
      status: row.estado,
      created_at: row.fecha_crea,
      updated_at: row.fecha_mod,
    };
  }

  static async getAll(anfitrionas?: string) {
    const data = (anfitrionas === '1') ? await getAnfitrionas() : await getUsersList();
    return data.map(this.mapUserFromDB);
  }

  static async create(data: any, fotoFilename: string = 'default.png') {
    const validated = UserCreateSchema.parse(data);
    
    // Check if RUN already exists
    const existing = await query<any[]>('SELECT id_usuario FROM usuarios WHERE run = ?', [validated.run]);
    if (existing.length > 0) {
      throw new Error('El RUN ya está registrado');
    }

    const id = generateUUID();
    const email = `${validated.nick}@lasmuñecasderamon.com`;
    const password = await bcrypt.hash(validated.run, 10);

    await query(`
      INSERT INTO usuarios (
        id_usuario, run, nick, nombre, apellido, direccion, telefono, 
        estado_civil, afp, rol_id, sueldo, aporte, descuento, foto, email, password, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      id, validated.run, validated.nick, validated.nombre, validated.apellido, 
      validated.direccion || '', validated.telefono, validated.estado_civil || '', 
      validated.afp, validated.rol_id, validated.sueldo || 0, validated.aporte || 0, 
      validated.descuento || 0, fotoFilename, email, password
    ]);

    return id;
  }

  static async update(id: string, data: any, fotoFilename: string | null = null) {
    const validated = UserUpdateSchema.parse({ ...data, id });

    const existing = await query<any[]>('SELECT foto FROM usuarios WHERE id_usuario = ?', [id]);
    if (!existing.length) throw new Error('Usuario no encontrado');

    const finalFoto = fotoFilename || data.foto || existing[0].foto || 'default.png';
    const email = validated.nick ? `${validated.nick}@lasmuñecasderamon.com` : undefined;
    const password = validated.run ? await bcrypt.hash(validated.run, 10) : undefined;

    await query(`
      UPDATE usuarios SET 
        run = COALESCE(?, run), nick = COALESCE(?, nick), 
        nombre = COALESCE(?, nombre), apellido = COALESCE(?, apellido), 
        direccion = COALESCE(?, direccion), telefono = COALESCE(?, telefono), 
        estado_civil = COALESCE(?, estado_civil), afp = COALESCE(?, afp), 
        rol_id = COALESCE(?, rol_id), sueldo = COALESCE(?, sueldo), 
        aporte = COALESCE(?, aporte), descuento = COALESCE(?, descuento),
        foto = ?, email = COALESCE(?, email), password = COALESCE(?, password)
      WHERE id_usuario = ?
    `, [
      validated.run ?? null, validated.nick ?? null, validated.nombre ?? null, validated.apellido ?? null,
      validated.direccion ?? null, validated.telefono ?? null, validated.estado_civil ?? null, validated.afp ?? null,
      (validated.rol_id !== undefined && validated.rol_id !== '') ? validated.rol_id : null,
      validated.sueldo ?? null, validated.aporte ?? null, validated.descuento ?? null,
      finalFoto, email ?? null, password ?? null, id
    ]);
  }

  /**
   * Obtiene anfitrionas activas con información extendida (en servicio, habitación).
   */
  static async getAnfitrionasActivas() {
    const data = await getAnfitrionas();
    return data.map(this.mapUserFromDB);
  }

  /**
   * Obtiene el staff activo (garzones, meseros, cajeros, anfitrionas).
   */
  static async getStaff() {
    const results = (await query(`
      SELECT 
        U.id_usuario, U.run, U.nick, U.nombre, U.apellido, U.direccion, U.telefono,
        U.estado_civil, U.afp, U.aporte, U.descuento, U.sueldo, U.email,
        R.nombre as rol_nombre, R.id_rol, U.foto, U.estado, U.fecha_crea, U.fecha_mod, U.fecha_baja
      FROM usuarios U
      INNER JOIN roles R ON R.id_rol = U.rol_id
      WHERE U.estado = 1
      ORDER BY U.nombre, U.apellido
    `)) as any[];

    return results
      .filter((user: any) => {
        const roleLower = user.rol_nombre?.toLowerCase() || '';
        return roleLower.includes('garzon') || roleLower.includes('mesero') || 
               roleLower.includes('cajero') || roleLower.includes('anfitriona');
      })
      .map(row => ({
        ...this.mapUserFromDB(row),
        housing_discount: false // Valor por defecto compatible
      }));
  }

  static async updateStatus(id: string, action: string) {
    const newStatus = action === 'activate' ? 1 : 0;
    await query('UPDATE usuarios SET estado = ? WHERE id_usuario = ?', [newStatus, id]);
  }

  static async delete(id: string) {
    await query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
  }

  static async getAvailableAnfitrionas() {
    return await query(`
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id_rol
      WHERE r.nombre = 'anfitriona' AND u.estado = 1 AND u.estado_servicio = 0
    `);
  }

  static async getById(id: string) {
    const res = await query<any[]>(`
      SELECT u.*, r.nombre as rol_nombre 
      FROM usuarios u 
      INNER JOIN roles r ON u.rol_id = r.id_rol 
      WHERE u.id_usuario = ?
    `, [id]);
    return res.length > 0 ? this.mapUserFromDB(res[0]) : null;
  }

  static async getByNick(nick: string) {
    const res = await query<any[]>(`
      SELECT u.*, r.nombre as rol_nombre 
      FROM usuarios u 
      INNER JOIN roles r ON u.rol_id = r.id_rol 
      WHERE u.nick = ?
    `, [nick]);
    return res.length > 0 ? this.mapUserFromDB(res[0]) : null;
  }

  static async updateServiceStatus(id: string, status: number) {
    await query('UPDATE usuarios SET estado_servicio = ? WHERE id_usuario = ?', [status, id]);
  }
}

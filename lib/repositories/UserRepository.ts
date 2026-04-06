import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { UserSchema, type UserType } from '@/lib/business/schemas';
import { BaseRepository } from './BaseRepository';

export class UserRepository {
  private static readonly TABLE = 'usuarios';
  private static readonly ID_COL = 'id_usuario';

  private static mapUserFromDB(row: any): UserType {
    const user = {
      id: row.id_usuario,
      run: row.run || '',
      nick: row.nick,
      name: row.nombre,
      lastName: row.apellido,
      email: row.email,
      phone: row.telefono,
      address: row.direccion,
      maritalStatus: row.estado_civil,
      afp: row.afp,
      rol_id: row.id_rol || row.rol_id,
      role: row.rol_nombre,
      salary: row.sueldo,
      contributions: row.aporte,
      discount: row.descuento,
      foto: row.foto,
      status: row.estado,
      estado_servicio: row.estado_servicio,
      created_at: row.fecha_crea,
      updated_at: row.fecha_mod,
      qr_token: row.qr_token
    };

    return UserSchema.parse(user);
  }

  static async getAll(params?: {
    anfitrionas?: string;
    search?: string;
    status?: string | number;
    role?: string;
    loggedIn?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ data: UserType[]; total: number }> {
    let where = 'WHERE 1=1';
    let sqlParams: any[] = [];

    if (params?.anfitrionas === '1') {
      where += " AND LOWER(r.nombre) = 'anfitriona'";
    }

    if (params?.search) {
      where +=
        ' AND (u.nombre LIKE ? OR u.apellido LIKE ? OR u.nick LIKE ? OR u.run LIKE ? OR u.email LIKE ?)';
      const search = `%${params.search}%`;
      sqlParams.push(search, search, search, search, search);
    }

    if (params?.status !== undefined && params?.status !== 'all') {
      where += ' AND u.estado = ?';
      const isStatusActive = params.status === 'active' || Number(params.status) === 1;
      sqlParams.push(isStatusActive ? 1 : 0);
    }

    if (params?.role && params?.role !== 'all') {
      where += ' AND LOWER(r.nombre) = LOWER(?)';
      sqlParams.push(params.role);
    }

    const loginJoin = params?.loggedIn
      ? 'INNER JOIN logins l ON l.usuario_id = u.id_usuario AND l.estado = 1'
      : '';

    const countSql = `
      SELECT COUNT(*) as total 
      FROM usuarios u 
      LEFT JOIN roles r ON u.rol_id = r.id_rol
      ${loginJoin}
      ${where}
    `;

    const dataSql = `
      SELECT u.id_usuario, u.run, u.nick, u.nombre, u.apellido, u.foto, u.estado, u.estado_servicio, u.telefono, u.email, u.direccion, u.estado_civil, u.afp, u.sueldo, u.aporte, u.descuento, u.fecha_crea, u.fecha_mod, u.qr_token, r.nombre as rol_nombre, r.id_rol 
      FROM usuarios u 
      LEFT JOIN roles r ON u.rol_id = r.id_rol
      ${loginJoin}
      ${where}
      ORDER BY u.fecha_crea DESC
      ${params?.limit !== undefined ? 'LIMIT ? OFFSET ?' : ''}
    `;

    const countRes = await query<any[]>(countSql, sqlParams);
    const total = countRes[0]?.total || 0;

    const queryParams =
      params?.limit !== undefined ? [...sqlParams, params.limit, params.offset || 0] : sqlParams;

    const data = await query<any[]>(dataSql, queryParams);
    if (!data || !Array.isArray(data)) return { data: [], total: 0 };

    return {
      data: data.map(row => this.mapUserFromDB(row)),
      total
    };
  }

  static async getById(id: string): Promise<UserType | null> {
    const results = await query<any[]>(
      `
      SELECT u.*, r.nombre as rol_nombre, r.id_rol 
      FROM usuarios u 
      LEFT JOIN roles r ON u.rol_id = r.id_rol
      WHERE u.id_usuario = ?
    `,
      [id]
    );

    return results.length > 0 ? this.mapUserFromDB(results[0]) : null;
  }

  static async getByRun(run: string): Promise<UserType | null> {
    const row = await BaseRepository.findOne<any>(query, this.TABLE, 'run', run);
    return row ? this.mapUserFromDB(row) : null;
  }

  static async getByNick(nick: string): Promise<UserType | null> {
    const row = await BaseRepository.findOne<any>(query, this.TABLE, 'nick', nick);
    return row ? this.mapUserFromDB(row) : null;
  }

  static async create(
    data: Partial<UserType> & { password?: string; email?: string },
    fotoFilename: string = 'default.png'
  ): Promise<UserType | null> {
    const id = generateUUID();
    await BaseRepository.insert(query, this.TABLE, {
      [this.ID_COL]: id,
      run: data.run,
      nick: data.nick,
      nombre: data.name,
      apellido: data.lastName,
      direccion: data.address || '',
      telefono: data.phone,
      estado_civil: data.maritalStatus || '',
      afp: data.afp,
      rol_id: data.rol_id,
      sueldo: data.salary || 0,
      aporte: data.contributions || 0,
      descuento: data.discount || 0,
      foto: fotoFilename,
      email: data.email,
      password: data.password,
      estado: 1,
      estado_servicio: 0,
      fecha_crea: getNowInBusinessTimezone()
    });
    return await this.getById(id);
  }

  static async update(
    id: string,
    data: Partial<UserType> & { password?: string; email?: string },
    fotoFilename: string | null = null
  ): Promise<UserType | null> {
    const upData: any = {
      run: data.run,
      nick: data.nick,
      nombre: data.name,
      apellido: data.lastName,
      direccion: data.address,
      telefono: data.phone,
      estado_civil: data.maritalStatus,
      afp: data.afp,
      rol_id: data.rol_id !== undefined && data.rol_id !== '' ? data.rol_id : undefined,
      sueldo: data.salary,
      aporte: data.contributions,
      descuento: data.discount,
      foto: fotoFilename ?? data.foto,
      email: data.email,
      password: data.password,
      fecha_mod: getNowInBusinessTimezone()
    };

    await BaseRepository.update(query, this.TABLE, this.ID_COL, id, upData);
    return await this.getById(id);
  }

  static async updateStatus(id: string, action: string): Promise<UserType | null> {
    const newStatus = action === 'activate' ? 1 : 0;
    await BaseRepository.update(query, this.TABLE, this.ID_COL, id, {
      estado: newStatus,
      fecha_mod: getNowInBusinessTimezone()
    });
    return await this.getById(id);
  }

  static async updateServiceStatus(id: string, status: number): Promise<void> {
    await BaseRepository.update(query, this.TABLE, this.ID_COL, id, { estado_servicio: status });
  }

  static async delete(id: string): Promise<void> {
    await BaseRepository.delete(query, this.TABLE, this.ID_COL, id);
  }

  static async getStaff(): Promise<UserType[]> {
    const results = await query<any[]>(`
      SELECT 
        U.*, R.nombre as rol_nombre, R.id_rol
      FROM usuarios U
      INNER JOIN roles R ON R.id_rol = U.rol_id
      WHERE U.estado = 1 
      AND (LOWER(R.nombre) LIKE '%garzon%' OR LOWER(R.nombre) LIKE '%mesero%' OR LOWER(R.nombre) LIKE '%cajero%' OR LOWER(R.nombre) LIKE '%anfitriona%')
      ORDER BY U.nombre, U.apellido
    `);

    return results.map(row => this.mapUserFromDB(row));
  }

  static async getAvailableAnfitrionas(): Promise<UserType[]> {
    const data = await query<any[]>(`
      SELECT u.*, r.nombre as rol_nombre, r.id_rol
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id_rol
      WHERE LOWER(r.nombre) = 'anfitriona' AND u.estado = 1 AND u.estado_servicio = 0
    `);
    return data.map(row => this.mapUserFromDB(row));
  }
}

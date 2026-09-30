import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { UserSchema, type UserType } from '@/lib/business/schemas';
import { BaseRepository } from './BaseRepository';
import { NotFoundError, DatabaseError, ConflictError } from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';

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
      biometrico_codigo: row.biometrico_codigo ?? null,
      biometrico_huella: Number(row.biometrico_huella || 0),
      biometrico_facial: Number(row.biometrico_facial || 0),
      created_at: row.fecha_crea,
      updated_at: row.fecha_mod
    };

    return UserSchema.parse(user);
  }

  static async getAll(params?: {
    anfitrionas?: string;
    search?: string;
    status?: string | number;
    role?: string;
    loggedIn?: boolean;
    enLocal?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ data: UserType[]; total: number }> {
    try {
      let where = 'WHERE 1=1';
      let sqlParams: any[] = [];

      if (params?.anfitrionas === '1') {
        where += " AND LOWER(r.nombre) = 'anfitriona'";
      }

      if (params?.search) {
        where +=
          ' AND (u.nombre ILIKE ? OR u.apellido ILIKE ? OR u.nick ILIKE ? OR u.run ILIKE ? OR u.email ILIKE ?)';
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

      if (params?.enLocal && params?.loggedIn) {
        where += ' AND l.en_local = 1';
      }

      const countSql = `SELECT COUNT(*) as total FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol ${loginJoin} ${where}`;

      const dataSql = `SELECT u.id_usuario, u.run, u.nick, u.nombre, u.apellido, u.foto, u.estado, u.estado_servicio, u.telefono, u.email, u.direccion, u.estado_civil, u.afp, u.sueldo, u.aporte, u.descuento, u.biometrico_codigo, u.biometrico_huella, u.biometrico_facial, u.fecha_crea, u.fecha_mod, r.nombre as rol_nombre, r.id_rol FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol ${loginJoin} ${where} ORDER BY u.fecha_crea DESC${params?.limit !== undefined ? ' LIMIT ? OFFSET ?' : ''}`;

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
    } catch (err) {
      logger.error('[UserRepository] Error en getAll:', { err });
      throw new DatabaseError('Error al obtener lista de usuarios', err);
    }
  }

  static async getById(id: string): Promise<UserType | null> {
    try {
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
    } catch (err) {
      logger.error('[UserRepository] Error en getById:', { id, err });
      throw new DatabaseError(`Error al obtener usuario ${id}`, err);
    }
  }

  static async getByRun(run: string): Promise<UserType | null> {
    try {
      const row = await BaseRepository.findOne<any>(query, this.TABLE, 'run', run);
      return row ? this.mapUserFromDB(row) : null;
    } catch (err) {
      logger.error('[UserRepository] Error en getByRun:', { run, err });
      throw new DatabaseError(`Error al obtener usuario por RUN ${run}`, err);
    }
  }

  static async getByNick(nick: string): Promise<UserType | null> {
    try {
      const row = await BaseRepository.findOne<any>(query, this.TABLE, 'nick', nick);
      return row ? this.mapUserFromDB(row) : null;
    } catch (err) {
      logger.error('[UserRepository] Error en getByNick:', { nick, err });
      throw new DatabaseError(`Error al obtener usuario por nick ${nick}`, err);
    }
  }

  static async create(
    data: Partial<UserType> & { password?: string; email?: string; force_password_change?: number },
    fotoFilename: string = 'default.png'
  ): Promise<UserType | null> {
    try {
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
        force_password_change: data.force_password_change ?? 1,
        biometrico_codigo: data.biometrico_codigo ?? null,
        biometrico_huella: data.biometrico_huella ?? 0,
        biometrico_facial: data.biometrico_facial ?? 0,
        estado: 1,
        estado_servicio: 0,
        fecha_crea: getNowInBusinessTimezone()
      });
      return await this.getById(id);
    } catch (err) {
      logger.error('[UserRepository] Error en create:', { err });
      throw new DatabaseError('Error al crear usuario', err);
    }
  }

  static async update(
    id: string,
    data: Partial<UserType> & { password?: string; email?: string },
    fotoFilename: string | null = null
  ): Promise<UserType | null> {
    try {
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
        biometrico_codigo: data.biometrico_codigo,
        biometrico_huella: data.biometrico_huella,
        biometrico_facial: data.biometrico_facial,
        fecha_mod: getNowInBusinessTimezone()
      };

      await BaseRepository.update(query, this.TABLE, this.ID_COL, id, upData);
      return await this.getById(id);
    } catch (err) {
      logger.error('[UserRepository] Error en update:', { id, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al actualizar usuario ${id}`, err);
    }
  }

  static async updateStatus(id: string, action: string): Promise<UserType | null> {
    try {
      const newStatus = action === 'activate' ? 1 : 0;
      await BaseRepository.update(query, this.TABLE, this.ID_COL, id, {
        estado: newStatus,
        fecha_mod: getNowInBusinessTimezone()
      });
      return await this.getById(id);
    } catch (err) {
      logger.error('[UserRepository] Error en updateStatus:', { id, action, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al actualizar estado del usuario ${id}`, err);
    }
  }

  static async updateServiceStatus(id: string, status: number): Promise<void> {
    try {
      await BaseRepository.update(query, this.TABLE, this.ID_COL, id, { estado_servicio: status });
    } catch (err) {
      logger.error('[UserRepository] Error en updateServiceStatus:', { id, status, err });
      throw new DatabaseError(`Error al actualizar estado de servicio del usuario ${id}`, err);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await BaseRepository.delete(query, this.TABLE, this.ID_COL, id);
    } catch (err) {
      logger.error('[UserRepository] Error en delete:', { id, err });
      throw new DatabaseError(`Error al eliminar usuario ${id}`, err);
    }
  }

  /**
   * Enrolamiento en el lector: solo se guardan el codigo que el equipo reporta y
   * los estados de cara/huella. El cotejo con la persona es del equipo, no nuestro.
   */
  static async updateBiometric(
    id: string,
    data: {
      biometrico_codigo?: string | null;
      biometrico_huella?: number;
      biometrico_facial?: number;
    }
  ): Promise<void> {
    try {
      await BaseRepository.update(query, this.TABLE, this.ID_COL, id, {
        biometrico_codigo: data.biometrico_codigo,
        biometrico_huella: data.biometrico_huella,
        biometrico_facial: data.biometrico_facial,
        fecha_mod: getNowInBusinessTimezone()
      });
    } catch (err: any) {
      // Dos personas no pueden compartir el codigo en el equipo.
      if (err?.code === '23505') throw new ConflictError('Ese codigo ya lo usa otra persona.');
      logger.error('[UserRepository] Error en updateBiometric:', { id, err });
      throw new DatabaseError(`Error al guardar el enrolamiento de ${id}`, err);
    }
  }

  /**
   * Plantillas maestras guardadas en la DB (lo que el lector capturó). La cara
   * se devuelve en base64 para poder mostrarla en el diálogo de enrolamiento.
   */
  static async getPlantillasBiometricas(id: string): Promise<{ tipo: string; datos: string }[]> {
    try {
      const rows = await query<any[]>(
        `SELECT tipo, datos FROM biometric_plantillas
          WHERE usuario_id = ? ORDER BY fecha_sincronizacion DESC NULLS LAST`,
        [id]
      );
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      logger.error('[UserRepository] Error en getPlantillasBiometricas:', { id, err });
      return [];
    }
  }

  /** Codigos ya usados por otras personas, para generar el siguiente libre. */
  static async getCodigosBiometricos(): Promise<string[]> {
    try {
      const rows = await query<any[]>(
        `SELECT biometrico_codigo FROM usuarios
          WHERE biometrico_codigo IS NOT NULL AND TRIM(biometrico_codigo) <> ''`,
        []
      );
      if (!Array.isArray(rows)) return [];
      return rows.map(row => String(row.biometrico_codigo ?? '').trim()).filter(Boolean);
    } catch (err) {
      logger.error('[UserRepository] Error en getCodigosBiometricos:', { err });
      return [];
    }
  }

  /** Ultima verificacion que el equipo mando por este usuario, para saber si el codigo funciona. */
  static async getLastBiometricEvent(
    id: string
  ): Promise<{ fecha_recepcion: string; resultado: string; metodo: string | null } | null> {
    try {
      const rows = await query<any[]>(
        `SELECT fecha_recepcion, resultado, metodo FROM biometric_events
          WHERE usuario_id = ? ORDER BY fecha_recepcion DESC LIMIT 1`,
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      logger.error('[UserRepository] Error en getLastBiometricEvent:', { id, err });
      return null;
    }
  }

  static async getStaff(): Promise<UserType[]> {
    try {
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
    } catch (err) {
      logger.error('[UserRepository] Error en getStaff:', { err });
      throw new DatabaseError('Error al obtener staff', err);
    }
  }

  static async getAvailableAnfitrionas(): Promise<UserType[]> {
    try {
      const data = await query<any[]>(`
      SELECT u.*, r.nombre as rol_nombre, r.id_rol
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id_rol
      INNER JOIN logins l ON l.usuario_id = u.id_usuario AND l.estado = 1
      WHERE LOWER(r.nombre) = 'anfitriona'
        AND u.estado = 1
        AND u.estado_servicio = 0
        AND l.en_local = 1
    `);
      return data.map(row => this.mapUserFromDB(row));
    } catch (err) {
      logger.error('[UserRepository] Error en getAvailableAnfitrionas:', { err });
      throw new DatabaseError('Error al obtener anfitrionas disponibles', err);
    }
  }
}

import { UserCreateSchema, UserUpdateSchema, type UserType } from '@/lib/business/schemas';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors/errors';
import { PermissionsCache } from '@/lib/auth/permissions-cache';
import * as argon2 from 'argon2';
import { EMAIL_DOMAIN } from '@/lib/constants/email';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

type UserCreateInput = z.input<typeof UserCreateSchema> & { foto?: unknown };
type UserUpdateInput = z.input<typeof UserUpdateSchema> & { foto?: unknown };

/** Lo que manda el formulario de enrolamiento (checkbox o 0/1 según venga). */
const UserBiometricSchema = z.object({
  codigo: z
    .string()
    .trim()
    .max(20, 'Maximo 20 caracteres')
    .regex(/^[a-zA-Z0-9._:-]*$/, 'Solo letras, numeros y . _ : -')
    .nullable()
    .optional(),
  huella: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
  facial: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional()
});

export class UserService {
  static async createUser(body: UserCreateInput, fotoFilename: string = 'default.png') {
    const bodyToValidate = { ...body };
    if (
      bodyToValidate.foto &&
      typeof bodyToValidate.foto !== 'string' &&
      'arrayBuffer' in (bodyToValidate.foto as any)
    ) {
      delete bodyToValidate.foto;
    }

    const validated = UserCreateSchema.parse(bodyToValidate);

    const existing = await UserRepository.getByRun(validated.run);
    if (existing) {
      throw new ValidationError('El RUN ya está registrado');
    }
    const email = `${validated.nick}${EMAIL_DOMAIN}`;
    // La contraseña inicial es el RUN (RUT) del trabajador, hasheada con argon2.
    // Se exige cambio en el primer inicio de sesión (force_password_change).
    const tempPassword = String(validated.run).trim();
    const password = await argon2.hash(tempPassword);

    const user = await UserRepository.create(
      { ...validated, email, password, force_password_change: 1 },
      fotoFilename
    );
    return { user, tempPassword };
  }

  static async updateUser(id: string, body: UserUpdateInput, fotoFilename: string | null = null) {
    const bodyToValidate = { ...body, id };
    if (
      bodyToValidate.foto &&
      typeof bodyToValidate.foto !== 'string' &&
      'arrayBuffer' in (bodyToValidate.foto as any)
    ) {
      delete bodyToValidate.foto;
    }
    const validated = UserUpdateSchema.parse(bodyToValidate);

    const existing = await UserRepository.getById(id.toString());
    if (!existing) throw new NotFoundError('Usuario', id);

    if (
      fotoFilename &&
      existing.foto &&
      existing.foto !== 'default.png' &&
      !existing.foto.startsWith('http')
    ) {
      const oldPath = path.join(process.cwd(), 'public', 'img', 'users', existing.foto);
      if (existsSync(oldPath)) {
        await fs.unlink(oldPath).catch(() => {});
      }
    }
    const { id: _validatedId, email: _validatedEmail, ...validatedWithoutId } = validated;
    const updateData: Partial<UserType> & {
      email?: string;
      password?: string;
      force_password_change?: number;
    } = {
      ...validatedWithoutId,
      email: undefined
    };

    if (validated.nick) {
      updateData.email = `${validated.nick}@lasmuñecasderamon.com`;
    }
    let newTempPassword: string | undefined;
    if (validated.run) {
      // Al cambiar el RUN, la contraseña se reinicia al nuevo RUN (hasheado).
      newTempPassword = String(validated.run).trim();
      updateData.password = await argon2.hash(newTempPassword);
      updateData.force_password_change = 1;
    }

    const result = await UserRepository.update(id.toString(), updateData, fotoFilename);

    if (validated.rol_id !== undefined) {
      await PermissionsCache.invalidate(id.toString());
    }

    return { user: result, newTempPassword };
  }

  /** Cambia el estado local; no registra ni modifica personas en el lector. */
  static async toggleUserStatus(id: string, action: string) {
    if (!['activate', 'deactivate'].includes(action)) {
      throw new ValidationError('Acción de estado inválida', {
        action,
        allowed: ['activate', 'deactivate']
      });
    }

    const usuarioId = id.toString();
    const usuario = await UserRepository.getById(usuarioId);
    if (!usuario) throw new NotFoundError('Usuario', usuarioId);

    if (action === 'deactivate') {
      await PermissionsCache.invalidate(usuarioId);
    }

    const resultado = await UserRepository.updateStatus(usuarioId, action);

    return {
      ...resultado,
      lector: { intentado: false, equiposOk: [] as string[], equiposFallo: [] as string[] }
    };
  }

  static async getAll(params?: Record<string, unknown>) {
    return await UserRepository.getAll(params);
  }

  static async getById(id: string | number) {
    return await UserRepository.getById(id.toString());
  }

  /** Elimina la cuenta y sus plantillas locales. */
  static async delete(id: string | number) {
    const usuarioId = id.toString();
    const usuario = await UserRepository.getById(usuarioId);

    if (usuario) await UserRepository.deletePlantillasBiometricas(usuarioId);

    return await UserRepository.delete(usuarioId);
  }

  static async update(id: string | number, body: Record<string, unknown>) {
    const validated = UserUpdateSchema.omit({ id: true }).parse(body);
    const { email, ...rest } = validated;
    return await UserRepository.update(id.toString(), {
      ...rest,
      ...(email != null ? { email } : {})
    });
  }

  static async getAvailableAnfitrionas() {
    return await UserRepository.getAvailableAnfitrionas();
  }

  static async updateServiceStatus(id: string | number, status: number) {
    return await UserRepository.updateServiceStatus(id.toString(), status);
  }

  static async getStaff() {
    return await UserRepository.getStaff();
  }

  /**
   * Enrolamiento en el lector: la cara/huella se cargan en el equipo, acá solo
   * queda el codigo que reporta y que modalidades quedaron listas.
   */
  static async getBiometricStatus(id: string | number) {
    const usuarioId = id.toString();
    const user = await UserRepository.getById(usuarioId);
    if (!user) throw new NotFoundError('Usuario', usuarioId);
    const evento = await UserRepository.getLastBiometricEvent(usuarioId);
    // Ultima captura quedada en la DB: la cara como foto y la huella como
    // plantilla, para poder mostrarlas en el diálogo de enrolamiento.
    const plantillas = await UserRepository.getPlantillasBiometricas(usuarioId);
    const de = (tipo: string) => plantillas.find(p => p.tipo === tipo)?.datos ?? null;
    return {
      codigo: user.biometrico_codigo ?? null,
      huella: Number(user.biometrico_huella || 0),
      facial: Number(user.biometrico_facial || 0),
      ultima_verificacion: evento?.fecha_recepcion ?? null,
      ultimo_resultado: evento?.resultado ?? null,
      cara_base64: de('cara'),
      huella_hex: de('huella')
    };
  }

  static async updateBiometric(id: string | number, body: unknown) {
    const usuarioId = id.toString();
    const parsed = UserBiometricSchema.parse(body ?? {});
    const user = await UserRepository.getById(usuarioId);
    if (!user) throw new NotFoundError('Usuario', usuarioId);

    await UserRepository.updateBiometric(usuarioId, {
      ...(parsed.codigo !== undefined
        ? { biometrico_codigo: parsed.codigo?.trim() ? parsed.codigo.trim() : null }
        : {}),
      ...(parsed.huella !== undefined ? { biometrico_huella: parsed.huella ? 1 : 0 } : {}),
      ...(parsed.facial !== undefined ? { biometrico_facial: parsed.facial ? 1 : 0 } : {})
    });
    return await this.getBiometricStatus(usuarioId);
  }

  /**
   * Genera y guarda el siguiente código numérico libre para una persona sin
   * código (primera vez que se enrola). Si ya tiene uno, lo devuelve tal cual.
   *
   * Ese código es el User ID que el lector va a reportar: se toma el máximo de
   * los numéricos ya usados (+1, arrancando en 1001) para que nunca se repita.
   * Ante un empate (dos personas generando a la vez) reintenta con el siguiente.
   */
  static async asignarCodigoBiometrico(id: string | number) {
    const usuarioId = id.toString();
    const user = await UserRepository.getById(usuarioId);
    if (!user) throw new NotFoundError('Usuario', usuarioId);

    const actual = (user.biometrico_codigo || '').trim();
    if (actual) {
      return { ...(await this.getBiometricStatus(usuarioId)), generado: false };
    }

    const usados = (await UserRepository.getCodigosBiometricos())
      .map(codigo => (/^\d+$/.test(codigo) ? Number(codigo) : NaN))
      .filter(n => Number.isFinite(n));
    let siguiente = Math.max(1000, ...usados) + 1;
    let errorEmpate: ConflictError | null = null;

    for (let intento = 0; intento < 3; intento++) {
      try {
        await UserRepository.updateBiometric(usuarioId, {
          biometrico_codigo: String(siguiente)
        });
        return { ...(await this.getBiometricStatus(usuarioId)), generado: true };
      } catch (err) {
        // Otra persona se lo ganó: probamos con el siguiente número.
        if (!(err instanceof ConflictError)) throw err;
        errorEmpate = err;
        siguiente += 1;
      }
    }

    throw errorEmpate ?? new ConflictError('No se pudo generar un código libre.');
  }
}

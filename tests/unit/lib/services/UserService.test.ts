import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '@/lib/services/UserService';
import { ValidationError, NotFoundError } from '@/lib/errors/errors';

vi.mock('@/lib/repositories/UserRepository', () => ({
  UserRepository: {
    getByRun: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    getDispositivosConPlantillas: vi.fn().mockResolvedValue([]),
    deletePlantillasBiometricas: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/lib/auth/permissions-cache', () => ({
  PermissionsCache: {
    invalidate: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    clear: vi.fn()
  }
}));

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password')
}));

vi.mock('fs/promises', () => ({
  default: { unlink: vi.fn().mockResolvedValue(undefined) },
  unlink: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('fs', async importOriginal => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, existsSync: vi.fn().mockReturnValue(false) };
});

import { UserRepository } from '@/lib/repositories/UserRepository';
import { PermissionsCache } from '@/lib/auth/permissions-cache';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UserService.createUser', () => {
  const validBody = {
    run: '12345678-9',
    nick: 'testuser',
    name: 'Test',
    lastName: 'User',
    rol_id: 'rol-1'
  };

  it('lanza ValidationError si el RUN ya está registrado', async () => {
    vi.mocked(UserRepository.getByRun).mockResolvedValue({ id: 'existing' } as any);

    await expect(UserService.createUser(validBody)).rejects.toThrow(ValidationError);
    await expect(UserService.createUser(validBody)).rejects.toThrow('RUN ya está registrado');
  });

  it('crea el usuario si el RUN no existe', async () => {
    vi.mocked(UserRepository.getByRun).mockResolvedValue(null);
    vi.mocked(UserRepository.create).mockResolvedValue({ id: 'new-user' } as any);

    const result = await UserService.createUser(validBody);

    expect(UserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        run: '12345678-9',
        nick: 'testuser',
        password: 'hashed-password'
      }),
      'default.png'
    );
    expect(result).toHaveProperty('user', { id: 'new-user' });
    expect(result).toHaveProperty('tempPassword');
    expect(typeof (result as any).tempPassword).toBe('string');
  });

  it('usa el RUN como contraseña inicial (hasheada)', async () => {
    vi.mocked(UserRepository.getByRun).mockResolvedValue(null);
    vi.mocked(UserRepository.create).mockResolvedValue({ id: 'new-user' } as any);
    const argon2 = await import('argon2');

    const result = await UserService.createUser(validBody);

    expect(result).toHaveProperty('tempPassword', '12345678-9');
    expect(vi.mocked(argon2.hash)).toHaveBeenCalledWith('12345678-9');
    expect(UserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ force_password_change: 1 }),
      'default.png'
    );
  });

  it('usa el fotoFilename proporcionado', async () => {
    vi.mocked(UserRepository.getByRun).mockResolvedValue(null);
    vi.mocked(UserRepository.create).mockResolvedValue({ id: 'new-user' } as any);

    await UserService.createUser(validBody, 'custom.jpg');

    expect(UserRepository.create).toHaveBeenCalledWith(expect.anything(), 'custom.jpg');
  });

  it('lanza ZodError si faltan campos requeridos', async () => {
    await expect(
      UserService.createUser({ run: '', name: '', lastName: '', rol_id: '' })
    ).rejects.toThrow();
  });
});

describe('UserService.updateUser', () => {
  const existingUser = {
    id: 'user-1',
    run: '12345678-9',
    nick: 'oldnick',
    name: 'Old',
    lastName: 'Name',
    rol_id: 'rol-1',
    foto: 'default.png'
  };

  it('lanza NotFoundError si el usuario no existe', async () => {
    vi.mocked(UserRepository.getById).mockResolvedValue(null);

    await expect(
      UserService.updateUser('user-1', {
        id: 'user-1',
        run: '12345678-9',
        name: 'New',
        lastName: 'Name',
        rol_id: 'rol-1'
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('actualiza el usuario correctamente', async () => {
    vi.mocked(UserRepository.getById).mockResolvedValue(existingUser as any);
    vi.mocked(UserRepository.update).mockResolvedValue({ ...existingUser, name: 'New' } as any);

    const result = await UserService.updateUser('user-1', {
      id: 'user-1',
      run: '12345678-9',
      name: 'New',
      lastName: 'Name',
      rol_id: 'rol-1'
    });

    expect(UserRepository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ password: 'hashed-password' }),
      null
    );
    expect(result.user).toMatchObject({ name: 'New' });
  });

  it('invalida el caché de permisos cuando cambia el rol', async () => {
    vi.mocked(UserRepository.getById).mockResolvedValue(existingUser as any);
    vi.mocked(UserRepository.update).mockResolvedValue(existingUser as any);

    await UserService.updateUser('user-1', {
      id: 'user-1',
      run: '12345678-9',
      name: 'Test',
      lastName: 'User',
      rol_id: 'rol-2'
    });

    expect(PermissionsCache.invalidate).toHaveBeenCalledWith('user-1');
  });

  it('NO invalida el caché si el rol no cambia', async () => {
    vi.mocked(UserRepository.getById).mockResolvedValue(existingUser as any);
    vi.mocked(UserRepository.update).mockResolvedValue(existingUser as any);

    await UserService.updateUser('user-1', {
      id: 'user-1',
      name: 'New Name',
      lastName: 'User',
      run: '12345678-9',
      rol_id: 'rol-1'
    });

    expect(PermissionsCache.invalidate).toHaveBeenCalledWith('user-1');
  });
});

describe('UserService.toggleUserStatus', () => {
  it('lanza ValidationError para acción inválida', async () => {
    await expect(UserService.toggleUserStatus('user-1', 'suspend')).rejects.toThrow(
      ValidationError
    );
    await expect(UserService.toggleUserStatus('user-1', 'suspend')).rejects.toThrow(
      'estado inválida'
    );
  });

  it('activa el usuario correctamente', async () => {
    vi.mocked(UserRepository.updateStatus).mockResolvedValue({ id: 'user-1', status: 1 } as any);

    await UserService.toggleUserStatus('user-1', 'activate');
    expect(UserRepository.updateStatus).toHaveBeenCalledWith('user-1', 'activate');
  });

  it('desactiva el usuario e invalida el caché', async () => {
    vi.mocked(UserRepository.updateStatus).mockResolvedValue({ id: 'user-1', status: 0 } as any);

    await UserService.toggleUserStatus('user-1', 'deactivate');

    expect(UserRepository.updateStatus).toHaveBeenCalledWith('user-1', 'deactivate');
    expect(PermissionsCache.invalidate).toHaveBeenCalledWith('user-1');
  });

  it('NO invalida el caché al activar', async () => {
    vi.mocked(UserRepository.updateStatus).mockResolvedValue({ id: 'user-1', status: 1 } as any);

    await UserService.toggleUserStatus('user-1', 'activate');

    expect(PermissionsCache.invalidate).not.toHaveBeenCalled();
  });
});

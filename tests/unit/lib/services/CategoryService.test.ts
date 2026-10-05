import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoryService } from '@/modules/inventario/categorias/servicio';

vi.mock('@/modules/inventario/categorias/repositorio', () => ({
  CategoryRepository: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    reorder: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { CategoryRepository } from '@/modules/inventario/categorias/repositorio';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CategoryService.getAll', () => {
  it('returns categories from repository', async () => {
    const cats = [{ id: 'cat-1', name: 'Bebidas' }];
    vi.mocked(CategoryRepository.getAll).mockResolvedValue(cats as any);
    const result = await CategoryService.getAll();
    expect(result).toEqual(cats);
  });
});

describe('CategoryService.create', () => {
  it('calls repository with parsed name and description', async () => {
    vi.mocked(CategoryRepository.create).mockResolvedValue({ id: 'new-1' } as any);
    const result = await CategoryService.create('Bebidas', 'Todas las bebidas');
    expect(CategoryRepository.create).toHaveBeenCalledWith('Bebidas', 'Todas las bebidas');
    expect(result).toMatchObject({ id: 'new-1' });
  });

  it('uses empty string as default description', async () => {
    vi.mocked(CategoryRepository.create).mockResolvedValue({ id: 'new-1' } as any);
    await CategoryService.create('Bebidas');
    expect(CategoryRepository.create).toHaveBeenCalledWith('Bebidas', '');
  });
});

describe('CategoryService.update', () => {
  it('calls repository with partial validated data', async () => {
    vi.mocked(CategoryRepository.update).mockResolvedValue({ id: 'cat-1' } as any);
    await CategoryService.update('cat-1', 'Nuevo nombre');
    expect(CategoryRepository.update).toHaveBeenCalledWith('cat-1', 'Nuevo nombre', '');
  });

  it('calls repository with description when provided', async () => {
    vi.mocked(CategoryRepository.update).mockResolvedValue({ id: 'cat-1' } as any);
    await CategoryService.update('cat-1', 'Nuevo nombre', 'Nueva desc');
    expect(CategoryRepository.update).toHaveBeenCalledWith('cat-1', 'Nuevo nombre', 'Nueva desc');
  });
});

describe('CategoryService.reorder', () => {
  it('passes categories array to repository', async () => {
    const cats = [{ id: 'cat-1' }, { id: 'cat-2' }];
    await CategoryService.reorder(cats);
    expect(CategoryRepository.reorder).toHaveBeenCalledWith(cats);
  });
});

describe('CategoryService.updateStatus', () => {
  it('calls repository with id and action', async () => {
    await CategoryService.updateStatus('cat-1', 'activate');
    expect(CategoryRepository.updateStatus).toHaveBeenCalledWith('cat-1', 'activate');
  });
});

describe('CategoryService.delete', () => {
  it('calls repository with id', async () => {
    await CategoryService.delete('cat-1');
    expect(CategoryRepository.delete).toHaveBeenCalledWith('cat-1');
  });
});

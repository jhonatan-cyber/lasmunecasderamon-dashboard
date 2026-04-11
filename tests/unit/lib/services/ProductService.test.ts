import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '@/lib/services/ProductService';
import { ConflictError } from '@/lib/errors/errors';

vi.mock('@/lib/repositories/ProductRepository', () => ({
  ProductRepository: {
    getByCodeOrName: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { ProductRepository } from '@/lib/repositories/ProductRepository';

const validProduct = {
  code: 'PROD-001',
  name: 'Whisky Premium',
  category_id: 'cat-1',
  price: 15000,
  commission: 2000,
  status: 1
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createProduct ───────────────────────────────────────────────────────────

describe('ProductService.createProduct', () => {
  it('lanza ConflictError si ya existe un producto con el mismo código/nombre', async () => {
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue({ id: 'existing-1' } as any);

    await expect(ProductService.createProduct(validProduct)).rejects.toThrow(ConflictError);
    await expect(ProductService.createProduct(validProduct)).rejects.toThrow(
      'mismo código o nombre'
    );
  });

  it('crea el producto si no existe duplicado', async () => {
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(null);
    vi.mocked(ProductRepository.create).mockResolvedValue({ id: 'new-1', ...validProduct } as any);

    const result = await ProductService.createProduct(validProduct, 'foto.jpg');

    expect(ProductRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PROD-001', name: 'Whisky Premium' }),
      'foto.jpg'
    );
    expect(result).toMatchObject({ id: 'new-1' });
  });

  it('usa default.png si no se pasa fotoName', async () => {
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(null);
    vi.mocked(ProductRepository.create).mockResolvedValue({ id: 'new-1' } as any);

    await ProductService.createProduct(validProduct);

    expect(ProductRepository.create).toHaveBeenCalledWith(expect.anything(), 'default.png');
  });

  it('normaliza category_id desde categoryId', async () => {
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(null);
    vi.mocked(ProductRepository.create).mockResolvedValue({ id: 'new-1' } as any);

    const bodyWithCategoryId = {
      ...validProduct,
      category_id: undefined as any,
      categoryId: 'cat-2'
    };
    await ProductService.createProduct(bodyWithCategoryId);

    expect(ProductRepository.getByCodeOrName).toHaveBeenCalledWith(
      'PROD-001',
      'Whisky Premium',
      'cat-2'
    );
  });
});

// ─── updateProduct ───────────────────────────────────────────────────────────

describe('ProductService.updateProduct', () => {
  const existingProduct = {
    id: 'prod-1',
    code: 'PROD-001',
    name: 'Whisky',
    category_id: 'cat-1',
    foto: 'old.jpg'
  };

  it('lanza ConflictError si otro producto tiene el mismo código/nombre', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue(existingProduct as any);
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue({ id: 'otro-prod' } as any);

    await expect(
      ProductService.updateProduct('prod-1', { code: 'PROD-001', name: 'Whisky' })
    ).rejects.toThrow(ConflictError);
  });

  it('no lanza si el producto encontrado es el mismo que se actualiza', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue(existingProduct as any);
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(existingProduct as any);
    vi.mocked(ProductRepository.update).mockResolvedValue(existingProduct as any);

    await expect(
      ProductService.updateProduct('prod-1', { code: 'PROD-001' })
    ).resolves.not.toThrow();
  });

  it('usa la foto existente si no se pasa fotoName', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue(existingProduct as any);
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(null);
    vi.mocked(ProductRepository.update).mockResolvedValue(existingProduct as any);

    await ProductService.updateProduct('prod-1', { name: 'Nuevo nombre' });

    expect(ProductRepository.update).toHaveBeenCalledWith('prod-1', expect.anything(), 'old.jpg');
  });

  it('usa la nueva foto si se pasa fotoName', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue(existingProduct as any);
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(null);
    vi.mocked(ProductRepository.update).mockResolvedValue(existingProduct as any);

    await ProductService.updateProduct('prod-1', { name: 'Nuevo nombre' }, 'nueva.jpg');

    expect(ProductRepository.update).toHaveBeenCalledWith('prod-1', expect.anything(), 'nueva.jpg');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '@/lib/services/ProductService';
import { ConflictError } from '@/lib/errors/errors';

vi.mock('@/lib/repositories/ProductRepository', () => ({
  ProductRepository: {
    getByCodeOrName: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getChampagneTiers: vi.fn().mockResolvedValue([]),
    saveChampagneTiers: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/lib/repositories/inventory/inventoryHelpers', () => ({
  esEstadoUnidadValido: (v: unknown) => v === 'almacen' || v === 'inactivo'
}));

vi.mock('@/modules/inventario', () => ({
  traspasarAlBar: vi.fn().mockResolvedValue({ trasladadas: 3, stock_bar: 8 }),
  aceptarTransferencia: vi.fn().mockResolvedValue(undefined),
  rechazarTransferencia: vi.fn().mockResolvedValue(undefined),
  verificarEnvase: vi.fn(),
  confirmarRecepcionEnvase: vi.fn(),
  listarDevoluciones: vi.fn().mockResolvedValue([]),
  buscarPresentacionPorCodigo: vi.fn().mockResolvedValue(null),
  crearPresentacion: vi.fn(),
  actualizarPresentacion: vi.fn().mockResolvedValue(undefined),
  actualizarFotoPresentacion: vi.fn().mockResolvedValue(undefined),
  eliminarPresentacion: vi.fn().mockResolvedValue(undefined),
  obtenerPresentacion: vi.fn().mockResolvedValue(null),
  listarPresentaciones: vi.fn().mockResolvedValue([]),
  listarPresentacionesPorProductos: vi.fn().mockResolvedValue({}),
  listarUnidades: vi.fn().mockResolvedValue({ total: 0, unidades: [] }),
  registrarUnidades: vi.fn().mockResolvedValue([]),
  cambiarEstadoUnidades: vi.fn().mockResolvedValue(4),
  listarStockBar: vi.fn().mockResolvedValue([]),
  obtenerResumenShots: vi.fn(),
  listarParaVenta: vi.fn().mockResolvedValue([]),
  listarMovimientos: vi.fn().mockResolvedValue([]),
  listarMovimientosRecientes: vi.fn().mockResolvedValue([])
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { ProductRepository } from '@/lib/repositories/ProductRepository';
import {
  aceptarTransferencia,
  actualizarPresentacion,
  buscarPresentacionPorCodigo,
  cambiarEstadoUnidades,
  listarPresentaciones,
  rechazarTransferencia,
  registrarUnidades,
  traspasarAlBar
} from '@/modules/inventario';

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
      'foto.jpg',
      { presentaciones: [] }
    );
    expect(result).toMatchObject({ id: 'new-1' });
  });

  it('usa default.png si no se pasa fotoName', async () => {
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(null);
    vi.mocked(ProductRepository.create).mockResolvedValue({ id: 'new-1' } as any);

    await ProductService.createProduct(validProduct);

    expect(ProductRepository.create).toHaveBeenCalledWith(expect.anything(), 'default.png', {
      presentaciones: []
    });
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

  it('pasa presentaciones con stock por fila al repositorio', async () => {
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(null);
    vi.mocked(ProductRepository.create).mockResolvedValue({ id: 'new-1' } as any);

    await ProductService.createProduct({
      ...validProduct,
      presentaciones: [
        { nombre: '500 ml', codigo_barras: '7801111111111', precio_compra: 5000, cantidad: 3 },
        { nombre: '750 ml', codigo_barras: '7801234567890', precio_compra: 8000, cantidad: 2 }
      ]
    } as any);

    expect(ProductRepository.create).toHaveBeenCalledWith(expect.anything(), 'default.png', {
      presentaciones: [
        {
          nombre: '500 ml',
          codigo_barras: '7801111111111',
          precio_compra: 5000,
          foto: null,
          cantidad: 3
        },
        {
          nombre: '750 ml',
          codigo_barras: '7801234567890',
          precio_compra: 8000,
          foto: null,
          cantidad: 2
        }
      ]
    });
  });

  it('rechaza códigos de barras duplicados en la misma carga', async () => {
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(null);

    await expect(
      ProductService.createProduct({
        ...validProduct,
        presentaciones: [
          { nombre: '500 ml', codigo_barras: '111' },
          { nombre: '750 ml', codigo_barras: '111' }
        ]
      } as any)
    ).rejects.toThrow('duplicado');

    expect(ProductRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza un código de barras ya registrado en otro producto', async () => {
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(null);
    vi.mocked(buscarPresentacionPorCodigo).mockResolvedValue({
      id: 'pres-1',
      producto_id: 'otro-producto',
      nombre: '750 ml',
      codigo_barras: '7801234567890',
      precio_compra: 8000,
      precio_venta: 0,
      comision: 0,
      foto: null,
      stock: 2
    });

    await expect(
      ProductService.createProduct({
        ...validProduct,
        presentaciones: [{ nombre: '750 ml', codigo_barras: '7801234567890' }]
      } as any)
    ).rejects.toThrow('ya está registrado en otro producto');

    expect(ProductRepository.create).not.toHaveBeenCalled();
  });

  it('permite conservar el código al editar la misma presentación', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue({ id: 'prod-1' } as any);
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(null);
    vi.mocked(ProductRepository.update).mockResolvedValue({ id: 'prod-1' } as any);
    vi.mocked(buscarPresentacionPorCodigo).mockResolvedValue({
      id: 'pres-1',
      producto_id: 'prod-1',
      nombre: '750 ml',
      codigo_barras: '7801234567890',
      precio_compra: 8000,
      precio_venta: 0,
      comision: 0,
      foto: null,
      stock: 2
    });

    await expect(
      ProductService.updatePresentation('pres-1', {
        nombre: '750 ml',
        codigo_barras: '7801234567890'
      } as any)
    ).resolves.not.toThrow();
  });

  it('rechaza el código de otra presentación aunque sea del mismo producto', async () => {
    vi.mocked(buscarPresentacionPorCodigo).mockResolvedValue({
      id: 'pres-otra',
      producto_id: 'prod-1',
      nombre: '500 ml',
      codigo_barras: '7801234567890',
      precio_compra: 5000,
      precio_venta: 0,
      comision: 0,
      foto: null,
      stock: 1
    });

    await expect(
      ProductService.updatePresentation('pres-1', {
        nombre: '750 ml',
        codigo_barras: '7801234567890'
      } as any)
    ).rejects.toThrow('ya está registrado');
  });

  it('actualiza nombre y precio de la presentación', async () => {
    vi.mocked(buscarPresentacionPorCodigo).mockResolvedValue(null);

    await ProductService.updatePresentation('pres-1', {
      nombre: '750 ml premium',
      precio_compra: 9000
    } as any);

    expect(vi.mocked(actualizarPresentacion)).toHaveBeenCalledWith('pres-1', {
      nombre: '750 ml premium',
      precio_compra: 9000
    });
  });
});

describe('ProductService champagne tiers', () => {
  it('devuelve los tramos guardados', async () => {
    const rows = [{ anfitrionas: 2, precio: 120000, comision: 40000 }];
    vi.mocked(ProductRepository.getChampagneTiers).mockResolvedValue(rows as any);

    await expect(ProductService.getChampagneTiers('prod-1')).resolves.toEqual(rows);
  });

  it('usa los valores por defecto si no hay tramos', async () => {
    vi.mocked(ProductRepository.getChampagneTiers).mockResolvedValue([]);

    const tiers = await ProductService.getChampagneTiers('prod-1');

    expect(tiers).toHaveLength(5);
    expect(tiers[2]).toMatchObject({ anfitrionas: 3, precio: 160000, comision: 60000 });
  });

  it('guarda tramos válidos y rechaza duplicados', async () => {
    vi.mocked(ProductRepository.saveChampagneTiers).mockResolvedValue(undefined);

    await ProductService.saveChampagneTiers('prod-1', [
      { anfitrionas: 1, precio: 120000, comision: 40000 },
      { anfitrionas: 2, precio: 120000, comision: 40000 }
    ]);

    expect(ProductRepository.saveChampagneTiers).toHaveBeenCalledWith('prod-1', [
      { anfitrionas: 1, precio: 120000, comision: 40000 },
      { anfitrionas: 2, precio: 120000, comision: 40000 }
    ]);

    await expect(
      ProductService.saveChampagneTiers('prod-1', [
        { anfitrionas: 2, precio: 1, comision: 0 },
        { anfitrionas: 2, precio: 2, comision: 0 }
      ])
    ).rejects.toThrow('duplicado');
  });
});

describe('ProductService.addUnits', () => {
  it('genera códigos vinculados a la presentación', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue({ id: 'prod-1' } as any);
    vi.mocked(listarPresentaciones).mockResolvedValue([
      {
        id: 'pres-1',
        producto_id: 'prod-1',
        nombre: '750 ml',
        codigo_barras: null,
        precio_compra: 8000,
        precio_venta: 0,
        comision: 0,
        foto: null,
        stock: 2
      }
    ]);
    vi.mocked(registrarUnidades).mockResolvedValue([
      { id: 'u3', codigo: 'LM-000003', codigo_barras: '2900000000034' },
      { id: 'u4', codigo: 'LM-000004', codigo_barras: '2900000000041' }
    ]);

    const result = await ProductService.addUnits('prod-1', 'pres-1', 2);

    expect(registrarUnidades).toHaveBeenCalledWith({
      producto_id: 'prod-1',
      cantidad: 2,
      presentacion_id: 'pres-1'
    });
    expect(result).toEqual([
      { id: 'u3', codigo: 'LM-000003', codigo_barras: '2900000000034' },
      { id: 'u4', codigo: 'LM-000004', codigo_barras: '2900000000041' }
    ]);
  });

  it('rechaza cantidades fuera de rango', async () => {
    await expect(ProductService.addUnits('prod-1', 'pres-1', 0)).rejects.toThrow('entre 1 y 1000');
    await expect(ProductService.addUnits('prod-1', 'pres-1', 1001)).rejects.toThrow(
      'entre 1 y 1000'
    );
    expect(registrarUnidades).not.toHaveBeenCalled();
  });

  it('rechaza una presentación de otro producto', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue({ id: 'prod-1' } as any);
    vi.mocked(listarPresentaciones).mockResolvedValue([]);

    await expect(ProductService.addUnits('prod-1', 'pres-ajena', 3)).rejects.toThrow(
      'no pertenece a este producto'
    );
    expect(registrarUnidades).not.toHaveBeenCalled();
  });

  it('rechaza cantidades fraccionarias sin mover existencias', async () => {
    await expect(ProductService.traspasarAlBar('prod-1', 'pres-1', 1.5, 15000, 0)).rejects.toThrow(
      'entre 1 y 1000'
    );
    expect(traspasarAlBar).not.toHaveBeenCalled();
  });
});

describe('ProductService.setUnitsEstado', () => {
  it('desactiva los códigos seleccionados', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue({ id: 'prod-1' } as any);

    const total = await ProductService.setUnitsEstado('prod-1', ['u-1', 'u-2'], 'inactivo');

    expect(cambiarEstadoUnidades).toHaveBeenCalledWith('prod-1', ['u-1', 'u-2'], 'inactivo');
    expect(total).toBe(4);
  });

  it('rechaza estados inválidos y listas vacías', async () => {
    await expect(ProductService.setUnitsEstado('prod-1', ['u-1'], 'vendido')).rejects.toThrow(
      'Estado inválido'
    );
    await expect(ProductService.setUnitsEstado('prod-1', [], 'inactivo')).rejects.toThrow(
      'entre 1 y 1000'
    );
    expect(cambiarEstadoUnidades).not.toHaveBeenCalled();
  });
});

describe('ProductService.traspasarAlBar', () => {
  it('guarda botella y shot con importes independientes y comisión opcional', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue({ id: 'prod-1' } as any);
    vi.mocked(listarPresentaciones).mockResolvedValue([{ id: 'pres-1' }] as any);
    await ProductService.traspasarAlBar('prod-1', 'pres-1', 2, undefined, undefined, 'user-1', [
      { tipo: 'botella', precio: 25000, comision: 1500 },
      { tipo: 'shot', precio: 3000 }
    ]);
    expect(traspasarAlBar).toHaveBeenCalledWith(
      expect.objectContaining({
        cantidad: 2,
        precio_venta: 25000,
        comision: 1500,
        opciones_venta: [
          { tipo: 'botella', precio: 25000, comision: 1500 },
          { tipo: 'shot', precio: 3000, comision: 0 }
        ]
      })
    );
  });

  it('permite solo shot sin reutilizar su precio como precio de botella', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue({ id: 'prod-1' } as any);
    vi.mocked(listarPresentaciones).mockResolvedValue([{ id: 'pres-1' }] as any);
    await ProductService.traspasarAlBar('prod-1', 'pres-1', 1, undefined, undefined, 'user-1', [
      { tipo: 'shot', precio: 2000 }
    ]);
    expect(traspasarAlBar).toHaveBeenCalledWith(
      expect.objectContaining({
        precio_venta: 0,
        comision: 0,
        opciones_venta: [{ tipo: 'shot', precio: 2000, comision: 0 }]
      })
    );
  });

  it.each([
    [],
    [{ tipo: 'copa', precio: 1000 }],
    [{ tipo: 'shot' }],
    [{ tipo: 'shot', precio: -1 }],
    [{ tipo: 'shot', precio: 1.5 }],
    [{ tipo: 'shot', precio: 1000, comision: -1 }],
    [
      { tipo: 'shot', precio: 1000 },
      { tipo: 'shot', precio: 2000 }
    ]
  ])('rechaza opciones inválidas antes de mover stock: %j', async (...entries) => {
    await expect(
      ProductService.traspasarAlBar('prod-1', 'pres-1', 1, undefined, undefined, 'user-1', entries)
    ).rejects.toThrow('Tipos de venta');
    expect(traspasarAlBar).not.toHaveBeenCalled();
  });
  const presConStock = [
    {
      id: 'pres-1',
      producto_id: 'prod-1',
      nombre: '750 ml',
      codigo_barras: null,
      precio_compra: 8000,
      precio_venta: 0,
      comision: 0,
      foto: null,
      stock: 5
    }
  ];

  it('traspasa con precio y comisión válidos', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue({ id: 'prod-1' } as any);
    vi.mocked(listarPresentaciones).mockResolvedValue(presConStock);

    const result = await ProductService.traspasarAlBar(
      'prod-1',
      'pres-1',
      3,
      15000,
      2000,
      'user-1'
    );

    expect(traspasarAlBar).toHaveBeenCalledWith({
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      cantidad: 3,
      precio_venta: 15000,
      comision: 2000,
      usuario_id: 'user-1'
    });
    expect(result).toEqual({ trasladadas: 3, stock_bar: 8 });
  });

  it('rechaza cantidades y montos inválidos', async () => {
    await expect(ProductService.traspasarAlBar('prod-1', 'pres-1', 0, 15000, 0)).rejects.toThrow(
      'entre 1 y 1000'
    );
    await expect(ProductService.traspasarAlBar('prod-1', 'pres-1', 2, -5, 0)).rejects.toThrow(
      'Precio de venta'
    );
    expect(traspasarAlBar).not.toHaveBeenCalled();
  });

  it('rechaza una presentación de otro producto', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue({ id: 'prod-1' } as any);
    vi.mocked(listarPresentaciones).mockResolvedValue([]);

    await expect(
      ProductService.traspasarAlBar('prod-1', 'pres-ajena', 2, 15000, 0)
    ).rejects.toThrow('no pertenece a este producto');
    expect(traspasarAlBar).not.toHaveBeenCalled();
  });
});

describe('ProductService.resolverTransferencia', () => {
  it('aprueba delegando en el repositorio', async () => {
    const result = await ProductService.resolverTransferencia('t-1', 'aprobar', 'barman-1');

    expect(aceptarTransferencia).toHaveBeenCalledWith('t-1', 'barman-1');
    expect(result).toEqual({ estado: 'aceptada' });
  });

  it('rechaza delegando en el repositorio', async () => {
    const result = await ProductService.resolverTransferencia('t-1', 'rechazar', 'barman-1');

    expect(rechazarTransferencia).toHaveBeenCalledWith('t-1', 'barman-1');
    expect(result).toEqual({ estado: 'rechazada' });
  });

  it('rechaza acciones inválidas y falta de usuario', async () => {
    await expect(ProductService.resolverTransferencia('t-1', 'anular', 'barman-1')).rejects.toThrow(
      'Acción inválida'
    );
    await expect(ProductService.resolverTransferencia('', 'aprobar', 'barman-1')).rejects.toThrow(
      'ID de transferencia'
    );
    await expect(ProductService.resolverTransferencia('t-1', 'aprobar', null)).rejects.toThrow(
      'usuario'
    );
    expect(aceptarTransferencia).not.toHaveBeenCalled();
    expect(rechazarTransferencia).not.toHaveBeenCalled();
  });
});

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

    expect(ProductRepository.update).toHaveBeenCalledWith('prod-1', expect.anything(), 'old.jpg', {
      presentacionesNuevas: []
    });
  });

  it('usa la nueva foto si se pasa fotoName', async () => {
    vi.mocked(ProductRepository.getById).mockResolvedValue(existingProduct as any);
    vi.mocked(ProductRepository.getByCodeOrName).mockResolvedValue(null);
    vi.mocked(ProductRepository.update).mockResolvedValue(existingProduct as any);

    await ProductService.updateProduct('prod-1', { name: 'Nuevo nombre' }, 'nueva.jpg');

    expect(ProductRepository.update).toHaveBeenCalledWith(
      'prod-1',
      expect.anything(),
      'nueva.jpg',
      { presentacionesNuevas: [] }
    );
  });
});

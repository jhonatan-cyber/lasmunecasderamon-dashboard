import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { InventoryRepository } from '@/lib/repositories/InventoryRepository';
import { ValidationError } from '@/lib/errors/errors';

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'accept_transfer' },
  async (_request, context) => {
    const { id } = await context.params;
    if (!id || typeof id !== 'string') throw new ValidationError('Transferencia inválida');
    await InventoryRepository.acceptTransferStandalone(id, context.user.id);
    return NextResponse.json({
      success: true,
      message: 'Recepción confirmada. Los productos ya están disponibles en el bar.'
    });
  }
);

import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrderFormHeader from '@/components/orders/OrderFormHeader';

afterEach(cleanup);

function renderHeader(
  props: Partial<React.ComponentProps<typeof OrderFormHeader>> = {}
): ReturnType<typeof render> {
  return render(
    <OrderFormHeader
      metodoPago='efectivo'
      onMetodoPagoChange={vi.fn()}
      baucherFoto={null}
      onBaucherChange={vi.fn()}
      clientes={[]}
      selectedCliente=''
      onClienteChange={vi.fn()}
      total={10000}
      subtotal={10000}
      tipPercentage={10}
      tipEnabled={false}
      onSubmit={vi.fn()}
      onTipChange={vi.fn()}
      {...props}
    />
  );
}

it('pide el baucher solo cuando el pago es con transferencia', () => {
  renderHeader();

  expect(screen.queryByLabelText('Foto del baucher (obligatoria)')).not.toBeInTheDocument();
});

it('muestra la captura del baucher con transferencia y entrega la foto', async () => {
  const onBaucherChange = vi.fn();
  renderHeader({ metodoPago: 'transferencia', onBaucherChange });

  const campo = screen.getByLabelText('Foto del baucher (obligatoria)');
  fireEvent.change(campo, {
    target: {
      files: [new File([new Uint8Array([1, 2, 3])], 'baucher.jpg', { type: 'image/jpeg' })]
    }
  });

  await waitFor(() => expect(onBaucherChange).toHaveBeenCalledTimes(1));
  expect(String(onBaucherChange.mock.calls[0][0])).toMatch(/^data:image\/jpeg;base64,/);
});

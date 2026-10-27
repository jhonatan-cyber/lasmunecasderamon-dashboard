import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BaucherFileInput } from '@/components/shared/BaucherFileInput';
import { BAUCHER_ARCHIVO_MAX_BYTES } from '@/lib/business/baucher';

afterEach(cleanup);

function archivo(nombre: string, tipo: string) {
  return new File([new Uint8Array([137, 80, 78, 71])], nombre, { type: tipo });
}

describe('BaucherFileInput', () => {
  it('entrega la foto elegida como data URL', async () => {
    const onChange = vi.fn();
    render(<BaucherFileInput id='baucher' value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Foto del baucher'), {
      target: { files: [archivo('baucher.jpg', 'image/jpeg')] }
    });

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(String(onChange.mock.calls[0][0])).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('rechaza un archivo que no es imagen', async () => {
    const onChange = vi.fn();
    render(<BaucherFileInput id='baucher' value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Foto del baucher'), {
      target: { files: [archivo('contrato.pdf', 'application/pdf')] }
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('JPG, PNG o WebP');
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('rechaza una foto que supera el tope del servidor', async () => {
    const onChange = vi.fn();
    render(<BaucherFileInput id='baucher' value={null} onChange={onChange} />);
    const pesada = archivo('baucher.jpg', 'image/jpeg');
    Object.defineProperty(pesada, 'size', { value: BAUCHER_ARCHIVO_MAX_BYTES + 1 });

    fireEvent.change(screen.getByLabelText('Foto del baucher'), {
      target: { files: [pesada] }
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('pesa demasiado');
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('quita la foto elegida', () => {
    const onChange = vi.fn();
    render(
      <BaucherFileInput id='baucher' value='data:image/jpeg;base64,SG9sYQ==' onChange={onChange} />
    );

    expect(screen.getByAltText('Vista previa del baucher')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Quitar foto/ }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});

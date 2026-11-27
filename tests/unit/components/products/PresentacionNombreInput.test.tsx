import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PresentacionNombreInput } from '@/components/products/PresentacionNombreInput';

afterEach(cleanup);

describe('PresentacionNombreInput', () => {
  it('permite seleccionar gramos y emite la presentación con la unidad abreviada', async () => {
    const onChange = vi.fn();
    render(<PresentacionNombreInput value='250 ml' onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Unidad de la presentación' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Gramos (g)' }));

    expect(onChange).toHaveBeenLastCalledWith('250 g');
    expect(screen.getByRole('combobox', { name: 'Unidad de la presentación' })).toHaveTextContent(
      'g'
    );
  });
});

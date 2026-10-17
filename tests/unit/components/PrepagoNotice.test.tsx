import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PrepagoNotice } from '@/components/shared/PrepagoNotice';

it('no muestra nada sin saldo o sin total', () => {
  const { container: sinSaldo } = render(<PrepagoNotice saldo={0} total={10000} />);
  expect(sinSaldo).toBeEmptyDOMElement();
  const { container: sinTotal } = render(<PrepagoNotice saldo={5000} total={0} />);
  expect(sinTotal).toBeEmptyDOMElement();
});

it('muestra el saldo aplicado y lo que falta por pagar cuando no cubre el total', () => {
  render(<PrepagoNotice saldo={30000} total={50000} />);
  expect(screen.getByText(/Saldo prepago/i)).toBeInTheDocument();
  expect(screen.getByText(/Aplicado:/i)).toBeInTheDocument();
  expect(screen.getByText(/Falta por pagar:/i)).toBeInTheDocument();
});

it('avisa cuando el saldo cubre el total', () => {
  render(<PrepagoNotice saldo={80000} total={50000} />);
  expect(screen.getByText(/El saldo cubre el total/i)).toBeInTheDocument();
  expect(screen.queryByText(/Falta por pagar:/i)).not.toBeInTheDocument();
});

it('en modo diferido (pedidos y solicitudes) dice que se aplicará al cobrar', () => {
  render(<PrepagoNotice saldo={30000} total={50000} diferido />);
  expect(screen.getByText(/Se aplicará al cobrar:/i)).toBeInTheDocument();
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CleanDatabaseConfirmModal } from '@/components/settings/CleanDatabaseConfirmModal';

afterEach(cleanup);

it('requires a new confirmation after the dialog is dismissed with Escape', () => {
  const onOpenChange = vi.fn();
  const props = {
    onOpenChange,
    onConfirm: vi.fn()
  };
  const { rerender } = render(<CleanDatabaseConfirmModal {...props} open />);

  fireEvent.click(screen.getByRole('checkbox'));
  const confirmButton = screen.getByRole('button', { name: 'Sí, vaciar todo' });
  expect(confirmButton).toBeEnabled();

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onOpenChange).toHaveBeenLastCalledWith(false);

  rerender(<CleanDatabaseConfirmModal {...props} open={false} />);
  rerender(<CleanDatabaseConfirmModal {...props} open />);

  expect(confirmButton).toBeDisabled();
});

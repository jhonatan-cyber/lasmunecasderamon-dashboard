import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useRoleForm } from '@/hooks/personal/useRoleForm';
import { useCategoryForm } from '@/hooks/personal/useCategoryForm';
import { useClientForm } from '@/hooks/personal/useClientForm';
afterEach(cleanup);
describe('edición de formularios', () => {
  it.each(['rol', 'categoría', 'cliente'])(
    '%s conserva cambios si se recrea el objeto inicial',
    async entity => {
      const submit = vi.fn().mockResolvedValue(undefined);
      const { result, rerender } = renderHook(
        ({ name }) => {
          const role = useRoleForm({
            initialValues: { name, description: 'Descripción válida' },
            open: true,
            onSubmit: submit
          });
          const category = useCategoryForm({
            initialValues: { name, description: '' },
            open: true,
            onSubmit: submit
          });
          const client = useClientForm({
            clientData: { name, lastName: 'Apellido' },
            open: true,
            onSubmit: submit
          });
          return entity === 'rol'
            ? { ...role, nameField: role.register('name') }
            : entity === 'categoría'
              ? { ...category, nameField: category.register('name') }
              : { ...client, nameField: client.register('name') };
        },
        { initialProps: { name: 'Inicial' } }
      );
      await act(async () => {
        await result.current.nameField.onChange({
          target: { name: 'name', value: 'Editado' },
          type: 'change'
        });
      });
      rerender({ name: 'Inicial' });
      await act(async () => {
        await result.current.onFormSubmit();
      });
      expect(submit.mock.calls[0][0]).toMatchObject({ name: 'Editado' });
    }
  );
  it.each(['rol', 'categoría', 'cliente'])(
    '%s rechaza nombres que contienen solamente espacios',
    async entity => {
      const submit = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => {
        const role = useRoleForm({
          initialValues: { name: '   ', description: 'Descripción válida' },
          open: true,
          onSubmit: submit
        });
        const category = useCategoryForm({
          initialValues: { name: '   ', description: '' },
          open: true,
          onSubmit: submit
        });
        const client = useClientForm({
          clientData: { name: '   ', lastName: 'Apellido' },
          open: true,
          onSubmit: submit
        });
        return entity === 'rol' ? role : entity === 'categoría' ? category : client;
      });
      await act(async () => {
        await result.current.onFormSubmit();
      });
      expect(submit).not.toHaveBeenCalled();
      expect(result.current.errors.name).toBeDefined();
    }
  );
  it('clientes mantiene un solo espacio final al escribir un nombre compuesto', () => {
    const { result } = renderHook(() =>
      useClientForm({
        clientData: { name: 'Ana', lastName: 'Pérez' },
        open: true,
        onSubmit: vi.fn()
      })
    );
    act(() => result.current.setValue('name', 'Ana '));
    expect(result.current.form.getValues('name')).toBe('Ana ');
  });
});

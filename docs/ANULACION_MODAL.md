# Sistema de Notificaciones de Anulación de Ventas

## Descripción

Se ha reemplazado el sistema anterior de SweetAlert con un modal personalizado que se puede mostrar en cualquier módulo de la aplicación. El nuevo sistema utiliza un contexto global que maneja las notificaciones de anulación de ventas.

## Componentes

### 1. AnulacionConfirmModal
- **Ubicación**: `components/AnulacionConfirmModal.tsx`
- **Propósito**: Modal que muestra las confirmaciones de anulación de ventas
- **Características**:
  - Diseño moderno y consistente con la UI
  - Diferentes estilos para confirmaciones y rechazos
  - Información detallada de la venta (código, cliente, total)
  - Animaciones suaves

### 2. AnulacionProvider (Contexto)
- **Ubicación**: `contexts/AnulacionContext.tsx`
- **Propósito**: Contexto global que maneja las notificaciones
- **Características**:
  - Conexión automática con Socket.IO
  - Escucha eventos de anulación procesada
  - Manejo centralizado del estado del modal
  - Disponible en toda la aplicación

## Uso

### En cualquier módulo:

```tsx
import { useAnulacionContext } from "@/contexts/AnulacionContext";

function MiComponente() {
  const { showNotification, setRefreshCallback } = useAnulacionContext();

  // Configurar callback de actualización
  useEffect(() => {
    setRefreshCallback(() => handleRefresh);
  }, [handleRefresh, setRefreshCallback]);

  const handleAnulacionConfirmada = () => {
    showNotification({
      tipo: 'confirmada',
      venta: {
        codigo: 'VENTA-001',
        cliente: 'Juan Pérez',
        total: 150000
      }
    });
  };

  return (
    <button onClick={handleAnulacionConfirmada}>
      Mostrar Notificación
    </button>
  );
}
```

### Automático (Recomendado):
El modal se muestra automáticamente cuando se recibe una notificación de anulación desde WhatsApp a través de Socket.IO. Al hacer clic en "Aceptar" en el modal, se ejecutará automáticamente la función de actualización configurada.

## Configuración

### Layout Principal
El `AnulacionProvider` está configurado en `app/layout.tsx`:

```tsx
import { AnulacionProvider } from "@/contexts/AnulacionContext";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnulacionProvider>
          <LayoutContent>{children}</LayoutContent>
          {/* Otros componentes */}
        </AnulacionProvider>
      </body>
    </html>
  );
}
```

## Ventajas del Nuevo Sistema

1. **Consistencia**: Diseño uniforme en toda la aplicación
2. **Reutilizable**: Se puede usar en cualquier módulo
3. **Mejor UX**: Modal más elegante que SweetAlert
4. **Mantenible**: Código centralizado y fácil de modificar
5. **Responsive**: Se adapta a diferentes tamaños de pantalla
6. **Actualización Automática**: Al aceptar la notificación se actualiza automáticamente la lista de ventas

## Actualización Automática

El sistema incluye una función de actualización automática que se ejecuta cuando el usuario hace clic en "Aceptar" en el modal de confirmación:

```tsx
// En cualquier módulo que necesite actualizarse
const { setRefreshCallback } = useAnulacionContext();

useEffect(() => {
  setRefreshCallback(() => handleRefresh);
}, [handleRefresh, setRefreshCallback]);
```

Esto asegura que cuando se procese una anulación desde WhatsApp, la lista de ventas se actualice automáticamente sin necesidad de recargar la página.

## Eventos Socket.IO

El sistema escucha el evento `anulacion_procesada` con la siguiente estructura:

```typescript
interface AnulacionNotification {
  tipo: 'confirmada' | 'rechazada';
  venta: {
    codigo: string;
    cliente: string;
    total: number;
  };
}
```

## Migración

- ✅ Eliminado `hooks/useAnulacionNotifications.ts`
- ✅ Eliminado `components/AnulacionNotifications.tsx`
- ✅ Removida dependencia de SweetAlert2
- ✅ Actualizado `app/layout.tsx`

## Archivos Eliminados

- `hooks/useAnulacionNotifications.ts`
- `components/AnulacionNotifications.tsx`
- Referencia a `sweetalert2/dist/sweetalert2.min.css` en layout

## Archivos Nuevos

- `components/AnulacionConfirmModal.tsx`
- `contexts/AnulacionContext.tsx`
- `components/AnulacionTest.tsx` (componente de prueba)
- `docs/ANULACION_MODAL.md` (esta documentación) 
# Sistema de Doble Temporizador

## Descripción
El sistema implementa dos temporizadores que trabajan en conjunto para optimizar la experiencia de edición de servicios:

1. **Temporizador Principal**: El temporizador del servicio que cuenta el tiempo de la sesión
2. **Temporizador de Edición**: Un temporizador de 5 minutos que se activa durante la edición

## Funcionamiento

### Al Abrir el Modal de Edición
1. **Se pausa el temporizador principal** del servicio
2. **Se inicia el temporizador de edición** (5 minutos)
3. **Se muestra indicador visual** de que el temporizador está pausado
4. **Se muestra el tiempo restante** para completar la edición

### Durante la Edición
- El temporizador principal permanece pausado
- El temporizador de edición cuenta regresivamente desde 5:00
- Se muestran advertencias cuando quedan 30 segundos
- El tiempo restante se muestra en el header del modal

### Al Cerrar el Modal
- **Se detiene el temporizador de edición**
- **Se reanuda el temporizador principal** desde donde se pausó
- **Se actualiza el tiempo** si se modificó en la edición

### Si Se Agota el Tiempo de Edición
- Se muestra una advertencia a los 30 segundos restantes
- Al llegar a 0, se cierra automáticamente el modal
- Se reanuda el temporizador principal
- Se muestra notificación de tiempo agotado

## Indicadores Visuales

### En la ServicioCard
- **🟢 Normal**: Temporizador corriendo normalmente
- **🟠 Pausado**: Muestra "⏸️ PAUSADO" cuando está en edición
- **🔴 Tiempo bajo**: Cuando quedan menos de 5 minutos

### En el Modal de Edición
- **Temporizador en header**: Muestra tiempo restante para editar
- **Indicador de pausa**: "⏸️ Temporizador principal pausado durante la edición"
- **Advertencia de tiempo**: Alerta roja cuando quedan menos de 60 segundos

## Configuración

### Tiempo de Edición
```typescript
const EDIT_TIME_LIMIT = 300; // 5 minutos en segundos
```

### Advertencias
- **30 segundos**: Toast de advertencia
- **60 segundos**: Indicador visual rojo en el modal

## Beneficios

1. **No se pierde tiempo de servicio** durante la edición
2. **Evita ediciones indefinidas** con límite de tiempo
3. **Experiencia clara** con indicadores visuales
4. **Continuidad del servicio** al reanudar automáticamente

## Casos de Uso

### Edición Rápida
- Usuario abre modal, completa campos, guarda
- Temporizador principal se reanuda sin pérdida de tiempo

### Edición Interrumpida
- Usuario abre modal pero no completa la edición
- Después de 5 minutos, modal se cierra automáticamente
- Temporizador principal se reanuda

### Cambio de Tiempo en Edición
- Si se modifica el tiempo del servicio en el modal
- Al guardar, se actualiza el temporizador principal con el nuevo tiempo
- El tiempo transcurrido se mantiene, solo se ajusta el tiempo total

## Implementación Técnica

### Hook useEditTimer
- Maneja el temporizador de edición independiente
- Callbacks para completado y tick
- Funciones de start/stop/pause/resume

### Integración con TimerContext
- Usa `pauseTimerByServicioId()` y `resumeTimerByServicioId()`
- Mantiene la sincronización con el temporizador principal
- Actualiza el tiempo si se modifica en la edición
# Variables de Entorno para el Proyecto

Crea un archivo `.env.local` en la raíz del proyecto con estas variables:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=AC15bf3ea3e84f2ed90307bb070e1d0794
TWILIO_AUTH_TOKEN=c65257bd3131e5afbf621a91ec1dc73d
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# WhatsApp Admin Number
ADMIN_WHATSAPP_NUMBER=whatsapp:59172419112

# Base URL for the application (usar ngrok en desarrollo)
NEXT_PUBLIC_BASE_URL=https://tu-url-de-ngrok.ngrok-free.app

# Socket.IO URL (usar ngrok URL para desarrollo)
NEXT_PUBLIC_SOCKET_URL=https://tu-url-de-ngrok.ngrok-free.app
```

## Notas Importantes:

1. **El archivo `.env.local` debe estar en la raíz del proyecto**
2. **Reinicia el servidor** después de crear/modificar el archivo
3. **No subas este archivo a Git** (ya está en .gitignore)

## Para verificar que funciona:

1. **Reinicia el servidor de desarrollo**
2. **Ve a la página de ventas**
3. **Intenta anular una venta**
4. **Revisa la consola del servidor** para ver si Twilio está configurado
5. **Deberías recibir un mensaje de WhatsApp** en el número 59172419112

## Si no funciona:

- Verifica que el archivo `.env.local` esté en la raíz
- Asegúrate de haber reiniciado el servidor
- Revisa la consola para mensajes de error
- Verifica que el número de WhatsApp esté activado en Twilio 
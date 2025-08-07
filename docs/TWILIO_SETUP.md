# Configuración de Twilio WhatsApp

## Variables de Entorno Requeridas

Agrega estas variables a tu archivo `.env.local`:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886

# WhatsApp Admin Number
ADMIN_WHATSAPP=573001234567

# Base URL for the application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Pasos para Configurar Twilio

### 1. Crear Cuenta en Twilio
- Ve a [twilio.com](https://www.twilio.com)
- Crea una cuenta gratuita
- Verifica tu número de teléfono

### 2. Obtener Credenciales
- Ve a la [Consola de Twilio](https://console.twilio.com/)
- Copia tu `Account SID` y `Auth Token`
- Configúralos en las variables de entorno

### 3. Configurar WhatsApp Sandbox
- Ve a [WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/manage/whatsapp-sandbox)
- Sigue las instrucciones para activar WhatsApp
- El número por defecto es `+14155238886`

### 4. Configurar Webhook para Respuestas
- Ve a [Twilio Console > WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/manage/whatsapp-sandbox)
- En "Webhook URL", configura: `https://tu-dominio.com/api/whatsapp/webhook`
- Para desarrollo local, usa ngrok: `ngrok http 3002`
- El webhook URL sería: `https://tu-ngrok-url.ngrok.io/api/whatsapp/webhook`

### 5. Probar WhatsApp
- Envía el código de activación al número de Twilio
- Una vez activado, podrás enviar mensajes

## Uso en el Sistema

El sistema automáticamente:
1. **Detecta si Twilio está configurado**
2. **Si no está configurado**: Muestra mensajes en consola (modo simulación)
3. **Si está configurado**: Envía mensajes reales por WhatsApp

## Mensaje de Ejemplo

Cuando se solicita una anulación, se envía:

```
🚨 SOLICITUD DE ANULACIÓN DE VENTA

📋 Detalles de la venta:
• Código: V-001
• Cliente: Juan Pérez
• Total: $150,000
• Fecha: 27/07/2025

📝 Motivo de anulación:
Cliente canceló la reserva

👤 Solicitado por: María García

✅ Para confirmar: Responde "SI" o "CONFIRMAR"
❌ Para rechazar: Responde "NO" o "RECHAZAR"

El administrador puede aprobar o rechazar esta solicitud respondiendo al mensaje
```

## Troubleshooting

### Error: "Variables de entorno de Twilio no configuradas"
- Verifica que las variables estén en `.env.local`
- Reinicia el servidor después de agregar variables

### Error: "Invalid phone number"
- Asegúrate de que el número tenga código de país (+57 para Colombia)
- El formato debe ser: `+573001234567`

### Error: "WhatsApp not activated"
- Sigue los pasos de activación del sandbox
- Envía el código de activación al número de Twilio 
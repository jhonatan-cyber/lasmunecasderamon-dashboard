# Auth Contract

Fecha de decisi�n: 2026-04-10

## Decisi�n vigente

El sistema usa autenticaci�n `JWT-only` con duraci�n de `24h`.

Esto significa:

- El backend emite un �nico `token` JWT en `POST /api/auth/login`.
- El token puede viajar por cookie `token` o por header
  `Authorization: Bearer <token>`.
- No existe soporte vigente para `refreshToken`.
- No existen endpoints activos para `2FA` (`/auth/2fa/enable` y
  `/auth/2fa/disable`).
- La app m�vil debe comportarse como cliente de JWT simple hasta que el backend
  cambie este contrato.

## Endpoints soportados

### `POST /api/auth/login`

Entrada:

- `email` + `password`
- o `qr_token`
- opcionalmente `codigo` cuando el rol y horario lo requieren

Salida exitosa:

- `success: true`
- `token: string`
- `user: { ... }`

Notas:

- Tambi�n setea cookie `token` en backend web.
- No devuelve `refreshToken`.

### `POST /api/auth/logout`

Salida:

- `success: true`
- `message: string`

Notas:

- Intenta cerrar la sesi�n l�gica del usuario si puede resolverlo.
- Siempre elimina la cookie `token`.
- Debe funcionar incluso con token expirado o ausente.

### `GET /api/auth/me`

Requiere autenticaci�n.

Salida:

- `success: true`
- `user: { ... }`

Notas:

- Devuelve el perfil enriquecido desde base de datos.

### `GET /api/auth/check-session`

Requiere autenticaci�n.

Salida:

- `success: true`
- `debeDesconectar: boolean`

Notas:

- Se usa para forzar deslogueo por reglas de asistencia/c�digo en ciertos roles.

### `GET /api/auth/check`

Requiere autenticaci�n.

Salida:

- `success: true`
- `user: { ...jwt payload enriquecido... }`

## Cambios futuros permitidos

Si se desea introducir `refresh tokens` o `2FA`, debe hacerse como cambio
expl�cito de contrato:

- agregar endpoints backend
- documentar request/response
- actualizar tests de contrato
- reci�n despu�s habilitar la UI cliente correspondiente

-- Conserva los tokens heredados antes de que Comunicaciones use su propia tabla.
-- Nunca reemplaza un registro creado por la API actual.
INSERT INTO push_tokens (id, usuario_id, token, device_type)
SELECT md5('legacy-push:' || push_token), id_usuario, push_token, 'legacy'
FROM (
  SELECT DISTINCT ON (push_token) id_usuario, push_token
  FROM usuarios
  WHERE push_token IS NOT NULL AND btrim(push_token) <> ''
  ORDER BY push_token, id_usuario
) heredados
ON CONFLICT (token) DO NOTHING;

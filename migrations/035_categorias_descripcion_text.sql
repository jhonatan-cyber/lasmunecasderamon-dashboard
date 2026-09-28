-- 035) categorias.descripcion pasa a text ----------------------------------
-- El modal de categorias no validaba el largo del textarea: una descripcion de
-- mas de 255 caracteres hacia fallar el PUT /api/categories con
-- "value too long for type character varying(255)" y la edicion terminaba en
-- 500 "Error interno del servidor". Con text se elimina el techo arbitrario del
-- formulario; el limite de UX (2000) lo pone CategorySchema.
--
-- En instalaciones nuevas esta migracion se adopta sin ejecutar si el dump ya
-- declara la columna como text.
ALTER TABLE categorias ALTER COLUMN descripcion TYPE text;

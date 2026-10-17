ALTER TABLE categorias ADD COLUMN IF NOT EXISTS system_key text UNIQUE;

UPDATE categorias SET system_key = 'bebidas_analcoholicas'
WHERE id_categoria = (
  SELECT id_categoria FROM categorias
  WHERE lower(trim(nombre)) IN ('bebidas analcohólicas', 'bebidas analcoholicas')
  ORDER BY fecha_crea, id_categoria LIMIT 1
) AND NOT EXISTS (SELECT 1 FROM categorias WHERE system_key = 'bebidas_analcoholicas');

INSERT INTO categorias (id_categoria, nombre, descripcion, estado, fecha_crea, display_order, system_key)
SELECT 'a763f1c4-1700-4d17-92d2-000000000076', 'Bebidas analcohólicas',
       'Bebidas sin alcohol', 1, CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago',
       COALESCE(MAX(display_order), 0) + 1, 'bebidas_analcoholicas'
FROM categorias
HAVING NOT EXISTS (SELECT 1 FROM categorias WHERE system_key = 'bebidas_analcoholicas');

CREATE OR REPLACE FUNCTION proteger_categoria_predeterminada() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'No se pueden truncar las categorías: existe una categoría predeterminada protegida';
  END IF;
  IF OLD.system_key = 'bebidas_analcoholicas' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'La categoría predeterminada Bebidas analcohólicas no se puede eliminar';
    END IF;
    IF NEW.system_key IS DISTINCT FROM OLD.system_key OR NEW.id_categoria IS DISTINCT FROM OLD.id_categoria THEN
      RAISE EXCEPTION 'No se puede quitar la protección de la categoría predeterminada';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER categorias_proteger_predeterminada BEFORE DELETE OR UPDATE ON categorias
FOR EACH ROW EXECUTE FUNCTION proteger_categoria_predeterminada();
CREATE TRIGGER categorias_proteger_truncate BEFORE TRUNCATE ON categorias
FOR EACH STATEMENT EXECUTE FUNCTION proteger_categoria_predeterminada();

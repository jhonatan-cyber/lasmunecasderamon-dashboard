UPDATE categorias
   SET system_key = 'cigarrillos'
 WHERE id_categoria = (
   SELECT id_categoria
     FROM categorias
    WHERE lower(trim(nombre)) = 'cigarrillos'
    ORDER BY fecha_crea, id_categoria
    LIMIT 1
 )
   AND NOT EXISTS (SELECT 1 FROM categorias WHERE system_key = 'cigarrillos');

INSERT INTO categorias (id_categoria, nombre, descripcion, estado, fecha_crea, display_order, system_key)
SELECT 'a763f1c4-1700-4d17-92d2-000000000089', 'Cigarrillos',
       'Cigarrillos', 1, CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago',
       COALESCE(MAX(display_order), 0) + 1, 'cigarrillos'
  FROM categorias
 HAVING NOT EXISTS (SELECT 1 FROM categorias WHERE system_key = 'cigarrillos')
    AND NOT EXISTS (SELECT 1 FROM categorias WHERE lower(trim(nombre)) = 'cigarrillos');

CREATE OR REPLACE FUNCTION proteger_categoria_predeterminada() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'No se pueden truncar las categorías: existe una categoría predeterminada protegida';
  END IF;
  IF OLD.system_key IN ('bebidas_analcoholicas', 'cigarrillos') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'La categoría predeterminada % no se puede eliminar', OLD.nombre;
    END IF;
    IF NEW.nombre IS DISTINCT FROM OLD.nombre THEN
      RAISE EXCEPTION 'La categoría predeterminada % no se puede renombrar', OLD.nombre;
    END IF;
    IF NEW.estado IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'La categoría predeterminada % no se puede desactivar', OLD.nombre;
    END IF;
    IF NEW.system_key IS DISTINCT FROM OLD.system_key OR NEW.id_categoria IS DISTINCT FROM OLD.id_categoria THEN
      RAISE EXCEPTION 'No se puede quitar la protección de la categoría predeterminada';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

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
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

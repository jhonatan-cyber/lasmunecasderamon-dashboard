// Compartida por el servidor y la confirmación para mostrar las mismas excepciones.
export const DATABASE_CLEAN_PROTECTED_TABLES = [
  'usuarios',
  'roles',
  'role_permissions',
  'permissions',
  'categorias',
  'productos',
  'inventario_presentaciones',
  'habitaciones',
  'clientes'
] as const;

// Metadatos del esquema: vaciarlos haría que se repitieran migraciones ya aplicadas.
export const DATABASE_MIGRATION_TABLES = ['_migrations', '_postgres_migrations'] as const;

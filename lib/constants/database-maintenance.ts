// Compartida por el servidor y la confirmación para mostrar las mismas excepciones.
export const DATABASE_CLEAN_PROTECTED_TABLES = [
  'usuarios',
  'roles',
  'role_permissions',
  'permissions',
  'configuraciones',
  'backups',
  '_migrations',
  '_postgres_migrations',
  'habitaciones',
  'productos',
  'categorias',
  'codigos',
  'inventario_presentaciones',
  'inventario_unidades',
  'inventario_movimientos',
  // Las unidades conservadas referencian las compras que las originaron.
  'compras',
  'detalle_compras',
  'producto_champagne_tiers'
] as const;

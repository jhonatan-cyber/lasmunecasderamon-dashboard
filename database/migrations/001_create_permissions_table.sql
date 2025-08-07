-- Crear tabla de permisos
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_module_action (module, action),
    INDEX idx_name (name)
);

-- Insertar permisos básicos del sistema
INSERT INTO permissions (name, description, module, action) VALUES
-- Usuarios
('users.view', 'Ver usuarios', 'users', 'view'),
('users.create', 'Crear usuarios', 'users', 'create'),
('users.edit', 'Editar usuarios', 'users', 'edit'),
('users.delete', 'Eliminar usuarios', 'users', 'delete'),
('users.activate', 'Activar usuarios', 'users', 'activate'),
('users.deactivate', 'Desactivar usuarios', 'users', 'deactivate'),

-- Roles
('roles.view', 'Ver roles', 'roles', 'view'),
('roles.create', 'Crear roles', 'roles', 'create'),
('roles.edit', 'Editar roles', 'roles', 'edit'),
('roles.delete', 'Eliminar roles', 'roles', 'delete'),
('roles.activate', 'Activar roles', 'roles', 'activate'),
('roles.deactivate', 'Desactivar roles', 'roles', 'deactivate'),
('roles.permissions', 'Gestionar permisos de roles', 'roles', 'permissions'),

-- Ventas
('sales.view', 'Ver ventas', 'sales', 'view'),
('sales.create', 'Crear ventas', 'sales', 'create'),
('sales.edit', 'Editar ventas', 'sales', 'edit'),
('sales.delete', 'Eliminar ventas', 'sales', 'delete'),
('sales.reports', 'Ver reportes de ventas', 'sales', 'reports'),

-- Productos
('products.view', 'Ver productos', 'products', 'view'),
('products.create', 'Crear productos', 'products', 'create'),
('products.edit', 'Editar productos', 'products', 'edit'),
('products.delete', 'Eliminar productos', 'products', 'delete'),

-- Categorías
('categories.view', 'Ver categorías', 'categories', 'view'),
('categories.create', 'Crear categorías', 'categories', 'create'),
('categories.edit', 'Editar categorías', 'categories', 'edit'),
('categories.delete', 'Eliminar categorías', 'categories', 'delete'),

-- Habitaciones
('rooms.view', 'Ver habitaciones', 'rooms', 'view'),
('rooms.create', 'Crear habitaciones', 'rooms', 'create'),
('rooms.edit', 'Editar habitaciones', 'rooms', 'edit'),
('rooms.delete', 'Eliminar habitaciones', 'rooms', 'delete'),

-- Caja
('cash_register.view', 'Ver caja', 'cash_register', 'view'),
('cash_register.open', 'Abrir caja', 'cash_register', 'open'),
('cash_register.close', 'Cerrar caja', 'cash_register', 'close'),
('cash_register.reports', 'Ver reportes de caja', 'cash_register', 'reports'),

-- Pedidos
('orders.view', 'Ver pedidos', 'orders', 'view'),
('orders.create', 'Crear pedidos', 'orders', 'create'),
('orders.edit', 'Editar pedidos', 'orders', 'edit'),
('orders.delete', 'Eliminar pedidos', 'orders', 'delete'),
('orders.process', 'Procesar pedidos', 'orders', 'process'),

-- Servicios
('services.view', 'Ver servicios', 'services', 'view'),
('services.create', 'Crear servicios', 'services', 'create'),
('services.edit', 'Editar servicios', 'services', 'edit'),
('services.delete', 'Eliminar servicios', 'services', 'delete'),

-- Propinas
('tips.view', 'Ver propinas', 'tips', 'view'),
('tips.create', 'Crear propinas', 'tips', 'create'),
('tips.edit', 'Editar propinas', 'tips', 'edit'),
('tips.delete', 'Eliminar propinas', 'tips', 'delete'),
('tips.distribute', 'Distribuir propinas', 'tips', 'distribute'),

-- Configuración
('settings.view', 'Ver configuración', 'settings', 'view'),
('settings.edit', 'Editar configuración', 'settings', 'edit'),

-- Reportes
('reports.view', 'Ver reportes', 'reports', 'view'),
('reports.export', 'Exportar reportes', 'reports', 'export'); 
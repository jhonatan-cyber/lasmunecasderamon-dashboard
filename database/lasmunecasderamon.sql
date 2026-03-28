-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 27-03-2026 a las 01:40:40
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `lasmunecasderamon`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `create_index_if_not_exists` (IN `table_name` VARCHAR(128), IN `index_name` VARCHAR(128), IN `index_definition` TEXT)   BEGIN
    DECLARE index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO index_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
        AND table_name = table_name
        AND index_name = index_name;
    
    IF index_exists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', index_name, ' ON ', table_name, ' ', index_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('✓ Índice ', index_name, ' creado en ', table_name) AS resultado;
    ELSE
        SELECT CONCAT('⚠ Índice ', index_name, ' ya existe en ', table_name) AS resultado;
    END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `anticipos`
--

CREATE TABLE `anticipos` (
  `id_anticipo` varchar(36) NOT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `monto` int(11) NOT NULL,
  `asistencia` int(11) NOT NULL DEFAULT 0,
  `comision` int(11) NOT NULL DEFAULT 0,
  `propina` int(11) NOT NULL DEFAULT 0,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asistencias`
--

CREATE TABLE `asistencias` (
  `id_asistencia` varchar(36) NOT NULL,
  `hora` time NOT NULL,
  `fecha` date NOT NULL,
  `fecha_pago` datetime DEFAULT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `resource_type` varchar(50) DEFAULT NULL,
  `resource_id` varchar(36) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `resource_type`, `resource_id`, `details`, `ip_address`, `created_at`) VALUES
('038418a1-4604-4fb5-b201-5f5e1147f082', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/users', 'users', NULL, '{}', '127.0.0.1', '2026-03-26 05:24:02'),
('07eaaca1-a8de-41c4-97d8-fc4a0973b8f5', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/clients', 'clients', NULL, '{}', '127.0.0.1', '2026-03-26 06:55:20'),
('0d21ec5a-e4d5-42ea-8155-7b144275816c', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/clients', 'clients', NULL, '{}', '127.0.0.1', '2026-03-26 06:52:59'),
('17f30899-f8d4-4277-b8c2-076a423eef64', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/users', 'users', NULL, '{}', '127.0.0.1', '2026-03-26 06:34:05'),
('1f724292-5bc9-41a0-9d4c-818c014ac5bd', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/users', 'users', NULL, '{}', '127.0.0.1', '2026-03-26 06:34:25'),
('31879132-be86-433d-8090-cdf3acfc3aea', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/clients', 'clients', NULL, '{}', '127.0.0.1', '2026-03-26 06:54:59'),
('31cb1777-bd33-4d19-a9b6-daf1775fe02e', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/users', 'users', NULL, '{}', '127.0.0.1', '2026-03-26 06:23:50'),
('5ad492f7-fc1a-4a53-af0e-74456fd0fe3c', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/users', 'users', NULL, '{}', '127.0.0.1', '2026-03-26 05:27:20'),
('5bd9b771-f036-4fb3-a942-00ce1a297468', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/users', 'users', NULL, '{}', '127.0.0.1', '2026-03-26 06:34:22'),
('673e1174-2b58-4a41-8cb1-d9b9969b2f9c', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/users', 'users', NULL, '{}', '127.0.0.1', '2026-03-26 06:24:42'),
('eb028b0c-391f-49b5-8253-d04d9c82fed3', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/users', 'users', NULL, '{}', '127.0.0.1', '2026-03-26 06:01:39'),
('f029155f-780e-43d1-ae01-dc1c29619c8e', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/clients', 'clients', NULL, '{}', '127.0.0.1', '2026-03-26 05:53:25');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cajas`
--

CREATE TABLE `cajas` (
  `id_caja` varchar(36) NOT NULL,
  `fecha_apertura` datetime NOT NULL,
  `usuario_id_apertura` varchar(36) DEFAULT NULL,
  `monto_apertura` int(11) NOT NULL,
  `efectivo` int(11) NOT NULL,
  `tarjeta` int(11) NOT NULL,
  `transferencia` int(11) NOT NULL DEFAULT 0,
  `prepago` int(11) DEFAULT 0,
  `usuario_id_cierre` varchar(36) DEFAULT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  `monto_cierre` int(11) NOT NULL,
  `venta` int(11) NOT NULL DEFAULT 0,
  `servicio` int(11) DEFAULT 0,
  `devolucion` int(11) DEFAULT 0,
  `iva` int(11) NOT NULL DEFAULT 0,
  `comision` int(11) NOT NULL DEFAULT 0,
  `propina` int(11) NOT NULL DEFAULT 0,
  `anticipo` int(11) NOT NULL DEFAULT 0,
  `estado` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id_categoria` varchar(36) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` varchar(255) NOT NULL DEFAULT 'Sin descripción',
  `estado` int(11) NOT NULL DEFAULT 1,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL,
  `display_order` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id_categoria`, `nombre`, `descripcion`, `estado`, `fecha_crea`, `fecha_mod`, `fecha_baja`, `display_order`) VALUES
('140356bd-67ce-49f0-b1f0-365a31b12697', 'Champagne', '', 1, '2026-03-16 06:43:09', NULL, NULL, 0),
('a7ce02ae-a2cf-4dda-b3e5-a3f4a42f15ac', 'Tragos Chicas', '', 1, '2026-03-16 06:43:46', NULL, NULL, 0),
('ba8c80ba-4b11-4b0c-879b-2936fa52db6b', 'Tequila', '', 1, '2026-03-16 06:43:37', NULL, NULL, 0),
('cf60de08-fa17-4354-b870-db5f2441fcbf', 'Prueva', '', 1, '0000-00-00 00:00:00', NULL, NULL, 0),
('db2d6083-74bb-44dc-afd4-088d70a5f76a', 'Cerveza ', '', 1, '2026-03-16 06:43:22', NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id_cliente` varchar(36) NOT NULL,
  `run` varchar(20) DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `apellido` varchar(255) NOT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1,
  `saldo` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id_cliente`, `run`, `nombre`, `apellido`, `telefono`, `fecha_crea`, `fecha_mod`, `estado`, `saldo`) VALUES
('70f78f5e-0360-4ec5-b069-d26f48826b2b', '156332311', 'Ramon', 'Troncoso', '', '2026-03-26 06:54:59', '2026-03-26 06:55:20', 1, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes_prepago_movimientos`
--

CREATE TABLE `clientes_prepago_movimientos` (
  `id_movimiento` varchar(36) NOT NULL,
  `cliente_id` varchar(36) NOT NULL,
  `tipo` enum('CARGA','CONSUMO','DEVOLUCION') NOT NULL,
  `monto` int(11) NOT NULL,
  `metodo_pago` varchar(50) DEFAULT NULL,
  `venta_id` varchar(36) DEFAULT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `metadatos` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `codigos`
--

CREATE TABLE `codigos` (
  `id_codigo` varchar(36) NOT NULL,
  `codigo` varchar(10) NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `estado` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `codigos`
--

INSERT INTO `codigos` (`id_codigo`, `codigo`, `fecha_crea`, `estado`) VALUES
('da610f62-c83f-4859-ac1e-945ab9f42836', '4982', '2026-03-19 03:51:14', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comisiones`
--

CREATE TABLE `comisiones` (
  `id_comision` varchar(36) NOT NULL,
  `venta_id` varchar(36) DEFAULT NULL,
  `servicio_id` varchar(36) DEFAULT NULL,
  `monto` int(11) NOT NULL DEFAULT 0,
  `estado` int(11) NOT NULL DEFAULT 1,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuentas`
--

CREATE TABLE `cuentas` (
  `id_cuenta` varchar(36) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `cliente_id` varchar(36) DEFAULT NULL,
  `total_comision` int(11) NOT NULL,
  `habitacion_id` varchar(36) DEFAULT NULL,
  `sub_total` int(11) NOT NULL,
  `total` int(11) NOT NULL,
  `metodo_pago` varchar(50) DEFAULT NULL,
  `pedido_id` varchar(36) DEFAULT NULL,
  `servicio_id` varchar(36) DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1,
  `tiempo` int(11) DEFAULT 0,
  `created_by` varchar(36) DEFAULT NULL,
  `cobrado_por` varchar(50) DEFAULT NULL,
  `propina` decimal(15,2) DEFAULT 0.00,
  `push_notified_5m` tinyint(4) DEFAULT 0,
  `push_notified_end` tinyint(4) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuentas_usuarios`
--

CREATE TABLE `cuentas_usuarios` (
  `id_cuenta_usuario` varchar(36) NOT NULL,
  `cuenta_id` varchar(36) DEFAULT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_comisiones`
--

CREATE TABLE `detalle_comisiones` (
  `id_detalle_comision` varchar(36) NOT NULL,
  `comision_id` varchar(36) DEFAULT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `comision` int(11) NOT NULL DEFAULT 0,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_cuentas`
--

CREATE TABLE `detalle_cuentas` (
  `id_detalle_cuenta` varchar(36) NOT NULL,
  `cuenta_id` varchar(36) DEFAULT NULL,
  `producto_id` varchar(36) DEFAULT NULL,
  `precio` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `sub_total` int(11) NOT NULL,
  `comision` int(11) NOT NULL,
  `hostess_id` varchar(36) DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `created_by` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_devoluciones_servicios`
--

CREATE TABLE `detalle_devoluciones_servicios` (
  `id_detalle_devolucion` varchar(36) NOT NULL,
  `devolucion_servicio_id` varchar(36) DEFAULT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `monto` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_devoluciones_ventas`
--

CREATE TABLE `detalle_devoluciones_ventas` (
  `id_detalle_devolucion` varchar(36) NOT NULL,
  `devolucion_venta_id` varchar(36) DEFAULT NULL,
  `producto_id` varchar(36) DEFAULT NULL,
  `cantidad` int(11) NOT NULL,
  `precio` int(11) NOT NULL,
  `comision` int(11) NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `estado` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_pedidos`
--

CREATE TABLE `detalle_pedidos` (
  `id_detalle_pedido` varchar(36) NOT NULL,
  `pedido_id` varchar(36) DEFAULT NULL,
  `producto_id` varchar(36) DEFAULT NULL,
  `precio` int(11) NOT NULL,
  `comision` int(11) NOT NULL,
  `genera_comision` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Indica si el producto genera comisión para las anfitrionas (1=Sí, 0=No)',
  `hostess_id` varchar(36) DEFAULT NULL,
  `habitacion_id` varchar(36) DEFAULT NULL,
  `cantidad` int(11) NOT NULL,
  `subtotal` int(11) NOT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_pedidos_anfitrionas`
--

CREATE TABLE `detalle_pedidos_anfitrionas` (
  `id_detalle_anfitriona` varchar(36) NOT NULL,
  `detalle_pedido_id` int(11) NOT NULL,
  `anfitriona_id` int(11) NOT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_propinas`
--

CREATE TABLE `detalle_propinas` (
  `id_detalle_propina` varchar(36) NOT NULL,
  `propina_id` varchar(36) DEFAULT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `monto` int(11) NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_servicios`
--

CREATE TABLE `detalle_servicios` (
  `id_detalle_servicio` varchar(36) NOT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `comision` decimal(10,2) NOT NULL DEFAULT 0.00,
  `servicio_id` varchar(36) DEFAULT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_servicios_clientes`
--

CREATE TABLE `detalle_servicios_clientes` (
  `id` varchar(36) NOT NULL,
  `servicio_id` varchar(36) DEFAULT NULL,
  `cliente_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_ventas`
--

CREATE TABLE `detalle_ventas` (
  `id_detalle_venta` varchar(36) NOT NULL,
  `venta_id` varchar(36) DEFAULT NULL,
  `producto_id` varchar(36) DEFAULT NULL,
  `precio` int(11) NOT NULL,
  `comision` int(11) NOT NULL,
  `hostess_id` varchar(36) DEFAULT NULL,
  `cantidad` int(11) NOT NULL,
  `sub_total` int(11) NOT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devoluciones_servicios`
--

CREATE TABLE `devoluciones_servicios` (
  `id_devolucion` varchar(36) NOT NULL,
  `servicio_id` varchar(36) DEFAULT NULL,
  `pieza_id` varchar(36) DEFAULT NULL,
  `cliente_id` varchar(36) DEFAULT NULL,
  `total` int(11) NOT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devoluciones_ventas`
--

CREATE TABLE `devoluciones_ventas` (
  `id_devolucion_venta` varchar(36) NOT NULL,
  `cliente_id` varchar(36) DEFAULT NULL,
  `venta_id` varchar(36) DEFAULT NULL,
  `total` int(11) NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `estado` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devoluciones_ventas_usuarios`
--

CREATE TABLE `devoluciones_ventas_usuarios` (
  `id_devolucion_usuario` varchar(36) NOT NULL,
  `detalle_devolucion_venta_id` varchar(36) DEFAULT NULL,
  `usuario_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `error_logs`
--

CREATE TABLE `error_logs` (
  `id` varchar(36) NOT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `stack_trace` text DEFAULT NULL,
  `request_body` text DEFAULT NULL,
  `fecha_crea` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `error_logs`
--

INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('', 'GET /api/users', 'Cannot read properties of undefined (reading \'length\')', 'Error: Cannot read properties of undefined (reading \'length\')\n    at PromisePool.execute (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\557b4_mysql2_381024e7._.js:11703:26)\n    at query (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:517:35)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1620:149)\n    at module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1819:178)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:821:16\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:709:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:29:45'),
('001b25ce-2d0f-4070-b08a-98c0d2515d6b', 'GET /api/clients', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]\n    at ClientRepository.mapClientFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1078:155)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:40\n    at Array.map (<anonymous>)\n    at ClientRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1711:18\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f1be3046._.js:719:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 06:34:50'),
('055e6bdc-515c-4e66-9138-3f2c205fe47e', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1599:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1813:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:716:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:55:30'),
('0a73eff4-03f9-43cb-9aaa-b21158863f01', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1599:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1813:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:716:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:55:31'),
('13c3297e-1b57-4ef2-a2b3-87ba3e292634', 'GET /api/clients', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]\n    at ClientRepository.mapClientFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1075:155)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1095:40\n    at Array.map (<anonymous>)\n    at ClientRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1095:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1708:18\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1567:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:55:26'),
('18d8b0f2-5793-48f3-8204-95fcfb45c68c', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1601:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1614:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1614:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1815:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:718:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:59:21'),
('1a1aff1a-7dc8-4e91-a7c5-ae51c8f6a352', 'GET /api/clients', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]\n    at ClientRepository.mapClientFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1078:155)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:40\n    at Array.map (<anonymous>)\n    at ClientRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1711:18\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f1be3046._.js:719:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 06:34:49'),
('2319585d-0443-4a5e-aeee-18a8d072430f', 'GET /api/clients', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]\n    at ClientRepository.mapClientFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1078:155)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:40\n    at Array.map (<anonymous>)\n    at ClientRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1711:18\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f1be3046._.js:719:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 06:53:50');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('33cbaab3-5ca9-41bf-9007-e680ee0b02ac', 'GET /api/clients', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]\n    at ClientRepository.mapClientFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1075:155)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1095:40\n    at Array.map (<anonymous>)\n    at ClientRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1095:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1708:18\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1567:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:55:28'),
('3bab1a69-37dd-4ce7-8630-ee048b493f6c', 'GET /api/clients', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]\n    at ClientRepository.mapClientFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1078:155)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:40\n    at Array.map (<anonymous>)\n    at ClientRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1711:18\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f1be3046._.js:719:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 06:34:56'),
('4335e858-a545-45be-990f-9ae12b5003c0', 'GET /api/clients', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]\n    at ClientRepository.mapClientFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1078:155)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:40\n    at Array.map (<anonymous>)\n    at ClientRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1711:18\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f1be3046._.js:719:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 06:53:49'),
('43bd9847-905a-446d-b7a7-aa5ed229e940', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1599:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1813:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:716:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:55:51'),
('444be7d4-af8a-4d45-8544-2a2a818d6812', 'GET /api/clients', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]\n    at ClientRepository.mapClientFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1078:155)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:40\n    at Array.map (<anonymous>)\n    at ClientRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1711:18\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f1be3046._.js:719:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 06:53:02'),
('450457cf-5f39-4aae-b561-da1392088785', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1599:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1813:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f43eb6d3._.js:716:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:57:56'),
('58161212-0871-4e0c-9f37-85fe0f5740d1', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1599:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1813:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:716:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:55:47'),
('59d9ef4f-9dae-4590-9809-f8e9c50cab5f', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1599:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1813:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f43eb6d3._.js:716:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:57:57');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('636bad6a-a340-40b4-956c-cffbcf06da52', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1601:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1614:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1614:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1815:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:718:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:59:22'),
('7bd15fb9-0ce1-4bee-864b-d261ca803292', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1599:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1813:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f43eb6d3._.js:716:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:58:03'),
('90e50686-18a4-40a3-b64c-e825353c5e92', 'GET /api/clients', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]\n    at ClientRepository.mapClientFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1078:155)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:40\n    at Array.map (<anonymous>)\n    at ClientRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1711:18\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f1be3046._.js:719:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 06:52:59'),
('aa03db0b-2751-4df6-af72-b65e4e5b487e', 'GET /api/clients', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]\n    at ClientRepository.mapClientFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1078:155)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:40\n    at Array.map (<anonymous>)\n    at ClientRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1711:18\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f1be3046._.js:719:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 06:34:52'),
('b23a2a10-226e-468d-a3fa-0a9c9913e3d3', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1599:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1612:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1813:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f43eb6d3._.js:716:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:57:59'),
('cba3f95e-6873-4f33-a174-098f8034cce1', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1601:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1614:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1614:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1815:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:718:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:59:37'),
('cdaa3a80-071d-4823-b33c-93047a106b30', 'POST /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"name\"\n    ],\n    \"message\": \"Invalid input: expected string, received undefined\"\n  },\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"lastName\"\n    ],\n    \"message\": \"Invalid input: expected string, received undefined\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"name\"\n    ],\n    \"message\": \"Invalid input: expected string, received undefined\"\n  },\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"lastName\"\n    ],\n    \"message\": \"Invalid input: expected string, received undefined\"\n  }\n]\n    at UserService.createUser (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1739:168)\n    at module.exports.POST.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1839:166)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:719:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 06:01:39'),
('e5cb0d59-577d-450f-9f7b-f7986a4236e2', 'GET /api/users', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"created_at\"\n    ],\n    \"message\": \"Invalid input: expected string, received Date\"\n  }\n]\n    at UserRepository.mapUserFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1601:151)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1614:37\n    at Array.map (<anonymous>)\n    at UserRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1614:21)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:1815:18)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__c7eb1ffd._.js:718:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_dd76b88c._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 05:59:24');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('fe3a698d-17e9-4433-a98e-f042cd0629a2', 'GET /api/clients', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"deuda\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  },\n  {\n    \"code\": \"invalid_union\",\n    \"errors\": [\n      [\n        {\n          \"expected\": \"string\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected string, received null\"\n        }\n      ],\n      [\n        {\n          \"expected\": \"date\",\n          \"code\": \"invalid_type\",\n          \"path\": [],\n          \"message\": \"Invalid input: expected date, received null\"\n        }\n      ]\n    ],\n    \"path\": [\n      \"updated_at\"\n    ],\n    \"message\": \"Invalid input\"\n  }\n]\n    at ClientRepository.mapClientFromDB (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1078:155)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:40\n    at Array.map (<anonymous>)\n    at ClientRepository.getAll (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1098:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__b6f76dfe._.js:1711:18\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__f1be3046._.js:719:20\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:37866)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:45156)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16028:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:187713)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16091:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\f4e7f_next_94a5a6f3._.js:16144:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1422:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1474:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1524:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:1018:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\next-server.js:395:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\base-server.js:909:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:387:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\trace\\trace.js:157:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:383:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:248:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:447:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\router-server.js:496:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon\\node_modules\\.pnpm\\next@16.1.2_@babel+core@7.2_1f1e4ccaf2dc542d9a0bc4d0150faadd\\node_modules\\next\\dist\\server\\lib\\start-server.js:226:13)', NULL, '2026-03-26 06:53:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `gratificaciones`
--

CREATE TABLE `gratificaciones` (
  `id` varchar(36) NOT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT current_timestamp(),
  `usuario_id` varchar(36) DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `habitaciones`
--

CREATE TABLE `habitaciones` (
  `id_habitacion` varchar(36) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `precio` int(11) NOT NULL,
  `tiempo` int(11) NOT NULL,
  `comision_anfitriona` int(11) DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `habitaciones`
--

INSERT INTO `habitaciones` (`id_habitacion`, `nombre`, `display_order`, `precio`, `tiempo`, `comision_anfitriona`, `estado`, `fecha_crea`, `fecha_mod`, `fecha_baja`) VALUES
('473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 'Jacuzzi ', 0, 200000, 5, 60000, 1, '2026-03-16 08:28:40', NULL, NULL),
('64c46699-e58f-4e7a-9e62-25d615720a70', 'Privado 2', 0, 30000, 15, 0, 1, '2026-03-16 08:29:41', NULL, NULL),
('b64b7bfe-7b74-4f74-8857-31750a856868', 'Vip', 0, 0, 0, 0, 1, '2026-03-16 08:27:30', NULL, NULL),
('d4288e9f-63e6-4b1d-8fa1-6670042e8827', 'Privado 1', 0, 30000, 15, 0, 1, '2026-03-16 08:29:01', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `horas_extras`
--

CREATE TABLE `horas_extras` (
  `id_hora_extra` varchar(36) NOT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `hora` int(11) NOT NULL,
  `monto` int(11) NOT NULL,
  `total` int(11) NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `logins`
--

CREATE TABLE `logins` (
  `id_login` varchar(36) NOT NULL,
  `usuario_id` varchar(36) NOT NULL,
  `last_login` datetime NOT NULL,
  `estado` int(11) NOT NULL DEFAULT 1,
  `ip_address` varchar(45) DEFAULT NULL,
  `en_local` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `logins`
--

INSERT INTO `logins` (`id_login`, `usuario_id`, `last_login`, `estado`, `ip_address`, `en_local`) VALUES
('947a4d8b-6e9b-4cf1-a2f2-7de2486a65af', '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-03-25 19:53:16', 1, '127.0.0.1', 0),
('a46b3306-adfd-4716-bfb5-81232b3ccd15', '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-03-25 19:16:38', 1, '127.0.0.1', 0),
('b32263a3-80fe-4cdd-87b3-3f8de0e030c4', '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-03-26 15:44:09', 1, '127.0.0.1', 0),
('e23ce122-ac27-44c4-8c96-c59668ca392d', '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-03-25 19:18:11', 1, '127.0.0.1', 0),
('fee0a4f5-e067-4518-8de9-9d9fb7581ebb', '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-03-26 05:57:33', 1, '127.0.0.1', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id` varchar(36) NOT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `rol_destinatario` varchar(50) DEFAULT NULL,
  `tipo` varchar(50) NOT NULL,
  `titulo` varchar(255) DEFAULT NULL,
  `mensaje` text DEFAULT NULL,
  `datos` text DEFAULT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_crea` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_leida` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `id_pedido` varchar(36) NOT NULL,
  `codigo` varchar(15) NOT NULL,
  `mesero_id` varchar(36) DEFAULT NULL,
  `cliente_id` varchar(36) DEFAULT NULL,
  `subtotal` int(11) NOT NULL,
  `total` int(11) NOT NULL,
  `propina` int(11) NOT NULL DEFAULT 0,
  `total_comision` int(11) NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos_usuarios`
--

CREATE TABLE `pedidos_usuarios` (
  `id_pedido_usuario` varchar(36) NOT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `pedido_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permissions`
--

CREATE TABLE `permissions` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `module` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `description`, `module`, `action`, `created_at`, `updated_at`, `deleted_at`) VALUES
('05334ab3-b304-444e-97e9-d2f4fe9c1727', 'Ver devoluciones', 'Acceso para visualizar todos los registros de devoluciones', 'returns', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('08b5920d-e7b0-4e94-b906-42fbe3a08438', 'Ver detalles de clientes', 'Acceso para ver información detallada de clientes', 'clients', 'view_details', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('0fd0af1d-7082-4e4e-88e3-0d10a1a5256a', 'Procesar pedidos', 'Acceso para procesar y gestionar pedidos', 'orders', 'process', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('144321cb-2f96-4c27-a025-208bfcec01d3', 'Ver clientes', 'Acceso para visualizar todos los clientes', 'clients', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('145bfa46-2b45-424c-9ee2-233a0a6973a0', 'Crear gratificaciones', 'Acceso para crear nuevos registros de gratificaciones', 'gratificaciones', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('1787b46b-78fe-4a8b-9dc4-571fa7e56c20', 'Crear productos', 'Acceso para crear nuevos productos en el catálogo', 'products', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('191040bf-222c-4f15-b553-eb895b7b731a', 'Ver productos', 'Acceso para visualizar todos los productos', 'products', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('1d5107c3-ffd7-48ce-b06c-be010233766b', 'Ver ventas', 'Acceso para visualizar todas las ventas', 'sales', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('208d766e-6d5b-477c-a7eb-e480bff7467e', 'Crear cuentas', 'Acceso para crear nuevas cuentas de clientes', 'accounts', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('27f9e876-ea6d-45ba-98ee-a3bd44403cd8', 'Editar categorías', 'Acceso para modificar categorías existentes', 'categories', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('28115302-66e3-432a-8a18-9e132ceed556', 'Crear pagos', 'Acceso para crear nuevos registros de pagos', 'payroll', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('2a6f78d5-8292-4177-8980-50f270b06657', 'Eliminar pedidos', 'Acceso para eliminar pedidos del sistema', 'orders', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('2ce981cc-ee3e-41cd-82ad-181827ff4070', 'Aprobar horas extras', 'Acceso para aprobar solicitudes de horas extras', 'overtime', 'approve', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('2da2b944-aab4-4c60-bb06-024ba05d8959', 'Crear roles', 'Acceso para crear nuevos roles en el sistema', 'roles', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('2f6300f4-a115-4e95-a5b1-2576bfcc9c1d', 'Calcular comisiones', 'Acceso para calcular comisiones de empleados', 'commissions', 'calculate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('2fb6087c-8784-401f-908f-3a3e2c158a26', 'Crear devoluciones', 'Acceso para crear nuevos registros de devoluciones', 'returns', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('36ef0033-2bc9-4f6e-840b-32496fc5fa9f', 'Editar pagos', 'Acceso para modificar información de pagos', 'payroll', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3a2d75fe-61a0-4332-b5b3-59e647c4409a', 'Crear asistencias', 'Acceso para registrar nuevas asistencias', 'attendance', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3b154066-0f7e-486f-8e0b-b656338be78b', 'Desactivar usuarios', 'Acceso para desactivar usuarios del sistema', 'users', 'deactivate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3da800d8-d6d8-4e1b-84a8-3f9aa5b3347e', 'Crear horas extras', 'Acceso para crear nuevos registros de horas extras', 'overtime', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3de31373-cc05-4203-a7ec-376ec4823df0', 'Eliminar comisiones', 'Acceso para eliminar registros de comisiones', 'commissions', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3dee3ac6-e672-4d03-8b66-a084b44ae044', 'Eliminar usuarios', 'Acceso para eliminar usuarios del sistema', 'users', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('3f4bf3c0-bab0-4f9e-9f5f-dac06f3d9901', 'Ver dashboard', 'Acceso al panel de control principal', 'dashboard', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('41064d58-14fc-49f8-91de-9380c7657f45', 'Aprobar devoluciones', 'Acceso para aprobar solicitudes de devoluciones', 'returns', 'approve', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('41a21c0b-7fbc-46c1-b585-c19c8561126e', 'Ver servicios', 'Acceso para visualizar todos los servicios', 'services', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('43ac31fc-67ce-47e2-a221-6c4555a011cb', 'Aprobar anticipos', 'Acceso para aprobar solicitudes de anticipos', 'advances', 'approve', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('469bdde8-11fa-4260-bdf7-e72736d0995f', 'Eliminar roles', 'Acceso para eliminar roles del sistema', 'roles', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('4794ec44-c5fa-41c9-a320-13aa9fb9f96d', 'Editar devoluciones', 'Acceso para modificar información de devoluciones', 'returns', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('488b28c7-a27c-4b9c-9dfc-727e292d006b', 'Eliminar cuentas', 'Acceso para eliminar cuentas de clientes', 'accounts', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('4bae7a62-c2f9-40df-b4b3-8a64df27ed61', 'Eliminar asistencias', 'Acceso para eliminar registros de asistencias', 'attendance', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('4e0547d8-b16a-4bb4-9313-2b0637f8a14d', 'Editar propinas', 'Acceso para modificar registros de propinas', 'tips', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('4ea0a72e-6948-4168-a24f-e4e9ea61ff50', 'Eliminar productos', 'Acceso para eliminar productos del catálogo', 'products', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('50e30209-2afc-445c-ba21-0f5a0e7d82c3', 'Crear pedidos', 'Acceso para crear nuevos pedidos en el sistema', 'orders', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('50f47425-1305-41d8-8e48-66752616070e', 'Ver usuarios', 'Acceso para visualizar todos los usuarios', 'users', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('5386fcc0-f608-47be-a858-113d975c8292', 'Editar privados', 'Acceso para modificar servicios de habitaciones privadas', 'private_rooms', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('566c5910-abf5-4382-8768-fb65d81749e9', 'Ver horas extras', 'Acceso para visualizar todos los registros de horas extras', 'overtime', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('57a6c962-d262-4cda-bd7c-71e32fdb5b6c', 'Editar asistencias', 'Acceso para modificar registros de asistencias', 'attendance', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('5b040973-2dee-4b04-8d2d-d986c80f0d61', 'Editar cuentas', 'Acceso para modificar información de cuentas', 'accounts', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('5df9b8a2-5469-4608-81f3-7d195a3b2e65', 'Editar comisiones', 'Acceso para modificar información de comisiones', 'commissions', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('63427f87-aa21-4e26-b38a-4d546c3a8362', 'Eliminar categorías', 'Acceso para eliminar categorías del sistema', 'categories', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('646bfaca-57bb-4eef-8070-96dd5845e517', 'Editar clientes', 'Acceso para modificar información de clientes', 'clients', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('64d6b9a4-4850-43e7-bd10-6f39b7d0cbff', 'Crear servicios', 'Acceso para crear nuevos servicios en el sistema', 'services', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('670c8faa-b518-4763-9304-90cc7e83dabe', 'Crear propinas', 'Acceso para registrar nuevas propinas en el sistema', 'tips', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('6bbfd327-3558-4e81-9fac-a2b0229e33b9', 'Eliminar anticipos', 'Acceso para eliminar anticipos del sistema', 'advances', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('6be77e9b-5258-42bd-ba5e-34b192ee4ac3', 'Activar usuarios', 'Acceso para activar usuarios deshabilitados', 'users', 'activate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('6e9ac863-cda0-43b6-995c-12cf047d6eee', 'Ver reportes', 'Acceso para visualizar reportes del sistema', 'reports', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('75001a3b-517d-428b-8043-4c157b04b732', 'Crear clientes', 'Acceso para crear nuevos clientes en el sistema', 'clients', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('75a787b0-e49b-4725-86e5-fdc50b3818d0', 'Editar usuarios', 'Acceso para modificar información de usuarios', 'users', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('761d2c17-d253-4b37-9991-5864cd39456f', 'Exportar reportes', 'Acceso para exportar reportes en diferentes formatos', 'reports', 'export', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('7d3df46d-edad-425d-a5cd-881c865b720d', 'Ver privados', 'Acceso para visualizar servicios de habitaciones privadas', 'private_rooms', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('814d8b48-b2df-42d7-9bb8-687197437f52', 'Editar habitaciones', 'Acceso para modificar información de habitaciones', 'rooms', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('8600dd14-135d-441f-83ad-61d3189eee22', 'Ver caja', 'Acceso para visualizar el estado actual de la caja', 'cash_register', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('8e753a2c-ffe7-4857-bd69-e75e2d435bc5', 'Editar horas extras', 'Acceso para modificar información de horas extras', 'overtime', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('917a7568-1819-4067-a86a-5986aa0e3bed', 'Cerrar caja', 'Acceso para cerrar la caja registradora del sistema', 'cash_register', 'close', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('923ab162-a367-4240-a07b-1af4116aca8e', 'Ver configuración', 'Acceso para visualizar la configuración del sistema', 'settings', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('93abd632-8863-4d9d-8e52-408b0c7d94cd', 'Distribuir propinas', 'Acceso para distribuir propinas entre empleados', 'tips', 'distribute', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9aa5fdb9-7a0a-404c-8037-2f6b76f62e30', 'Editar roles', 'Acceso para modificar información de roles', 'roles', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9b742701-f143-481a-8efb-5f80df07d5c8', 'Ver pedidos', 'Acceso para visualizar todos los pedidos', 'orders', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9d6e7d67-a465-4b86-a135-914593f89e30', 'Abrir caja', 'Acceso para abrir la caja registradora del sistema', 'cash_register', 'open', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9dbfe095-0257-4ee3-b34b-42d4a6900017', 'Finalizar privados', 'Acceso para finalizar servicios de habitaciones privadas', 'private_rooms', 'finalize', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9e1a00a9-9ed5-41e9-b597-aeb21baf7a42', 'Crear ventas', 'Acceso para crear nuevas ventas en el sistema', 'sales', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9e51653e-a504-4cdc-a1ae-422c28c2385e', 'Retirar efectivo', 'Acceso para retirar efectivo de la caja', 'cash_register', 'withdraw', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('9ee5a439-ab97-410f-a1ed-59b91ec72d6e', 'Editar anticipos', 'Acceso para modificar información de anticipos', 'advances', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a1a6139d-60f8-446f-9518-80913511f1b4', 'Crear habitaciones', 'Acceso para crear nuevas habitaciones en el sistema', 'rooms', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a42b3c21-cfd9-428e-a632-5765798298e5', 'Editar configuración', 'Acceso para modificar la configuración del sistema', 'settings', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a59fdb0c-e02e-4816-8202-417a9d87823b', 'Eliminar ventas', 'Acceso para eliminar ventas del sistema', 'sales', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a6f7b28b-8c11-4dcd-aed3-3906275233fd', 'Eliminar gratificaciones', 'Acceso para eliminar registros de gratificaciones', 'gratificaciones', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a7394593-1784-4388-a359-a594e45037bb', 'Ver reportes de ventas', 'Acceso para consultar reportes de ventas', 'sales', 'reports', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a8569b9c-8912-4a67-8c1a-c9773830a6d6', 'Editar servicios', 'Acceso para modificar información de servicios', 'services', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('a9c197fb-1e46-4afc-9a46-65ae23ed8aff', 'Ver asistencias', 'Acceso para visualizar todos los registros de asistencias', 'attendance', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('aa90142c-7de6-4cdd-9f35-5fe1b2b3e9e2', 'Crear comisiones', 'Acceso para crear nuevos registros de comisiones', 'commissions', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('afa9b2f6-d1c6-4d90-b4e1-0ec4e000cc8c', 'Editar gratificaciones', 'Acceso para modificar información de gratificaciones', 'gratificaciones', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b0736fc1-5edd-47d3-b0d2-164e2cc3acb3', 'Crear usuarios', 'Acceso para crear nuevos usuarios en el sistema', 'users', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b3ed223d-d547-432a-9a37-249c13763cbe', 'Gestionar permisos', 'Acceso para asignar y gestionar permisos de roles', 'roles', 'permissions', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b54ba825-b027-48e5-a82e-527feaec7bfb', 'Ver categorías', 'Acceso para visualizar todas las categorías', 'categories', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b60701fa-ccbd-46f0-a1fe-f0739d2c73d4', 'Eliminar clientes', 'Acceso para eliminar clientes del sistema', 'clients', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b6d90e0d-94d9-44b7-a56a-bc222a153f30', 'Ver habitaciones', 'Acceso para visualizar todas las habitaciones', 'rooms', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b6e40e50-465b-4419-8a1b-c407b4f00395', 'Editar pedidos', 'Acceso para modificar pedidos existentes', 'orders', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('b9e41d5d-cf31-4bf2-84c5-7d6af56219d7', 'Ver cuentas', 'Acceso para visualizar todas las cuentas', 'accounts', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('ba986d57-791a-4b4e-8727-b777e0b3ff20', 'Ver propinas', 'Acceso para visualizar todos los registros de propinas', 'tips', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('bd72a8df-37ad-4b55-a6f2-0defd0ac5173', 'Crear privados', 'Acceso para crear servicios de habitaciones privadas', 'private_rooms', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('bdbd9586-70a3-444f-9dd6-7475b0363446', 'Crear anticipos', 'Acceso para crear nuevos anticipos en el sistema', 'advances', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('bedf373f-2044-4696-9311-f5f456f47820', 'Cobrar cuentas', 'Acceso para procesar cobros de cuentas', 'accounts', 'collect', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('c26a1a84-d9b8-495b-951c-c1fa89a9cfa8', 'Editar ventas', 'Acceso para modificar información de ventas', 'sales', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('c33816c7-49ca-422d-aded-673c72c9c3d4', 'Activar roles', 'Acceso para activar roles deshabilitados', 'roles', 'activate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('c46b7512-6b40-48f5-a67c-b15de0da1511', 'Eliminar devoluciones', 'Acceso para eliminar registros de devoluciones', 'returns', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('c6852a24-418a-4658-b980-540ce8d2b726', 'Ver pagos', 'Acceso para visualizar todos los registros de pagos', 'payroll', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('c91bc682-4fc7-46b8-a74b-bcd2b9daa15c', 'Eliminar habitaciones', 'Acceso para eliminar habitaciones del sistema', 'rooms', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('cfcc1b1e-09da-4ddd-877a-3a4120c5e4af', 'Desactivar roles', 'Acceso para desactivar roles del sistema', 'roles', 'deactivate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('d1880d51-58ec-4eda-b7fd-1d97326b834f', 'Eliminar servicios', 'Acceso para eliminar servicios del sistema', 'services', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('d2dcbb35-9bbe-4035-bf06-f27026d6f71a', 'Ver roles', 'Acceso para visualizar todos los roles del sistema', 'roles', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('d34594bd-64c9-4ef9-ad80-1b1ad18c8d9f', 'Ver reportes de caja', 'Acceso para consultar reportes financieros de caja', 'cash_register', 'reports', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('d76b99a8-131b-4b8e-9203-e7e0af156e0b', 'Ver anticipos', 'Acceso para visualizar todos los anticipos', 'advances', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('d7cce40b-1355-45b4-8e1b-9426cade5e4e', 'Ver detalles gratificaciones', 'Acceso para ver detalles de gratificaciones por usuario', 'gratificaciones', 'view_details', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('e41b780d-74d5-4316-a614-86808f4dacd5', 'Ver gratificaciones', 'Acceso para visualizar todos los registros de gratificaciones', 'gratificaciones', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('e725e3dd-2650-41da-adb9-64df9097a14b', 'Eliminar propinas', 'Acceso para eliminar registros de propinas', 'tips', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('e7f25f27-ee01-4932-a1d3-bddac7e6822b', 'Procesar pagos', 'Acceso para procesar pagos de trabajadores', 'payroll', 'process', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('f25a80d2-9a3b-4654-aa9c-6d23ef8f4c66', 'Eliminar horas extras', 'Acceso para eliminar registros de horas extras', 'overtime', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('f51d4803-42b4-4baa-a613-ad294dc0aacd', 'Calcular pagos', 'Acceso para calcular pagos de trabajadores', 'payroll', 'calculate', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('f898a916-fc5c-49ac-8a55-9693a172d480', 'Eliminar pagos', 'Acceso para eliminar registros de pagos', 'payroll', 'delete', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('f8f83e81-eade-414e-85c4-6c7754cd2509', 'Ver comisiones', 'Acceso para visualizar todos los registros de comisiones', 'commissions', 'view', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('fcd74b42-4978-4cf6-b9ac-b7216a1d1243', 'Editar productos', 'Acceso para modificar información de productos', 'products', 'edit', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL),
('fe886efa-4dd5-432d-bcf9-3a14d1e47e9a', 'Crear categorías', 'Acceso para crear nuevas categorías de productos', 'categories', 'create', '2026-03-16 15:54:06', '2026-03-16 15:54:06', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` varchar(36) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `categoria_id` varchar(36) DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `precio` int(11) NOT NULL,
  `comision` int(11) NOT NULL,
  `descripcion` varchar(255) DEFAULT 'Sin descripcion',
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1,
  `foto` varchar(255) NOT NULL DEFAULT 'default.png'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `codigo`, `nombre`, `categoria_id`, `display_order`, `precio`, `comision`, `descripcion`, `fecha_crea`, `fecha_mod`, `fecha_baja`, `estado`, `foto`) VALUES
('5c4a9d31-dcfa-4713-9fd9-fcf20856861d', 'ZOL3A1P6', 'Paceña', 'db2d6083-74bb-44dc-afd4-088d70a5f76a', 0, 10000, 0, '', '2026-03-16 08:23:02', NULL, NULL, 1, 'default.png'),
('620e56b3-ca46-4733-8805-0053d4a2d7b4', 'PLRUY01W', 'Corona', 'db2d6083-74bb-44dc-afd4-088d70a5f76a', 0, 10000, 0, '', '2026-03-16 08:22:51', NULL, NULL, 1, 'default.png'),
('78096a64-bdc0-4f0e-a290-34921fe24443', 'NL5RRS1Y', 'Champagne 200', '140356bd-67ce-49f0-b1f0-365a31b12697', 0, 200000, 100000, '', '2026-03-16 07:32:21', NULL, NULL, 1, 'default.png'),
('7c19165b-4044-4713-8f53-8f54dcb7da8f', '8YVRNY8L', 'Champagne 160', '140356bd-67ce-49f0-b1f0-365a31b12697', 0, 160000, 60000, '', '2026-03-16 06:44:24', NULL, NULL, 1, 'default.png'),
('a271274a-cb10-48cd-81cf-888d67e55314', '7U1V3056', 'Trago De 20', 'a7ce02ae-a2cf-4dda-b3e5-a3f4a42f15ac', 0, 20000, 5000, '', '2026-03-16 08:26:45', NULL, NULL, 1, 'default.png'),
('b21f60c6-4c50-4bff-8293-5871f9847b35', 'VK8UNE9C', 'José Cuervo', 'ba8c80ba-4b11-4b0c-879b-2936fa52db6b', 0, 30000, 7000, '', '2026-03-16 08:23:54', NULL, NULL, 1, 'default.png'),
('cf825266-ced7-4475-9b9c-ffbfe101746a', 'YT490UEY', 'Champagne 240', '140356bd-67ce-49f0-b1f0-365a31b12697', 0, 240000, 140000, '', '2026-03-16 08:22:26', NULL, NULL, 1, 'default.png');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `propinas`
--

CREATE TABLE `propinas` (
  `id_propina` varchar(36) NOT NULL,
  `venta_id` varchar(36) DEFAULT NULL,
  `propina` int(11) NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `retiros_caja`
--

CREATE TABLE `retiros_caja` (
  `id_retiro` varchar(36) NOT NULL,
  `caja_id` varchar(36) DEFAULT NULL,
  `monto` int(11) NOT NULL,
  `motivo` text NOT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `fecha_retiro` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id_rol` varchar(36) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text NOT NULL,
  `estado` int(11) NOT NULL DEFAULT 1,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id_rol`, `nombre`, `descripcion`, `estado`, `fecha_crea`, `fecha_mod`, `fecha_baja`) VALUES
('0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'Anfitriona', 'Acceso a la app', 1, '2026-03-16 05:24:45', NULL, NULL),
('3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'Administrador', 'Rol administrador creado automáticamente', 1, '2026-03-16 04:43:46', NULL, NULL),
('8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'Cajero', 'Acceso al sistema y a la app', 1, '2026-03-16 05:25:17', NULL, NULL),
('fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'Garzon', 'Acceso a la app', 1, '2026-03-16 05:25:05', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` varchar(36) NOT NULL,
  `role_id` varchar(36) DEFAULT NULL,
  `permission_id` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`) VALUES
('', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '3f4bf3c0-bab0-4f9e-9f5f-dac06f3d9901', '2026-03-16 16:08:25', '2026-03-16 16:08:25'),
('00d9e037-4d8d-4135-99fd-5060e164c0ab', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'c6852a24-418a-4658-b980-540ce8d2b726', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('0134da65-1638-460d-95d2-188d4f453804', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'f8f83e81-eade-414e-85c4-6c7754cd2509', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('018ce65c-7c90-40a7-908e-07594def4ea5', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'b6e40e50-465b-4419-8a1b-c407b4f00395', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('056634d0-77cb-4768-be92-fce8a87bac0b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '4ea0a72e-6948-4168-a24f-e4e9ea61ff50', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('07bbaa37-e110-4add-9eca-20281f7be698', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '8600dd14-135d-441f-83ad-61d3189eee22', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('0a727677-5f43-4b3a-aed4-8134ff3cccdf', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9dbfe095-0257-4ee3-b34b-42d4a6900017', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('0a861a3f-0286-4980-bfbb-3b13955ca55d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'fcd74b42-4978-4cf6-b9ac-b7216a1d1243', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('0aaad4c4-fa12-41ba-af50-e3af298e1ddf', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '1787b46b-78fe-4a8b-9dc4-571fa7e56c20', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('0caf357b-1cda-47c1-90a1-a36355a96325', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '28115302-66e3-432a-8a18-9e132ceed556', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('0d01d037-0bfc-49ef-a1ba-4fe67f11e75f', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', '3f4bf3c0-bab0-4f9e-9f5f-dac06f3d9901', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('0da6650d-c37d-4f10-9807-75e74f4ac31b', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'bdbd9586-70a3-444f-9dd6-7475b0363446', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('11873c44-6127-404a-9371-5ce918cc3e2d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '145bfa46-2b45-424c-9ee2-233a0a6973a0', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('18e1bfe7-1bf4-40ce-aa28-90b859d3d40e', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'd76b99a8-131b-4b8e-9203-e7e0af156e0b', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('197ea05f-0c1b-45a5-a189-5d2ab064ec95', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '4e0547d8-b16a-4bb4-9313-2b0637f8a14d', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('1c65ddf8-9b01-4731-b7cb-012d7971bbd1', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '144321cb-2f96-4c27-a025-208bfcec01d3', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('1ee6421b-a764-45a7-ad1f-fbd29e04bb2d', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '144321cb-2f96-4c27-a025-208bfcec01d3', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('1eea6bc0-cbd1-4169-9433-5101835e63c9', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b54ba825-b027-48e5-a82e-527feaec7bfb', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('1ef00822-46ee-43dc-9a69-aec741caf578', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '191040bf-222c-4f15-b553-eb895b7b731a', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('1f01305a-cd4d-43ea-934f-5347f8a98351', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b3ed223d-d547-432a-9a37-249c13763cbe', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('1f366183-3ecb-4ff7-8735-dfa0a7fbe248', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '75a787b0-e49b-4725-86e5-fdc50b3818d0', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('205fb5aa-df6a-4993-9731-520b7b4433aa', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '93abd632-8863-4d9d-8e52-408b0c7d94cd', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('24884edf-cd82-4acf-b22b-81258d44dde7', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '05334ab3-b304-444e-97e9-d2f4fe9c1727', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('24f6f25d-70fb-4751-b45b-08e5851972af', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '5386fcc0-f608-47be-a858-113d975c8292', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('27a2ce44-a502-4848-b960-be9d0d319615', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'b6d90e0d-94d9-44b7-a56a-bc222a153f30', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('27b27c73-9aab-4314-8c38-7c9ec5eefaaf', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a59fdb0c-e02e-4816-8202-417a9d87823b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('28ada67e-dbae-46f4-bb76-968ce98f5620', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a42b3c21-cfd9-428e-a632-5765798298e5', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('29873017-bede-4a21-825b-2fb4c5325ef0', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9e51653e-a504-4cdc-a1ae-422c28c2385e', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('2a86e519-aaa1-4807-930c-3385cd2bdad6', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '488b28c7-a27c-4b9c-9dfc-727e292d006b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('2ceefd86-6227-4dd9-ae39-602fca5eb87a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '2ce981cc-ee3e-41cd-82ad-181827ff4070', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('2ec740de-9b0d-4b6f-8fb2-dbcbb82668b5', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'c46b7512-6b40-48f5-a67c-b15de0da1511', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('32003102-0ad0-41f2-ad7c-55ba2a532d49', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b60701fa-ccbd-46f0-a1fe-f0739d2c73d4', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('32a2d315-7699-4a30-a0c1-2786a6f13727', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '08b5920d-e7b0-4e94-b906-42fbe3a08438', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('332cc9a7-0367-4b21-9e4f-49e5b3a50c8f', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '50f47425-1305-41d8-8e48-66752616070e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('3355a420-04b4-43f3-8158-d3233528091d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'fe886efa-4dd5-432d-bcf9-3a14d1e47e9a', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('3392e487-83ad-4346-9bd0-c3c6d1bc454a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '43ac31fc-67ce-47e2-a221-6c4555a011cb', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('33b0ba3f-d8c1-4436-bb4c-eb73bdf1c143', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '1d5107c3-ffd7-48ce-b06c-be010233766b', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('36225d03-4fd2-4b42-a31e-a3246480b4da', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'd7cce40b-1355-45b4-8e1b-9426cade5e4e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('388e3409-d908-4291-bfcd-7d0f4faa29fc', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'c26a1a84-d9b8-495b-951c-c1fa89a9cfa8', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('3bd8350b-71c2-408b-9a88-7526491c9389', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '6bbfd327-3558-4e81-9fac-a2b0229e33b9', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('3bfa2d50-ea1f-4345-bde4-6b8547bc2fad', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '3f4bf3c0-bab0-4f9e-9f5f-dac06f3d9901', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('3d608f4b-8ed1-4ab6-8c70-82c533f60186', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3de31373-cc05-4203-a7ec-376ec4823df0', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('41827c68-79e8-44ff-8557-a289b8c47580', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '144321cb-2f96-4c27-a025-208bfcec01d3', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('4401cfb5-88f1-44e2-889d-52d0c83e71a1', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'b9e41d5d-cf31-4bf2-84c5-7d6af56219d7', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('45709f85-9695-4446-9c8d-1a5b66196c1d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'afa9b2f6-d1c6-4d90-b4e1-0ec4e000cc8c', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('4782ac01-978c-44e5-8527-c28faa02674d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'aa90142c-7de6-4cdd-9f35-5fe1b2b3e9e2', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('4971e805-0d33-4a51-bcaa-c63d50ab0d77', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '64d6b9a4-4850-43e7-bd10-6f39b7d0cbff', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('4ba21e61-43fe-4872-b7f5-7c78f0cf4803', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '05334ab3-b304-444e-97e9-d2f4fe9c1727', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('4bbf1c13-1a29-4c0b-a09d-08e4355392b9', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '469bdde8-11fa-4260-bdf7-e72736d0995f', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('4bbf8d9f-edfa-49ed-9e37-ece86b233f74', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'b54ba825-b027-48e5-a82e-527feaec7bfb', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('4d5b91b8-a6cc-4c57-a093-1d72437d5fa0', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'e7f25f27-ee01-4932-a1d3-bddac7e6822b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('502ac74f-7d7a-4098-918b-2cbd51081e2e', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '50e30209-2afc-445c-ba21-0f5a0e7d82c3', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('51b53024-e26f-43f8-b8a0-d0ca0f506be8', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'bd72a8df-37ad-4b55-a6f2-0defd0ac5173', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('55448814-3b02-45f2-b7fb-91e0f4f27271', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '2a6f78d5-8292-4177-8980-50f270b06657', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('573f9006-3974-46f2-b9e0-3df23913d0da', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', '144321cb-2f96-4c27-a025-208bfcec01d3', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('596c96ac-33e1-424b-97f6-c05ac3d6e337', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', '7d3df46d-edad-425d-a5cd-881c865b720d', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('5c7fa5db-9016-460a-a904-8012d29c359d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '27f9e876-ea6d-45ba-98ee-a3bd44403cd8', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('5e9931eb-8e53-4446-ab21-e4b991ef13ab', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'ba986d57-791a-4b4e-8727-b777e0b3ff20', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('6255aecf-959f-425d-8154-a0b2c85a0690', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'c26a1a84-d9b8-495b-951c-c1fa89a9cfa8', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('628f462a-1850-4838-b767-4d670a810c73', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '670c8faa-b518-4763-9304-90cc7e83dabe', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('64113d5c-3f0f-46cd-aed6-ebc6142afc2b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9e51653e-a504-4cdc-a1ae-422c28c2385e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('66080ec5-48f0-46cd-af16-0f25b9d20398', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'd1880d51-58ec-4eda-b7fd-1d97326b834f', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('6674a683-76c6-4e1e-a6dd-48988983fb1a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '8e753a2c-ffe7-4857-bd69-e75e2d435bc5', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('67737445-50f0-496b-8aee-a7e3d5210583', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '566c5910-abf5-4382-8768-fb65d81749e9', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('6a15be39-cd73-436a-b80d-d4975533041a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9e1a00a9-9ed5-41e9-b597-aeb21baf7a42', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('6b2fed1f-f8de-40c5-93a4-00e5968cefe8', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '6e9ac863-cda0-43b6-995c-12cf047d6eee', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('7209e5be-2960-4a9e-b8ee-86bc809dfabb', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '41a21c0b-7fbc-46c1-b585-c19c8561126e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('72718e77-817b-4cfe-bb6e-91fd80f412a8', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '36ef0033-2bc9-4f6e-840b-32496fc5fa9f', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('73379423-c1a9-4b66-9f22-34461cac4886', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '2f6300f4-a115-4e95-a5b1-2576bfcc9c1d', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('73e504db-2cbd-4102-9ce2-9b4883185e05', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'f25a80d2-9a3b-4654-aa9c-6d23ef8f4c66', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('75e67c6b-ab71-4693-af48-aff05e75720e', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '917a7568-1819-4067-a86a-5986aa0e3bed', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('778e708a-b277-48bb-b59e-a1dd02b547da', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3da800d8-d6d8-4e1b-84a8-3f9aa5b3347e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('79008e6d-b36d-4853-a7c8-6fd9a71e4e91', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a1a6139d-60f8-446f-9518-80913511f1b4', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('7a579205-1252-414f-b0e0-14b9e0ae0982', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '9b742701-f143-481a-8efb-5f80df07d5c8', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('7a6c3575-85c6-4101-8d06-15216ecfbd43', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a6f7b28b-8c11-4dcd-aed3-3906275233fd', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('7a923f7a-06f6-4dd0-8049-16d630c135b1', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '43ac31fc-67ce-47e2-a221-6c4555a011cb', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('7e98bc38-ec02-4887-98e5-1f63dc7ab881', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '6be77e9b-5258-42bd-ba5e-34b192ee4ac3', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8169b0a3-ff80-4c53-a5df-108d826f529d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '5df9b8a2-5469-4608-81f3-7d195a3b2e65', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('818a3064-a4b2-4d9b-aa1c-c077db3b044e', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'f51d4803-42b4-4baa-a613-ad294dc0aacd', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('823e9df0-597a-489c-8c48-06e3344732cc', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '41064d58-14fc-49f8-91de-9380c7657f45', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('826bb6bc-dfe9-4d24-856b-ca8ed1c55d2a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3a2d75fe-61a0-4332-b5b3-59e647c4409a', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8345bacb-064f-4ea4-996c-0f4bab4fa3e9', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '75001a3b-517d-428b-8043-4c157b04b732', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('839895fc-30d2-4406-8f36-4c80a08b205b', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'a9c197fb-1e46-4afc-9a46-65ae23ed8aff', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('85e55bab-046e-45c4-8dd4-b4f1c58d0fc4', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '646bfaca-57bb-4eef-8070-96dd5845e517', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('861d17eb-f7cd-4070-b616-51ea47a953ec', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9ee5a439-ab97-410f-a1ed-59b91ec72d6e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('86f24b99-c4da-405b-a174-4328ed6ca18a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'bdbd9586-70a3-444f-9dd6-7475b0363446', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('874ed56e-a468-4491-9ebe-269e0b5b4338', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a8569b9c-8912-4a67-8c1a-c9773830a6d6', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('88b48d47-4d7a-4b21-a859-c1d1ddd51432', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'c91bc682-4fc7-46b8-a74b-bcd2b9daa15c', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('895ad27a-dc2e-46c0-9ddc-45aacff72431', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3f4bf3c0-bab0-4f9e-9f5f-dac06f3d9901', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8a98bead-fefa-4eb0-a79e-bcc1850c09ae', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9b742701-f143-481a-8efb-5f80df07d5c8', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8b44c719-9798-4672-aedb-883d33bec2b2', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b6d90e0d-94d9-44b7-a56a-bc222a153f30', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8beaaf90-f5e0-4f27-a573-86a1591890ff', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'c33816c7-49ca-422d-aded-673c72c9c3d4', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8c106130-6387-4b80-995e-72b9a86f2f92', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'a9c197fb-1e46-4afc-9a46-65ae23ed8aff', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('8e65c040-2be8-4cb9-9289-3317e7cb88a3', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a9c197fb-1e46-4afc-9a46-65ae23ed8aff', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('8e783ab0-672e-4fa9-b4d2-7946b1a8acb1', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '1d5107c3-ffd7-48ce-b06c-be010233766b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('90478d27-f2c6-4ffc-968b-1e3e5ab22c26', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9d6e7d67-a465-4b86-a135-914593f89e30', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('9150100a-c677-44b3-9159-8d0099d6fd29', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '761d2c17-d253-4b37-9991-5864cd39456f', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('91532e25-5ef6-404f-be6a-ce39115bf579', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'd34594bd-64c9-4ef9-ad80-1b1ad18c8d9f', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('9344439d-8568-4cc1-9a35-2dbd00a09f7d', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'bdbd9586-70a3-444f-9dd6-7475b0363446', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('9417d045-bc02-42d3-9592-a34826717d45', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '7d3df46d-edad-425d-a5cd-881c865b720d', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('9c7db946-f0f3-4928-a4a5-a89f32647ea0', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '566c5910-abf5-4382-8768-fb65d81749e9', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('9cdb293a-6508-44de-9d63-720f39d1e0eb', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'a7394593-1784-4388-a359-a594e45037bb', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('9d0771b8-0c66-4568-bbc3-410f65f2235d', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'e41b780d-74d5-4316-a614-86808f4dacd5', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('9d4d1ff0-240d-4158-9c37-42a3a61c27ed', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9d6e7d67-a465-4b86-a135-914593f89e30', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('9dbe458b-1b38-4177-851b-8f60a9d8851c', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'b54ba825-b027-48e5-a82e-527feaec7bfb', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('9f7fa9d4-cb89-4d6e-8d11-d257c10862e7', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b0736fc1-5edd-47d3-b0d2-164e2cc3acb3', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('9ff12c43-c88e-4e76-b9a3-37b73c6ac2ac', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '4794ec44-c5fa-41c9-a320-13aa9fb9f96d', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('a1f8c9ae-1547-4565-8cf7-78d8a686e023', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'd34594bd-64c9-4ef9-ad80-1b1ad18c8d9f', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('a1fc916e-ce19-4a0c-a23b-28976aefd9d7', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '0fd0af1d-7082-4e4e-88e3-0d10a1a5256a', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('a5900304-7c53-4aff-894d-085bfd49c24a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '75001a3b-517d-428b-8043-4c157b04b732', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('ab0f2277-a8a8-4cbd-99a8-d86c7abbc8b5', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'ba986d57-791a-4b4e-8727-b777e0b3ff20', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('aed60ea1-80bd-451a-a583-d6b3703ac9b4', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9e1a00a9-9ed5-41e9-b597-aeb21baf7a42', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('af61358d-0f0d-4934-adb1-34c700f6ce06', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '2da2b944-aab4-4c60-bb06-024ba05d8959', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('b354e0dc-3813-4fcb-a4f9-e778b5c81eff', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'd76b99a8-131b-4b8e-9203-e7e0af156e0b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('b3a12f6a-927b-4cc6-8e0e-9ab547bfb20d', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '208d766e-6d5b-477c-a7eb-e480bff7467e', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('c1474634-6140-4dfb-bd64-c5e510563958', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'f898a916-fc5c-49ac-8a55-9693a172d480', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('c47dcfb2-9004-4f66-84a8-41aee3a0a4c0', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '2fb6087c-8784-401f-908f-3a3e2c158a26', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('c58d9a14-724a-48c2-b2df-1236dd2f41ca', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'b6e40e50-465b-4419-8a1b-c407b4f00395', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('c9d21417-f2ca-4653-9f64-ee3513ea86ec', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '57a6c962-d262-4cda-bd7c-71e32fdb5b6c', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('cd9dad2a-054f-448a-8e38-8c56ca916de9', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '4bae7a62-c2f9-40df-b4b3-8a64df27ed61', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('d16cd048-1bdd-4161-aefd-8352dea5fef8', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'b6d90e0d-94d9-44b7-a56a-bc222a153f30', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('d21142f3-0611-4b22-be71-3b29fd348c28', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b6e40e50-465b-4419-8a1b-c407b4f00395', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('d3e70fb9-93c2-4951-9640-2cccce408ec8', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'bd72a8df-37ad-4b55-a6f2-0defd0ac5173', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('d54d23f5-d7ce-4431-b1d6-2006074a0b36', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'b9e41d5d-cf31-4bf2-84c5-7d6af56219d7', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('d591dba1-946a-43cd-9f43-beb4f0f075dc', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'b6d90e0d-94d9-44b7-a56a-bc222a153f30', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('d6d45247-ad11-475c-b50e-1018a5773dbe', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '917a7568-1819-4067-a86a-5986aa0e3bed', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('d77d853f-e211-40a2-bd14-e24b149a12f7', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '50e30209-2afc-445c-ba21-0f5a0e7d82c3', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('d89b06b4-8d1a-4bab-b60c-811cce0ee483', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '566c5910-abf5-4382-8768-fb65d81749e9', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('d94b6623-c4f7-4dc5-9cfd-ca30c230adde', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '923ab162-a367-4240-a07b-1af4116aca8e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('da7351f9-3c94-4319-b291-437774ffe53b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9aa5fdb9-7a0a-404c-8037-2f6b76f62e30', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('dc08ff85-293f-4ca8-b678-cb1cf9e15fdc', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'd76b99a8-131b-4b8e-9203-e7e0af156e0b', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('ddf2d717-9632-4bcd-9419-34994ca7e862', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '814d8b48-b2df-42d7-9bb8-687197437f52', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('de1c5d06-6fd2-4c90-b1b7-5c730900d337', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '2fb6087c-8784-401f-908f-3a3e2c158a26', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('e0def367-f178-445f-9924-d0a736eb8553', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '7d3df46d-edad-425d-a5cd-881c865b720d', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('e1eee036-2ddb-4df2-97c7-5ff006e0e6bf', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '0fd0af1d-7082-4e4e-88e3-0d10a1a5256a', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('e26c73e2-028a-40db-9d20-624a3480c5db', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '670c8faa-b518-4763-9304-90cc7e83dabe', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('e46bedd3-f27b-4443-b717-14ca2fb6a1d9', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '63427f87-aa21-4e26-b38a-4d546c3a8362', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('e4cde1a2-0499-4fba-899e-de0fa0baaafe', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9dbfe095-0257-4ee3-b34b-42d4a6900017', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('e6854d93-7cde-4e75-aa8c-c42b3097ba5a', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', '191040bf-222c-4f15-b553-eb895b7b731a', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('e79fa2f0-6004-4143-8af5-c905942371c7', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'd2dcbb35-9bbe-4035-bf06-f27026d6f71a', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('e7e45249-2430-46e8-9ba6-81d7b590447a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3dee3ac6-e672-4d03-8b66-a084b44ae044', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('e94092a2-674a-4d64-8468-a2e15fca9cc4', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3b154066-0f7e-486f-8e0b-b656338be78b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('eb50c7a5-d72c-4ac3-9b30-769c04023d0b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'cfcc1b1e-09da-4ddd-877a-3a4120c5e4af', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('eb6625c5-13b6-4b77-ab26-e09aa5aa49ef', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9b742701-f143-481a-8efb-5f80df07d5c8', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('ef4f25bc-bbb2-4ee8-b718-7147cfa8906e', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'ba986d57-791a-4b4e-8727-b777e0b3ff20', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('f00feb40-47b6-4ab0-aa0a-6bacf5705e33', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'bedf373f-2044-4696-9311-f5f456f47820', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f1f79136-734a-487c-9222-7825bac97fea', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '8600dd14-135d-441f-83ad-61d3189eee22', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('f201baf3-5867-4a60-84cd-b2a86b3ba183', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'f8f83e81-eade-414e-85c4-6c7754cd2509', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f29606ac-0952-47fc-a499-cee51a0c5c2b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '208d766e-6d5b-477c-a7eb-e480bff7467e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f50a0216-fd37-4cc1-9f05-a580d44dad79', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '64d6b9a4-4850-43e7-bd10-6f39b7d0cbff', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f55aa3ea-09e4-475c-b615-5cd5390392c7', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'e725e3dd-2650-41da-adb9-64df9097a14b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f5eaa7da-2d5d-4d5e-b453-268324595632', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '50e30209-2afc-445c-ba21-0f5a0e7d82c3', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f70ad152-86b2-4827-a66d-1200475dcd5b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '191040bf-222c-4f15-b553-eb895b7b731a', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('fc3d2a55-c397-43e4-afdf-b76e3d97b7ca', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '5b040973-2dee-4b04-8d2d-d986c80f0d61', '2026-03-16 15:59:31', '2026-03-16 15:59:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicios`
--

CREATE TABLE `servicios` (
  `id_servicio` varchar(36) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `cliente_id` varchar(36) DEFAULT NULL,
  `habitacion_id` varchar(36) DEFAULT NULL,
  `precio_habitacion` int(11) NOT NULL,
  `precio_servicio` int(11) NOT NULL,
  `iva` int(11) NOT NULL DEFAULT 0,
  `sub_total` int(11) NOT NULL,
  `total` int(11) NOT NULL,
  `tiempo` int(11) NOT NULL,
  `metodo_pago` varchar(50) NOT NULL,
  `caja_id` varchar(36) DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1,
  `created_by` varchar(36) DEFAULT NULL,
  `paused_at` datetime DEFAULT NULL,
  `push_notified_5m` tinyint(1) DEFAULT 0,
  `push_notified_end` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicio_logs`
--

CREATE TABLE `servicio_logs` (
  `id` varchar(36) NOT NULL,
  `servicio_id` varchar(36) DEFAULT NULL,
  `tipo_evento` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `usuario_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_anticipos`
--

CREATE TABLE `solicitudes_anticipos` (
  `id_solicitud` varchar(36) NOT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `motivo` text DEFAULT NULL,
  `estado` enum('pendiente','confirmada','rechazada') DEFAULT 'pendiente',
  `motivo_rechazo` text DEFAULT NULL,
  `token` varchar(100) DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `admin_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_anulacion`
--

CREATE TABLE `solicitudes_anulacion` (
  `id` varchar(36) NOT NULL,
  `venta_id` varchar(36) DEFAULT NULL,
  `token` varchar(255) NOT NULL,
  `estado` enum('pendiente','confirmada','rechazada') DEFAULT 'pendiente',
  `fecha_solicitud` datetime NOT NULL,
  `solicitado_por` varchar(255) DEFAULT 'Usuario del Sistema',
  `motivo` varchar(500) DEFAULT 'Motivo no especificado'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_anulacion_servicios`
--

CREATE TABLE `solicitudes_anulacion_servicios` (
  `id` varchar(36) NOT NULL,
  `servicio_id` varchar(36) DEFAULT NULL,
  `token` varchar(255) NOT NULL,
  `estado` enum('pendiente','confirmada','rechazada') DEFAULT 'pendiente',
  `fecha_solicitud` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `solicitado_por` varchar(255) DEFAULT 'Usuario del Sistema',
  `motivo` varchar(500) DEFAULT 'Motivo no especificado'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_atencion`
--

CREATE TABLE `solicitudes_atencion` (
  `id` varchar(36) NOT NULL,
  `anfitriona_id` varchar(36) DEFAULT NULL,
  `habitacion_id` varchar(36) DEFAULT NULL,
  `servicio_id` varchar(36) DEFAULT NULL,
  `tipo` varchar(50) NOT NULL,
  `mensaje` text DEFAULT NULL,
  `estado` tinyint(4) DEFAULT 0,
  `atendido_por` varchar(36) DEFAULT NULL,
  `fecha_crea` datetime DEFAULT NULL,
  `fecha_acepta` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_servicios`
--

CREATE TABLE `solicitudes_servicios` (
  `id_solicitud` varchar(36) NOT NULL,
  `codigo` varchar(8) DEFAULT NULL,
  `cliente_id` varchar(36) DEFAULT NULL,
  `habitacion_id` varchar(36) DEFAULT NULL,
  `precio_servicio` decimal(10,2) NOT NULL DEFAULT 0.00,
  `iva` int(11) NOT NULL DEFAULT 0,
  `precio_habitacion` decimal(10,2) NOT NULL DEFAULT 0.00,
  `comision_anfitriona` decimal(10,2) NOT NULL DEFAULT 0.00,
  `anfitrionas_ids` longtext NOT NULL CHECK (json_valid(`anfitrionas_ids`)),
  `num_clientes` int(11) NOT NULL DEFAULT 1,
  `metodo_pago` varchar(50) NOT NULL,
  `tiempo` int(11) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `solicitado_por` varchar(36) DEFAULT NULL,
  `estado` enum('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  `motivo_rechazo` text DEFAULT NULL,
  `procesado_por` varchar(36) DEFAULT NULL,
  `fecha_solicitud` datetime NOT NULL,
  `fecha_procesamiento` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `solicitudes_servicios`
--

INSERT INTO `solicitudes_servicios` (`id_solicitud`, `codigo`, `cliente_id`, `habitacion_id`, `precio_servicio`, `iva`, `precio_habitacion`, `comision_anfitriona`, `anfitrionas_ids`, `num_clientes`, `metodo_pago`, `tiempo`, `total`, `solicitado_por`, `estado`, `motivo_rechazo`, `procesado_por`, `fecha_solicitud`, `fecha_procesamiento`) VALUES
('00bde1ca-3f33-4241-ac05-5c09db8243d3', 'MLDY6DSZ', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 0.00, 0, 200000.00, 60000.00, '[\"9a4cd7c2-ab90-4d9a-936a-af4669416024\"]', 1, 'tarjeta', 5, 200000.00, '3f9041fd-ed80-4b46-a586-d0d1093592d9', 'aprobada', NULL, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', '0000-00-00 00:00:00', '2026-03-20 16:30:17'),
('029b3e78-688a-4d52-bc25-98aecb543e7c', 'W9RUV8RX', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '64c46699-e58f-4e7a-9e62-25d615720a70', 50000.00, 0, 30000.00, 0.00, '[\"9a4cd7c2-ab90-4d9a-936a-af4669416024\"]', 1, 'prepago', 15, 80000.00, '3f9041fd-ed80-4b46-a586-d0d1093592d9', 'aprobada', NULL, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', '2026-03-23 11:52:15', '2026-03-23 11:56:39'),
('10b3961b-b2f9-4981-8de7-0b471c55cea2', 'IUCZ5WNH', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 0.00, 0, 200000.00, 60000.00, '[\"9a4cd7c2-ab90-4d9a-936a-af4669416024\"]', 1, 'tarjeta', 5, 200000.00, '3f9041fd-ed80-4b46-a586-d0d1093592d9', 'aprobada', NULL, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', '0000-00-00 00:00:00', '2026-03-20 17:15:14'),
('496689f1-7147-4146-b130-2b29040f3a88', '2FQT3WIO', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 0.00, 0, 200000.00, 60000.00, '[\"9a4cd7c2-ab90-4d9a-936a-af4669416024\"]', 1, 'tarjeta', 5, 200000.00, '3f9041fd-ed80-4b46-a586-d0d1093592d9', 'aprobada', NULL, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', '0000-00-00 00:00:00', '2026-03-20 15:30:19'),
('7269e4fc-2b31-487e-aab9-bd9c480b1bfd', 'WQREJ60H', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 0.00, 0, 200000.00, 60000.00, '[\"9a4cd7c2-ab90-4d9a-936a-af4669416024\"]', 1, 'efectivo', 5, 200000.00, '3f9041fd-ed80-4b46-a586-d0d1093592d9', 'aprobada', NULL, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', '0000-00-00 00:00:00', '2026-03-20 15:41:47');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` varchar(36) NOT NULL,
  `run` varchar(50) NOT NULL,
  `nick` varchar(255) DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `apellido` varchar(255) NOT NULL,
  `direccion` varchar(255) NOT NULL,
  `telefono` varchar(50) NOT NULL,
  `estado_civil` varchar(50) NOT NULL,
  `afp` varchar(100) NOT NULL,
  `aporte` int(11) NOT NULL,
  `sueldo` int(11) NOT NULL,
  `descuento` int(11) NOT NULL DEFAULT 0,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `rol_id` varchar(36) DEFAULT NULL,
  `foto` varchar(255) NOT NULL DEFAULT 'default.png',
  `estado` int(11) NOT NULL DEFAULT 1,
  `estado_servicio` int(11) NOT NULL DEFAULT 1,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL,
  `push_token` varchar(255) DEFAULT NULL,
  `qr_token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `run`, `nick`, `nombre`, `apellido`, `direccion`, `telefono`, `estado_civil`, `afp`, `aporte`, `sueldo`, `descuento`, `email`, `password`, `rol_id`, `foto`, `estado`, `estado_servicio`, `fecha_crea`, `fecha_mod`, `fecha_baja`, `push_token`, `qr_token`) VALUES
('1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '12345678', 'Lizi', 'Lizeth', 'Villa Pardo', 'Av/colon', '70003456', 'Soltero/a', 'AFP', 1500, 15000, 0, 'Lizi@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$/G2PaeoDepu7s1o1SRMNsw$RZUVeJYCejAVhsImgcQf/DeC9lWvaMgevdOPpMz5QnA', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'default.png', 1, 0, '0000-00-00 00:00:00', NULL, NULL, NULL, NULL),
('56f3469c-a6ee-4263-9c4e-9a3063021346', '123456789', 'Sebas', 'Sebastias Fernando', 'Flores Llamos', 'Av/colon', '75415263', 'Soltero/a', 'AFP', 2000, 20000, 0, 'Sebas@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$Sm/KZDxVkyl6pD/ZiTpHqQ$oJU1ejYn0CQVH9FLlRRja5sWqwpyv4VjGkk2blQc2w8', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'default.png', 1, 0, '0000-00-00 00:00:00', NULL, NULL, NULL, NULL),
('641f3837-3fc2-4ddf-8d03-de7501a62756', 'REMOVED_PASSWORD', 'Admin', 'Jhonatan', 'Ancasi Flores', 'Av/colon', '72419112', 'Soltero/a', 'AFP', 0, 0, 0, 'Admin@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$L761WxD3Zy3zFDs9nYqiOA$8WETDSyxTxZOkdoOWzLitBZo9lFkIW40W2OkHMUgnjQ', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'default.png', 1, 1, '2026-03-25 22:15:59', NULL, NULL, NULL, NULL),
('6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', '10101010', 'Pepe', 'Pablo', 'Lopez Reinoso', 'Av Gan Chaco', '78459632', 'Casado/a', 'AFP', 2000, 20000, 0, 'Pepe@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$709sDB5IMUTe6/cKSm210A$baNjIa6MdRRytImLz1z9EYgd7G7h2OHr8Rcu2XmJv20', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'default.png', 1, 0, '0000-00-00 00:00:00', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id_venta` varchar(36) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `cliente_id` varchar(36) DEFAULT NULL,
  `pedido_id` varchar(36) DEFAULT NULL,
  `caja_id` varchar(36) DEFAULT NULL,
  `habitacion_id` varchar(36) DEFAULT NULL,
  `metodo_pago` varchar(50) NOT NULL,
  `propina` int(11) NOT NULL,
  `sub_total` int(11) NOT NULL,
  `total` int(11) NOT NULL,
  `total_comision` int(11) NOT NULL DEFAULT 0,
  `tiempo` int(11) DEFAULT 0,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int(11) NOT NULL DEFAULT 1,
  `created_by` varchar(36) DEFAULT NULL,
  `paused_at` datetime DEFAULT NULL,
  `cuenta_id` varchar(36) DEFAULT NULL,
  `push_notified_5m` tinyint(4) DEFAULT 0,
  `push_notified_end` tinyint(4) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas_usuarios`
--

CREATE TABLE `ventas_usuarios` (
  `id_usuario_venta` varchar(36) NOT NULL,
  `usuario_id` varchar(36) DEFAULT NULL,
  `venta_id` varchar(36) DEFAULT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `_migrations`
--

CREATE TABLE `_migrations` (
  `id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `executed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `_migrations`
--

INSERT INTO `_migrations` (`id`, `filename`, `executed_at`) VALUES
(1, 'add_habitacion_to_detalle_pedidos.sql', '2026-03-25 10:22:06'),
(2, 'create_gratificaciones.sql', '2026-03-25 10:22:06'),
(3, 'create_notificaciones_table.sql', '2026-03-25 10:22:06');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `anticipos`
--
ALTER TABLE `anticipos`
  ADD PRIMARY KEY (`id_anticipo`);

--
-- Indices de la tabla `asistencias`
--
ALTER TABLE `asistencias`
  ADD PRIMARY KEY (`id_asistencia`);

--
-- Indices de la tabla `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `cajas`
--
ALTER TABLE `cajas`
  ADD PRIMARY KEY (`id_caja`);

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id_categoria`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id_cliente`);

--
-- Indices de la tabla `clientes_prepago_movimientos`
--
ALTER TABLE `clientes_prepago_movimientos`
  ADD PRIMARY KEY (`id_movimiento`),
  ADD KEY `fk_prepago_cliente` (`cliente_id`);

--
-- Indices de la tabla `codigos`
--
ALTER TABLE `codigos`
  ADD PRIMARY KEY (`id_codigo`);

--
-- Indices de la tabla `comisiones`
--
ALTER TABLE `comisiones`
  ADD PRIMARY KEY (`id_comision`);

--
-- Indices de la tabla `cuentas`
--
ALTER TABLE `cuentas`
  ADD PRIMARY KEY (`id_cuenta`),
  ADD KEY `fk_cuentas_cliente_id` (`cliente_id`),
  ADD KEY `fk_cuentas_created_by` (`created_by`);

--
-- Indices de la tabla `cuentas_usuarios`
--
ALTER TABLE `cuentas_usuarios`
  ADD PRIMARY KEY (`id_cuenta_usuario`),
  ADD KEY `fk_cuentas_usuarios_cuenta_id` (`cuenta_id`);

--
-- Indices de la tabla `detalle_comisiones`
--
ALTER TABLE `detalle_comisiones`
  ADD PRIMARY KEY (`id_detalle_comision`),
  ADD KEY `fk_detalle_comisiones_comision_id` (`comision_id`);

--
-- Indices de la tabla `detalle_cuentas`
--
ALTER TABLE `detalle_cuentas`
  ADD PRIMARY KEY (`id_detalle_cuenta`),
  ADD KEY `fk_detalle_cuentas_cuenta_id` (`cuenta_id`);

--
-- Indices de la tabla `detalle_devoluciones_servicios`
--
ALTER TABLE `detalle_devoluciones_servicios`
  ADD PRIMARY KEY (`id_detalle_devolucion`),
  ADD KEY `fk_detalle_devoluciones_servicios_devolucion_servicio_id` (`devolucion_servicio_id`);

--
-- Indices de la tabla `detalle_devoluciones_ventas`
--
ALTER TABLE `detalle_devoluciones_ventas`
  ADD PRIMARY KEY (`id_detalle_devolucion`),
  ADD KEY `fk_detalle_devoluciones_ventas_devolucion_venta_id` (`devolucion_venta_id`);

--
-- Indices de la tabla `detalle_pedidos`
--
ALTER TABLE `detalle_pedidos`
  ADD PRIMARY KEY (`id_detalle_pedido`),
  ADD KEY `fk_detalle_pedidos_habitacion_id` (`habitacion_id`),
  ADD KEY `fk_detalle_pedidos_pedido_id` (`pedido_id`),
  ADD KEY `idx_detalle_pedidos_habitacion` (`habitacion_id`);

--
-- Indices de la tabla `detalle_pedidos_anfitrionas`
--
ALTER TABLE `detalle_pedidos_anfitrionas`
  ADD PRIMARY KEY (`id_detalle_anfitriona`);

--
-- Indices de la tabla `detalle_propinas`
--
ALTER TABLE `detalle_propinas`
  ADD PRIMARY KEY (`id_detalle_propina`);

--
-- Indices de la tabla `detalle_servicios`
--
ALTER TABLE `detalle_servicios`
  ADD PRIMARY KEY (`id_detalle_servicio`);

--
-- Indices de la tabla `detalle_servicios_clientes`
--
ALTER TABLE `detalle_servicios_clientes`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  ADD PRIMARY KEY (`id_detalle_venta`);

--
-- Indices de la tabla `devoluciones_servicios`
--
ALTER TABLE `devoluciones_servicios`
  ADD PRIMARY KEY (`id_devolucion`),
  ADD KEY `fk_devoluciones_servicios_cliente_id` (`cliente_id`),
  ADD KEY `fk_devoluciones_servicios_pieza_id` (`pieza_id`);

--
-- Indices de la tabla `devoluciones_ventas`
--
ALTER TABLE `devoluciones_ventas`
  ADD PRIMARY KEY (`id_devolucion_venta`),
  ADD KEY `fk_devoluciones_ventas_cliente_id` (`cliente_id`);

--
-- Indices de la tabla `devoluciones_ventas_usuarios`
--
ALTER TABLE `devoluciones_ventas_usuarios`
  ADD PRIMARY KEY (`id_devolucion_usuario`),
  ADD KEY `fk_devoluciones_ventas_usuarios_detalle_devolucion_venta_id` (`detalle_devolucion_venta_id`);

--
-- Indices de la tabla `error_logs`
--
ALTER TABLE `error_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `gratificaciones`
--
ALTER TABLE `gratificaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_gratificaciones_usuario` (`usuario_id`),
  ADD KEY `idx_gratificaciones_fecha` (`fecha_hora`);

--
-- Indices de la tabla `habitaciones`
--
ALTER TABLE `habitaciones`
  ADD PRIMARY KEY (`id_habitacion`);

--
-- Indices de la tabla `horas_extras`
--
ALTER TABLE `horas_extras`
  ADD PRIMARY KEY (`id_hora_extra`);

--
-- Indices de la tabla `logins`
--
ALTER TABLE `logins`
  ADD PRIMARY KEY (`id_login`);

--
-- Indices de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario_leida` (`usuario_id`,`leida`),
  ADD KEY `idx_rol_leida` (`rol_destinatario`,`leida`);

--
-- Indices de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`id_pedido`),
  ADD KEY `fk_pedidos_cliente_id` (`cliente_id`);

--
-- Indices de la tabla `pedidos_usuarios`
--
ALTER TABLE `pedidos_usuarios`
  ADD PRIMARY KEY (`id_pedido_usuario`),
  ADD KEY `fk_pedidos_usuarios_pedido_id` (`pedido_id`);

--
-- Indices de la tabla `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_permission` (`module`,`action`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`);

--
-- Indices de la tabla `propinas`
--
ALTER TABLE `propinas`
  ADD PRIMARY KEY (`id_propina`);

--
-- Indices de la tabla `retiros_caja`
--
ALTER TABLE `retiros_caja`
  ADD PRIMARY KEY (`id_retiro`),
  ADD KEY `fk_retiros_caja_caja_id` (`caja_id`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id_rol`);

--
-- Indices de la tabla `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`);

--
-- Indices de la tabla `servicios`
--
ALTER TABLE `servicios`
  ADD PRIMARY KEY (`id_servicio`),
  ADD KEY `fk_servicios_created_by` (`created_by`);

--
-- Indices de la tabla `servicio_logs`
--
ALTER TABLE `servicio_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `solicitudes_anticipos`
--
ALTER TABLE `solicitudes_anticipos`
  ADD PRIMARY KEY (`id_solicitud`),
  ADD KEY `fk_solicitudes_anticipos_usuario_id` (`usuario_id`);

--
-- Indices de la tabla `solicitudes_anulacion`
--
ALTER TABLE `solicitudes_anulacion`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_solicitudes_anulacion_venta_id` (`venta_id`);

--
-- Indices de la tabla `solicitudes_anulacion_servicios`
--
ALTER TABLE `solicitudes_anulacion_servicios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_solicitudes_anulacion_servicios_servicio_id` (`servicio_id`);

--
-- Indices de la tabla `solicitudes_atencion`
--
ALTER TABLE `solicitudes_atencion`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `solicitudes_servicios`
--
ALTER TABLE `solicitudes_servicios`
  ADD PRIMARY KEY (`id_solicitud`),
  ADD KEY `fk_solicitudes_servicios_procesado_por` (`procesado_por`),
  ADD KEY `fk_solicitudes_servicios_solicitado_por` (`solicitado_por`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD KEY `fk_usuarios_rol_id` (`rol_id`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id_venta`),
  ADD KEY `fk_ventas_created_by` (`created_by`);

--
-- Indices de la tabla `ventas_usuarios`
--
ALTER TABLE `ventas_usuarios`
  ADD PRIMARY KEY (`id_usuario_venta`),
  ADD KEY `fk_ventas_usuarios_usuario_id` (`usuario_id`),
  ADD KEY `fk_ventas_usuarios_venta_id` (`venta_id`);

--
-- Indices de la tabla `_migrations`
--
ALTER TABLE `_migrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `filename` (`filename`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `_migrations`
--
ALTER TABLE `_migrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `clientes_prepago_movimientos`
--
ALTER TABLE `clientes_prepago_movimientos`
  ADD CONSTRAINT `fk_prepago_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`);

--
-- Filtros para la tabla `cuentas`
--
ALTER TABLE `cuentas`
  ADD CONSTRAINT `fk_cuentas_cliente_id` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cuentas_created_by` FOREIGN KEY (`created_by`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `cuentas_usuarios`
--
ALTER TABLE `cuentas_usuarios`
  ADD CONSTRAINT `fk_cuentas_usuarios_cuenta_id` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id_cuenta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_comisiones`
--
ALTER TABLE `detalle_comisiones`
  ADD CONSTRAINT `fk_detalle_comisiones_comision_id` FOREIGN KEY (`comision_id`) REFERENCES `comisiones` (`id_comision`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_cuentas`
--
ALTER TABLE `detalle_cuentas`
  ADD CONSTRAINT `fk_detalle_cuentas_cuenta_id` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id_cuenta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_devoluciones_servicios`
--
ALTER TABLE `detalle_devoluciones_servicios`
  ADD CONSTRAINT `fk_detalle_devoluciones_servicios_devolucion_servicio_id` FOREIGN KEY (`devolucion_servicio_id`) REFERENCES `devoluciones_servicios` (`id_devolucion`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_devoluciones_ventas`
--
ALTER TABLE `detalle_devoluciones_ventas`
  ADD CONSTRAINT `fk_detalle_devoluciones_ventas_devolucion_venta_id` FOREIGN KEY (`devolucion_venta_id`) REFERENCES `devoluciones_ventas` (`id_devolucion_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_pedidos`
--
ALTER TABLE `detalle_pedidos`
  ADD CONSTRAINT `fk_detalle_pedidos_habitacion` FOREIGN KEY (`habitacion_id`) REFERENCES `habitaciones` (`id_habitacion`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_pedidos_habitacion_id` FOREIGN KEY (`habitacion_id`) REFERENCES `habitaciones` (`id_habitacion`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_pedidos_pedido_id` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `devoluciones_servicios`
--
ALTER TABLE `devoluciones_servicios`
  ADD CONSTRAINT `fk_devoluciones_servicios_cliente_id` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_devoluciones_servicios_pieza_id` FOREIGN KEY (`pieza_id`) REFERENCES `habitaciones` (`id_habitacion`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `devoluciones_ventas`
--
ALTER TABLE `devoluciones_ventas`
  ADD CONSTRAINT `fk_devoluciones_ventas_cliente_id` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `devoluciones_ventas_usuarios`
--
ALTER TABLE `devoluciones_ventas_usuarios`
  ADD CONSTRAINT `fk_devoluciones_ventas_usuarios_detalle_devolucion_venta_id` FOREIGN KEY (`detalle_devolucion_venta_id`) REFERENCES `detalle_devoluciones_ventas` (`id_detalle_devolucion`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `fk_pedidos_cliente_id` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `pedidos_usuarios`
--
ALTER TABLE `pedidos_usuarios`
  ADD CONSTRAINT `fk_pedidos_usuarios_pedido_id` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `retiros_caja`
--
ALTER TABLE `retiros_caja`
  ADD CONSTRAINT `fk_retiros_caja_caja_id` FOREIGN KEY (`caja_id`) REFERENCES `cajas` (`id_caja`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Servidor: mysql:3306
-- Tiempo de generación: 15-01-2026 a las 13:11:19
-- Versión del servidor: 8.0.44
-- Versión de PHP: 8.3.26

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

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `anticipos`
--

CREATE TABLE `anticipos` (
  `id_anticipo` int NOT NULL,
  `usuario_id` int NOT NULL,
  `monto` int NOT NULL,
  `asistencia` int NOT NULL DEFAULT '0',
  `comision` int NOT NULL DEFAULT '0',
  `propina` int NOT NULL DEFAULT '0',
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `anticipos`
--

INSERT INTO `anticipos` (`id_anticipo`, `usuario_id`, `monto`, `asistencia`, `comision`, `propina`, `fecha_crea`, `fecha_mod`, `estado`) VALUES
(4, 2, 300, 0, 0, 0, '2025-08-26 05:45:21', '2025-08-26 07:41:04', 0),
(6, 5, 300, 0, 0, 0, '2025-08-26 09:31:36', '2026-01-14 03:37:50', 0),
(7, 2, 500, 0, 0, 0, '2025-08-26 22:46:17', '2025-08-26 22:47:21', 0),
(8, 5, 50000, 0, 0, 0, '2026-01-14 03:42:24', '2026-01-14 03:43:30', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asistencias`
--

CREATE TABLE `asistencias` (
  `id_asistencia` int NOT NULL,
  `hora` time NOT NULL,
  `fecha` date NOT NULL,
  `fecha_pago` datetime DEFAULT NULL,
  `usuario_id` int NOT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `asistencias`
--

INSERT INTO `asistencias` (`id_asistencia`, `hora`, `fecha`, `fecha_pago`, `usuario_id`, `estado`) VALUES
(1, '04:15:31', '2025-08-26', '2025-08-26 07:41:04', 2, 0),
(4, '04:15:31', '2025-08-26', '2026-01-14 03:37:50', 5, 0),
(5, '20:27:11', '2026-01-13', '2026-01-14 03:38:03', 2, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cajas`
--

CREATE TABLE `cajas` (
  `id_caja` int NOT NULL,
  `fecha_apertura` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_id_apertura` int NOT NULL,
  `monto_apertura` int NOT NULL,
  `efectivo` int NOT NULL,
  `tarjeta` int NOT NULL,
  `transferencia` int NOT NULL DEFAULT '0',
  `usuario_id_cierre` int DEFAULT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  `venta` int NOT NULL DEFAULT '0',
  `servicio` int DEFAULT '0',
  `devolucion` int DEFAULT '0',
  `iva` int NOT NULL DEFAULT '0',
  `comision` int NOT NULL DEFAULT '0',
  `propina` int NOT NULL DEFAULT '0',
  `anticipo` int NOT NULL DEFAULT '0',
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `cajas`
--

INSERT INTO `cajas` (`id_caja`, `fecha_apertura`, `usuario_id_apertura`, `monto_apertura`, `efectivo`, `tarjeta`, `transferencia`, `usuario_id_cierre`, `fecha_cierre`, `venta`, `servicio`, `devolucion`, `iva`, `comision`, `propina`, `anticipo`, `estado`) VALUES
(1, '2025-08-26 04:14:24', 1, 500, 280900, 167900, 40100, 1, '2025-08-26 23:01:36', 484800, 6200, 0, 600, 100000, 4800, 2100, 0),
(2, '2025-08-26 23:02:25', 1, 50000, 143900, 80000, 20000, 1, '2026-01-14 03:02:15', 374000, 0, 0, 0, 60000, 4000, 0, 0),
(3, '2026-01-14 03:02:38', 1, 100000, 0, 0, 0, 1, '2026-01-14 03:03:01', 0, 0, 0, 0, 0, 0, 0, 0),
(4, '2026-01-14 03:03:59', 1, 5000, 110000, 150000, 0, NULL, NULL, 30000, 280000, 0, 20000, 200000, 0, 50000, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id_categoria` int NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id_categoria`, `nombre`, `descripcion`, `estado`, `fecha_crea`, `fecha_mod`, `fecha_baja`) VALUES
(1, 'Cervezas', '', 1, '2026-01-14 02:15:43', NULL, NULL),
(2, 'Champaña', '', 1, '2026-01-14 04:13:41', NULL, NULL),
(3, 'Tragochicas', '', 1, '2026-01-14 04:44:31', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id_cliente` int NOT NULL,
  `run` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `codigos`
--

CREATE TABLE `codigos` (
  `id_codigo` int NOT NULL DEFAULT '1',
  `codigo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `codigos`
--

INSERT INTO `codigos` (`id_codigo`, `codigo`, `fecha_crea`, `estado`) VALUES
(1, '1813', '2025-01-13 10:47:53', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comisiones`
--

CREATE TABLE `comisiones` (
  `id_comision` int NOT NULL,
  `venta_id` int DEFAULT NULL,
  `servicio_id` int DEFAULT NULL,
  `monto` int NOT NULL DEFAULT '0',
  `estado` int NOT NULL DEFAULT '1',
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuentas`
--

CREATE TABLE `cuentas` (
  `id_cuenta` int NOT NULL,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` int NOT NULL,
  `total_comision` int NOT NULL,
  `habitacion_id` int DEFAULT NULL,
  `sub_total` int NOT NULL,
  `total` int NOT NULL,
  `metodo_pago` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pedido_id` int DEFAULT NULL,
  `servicio_id` int DEFAULT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuentas_usuarios`
--

CREATE TABLE `cuentas_usuarios` (
  `id_cuenta_usuario` int NOT NULL,
  `cuenta_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_comisiones`
--

CREATE TABLE `detalle_comisiones` (
  `id_detalle_comision` int NOT NULL,
  `comision_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `comision` int NOT NULL DEFAULT '0',
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_cuentas`
--

CREATE TABLE `detalle_cuentas` (
  `id_detalle_cuenta` int NOT NULL,
  `cuenta_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `precio` int NOT NULL,
  `cantidad` int NOT NULL,
  `sub_total` int NOT NULL,
  `comision` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_devoluciones_servicios`
--

CREATE TABLE `detalle_devoluciones_servicios` (
  `id_detalle_devolucion` int NOT NULL,
  `devolucion_servicio_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `monto` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_devoluciones_ventas`
--

CREATE TABLE `detalle_devoluciones_ventas` (
  `id_detalle_devolucion` int NOT NULL,
  `devolucion_venta_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio` int NOT NULL,
  `comision` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_pedidos`
--

CREATE TABLE `detalle_pedidos` (
  `id_detalle_pedido` int NOT NULL,
  `pedido_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `precio` int NOT NULL,
  `comision` int NOT NULL,
  `cantidad` int NOT NULL,
  `subtotal` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_propinas`
--

CREATE TABLE `detalle_propinas` (
  `id_detalle_propina` int NOT NULL,
  `propina_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `monto` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_servicios`
--

CREATE TABLE `detalle_servicios` (
  `id_detalle_servicio` int NOT NULL,
  `usuario_id` int NOT NULL,
  `servicio_id` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_ventas`
--

CREATE TABLE `detalle_ventas` (
  `id_detalle_venta` int NOT NULL,
  `venta_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `precio` int NOT NULL,
  `comision` int NOT NULL,
  `cantidad` int NOT NULL,
  `sub_total` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devoluciones_servicios`
--

CREATE TABLE `devoluciones_servicios` (
  `id_devolucion` int NOT NULL,
  `servicio_id` int NOT NULL,
  `pieza_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `total` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devoluciones_ventas`
--

CREATE TABLE `devoluciones_ventas` (
  `id_devolucion_venta` int NOT NULL,
  `cliente_id` int NOT NULL,
  `venta_id` int NOT NULL,
  `total` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devoluciones_ventas_usuarios`
--

CREATE TABLE `devoluciones_ventas_usuarios` (
  `id_devolucion_usuario` int NOT NULL,
  `detalle_devolucion_venta_id` int NOT NULL,
  `usuario_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `error_logs`
--

CREATE TABLE `error_logs` (
  `id` int NOT NULL,
  `endpoint` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_general_ci,
  `stack_trace` text COLLATE utf8mb4_general_ci,
  `request_body` text COLLATE utf8mb4_general_ci,
  `fecha_crea` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `error_logs`
--

INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
(1, '/api/sales POST', 'Cannot add or update a child row: a foreign key constraint fails (`lasmunecasderamon`.`ventas`, CONSTRAINT `fk_ventas_clientes` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE)', 'Error: Cannot add or update a child row: a foreign key constraint fails (`lasmunecasderamon`.`ventas`, CONSTRAINT `fk_ventas_clientes` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE)\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async u (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:65:10)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1808)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.m (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:107:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)\n    at async NextNodeServer.handleCatchallRenderRequest (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:391:37)', '{\"cliente_id\":1,\"metodo_pago\":\"efectivo\",\"propina\":1000,\"sub_total\":10000,\"total\":11000,\"detalles\":[{\"producto_id\":2,\"precio\":10000,\"cantidad\":1,\"comision\":0,\"sub_total\":10000}],\"usuarios\":[5]}', '2026-01-14 02:48:03'),
(2, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:33:9)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.g (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:125:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:08:27'),
(3, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:33:9)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.g (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:125:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:11:20'),
(4, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:34:9)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.g (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:126:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:12:46'),
(5, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:34:9)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.g (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:126:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:13:11'),
(6, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:34:9)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.g (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:126:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:13:27'),
(7, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:34:9)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.g (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:126:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:13:30'),
(8, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:34:107)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.v (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:126:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:17:22'),
(9, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:34:107)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.v (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:126:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:17:59'),
(10, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:34:107)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.v (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:126:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:30:38'),
(11, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:34:107)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.v (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:126:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:31:42'),
(12, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:34:107)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.v (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:126:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:33:21'),
(13, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:34:107)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.v (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:126:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:35:18'),
(14, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:34:107)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.v (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:126:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:44:14'),
(15, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:30:107)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.p (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:131:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:52:25'),
(16, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:30:107)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.p (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:131:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 03:52:28'),
(17, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:30:107)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.p (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:131:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 04:02:12'),
(18, '/api/sales GET LISTA', 'Incorrect arguments to mysqld_stmt_execute', 'Error: Incorrect arguments to mysqld_stmt_execute\n    at PromiseConnection.execute (/var/www/lasmuñecasderamon/node_modules/.pnpm/mysql2@3.14.3/node_modules/mysql2/lib/promise/connection.js:47:22)\n    at n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__58c03648._.js:1:811)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async c (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:30:107)\n    at async i (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:2170)\n    at async n (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:1:1777)\n    at async tm (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:95955)\n    at async tg.render (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/compiled/next-server/pages-api-turbo.runtime.prod.js:1:96670)\n    at async Module.p (/var/www/lasmuñecasderamon/.next/server/chunks/[root-of-the-server]__9d6dd623._.js:131:2052)\n    at async NextNodeServer.runApi (/var/www/lasmuñecasderamon/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.0_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/next-server.js:750:9)', '{}', '2026-01-14 04:02:16');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `habitaciones`
--

CREATE TABLE `habitaciones` (
  `id_habitacion` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `precio` int NOT NULL,
  `tiempo` int NOT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `habitaciones`
--

INSERT INTO `habitaciones` (`id_habitacion`, `nombre`, `precio`, `tiempo`, `estado`, `fecha_crea`, `fecha_mod`, `fecha_baja`) VALUES
(3, '1', 30000, 1, 1, '2026-01-14 03:20:27', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `horas_extras`
--

CREATE TABLE `horas_extras` (
  `id_hora_extra` int NOT NULL,
  `usuario_id` int NOT NULL,
  `hora` int NOT NULL,
  `monto` int NOT NULL,
  `total` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `horas_extras`
--

INSERT INTO `horas_extras` (`id_hora_extra`, `usuario_id`, `hora`, `monto`, `total`, `fecha_crea`, `fecha_mod`, `estado`) VALUES
(1, 2, 2, 200, 400, '2025-08-26 05:19:27', '2025-08-26 07:41:04', 0),
(2, 4, 2, 300, 600, '2025-08-26 05:21:57', '2025-08-26 07:54:03', 0),
(3, 2, 2, 200, 400, '2025-08-26 22:45:32', '2025-08-26 22:47:21', 0),
(4, 2, 1, 2400, 2400, '2026-01-14 02:36:40', '2026-01-14 03:38:03', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `logins`
--

CREATE TABLE `logins` (
  `id_login` int NOT NULL,
  `usuario_id` int NOT NULL,
  `last_login` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `logins`
--

INSERT INTO `logins` (`id_login`, `usuario_id`, `last_login`, `estado`) VALUES
(1, 2, '2025-08-26 04:56:10', 0),
(4, 5, '2025-08-26 23:17:00', 0),
(5, 2, '2025-08-26 23:07:31', 0),
(6, 1, '2025-08-28 08:07:27', 0),
(7, 1, '2026-01-14 04:33:21', 1),
(8, 2, '2026-01-14 02:51:55', 0),
(9, 7, '2026-01-14 03:56:52', 1),
(10, 8, '2026-01-14 03:56:52', 1),
(11, 9, '2026-01-14 03:57:02', 1),
(12, 10, '2026-01-14 03:57:02', 1),
(13, 11, '2026-01-14 03:57:18', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `id_pedido` int NOT NULL,
  `codigo` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mesero_id` int NOT NULL,
  `cliente_id` int NOT NULL DEFAULT '1',
  `subtotal` int NOT NULL,
  `total` int NOT NULL,
  `total_comision` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos_usuarios`
--

CREATE TABLE `pedidos_usuarios` (
  `id_pedido_usuario` int NOT NULL,
  `usuario_id` int NOT NULL,
  `pedido_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permissions`
--

CREATE TABLE `permissions` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `module` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `description`, `module`, `action`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'ver_usuarios', '', 'usuarios', 'ver', '2025-08-12 03:31:57', '2025-08-12 03:31:57', NULL),
(2, 'crear_usuarios', '', 'usuarios', 'crear', '2025-08-12 19:20:42', '2025-08-12 19:20:42', NULL),
(3, 'editar_usuarios', '', 'usuarios', 'editar', '2025-08-12 19:20:54', '2025-08-12 19:20:54', NULL),
(4, 'eliminar_usuarios', '', 'usuarios', 'eliminar', '2025-08-12 19:21:13', '2025-08-12 19:21:13', NULL),
(5, 'activar_usuarios', '', 'usuarios', 'activar', '2025-08-12 19:21:29', '2025-08-12 19:21:29', NULL),
(6, 'desactivar_usuarios', '', 'usuarios', 'desactivar', '2025-08-12 19:21:40', '2025-08-12 19:21:40', NULL),
(7, 'ver_clientes', '', 'clientes', 'ver', '2025-08-12 19:21:56', '2025-08-12 19:22:11', NULL),
(8, 'crear_clientes', '', 'clientes', 'crear', '2025-08-12 19:23:32', '2025-08-12 19:23:32', NULL),
(9, 'editar_clientes', '', 'clientes', 'editar', '2025-08-12 19:23:43', '2025-08-12 19:23:43', NULL),
(10, 'eliminar_clientes', '', 'clientes', 'eliminar', '2025-08-12 19:23:54', '2025-08-12 19:23:54', NULL),
(11, 'ver_productos', '', 'productos', 'ver', '2025-08-12 19:26:41', '2025-08-12 19:26:41', NULL),
(12, 'crear_productos', '', 'productos', 'crear', '2025-08-12 19:26:49', '2025-08-12 19:26:49', NULL),
(13, 'editar_productos', '', 'productos', 'editar', '2025-08-12 19:27:06', '2025-08-12 19:27:06', NULL),
(14, 'eliminar_productos', '', 'productos', 'eliminar', '2025-08-12 19:27:18', '2025-08-12 19:27:18', NULL),
(15, 'activar_productos', '', 'productos', 'activar', '2025-08-12 19:27:31', '2025-08-12 19:27:31', NULL),
(16, 'desactivar_productos', '', 'productos', 'desactivar', '2025-08-12 19:27:49', '2025-08-12 19:27:49', NULL),
(17, 'ver_categorias', '', 'categorias', 'ver', '2025-08-12 19:28:23', '2025-08-12 19:28:23', NULL),
(18, 'crear_categorias', '', 'categorias', 'crear', '2025-08-12 19:28:34', '2025-08-12 19:28:34', NULL),
(19, 'editar_categorias', '', 'categorias', 'editar', '2025-08-12 19:28:44', '2025-08-12 19:28:44', NULL),
(20, 'eliminar_categorias', '', 'categorias', 'eliminar', '2025-08-12 19:28:54', '2025-08-12 19:28:54', NULL),
(21, 'activar_categorias', '', 'categorias', 'activar', '2025-08-12 19:29:06', '2025-08-12 19:29:06', NULL),
(22, 'desactivar_categorias', '', 'categorias', 'desactivar', '2025-08-12 19:29:17', '2025-08-12 19:29:17', NULL),
(23, 'ver_pedidos', '', 'pedidos', 'ver', '2025-08-12 19:30:22', '2025-08-12 19:30:22', NULL),
(24, 'crear_pedidos', '', 'pedidos', 'crear', '2025-08-12 19:30:35', '2025-08-12 19:30:35', NULL),
(25, 'procesar_pedidos', '', 'pedidos', 'procesar', '2025-08-12 19:30:50', '2025-08-12 19:30:50', NULL),
(26, 'ver_ventas', '', 'ventas', 'ver', '2025-08-12 19:32:12', '2025-08-12 19:32:12', NULL),
(27, 'crear_ventas', '', 'ventas', 'crear', '2025-08-12 19:32:36', '2025-08-12 19:32:36', NULL),
(28, 'ver_roles', '', 'roles', 'ver', '2025-08-12 19:33:32', '2025-08-12 19:33:32', NULL),
(29, 'crear_roles', '', 'roles', 'crear', '2025-08-12 19:33:48', '2025-08-12 19:33:48', NULL),
(30, 'editar_roles', '', 'roles', 'editar', '2025-08-12 19:33:57', '2025-08-12 19:33:57', NULL),
(31, 'eliminar_roles', '', 'roles', 'eliminar', '2025-08-12 19:34:07', '2025-08-12 19:34:07', NULL),
(32, 'activar_roles', '', 'roles', 'activar', '2025-08-12 19:34:21', '2025-08-12 19:34:21', NULL),
(33, 'desactivar_roles', '', 'roles', 'desactivar', '2025-08-12 19:34:31', '2025-08-12 19:34:31', NULL),
(34, 'ver_asistencias', '', 'asistencias', 'ver', '2025-08-12 19:35:06', '2025-08-12 19:35:06', NULL),
(35, 'ver_horas_extras', '', 'horas_extras', 'ver', '2025-08-12 19:35:22', '2025-08-12 19:35:22', NULL),
(36, 'crear_horas_extras', '', 'horas_extras', 'crear', '2025-08-12 19:35:35', '2025-08-12 19:35:35', NULL),
(37, 'ver_caja', '', 'caja', 'ver', '2025-08-18 23:27:59', '2025-08-18 23:27:59', NULL),
(38, 'crear_caja', '', 'caja', 'crear', '2025-08-18 23:28:21', '2025-08-18 23:28:21', NULL),
(39, 'cerrar_caja', '', 'caja', 'cerrar', '2025-08-19 09:23:14', '2025-08-19 09:23:14', NULL),
(40, 'Procesar pedidos', 'Acceso para procesar y gestionar pedidos', 'orders', 'process', '2025-08-22 08:41:08', '2025-08-22 08:41:08', NULL),
(41, 'Ver clientes', 'Acceso para visualizar todos los clientes del sistema', 'clients', 'view', '2025-08-27 03:03:27', '2025-08-27 03:03:27', NULL),
(42, 'Ver detalle de clientes', 'Acceso para ver información detallada de clientes específicos', 'clients', 'detail', '2025-08-27 03:03:27', '2025-08-27 03:03:27', NULL),
(43, 'Crear clientes', 'Acceso para crear nuevos clientes en el sistema', 'clients', 'create', '2025-08-27 03:03:27', '2025-08-27 03:03:27', NULL),
(44, 'Editar clientes', 'Acceso para modificar información de clientes', 'clients', 'edit', '2025-08-27 03:03:27', '2025-08-27 03:03:27', NULL),
(45, 'Eliminar clientes', 'Acceso para eliminar clientes del sistema', 'clients', 'delete', '2025-08-27 03:03:27', '2025-08-27 03:03:27', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` int NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `categoria_id` int NOT NULL,
  `precio` int NOT NULL,
  `comision` int NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_general_ci DEFAULT 'Sin descripcion',
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `foto` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'default.png'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `codigo`, `nombre`, `categoria_id`, `precio`, `comision`, `descripcion`, `fecha_crea`, `fecha_mod`, `fecha_baja`, `estado`, `foto`) VALUES
(2, 'NJ2K222J', 'corona 375cc', 1, 10000, 0, 'cerveza cliente', '2026-01-14 02:23:04', NULL, NULL, 1, 'default.png'),
(3, 'SHM2QK4G', 'champaña', 2, 120000, 40000, 'champaña chicas', '2026-01-14 04:15:22', NULL, NULL, 1, 'default.png'),
(4, '658PH4YM', 'trago $20.000', 3, 20000, 7000, 'trago chica', '2026-01-14 04:45:45', NULL, NULL, 1, 'default.png');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `propinas`
--

CREATE TABLE `propinas` (
  `id_propina` int NOT NULL,
  `venta_id` int NOT NULL,
  `propina` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `retiros_caja`
--

CREATE TABLE `retiros_caja` (
  `id_retiro` int NOT NULL COMMENT 'ID único del retiro',
  `id_caja` int NOT NULL COMMENT 'ID de la caja de la cual se retiró el dinero',
  `monto` decimal(10,2) NOT NULL COMMENT 'Monto retirado',
  `motivo` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Motivo del retiro',
  `usuario_id` int NOT NULL COMMENT 'ID del usuario que realizó el retiro',
  `fecha_retiro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora del retiro'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id_rol` int NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_general_ci NOT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id_rol`, `nombre`, `descripcion`, `estado`, `fecha_crea`, `fecha_mod`, `fecha_baja`) VALUES
(1, 'Administrador', 'Acceso a todos los modulos', 1, '2025-08-16 18:10:36', NULL, NULL),
(2, 'garzon', 'acceso a los pedidos', 1, '2025-08-16 18:31:01', NULL, NULL),
(3, 'anfitriona', 'sin acceso a los modulos', 1, '2025-08-16 18:39:45', NULL, NULL),
(4, 'cajero', 'acceso a multiples modulos del sistema', 1, '2025-08-16 18:43:08', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` int NOT NULL,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`) VALUES
(25, 4, 8, '2025-08-18 19:19:19', '2025-08-18 19:19:19'),
(26, 4, 9, '2025-08-18 19:19:19', '2025-08-18 19:19:19'),
(27, 4, 10, '2025-08-18 19:19:19', '2025-08-18 19:19:19'),
(28, 4, 7, '2025-08-18 19:19:19', '2025-08-18 19:19:19'),
(29, 4, 24, '2025-08-18 19:19:19', '2025-08-18 19:19:19'),
(30, 4, 25, '2025-08-18 19:19:19', '2025-08-18 19:19:19'),
(31, 4, 23, '2025-08-18 19:19:19', '2025-08-18 19:19:19'),
(32, 4, 27, '2025-08-18 19:19:19', '2025-08-18 19:19:19'),
(33, 4, 26, '2025-08-18 19:19:19', '2025-08-18 19:19:19'),
(152, 3, 40, '2025-08-22 08:41:08', '2025-08-22 08:41:08'),
(153, 4, 40, '2025-08-22 08:41:08', '2025-08-22 08:41:08'),
(260, 2, 8, '2025-08-27 03:34:28', '2025-08-27 03:34:28'),
(261, 2, 9, '2025-08-27 03:34:28', '2025-08-27 03:34:28'),
(262, 2, 10, '2025-08-27 03:34:28', '2025-08-27 03:34:28'),
(263, 2, 7, '2025-08-27 03:34:28', '2025-08-27 03:34:28'),
(264, 2, 40, '2025-08-27 03:34:28', '2025-08-27 03:34:28'),
(265, 2, 24, '2025-08-27 03:34:28', '2025-08-27 03:34:28'),
(266, 2, 23, '2025-08-27 03:34:28', '2025-08-27 03:34:28'),
(267, 1, 1, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(268, 1, 2, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(269, 1, 3, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(270, 1, 4, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(271, 1, 5, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(272, 1, 6, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(273, 1, 7, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(274, 1, 8, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(275, 1, 9, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(276, 1, 10, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(277, 1, 11, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(278, 1, 12, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(279, 1, 13, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(280, 1, 14, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(281, 1, 15, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(282, 1, 16, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(283, 1, 17, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(284, 1, 18, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(285, 1, 19, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(286, 1, 20, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(287, 1, 21, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(288, 1, 22, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(289, 1, 23, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(290, 1, 24, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(291, 1, 25, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(292, 1, 26, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(293, 1, 27, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(294, 1, 28, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(295, 1, 29, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(296, 1, 30, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(297, 1, 31, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(298, 1, 32, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(299, 1, 33, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(300, 1, 34, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(301, 1, 35, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(302, 1, 36, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(303, 1, 37, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(304, 1, 38, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(305, 1, 39, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(306, 1, 40, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(307, 1, 41, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(308, 1, 42, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(309, 1, 43, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(310, 1, 44, '2025-08-27 03:34:30', '2025-08-27 03:34:30'),
(311, 1, 45, '2025-08-27 03:34:30', '2025-08-27 03:34:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicios`
--

CREATE TABLE `servicios` (
  `id_servicio` int NOT NULL,
  `codigo` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `cliente_id` int NOT NULL,
  `habitacion_id` int NOT NULL,
  `precio_habitacion` int NOT NULL,
  `precio_servicio` int NOT NULL,
  `iva` int NOT NULL DEFAULT '0',
  `sub_total` int NOT NULL,
  `total` int NOT NULL,
  `tiempo` int NOT NULL,
  `metodo_pago` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_anulacion`
--

CREATE TABLE `solicitudes_anulacion` (
  `id` int NOT NULL,
  `venta_id` int NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `estado` enum('pendiente','confirmada','rechazada') COLLATE utf8mb4_general_ci DEFAULT 'pendiente',
  `fecha_solicitud` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `solicitado_por` varchar(255) COLLATE utf8mb4_general_ci DEFAULT 'Usuario del Sistema',
  `motivo` varchar(500) COLLATE utf8mb4_general_ci DEFAULT 'Motivo no especificado'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_anulacion_servicios`
--

CREATE TABLE `solicitudes_anulacion_servicios` (
  `id` int NOT NULL,
  `servicio_id` int NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `estado` enum('pendiente','confirmada','rechazada') COLLATE utf8mb4_general_ci DEFAULT 'pendiente',
  `fecha_solicitud` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `solicitado_por` varchar(255) COLLATE utf8mb4_general_ci DEFAULT 'Usuario del Sistema',
  `motivo` varchar(500) COLLATE utf8mb4_general_ci DEFAULT 'Motivo no especificado'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL,
  `run` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `nick` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `apellido` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `telefono` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `estado_civil` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `afp` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `aporte` int NOT NULL,
  `sueldo` int NOT NULL,
  `descuento` int NOT NULL DEFAULT '0',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `rol_id` int NOT NULL,
  `foto` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'default.png',
  `estado` int NOT NULL DEFAULT '1',
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `run`, `nick`, `nombre`, `apellido`, `direccion`, `telefono`, `estado_civil`, `afp`, `aporte`, `sueldo`, `descuento`, `email`, `password`, `rol_id`, `foto`, `estado`, `fecha_crea`, `fecha_mod`, `fecha_baja`) VALUES
(1, '10571705', 'admin', 'jhonatan', 'flores', 'Av Blanco Galindo', '72419112', 'Casado', 'AFP por defecto', 0, 0, 0, 'admin@lasmuñecasderamon.com', '$2b$12$UC2TlWcHOg824P6Lu3svJOOlVUy2zNdskF7gkIo1NXVGgtXRwmDI6', 1, 'user_1756263576935.png', 1, '2025-08-24 08:22:40', '2025-08-26 22:59:54', NULL),
(2, '10101010', 'pepe', 'pedro', 'martinez', 'av circumbalacion', '67909084', 'Casado/a', 'Afp', 500, 5000, 0, 'pepe@lasmuñecasderamon.com', '$2b$12$Zj1jjrNM4gvx0wzpS0vVY.XdR/eMQG94I3sNcjM3smWrmKf..D35K', 2, 'user_1756146589351.jpg', 1, '2025-08-25 04:52:45', '2025-08-26 04:54:01', NULL),
(5, '12345678', 'lizi', 'Lizeth', 'Villa', 'av/colon', '7542156322', 'Casado', 'Afp', 500, 5000, 200, 'lizi@lasmuñecasderamon.com', '$2b$10$LMVCVscWCf3QZgYVJbfwdOULNMa80tG8NDL0VBl/DBUZph6NLrYEm', 3, 'default.png', 1, '2025-08-26 04:12:58', '2025-08-27 07:55:20', NULL),
(6, '123665425', 'algo', 'jhonatan', 'flores', 'av/colon', '75412563', 'Casado/a', 'Afp', 500, 5000, 0, 'algo@lasmuñecasderamon.com', '$2b$10$2NyJaa2dY327BazZIdLyHOScPkwK1drFpf2/iPya9BQ.6d3PgvfPa', 2, 'default.png', 1, '2025-08-26 22:26:37', NULL, NULL),
(7, '11111111', 'anfitriona1', 'María', 'González', 'Calle Principal 123', '70000001', 'Soltero/a', 'AFP por defecto', 500, 3000, 100, 'maria@lasmuñecasderamon.com', '$2b$10$mfsL9bYBDD0S8XA/lAftued0noqos5xeWhhyE1EJRR98dI133R5hC', 3, 'default.png', 1, '2026-01-14 03:53:58', NULL, NULL),
(8, '22222222', 'anfitriona2', 'Carolina', 'López', 'Avenida Secundaria 456', '70000002', 'Soltero/a', 'AFP por defecto', 500, 3000, 100, 'carolina@lasmuñecasderamon.com', '$2b$10$iRdrBiWMZJTetYX3aJSHUeB8hLTeFsM0F6du3cu41sd3vDyc6EQZq', 3, 'default.png', 1, '2026-01-14 03:53:58', NULL, NULL),
(9, '33333333', 'anfitriona3', 'Rosa', 'Martínez', 'Calle Tercera 789', '70000003', 'Casado/a', 'AFP por defecto', 500, 3500, 150, 'rosa@lasmuñecasderamon.com', '$2b$10$Jmhlzut6daI4Pm8R3PJw3Ombn5.IQYanPIAWkW690r.r69xLUG5yS', 3, 'default.png', 1, '2026-01-14 03:53:58', NULL, NULL),
(10, '44444444', 'anfitriona4', 'Alejandra', 'García', 'Avenida Cuarta 321', '70000004', 'Soltero/a', 'AFP por defecto', 500, 3000, 100, 'alejandra@lasmuñecasderamon.com', '$2b$10$WJ/LjfWAPUrJ5RynQju23.tWt6FpPs5OOzk50vNojJetMQjKIVNy6', 3, 'default.png', 1, '2026-01-14 03:53:58', NULL, NULL),
(11, '55555555', 'anfitriona5', 'Daniela', 'Rodríguez', 'Calle Quinta 654', '70000005', 'Casado/a', 'AFP por defecto', 500, 3500, 150, 'daniela@lasmuñecasderamon.com', '$2b$10$CknSQRBZXujZt9OD4ONBQOKcaVrMFpp3C8LqkPznBK.p9UV1OpnXq', 3, 'default.png', 1, '2026-01-14 03:53:58', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id_venta` int NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `cliente_id` int DEFAULT NULL,
  `habitacion_id` int DEFAULT '0',
  `metodo_pago` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `propina` int NOT NULL,
  `sub_total` int NOT NULL,
  `total` int NOT NULL,
  `total_comision` int NOT NULL DEFAULT '0',
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas_usuarios`
--

CREATE TABLE `ventas_usuarios` (
  `id_usuario_venta` int NOT NULL,
  `usuario_id` int NOT NULL,
  `venta_id` int NOT NULL,
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `anticipos`
--
ALTER TABLE `anticipos`
  ADD PRIMARY KEY (`id_anticipo`),
  ADD KEY `fk_anticipos_usuarios` (`usuario_id`);

--
-- Indices de la tabla `asistencias`
--
ALTER TABLE `asistencias`
  ADD PRIMARY KEY (`id_asistencia`),
  ADD KEY `fk_asistencia_usuarios` (`usuario_id`);

--
-- Indices de la tabla `cajas`
--
ALTER TABLE `cajas`
  ADD PRIMARY KEY (`id_caja`),
  ADD KEY `fk_cajas_usuario_apertura` (`usuario_id_apertura`),
  ADD KEY `fk_cajas_usuario_cierre` (`usuario_id_cierre`);

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
-- Indices de la tabla `codigos`
--
ALTER TABLE `codigos`
  ADD PRIMARY KEY (`id_codigo`);

--
-- Indices de la tabla `comisiones`
--
ALTER TABLE `comisiones`
  ADD PRIMARY KEY (`id_comision`),
  ADD KEY `fk_comisiones_ventas` (`venta_id`),
  ADD KEY `fk_comisiones_servicios` (`servicio_id`);

--
-- Indices de la tabla `cuentas`
--
ALTER TABLE `cuentas`
  ADD PRIMARY KEY (`id_cuenta`),
  ADD KEY `fk_cuentas_clientes` (`cliente_id`);

--
-- Indices de la tabla `cuentas_usuarios`
--
ALTER TABLE `cuentas_usuarios`
  ADD PRIMARY KEY (`id_cuenta_usuario`),
  ADD KEY `fk_cuentas_usuarios_cuentas` (`cuenta_id`),
  ADD KEY `fk_cuentas_usuarios_usuarios` (`usuario_id`);

--
-- Indices de la tabla `detalle_comisiones`
--
ALTER TABLE `detalle_comisiones`
  ADD PRIMARY KEY (`id_detalle_comision`),
  ADD KEY `fk_detalle_comisiones_comisiones` (`comision_id`),
  ADD KEY `fk_detalle_comisiones_usuarios` (`usuario_id`);

--
-- Indices de la tabla `detalle_cuentas`
--
ALTER TABLE `detalle_cuentas`
  ADD PRIMARY KEY (`id_detalle_cuenta`),
  ADD KEY `fk_detalle_cuentas_cuentas` (`cuenta_id`),
  ADD KEY `fk_detalle_cuentas_productos` (`producto_id`);

--
-- Indices de la tabla `detalle_devoluciones_servicios`
--
ALTER TABLE `detalle_devoluciones_servicios`
  ADD PRIMARY KEY (`id_detalle_devolucion`),
  ADD KEY `fk_detalle_devoluciones_servicios_devoluciones` (`devolucion_servicio_id`),
  ADD KEY `fk_detalle_devoluciones_servicios_usuarios` (`usuario_id`);

--
-- Indices de la tabla `detalle_devoluciones_ventas`
--
ALTER TABLE `detalle_devoluciones_ventas`
  ADD PRIMARY KEY (`id_detalle_devolucion`),
  ADD KEY `fk_detalle_devoluciones_ventas_devoluciones` (`devolucion_venta_id`),
  ADD KEY `fk_detalle_devoluciones_ventas_productos` (`producto_id`);

--
-- Indices de la tabla `detalle_pedidos`
--
ALTER TABLE `detalle_pedidos`
  ADD PRIMARY KEY (`id_detalle_pedido`),
  ADD KEY `fk_detalle_pedidos_pedidos` (`pedido_id`),
  ADD KEY `fk_detalle_pedidos_productos` (`producto_id`);

--
-- Indices de la tabla `detalle_propinas`
--
ALTER TABLE `detalle_propinas`
  ADD PRIMARY KEY (`id_detalle_propina`),
  ADD KEY `fk_detalle_propinas_propinas` (`propina_id`),
  ADD KEY `fk_detalle_propinas_usuarios` (`usuario_id`);

--
-- Indices de la tabla `detalle_servicios`
--
ALTER TABLE `detalle_servicios`
  ADD PRIMARY KEY (`id_detalle_servicio`),
  ADD KEY `fk_detalle_servicios_servicios` (`servicio_id`),
  ADD KEY `fk_detalle_servicios_usuarios` (`usuario_id`),
  ADD KEY `idx_detalle_servicios_servicio` (`servicio_id`),
  ADD KEY `idx_detalle_servicios_usuario` (`usuario_id`);

--
-- Indices de la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  ADD PRIMARY KEY (`id_detalle_venta`),
  ADD KEY `fk_detalle_ventas_ventas` (`venta_id`),
  ADD KEY `fk_detalle_ventas_productos` (`producto_id`);

--
-- Indices de la tabla `devoluciones_servicios`
--
ALTER TABLE `devoluciones_servicios`
  ADD PRIMARY KEY (`id_devolucion`),
  ADD KEY `fk_devoluciones_servicios_servicios` (`servicio_id`),
  ADD KEY `fk_devoluciones_servicios_piezas` (`pieza_id`),
  ADD KEY `fk_devoluciones_servicios_clientes` (`cliente_id`);

--
-- Indices de la tabla `devoluciones_ventas`
--
ALTER TABLE `devoluciones_ventas`
  ADD PRIMARY KEY (`id_devolucion_venta`),
  ADD KEY `fk_devoluciones_ventas_clientes` (`cliente_id`);

--
-- Indices de la tabla `devoluciones_ventas_usuarios`
--
ALTER TABLE `devoluciones_ventas_usuarios`
  ADD PRIMARY KEY (`id_devolucion_usuario`),
  ADD KEY `fk_devoluciones_ventas_usuarios_detalle` (`detalle_devolucion_venta_id`),
  ADD KEY `fk_devoluciones_ventas_usuarios_usuarios` (`usuario_id`);

--
-- Indices de la tabla `error_logs`
--
ALTER TABLE `error_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `habitaciones`
--
ALTER TABLE `habitaciones`
  ADD PRIMARY KEY (`id_habitacion`);

--
-- Indices de la tabla `horas_extras`
--
ALTER TABLE `horas_extras`
  ADD PRIMARY KEY (`id_hora_extra`),
  ADD KEY `fk_horas_extras_usuarios` (`usuario_id`);

--
-- Indices de la tabla `logins`
--
ALTER TABLE `logins`
  ADD PRIMARY KEY (`id_login`),
  ADD KEY `fk_logins_usuarios` (`usuario_id`);

--
-- Indices de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`id_pedido`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `fk_pedidos_usuarios_mesero` (`mesero_id`),
  ADD KEY `fk_pedidos_clientes` (`cliente_id`);

--
-- Indices de la tabla `pedidos_usuarios`
--
ALTER TABLE `pedidos_usuarios`
  ADD PRIMARY KEY (`id_pedido_usuario`),
  ADD KEY `fk_pedidos_usuarios_pedidos` (`pedido_id`),
  ADD KEY `fk_pedidos_usuarios_usuarios` (`usuario_id`);

--
-- Indices de la tabla `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_module_action` (`module`,`action`),
  ADD KEY `idx_name` (`name`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`),
  ADD KEY `fk_productos_categorias` (`categoria_id`);

--
-- Indices de la tabla `propinas`
--
ALTER TABLE `propinas`
  ADD PRIMARY KEY (`id_propina`),
  ADD KEY `fk_propinas_ventas` (`venta_id`);

--
-- Indices de la tabla `retiros_caja`
--
ALTER TABLE `retiros_caja`
  ADD PRIMARY KEY (`id_retiro`),
  ADD KEY `idx_caja` (`id_caja`),
  ADD KEY `idx_usuario` (`usuario_id`),
  ADD KEY `idx_fecha` (`fecha_retiro`);

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
  ADD UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`),
  ADD KEY `idx_role_id` (`role_id`),
  ADD KEY `idx_permission_id` (`permission_id`);

--
-- Indices de la tabla `servicios`
--
ALTER TABLE `servicios`
  ADD PRIMARY KEY (`id_servicio`),
  ADD KEY `fk_servicios_clientes` (`cliente_id`),
  ADD KEY `fk_servicios_piezas` (`habitacion_id`),
  ADD KEY `idx_servicios_codigo` (`codigo`),
  ADD KEY `idx_servicios_cliente` (`cliente_id`),
  ADD KEY `idx_servicios_habitacion` (`habitacion_id`),
  ADD KEY `idx_servicios_estado` (`estado`),
  ADD KEY `idx_servicios_fecha` (`fecha_crea`);

--
-- Indices de la tabla `solicitudes_anulacion`
--
ALTER TABLE `solicitudes_anulacion`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `solicitudes_anulacion_ibfk_1` (`venta_id`);

--
-- Indices de la tabla `solicitudes_anulacion_servicios`
--
ALTER TABLE `solicitudes_anulacion_servicios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `solicitudes_anulacion_servicios_ibfk_1` (`servicio_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD KEY `fk_usuarios_roles` (`rol_id`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id_venta`),
  ADD KEY `fk_ventas_clientes` (`cliente_id`);

--
-- Indices de la tabla `ventas_usuarios`
--
ALTER TABLE `ventas_usuarios`
  ADD PRIMARY KEY (`id_usuario_venta`),
  ADD KEY `fk_ventas_usuario_ventas` (`venta_id`),
  ADD KEY `fk_ventas_usuario_usuarios` (`usuario_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `anticipos`
--
ALTER TABLE `anticipos`
  MODIFY `id_anticipo` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `asistencias`
--
ALTER TABLE `asistencias`
  MODIFY `id_asistencia` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `cajas`
--
ALTER TABLE `cajas`
  MODIFY `id_caja` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id_categoria` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id_cliente` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `comisiones`
--
ALTER TABLE `comisiones`
  MODIFY `id_comision` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT de la tabla `cuentas`
--
ALTER TABLE `cuentas`
  MODIFY `id_cuenta` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `cuentas_usuarios`
--
ALTER TABLE `cuentas_usuarios`
  MODIFY `id_cuenta_usuario` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `detalle_comisiones`
--
ALTER TABLE `detalle_comisiones`
  MODIFY `id_detalle_comision` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT de la tabla `detalle_cuentas`
--
ALTER TABLE `detalle_cuentas`
  MODIFY `id_detalle_cuenta` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `detalle_devoluciones_servicios`
--
ALTER TABLE `detalle_devoluciones_servicios`
  MODIFY `id_detalle_devolucion` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `detalle_devoluciones_ventas`
--
ALTER TABLE `detalle_devoluciones_ventas`
  MODIFY `id_detalle_devolucion` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `detalle_pedidos`
--
ALTER TABLE `detalle_pedidos`
  MODIFY `id_detalle_pedido` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT de la tabla `detalle_propinas`
--
ALTER TABLE `detalle_propinas`
  MODIFY `id_detalle_propina` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT de la tabla `detalle_servicios`
--
ALTER TABLE `detalle_servicios`
  MODIFY `id_detalle_servicio` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  MODIFY `id_detalle_venta` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT de la tabla `devoluciones_servicios`
--
ALTER TABLE `devoluciones_servicios`
  MODIFY `id_devolucion` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `devoluciones_ventas`
--
ALTER TABLE `devoluciones_ventas`
  MODIFY `id_devolucion_venta` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `devoluciones_ventas_usuarios`
--
ALTER TABLE `devoluciones_ventas_usuarios`
  MODIFY `id_devolucion_usuario` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `error_logs`
--
ALTER TABLE `error_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `habitaciones`
--
ALTER TABLE `habitaciones`
  MODIFY `id_habitacion` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `horas_extras`
--
ALTER TABLE `horas_extras`
  MODIFY `id_hora_extra` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `logins`
--
ALTER TABLE `logins`
  MODIFY `id_login` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `id_pedido` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `pedidos_usuarios`
--
ALTER TABLE `pedidos_usuarios`
  MODIFY `id_pedido_usuario` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT de la tabla `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `propinas`
--
ALTER TABLE `propinas`
  MODIFY `id_propina` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `retiros_caja`
--
ALTER TABLE `retiros_caja`
  MODIFY `id_retiro` int NOT NULL AUTO_INCREMENT COMMENT 'ID único del retiro';

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id_rol` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `role_permissions`
--
ALTER TABLE `role_permissions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=312;

--
-- AUTO_INCREMENT de la tabla `servicios`
--
ALTER TABLE `servicios`
  MODIFY `id_servicio` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `solicitudes_anulacion`
--
ALTER TABLE `solicitudes_anulacion`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `solicitudes_anulacion_servicios`
--
ALTER TABLE `solicitudes_anulacion_servicios`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id_venta` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT de la tabla `ventas_usuarios`
--
ALTER TABLE `ventas_usuarios`
  MODIFY `id_usuario_venta` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `anticipos`
--
ALTER TABLE `anticipos`
  ADD CONSTRAINT `fk_anticipos_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `asistencias`
--
ALTER TABLE `asistencias`
  ADD CONSTRAINT `fk_asistencia_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `cajas`
--
ALTER TABLE `cajas`
  ADD CONSTRAINT `fk_cajas_usuario_apertura` FOREIGN KEY (`usuario_id_apertura`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cajas_usuario_cierre` FOREIGN KEY (`usuario_id_cierre`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `comisiones`
--
ALTER TABLE `comisiones`
  ADD CONSTRAINT `fk_comisiones_servicios` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id_servicio`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_comisiones_ventas` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `cuentas`
--
ALTER TABLE `cuentas`
  ADD CONSTRAINT `fk_cuentas_clientes` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `cuentas_usuarios`
--
ALTER TABLE `cuentas_usuarios`
  ADD CONSTRAINT `fk_cuentas_usuarios_cuentas` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id_cuenta`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cuentas_usuarios_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_comisiones`
--
ALTER TABLE `detalle_comisiones`
  ADD CONSTRAINT `fk_detalle_comisiones_comisiones` FOREIGN KEY (`comision_id`) REFERENCES `comisiones` (`id_comision`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_comisiones_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_cuentas`
--
ALTER TABLE `detalle_cuentas`
  ADD CONSTRAINT `fk_detalle_cuentas_cuentas` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id_cuenta`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_cuentas_productos` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_devoluciones_servicios`
--
ALTER TABLE `detalle_devoluciones_servicios`
  ADD CONSTRAINT `fk_detalle_devoluciones_servicios_devoluciones` FOREIGN KEY (`devolucion_servicio_id`) REFERENCES `devoluciones_servicios` (`id_devolucion`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_devoluciones_servicios_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_devoluciones_ventas`
--
ALTER TABLE `detalle_devoluciones_ventas`
  ADD CONSTRAINT `fk_detalle_devoluciones_ventas_devoluciones` FOREIGN KEY (`devolucion_venta_id`) REFERENCES `devoluciones_ventas` (`id_devolucion_venta`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_devoluciones_ventas_productos` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_pedidos`
--
ALTER TABLE `detalle_pedidos`
  ADD CONSTRAINT `fk_detalle_pedidos_pedidos` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_pedidos_productos` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_propinas`
--
ALTER TABLE `detalle_propinas`
  ADD CONSTRAINT `fk_detalle_propinas_propinas` FOREIGN KEY (`propina_id`) REFERENCES `propinas` (`id_propina`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_propinas_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_servicios`
--
ALTER TABLE `detalle_servicios`
  ADD CONSTRAINT `fk_detalle_servicios_servicios` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id_servicio`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_servicios_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  ADD CONSTRAINT `fk_detalle_ventas_productos` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_ventas_ventas` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `devoluciones_servicios`
--
ALTER TABLE `devoluciones_servicios`
  ADD CONSTRAINT `fk_devoluciones_servicios_clientes` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_devoluciones_servicios_piezas` FOREIGN KEY (`pieza_id`) REFERENCES `habitaciones` (`id_habitacion`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_devoluciones_servicios_servicios` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id_servicio`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `devoluciones_ventas`
--
ALTER TABLE `devoluciones_ventas`
  ADD CONSTRAINT `fk_devoluciones_ventas_clientes` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `devoluciones_ventas_usuarios`
--
ALTER TABLE `devoluciones_ventas_usuarios`
  ADD CONSTRAINT `fk_devoluciones_ventas_usuarios_detalle` FOREIGN KEY (`detalle_devolucion_venta_id`) REFERENCES `detalle_devoluciones_ventas` (`id_detalle_devolucion`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_devoluciones_ventas_usuarios_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `logins`
--
ALTER TABLE `logins`
  ADD CONSTRAINT `fk_logins_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `fk_pedidos_clientes` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pedidos_usuarios_mesero` FOREIGN KEY (`mesero_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `pedidos_usuarios`
--
ALTER TABLE `pedidos_usuarios`
  ADD CONSTRAINT `fk_pedidos_usuarios_pedidos` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pedidos_usuarios_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `fk_productos_categorias` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id_categoria`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `propinas`
--
ALTER TABLE `propinas`
  ADD CONSTRAINT `fk_propinas_ventas` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `retiros_caja`
--
ALTER TABLE `retiros_caja`
  ADD CONSTRAINT `fk_retiros_caja` FOREIGN KEY (`id_caja`) REFERENCES `cajas` (`id_caja`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_retiros_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id_rol`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `servicios`
--
ALTER TABLE `servicios`
  ADD CONSTRAINT `fk_servicios_clientes` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_servicios_piezas` FOREIGN KEY (`habitacion_id`) REFERENCES `habitaciones` (`id_habitacion`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `solicitudes_anulacion`
--
ALTER TABLE `solicitudes_anulacion`
  ADD CONSTRAINT `solicitudes_anulacion_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `solicitudes_anulacion_servicios`
--
ALTER TABLE `solicitudes_anulacion_servicios`
  ADD CONSTRAINT `solicitudes_anulacion_servicios_ibfk_1` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id_servicio`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_roles` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id_rol`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_ventas_clientes` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `ventas_usuarios`
--
ALTER TABLE `ventas_usuarios`
  ADD CONSTRAINT `fk_ventas_usuario_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ventas_usuario_ventas` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

DELIMITER $$
--
-- Eventos
--
CREATE DEFINER=`root`@`localhost` EVENT `update_code` ON SCHEDULE EVERY 1 MINUTE STARTS '2025-05-19 18:38:16' ON COMPLETION NOT PRESERVE ENABLE DO UPDATE codigos 
  SET codigo = FLOOR(1000 + RAND() * 9000)$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

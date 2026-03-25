-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 24-03-2026 a las 17:55:08
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

--
-- Volcado de datos para la tabla `asistencias`
--

INSERT INTO `asistencias` (`id_asistencia`, `hora`, `fecha`, `fecha_pago`, `usuario_id`, `estado`) VALUES
('2afff6b0-6511-4a8a-8fa2-6e1e1a1df4e9', '13:05:56', '2026-03-16', NULL, '3f9041fd-ed80-4b46-a586-d0d1093592d9', 1),
('9d3d4cc2-d548-4bde-8203-f2b23d557715', '11:56:18', '2026-03-16', NULL, '9a4cd7c2-ab90-4d9a-936a-af4669416024', 1),
('f447e66d-fb4c-4152-81b3-6866ed843e95', '03:36:26', '2026-03-19', NULL, '3f9041fd-ed80-4b46-a586-d0d1093592d9', 1);

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

--
-- Volcado de datos para la tabla `cajas`
--

INSERT INTO `cajas` (`id_caja`, `fecha_apertura`, `usuario_id_apertura`, `monto_apertura`, `efectivo`, `tarjeta`, `transferencia`, `prepago`, `usuario_id_cierre`, `fecha_cierre`, `monto_cierre`, `venta`, `servicio`, `devolucion`, `iva`, `comision`, `propina`, `anticipo`, `estado`) VALUES
('487357d6-3b13-4508-b949-e753b8586993', '2026-03-16 16:01:14', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 1000, 0, 0, 0, 0, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', '2026-03-16 16:33:12', 0, 0, 0, 0, 0, 0, 0, 0, 0),
('f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-16 17:03:50', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 1000, 744000, 1853000, 546000, 299000, NULL, NULL, 0, 820000, 2540000, 0, 20000, 1138000, 82000, 0, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id_categoria` varchar(36) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
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
('0bd66edc-ac8b-4867-a864-42d4c6f2d673', '123467866', 'Ramon', 'Troncoso', '75695632', '2026-03-16 05:59:36', '2026-03-20 21:21:42', 1, 201000),
('47d1d2dd-a63e-4d55-8b30-91ead07ebd34', '10571425', 'Jhon Carlos', 'Ancasi Flores', '67909084', '2026-03-24 12:30:58', NULL, 1, 0),
('924503aa-3c67-45a0-9ab6-5a151d4eb6ce', '', 'Jose', 'López Pérez ', '', '2026-03-21 13:02:59', NULL, 1, 0);

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

--
-- Volcado de datos para la tabla `clientes_prepago_movimientos`
--

INSERT INTO `clientes_prepago_movimientos` (`id_movimiento`, `cliente_id`, `tipo`, `monto`, `metodo_pago`, `venta_id`, `usuario_id`, `fecha_crea`, `metadatos`) VALUES
('116f7d50-7ad9-4e5d-80a5-e4ee950d3d91', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', 'CONSUMO', 200000, NULL, NULL, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', '2026-03-23 12:35:41', NULL),
('31ccb824-1182-41ac-9a0f-1cdd0246332d', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', 'CARGA', 100000, 'tarjeta', NULL, NULL, '2026-03-21 13:42:55', NULL),
('6824278a-ebd2-439d-8755-d1ce7c76ceab', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', 'CARGA', 200000, 'efectivo', NULL, NULL, '2026-03-20 21:25:36', NULL),
('ab81355d-3d77-4b28-a496-fd07a8054faf', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', 'CARGA', 100000, 'mixto', NULL, NULL, '2026-03-21 13:47:52', NULL),
('ea1bd3d8-6309-41bc-a393-d4262ed6a47b', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', 'CONSUMO', 99000, NULL, 'bb337d49-1803-4f6c-b973-ed6fc6caa0e8', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', '2026-03-23 18:55:16', '{\"productos\":[{\"nombre\":\"José Cuervo\",\"cantidad\":3}],\"anfitrionas\":[\"Lizi\"]}'),
('ebdc0970-bdf4-4f69-9c7a-b1fdefefe1c5', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', 'CARGA', 100000, 'mixto', NULL, NULL, '2026-03-21 13:51:15', '{\"metodo_primario\":\"efectivo\",\"monto_primario\":50000,\"metodo_secundario\":\"transferencia\",\"monto_secundario\":50000}');

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

--
-- Volcado de datos para la tabla `comisiones`
--

INSERT INTO `comisiones` (`id_comision`, `venta_id`, `servicio_id`, `monto`, `estado`, `fecha_crea`, `fecha_mod`) VALUES
('0050da41-f614-454f-89a7-db8609daa7f1', NULL, '9284777c-56fd-411d-8884-60d0d6ec7053', 60000, 1, '2026-03-20 17:15:14', NULL),
('0db3db15-b4b9-47f7-b1ae-9c84e9dde919', 'eff92926-8098-4ae9-bbbe-24e3a9630a09', NULL, 14000, 1, '2026-03-23 18:28:26', NULL),
('10138167-00a0-49f0-bbdc-63b2fa9e4337', 'a504f5d5-7beb-45a8-b0fa-154f12122c2a', NULL, 7000, 1, '2026-03-19 12:35:49', NULL),
('1a311b53-9c23-47e5-a12b-8c48c5a74b9c', NULL, 'c0538b08-c466-4b50-9b04-fb266daed9dd', 50000, 1, '2026-03-23 11:56:39', NULL),
('2638670a-5542-4070-a837-6ec3c55fb3f7', NULL, '0b1a2375-899f-42d4-96e1-af852c0fd019', 60000, 1, '2026-03-20 15:30:19', NULL),
('2f513ea7-feca-46be-a302-8ae1c502c415', NULL, '2438c1b0-ac27-468a-8edc-2b188c52fa08', 60000, 1, '0000-00-00 00:00:00', NULL),
('4d432ef6-a03b-4ac5-bc6f-e9c8287f3cb0', 'd240ab0f-c941-40ef-93e2-3d31a8288318', NULL, 7000, 1, '2026-03-17 13:53:26', NULL),
('4e1dc20a-554d-48dd-997a-e02159820499', NULL, 'ae668372-16aa-47c4-800b-5dd51ea64a15', 60000, 1, '2026-03-19 18:39:10', NULL),
('58f97a5a-a61c-492a-a3b7-93c687c67cc9', NULL, '8b1cfa2c-9502-430c-a02d-5c417d568d2c', 60000, 1, '0000-00-00 00:00:00', NULL),
('5c04cf83-29cf-44f7-9f79-c5e63f4ae705', 'aa5a3815-0deb-42fb-bfd6-948742e98d85', NULL, 7000, 1, '2026-03-19 15:51:37', NULL),
('806262a4-e50e-4cd5-aead-3ec3f524dc7a', NULL, '11800fb7-7082-4816-bf13-1816ffe54c14', 110000, 1, '2026-03-20 05:20:04', NULL),
('8121e0eb-84b1-4a60-b99b-2714d2e76c96', 'a7d1a4d1-ab6d-4113-8508-15d5cf37c01b', NULL, 60000, 1, '2026-03-19 16:43:23', NULL),
('8fb34160-65ae-414e-80eb-f4881814a110', NULL, 'b8d3d8d4-2e97-42a7-ac70-a17bb100717e', 110000, 1, '2026-03-20 00:40:47', NULL),
('a3eeea37-db2f-4bbc-b72d-30909882b2e2', NULL, '2cf9f64a-dd93-45b4-8f66-b80d90dfc7e0', 60000, 1, '0000-00-00 00:00:00', NULL),
('ab299473-8c5f-4c4a-b8c9-8b5ad28c41b7', '34feb918-2a66-4a45-a43c-810228725621', NULL, 7000, 1, '2026-03-19 17:31:15', NULL),
('ab57accd-a6d0-4104-b2ef-c7ca89c33171', '9913a309-057f-47c2-a552-379846173a74', NULL, 7000, 1, '2026-03-19 16:04:54', NULL),
('b24e01ea-c84e-4a73-b8e2-1a6f360fc5f1', NULL, '4f1f0a89-f98d-469c-925d-0937a447be50', 60000, 1, '2026-03-20 16:30:17', NULL),
('bb863d1b-c4d6-4afb-838a-3cc00195e852', 'bb337d49-1803-4f6c-b973-ed6fc6caa0e8', NULL, 21000, 1, '0000-00-00 00:00:00', NULL),
('c0d09b38-8559-475e-b88c-ec36ef997144', '9742a646-671d-4b8c-ac75-40930f76cf00', NULL, 7000, 1, '2026-03-19 12:32:55', NULL),
('c50c2e2c-d442-4f5a-bb36-fda8ebede5f5', NULL, '79f75945-12e2-44ce-8007-8bfbde28ae02', 50000, 1, '0000-00-00 00:00:00', NULL),
('eb7fdfbf-6c3d-4a04-9702-36d6225b58c3', 'c9e5654c-bcf1-41f9-95de-8a784070375a', NULL, 7000, 1, '2026-03-17 12:29:37', NULL),
('eba0d2d6-c483-4083-8824-dc73c0decbdb', NULL, '707afd26-6f96-4607-9eeb-cd92b45d392b', 60000, 1, '0000-00-00 00:00:00', NULL),
('ece8f4e2-46b5-430e-84eb-eba34244084f', NULL, '9787efe1-7e81-4dc6-8963-914eac3fdc30', 60000, 1, '2026-03-20 00:40:02', NULL),
('f1c240ba-495e-458f-9ed8-334c7fdbb1aa', NULL, 'd896d094-f21e-42bd-9fc9-d3d0fe67c1b7', 60000, 1, '2026-03-20 15:41:47', NULL),
('f9160f09-3881-424a-8c4b-8dd6061606f4', NULL, '20d4c49b-38ab-4db0-a0f4-162f3532ba4b', 60000, 1, '2026-03-19 18:04:03', NULL),
('fdb3389c-f37b-4da2-bd28-7e4bc18f51c8', 'c972674f-c1de-4297-aac8-473893a0e28c', NULL, 14000, 1, '0000-00-00 00:00:00', NULL);

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

--
-- Volcado de datos para la tabla `cuentas`
--

INSERT INTO `cuentas` (`id_cuenta`, `codigo`, `cliente_id`, `total_comision`, `habitacion_id`, `sub_total`, `total`, `metodo_pago`, `pedido_id`, `servicio_id`, `fecha_crea`, `fecha_mod`, `estado`, `tiempo`, `created_by`, `cobrado_por`, `propina`, `push_notified_5m`, `push_notified_end`) VALUES
('154b6a4b-aade-4f70-a0ca-10a932d9e0af', '5JL1Q8ZA', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', 14000, 'd4288e9f-63e6-4b1d-8fa1-6670042e8827', 170000, 170000, NULL, NULL, NULL, '2026-03-23 17:58:17', '2026-03-23 18:28:26', 0, 5, NULL, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 0.00, 0, 0),
('9032b3df-1d9a-4743-9132-32ddc16f3e1b', 'VISY3AH9', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', 7000, 'd4288e9f-63e6-4b1d-8fa1-6670042e8827', 30000, 30000, NULL, NULL, NULL, '2026-03-23 16:17:07', NULL, 0, 5, NULL, NULL, 0.00, 0, 0),
('e12b7ce2-95b2-4ba5-99a6-bd00ca74ad1c', '74FORGST', '924503aa-3c67-45a0-9ab6-5a151d4eb6ce', 0, NULL, 40000, 40000, NULL, NULL, NULL, '2026-03-21 15:06:43', '2026-03-21 17:16:50', 0, 0, NULL, NULL, 0.00, 0, 0);

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

--
-- Volcado de datos para la tabla `cuentas_usuarios`
--

INSERT INTO `cuentas_usuarios` (`id_cuenta_usuario`, `cuenta_id`, `usuario_id`, `fecha_crea`) VALUES
('', '154b6a4b-aade-4f70-a0ca-10a932d9e0af', '9a4cd7c2-ab90-4d9a-936a-af4669416024', '0000-00-00 00:00:00'),
('f610b1d0-3a79-4eee-b95d-439477380027', '9032b3df-1d9a-4743-9132-32ddc16f3e1b', '9a4cd7c2-ab90-4d9a-936a-af4669416024', '0000-00-00 00:00:00');

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

--
-- Volcado de datos para la tabla `detalle_comisiones`
--

INSERT INTO `detalle_comisiones` (`id_detalle_comision`, `comision_id`, `usuario_id`, `comision`, `fecha_crea`, `fecha_mod`, `estado`) VALUES
('', 'f9160f09-3881-424a-8c4b-8dd6061606f4', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '2026-03-19 18:04:03', NULL, 1),
('12beff70-c4d5-4a6c-8def-bd8063baca58', 'b24e01ea-c84e-4a73-b8e2-1a6f360fc5f1', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '2026-03-20 16:30:17', NULL, 1),
('1a8c011c-3ea2-4b9d-ad3d-4dadbd16eeff', 'eba0d2d6-c483-4083-8824-dc73c0decbdb', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '0000-00-00 00:00:00', NULL, 1),
('1aa88398-c325-424c-96c4-20083e0e1957', '2f513ea7-feca-46be-a302-8ae1c502c415', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '0000-00-00 00:00:00', NULL, 1),
('2b632471-256a-408b-b120-1313da33c16f', '4d432ef6-a03b-4ac5-bc6f-e9c8287f3cb0', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 7000, '2026-03-17 13:53:26', NULL, 1),
('360530ba-8578-4189-8b16-925f268cd6ee', 'f1c240ba-495e-458f-9ed8-334c7fdbb1aa', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '2026-03-20 15:41:47', NULL, 1),
('38d70703-56c5-4bd2-bb34-f531eac0381d', '8fb34160-65ae-414e-80eb-f4881814a110', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 110000, '2026-03-20 00:40:47', NULL, 1),
('40eeb32d-dda3-4679-b320-1088abcb0a41', 'ab299473-8c5f-4c4a-b8c9-8b5ad28c41b7', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 7000, '2026-03-19 17:31:15', NULL, 1),
('4dc28a99-4bf3-467d-98f3-91e574335677', '8121e0eb-84b1-4a60-b99b-2714d2e76c96', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '2026-03-19 16:43:23', NULL, 1),
('5a3149ce-3cc1-4422-9142-794b410d4972', 'ece8f4e2-46b5-430e-84eb-eba34244084f', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '2026-03-20 00:40:02', NULL, 1),
('5bbc07ba-f863-46a1-99a6-81bb2607c418', 'c50c2e2c-d442-4f5a-bb36-fda8ebede5f5', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 50000, '0000-00-00 00:00:00', NULL, 1),
('61a2819f-f7e6-4310-af85-a62987f2d02b', 'ab57accd-a6d0-4104-b2ef-c7ca89c33171', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 7000, '2026-03-19 16:04:54', NULL, 1),
('67a26477-ebd0-4c0b-aca4-ee40096e17e3', '0db3db15-b4b9-47f7-b1ae-9c84e9dde919', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 14000, '2026-03-23 18:28:26', NULL, 1),
('6e0bab00-4cba-4472-ae02-00f48fe71a86', 'fdb3389c-f37b-4da2-bd28-7e4bc18f51c8', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 14000, '0000-00-00 00:00:00', NULL, 1),
('746f988f-237e-4a2a-be3d-a2eed4820b8b', '10138167-00a0-49f0-bbdc-63b2fa9e4337', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 7000, '2026-03-19 12:35:49', NULL, 1),
('81ceda88-bc4c-4f6a-b94f-ecedafcf2168', '0050da41-f614-454f-89a7-db8609daa7f1', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '2026-03-20 17:15:14', NULL, 1),
('abdd7af8-b6ff-4609-b679-1c9f1c40325b', 'bb863d1b-c4d6-4afb-838a-3cc00195e852', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 21000, '0000-00-00 00:00:00', NULL, 1),
('af8367e1-98ac-4a79-91ac-df5262ca6681', 'eb7fdfbf-6c3d-4a04-9702-36d6225b58c3', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 7000, '2026-03-17 12:29:37', NULL, 1),
('b7a52ef7-b244-4b4f-b2bb-39faadbbe0d1', '2638670a-5542-4070-a837-6ec3c55fb3f7', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '2026-03-20 15:30:19', NULL, 1),
('ba9b5077-f2d6-40f6-9e71-7f424ef8774f', '58f97a5a-a61c-492a-a3b7-93c687c67cc9', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '0000-00-00 00:00:00', NULL, 1),
('bb3ab82c-77d3-4db1-bfa9-790a16eabc40', '1a311b53-9c23-47e5-a12b-8c48c5a74b9c', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 50000, '2026-03-23 11:56:39', NULL, 1),
('d84ee700-f1cf-4000-9fa2-d044e1fcb752', '806262a4-e50e-4cd5-aead-3ec3f524dc7a', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 110000, '2026-03-20 05:20:04', NULL, 1),
('d94ee24c-ea19-495a-a829-a68aa9cf3b89', 'a3eeea37-db2f-4bbc-b72d-30909882b2e2', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '0000-00-00 00:00:00', NULL, 1),
('e4be0f59-45ab-42f3-8ba4-9c119a0d4714', '5c04cf83-29cf-44f7-9f79-c5e63f4ae705', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 7000, '2026-03-19 15:51:37', NULL, 1),
('e7d0d0de-35d6-4a94-8020-5e24266cbc0a', 'c0d09b38-8559-475e-b88c-ec36ef997144', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 7000, '2026-03-19 12:32:55', NULL, 1),
('e7f7a7b1-e9c5-4259-9e55-c2609c1f29e6', '4e1dc20a-554d-48dd-997a-e02159820499', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000, '2026-03-19 18:39:10', NULL, 1);

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

--
-- Volcado de datos para la tabla `detalle_cuentas`
--

INSERT INTO `detalle_cuentas` (`id_detalle_cuenta`, `cuenta_id`, `producto_id`, `precio`, `cantidad`, `sub_total`, `comision`, `hostess_id`, `fecha_crea`, `created_by`) VALUES
('', 'e12b7ce2-95b2-4ba5-99a6-bd00ca74ad1c', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 1, 10000, 0, NULL, '2026-03-21 15:13:07', NULL),
('109574a6-2c50-4cf7-9d73-17793d17a2b6', 'e12b7ce2-95b2-4ba5-99a6-bd00ca74ad1c', '5c4a9d31-dcfa-4713-9fd9-fcf20856861d', 10000, 2, 20000, 0, NULL, '2026-03-21 15:06:43', NULL),
('449008cd-68de-4a33-b5a4-9a5d8ee29150', 'e12b7ce2-95b2-4ba5-99a6-bd00ca74ad1c', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 1, 10000, 0, NULL, '2026-03-21 15:06:43', NULL),
('45efa446-c5aa-4311-af05-45399da97097', '154b6a4b-aade-4f70-a0ca-10a932d9e0af', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 1, 30000, 7000, '9a4cd7c2-ab90-4d9a-936a-af4669416024', '2026-03-23 16:43:07', NULL),
('4e530c53-f5a5-4900-9400-e3af530b9d90', '154b6a4b-aade-4f70-a0ca-10a932d9e0af', '5c4a9d31-dcfa-4713-9fd9-fcf20856861d', 10000, 1, 10000, 0, NULL, '2026-03-23 18:07:25', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e'),
('5db5edc7-3938-490b-af81-71967c754419', '9032b3df-1d9a-4743-9132-32ddc16f3e1b', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 1, 30000, 7000, '9a4cd7c2-ab90-4d9a-936a-af4669416024', '2026-03-23 16:17:07', NULL),
('61b5623b-5b58-4324-af7a-3cf2951f24a8', '154b6a4b-aade-4f70-a0ca-10a932d9e0af', '5c4a9d31-dcfa-4713-9fd9-fcf20856861d', 10000, 3, 30000, 0, NULL, '2026-03-23 17:57:51', NULL),
('6f952ce0-797e-4deb-8715-447840f50480', '154b6a4b-aade-4f70-a0ca-10a932d9e0af', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 2, 20000, 0, NULL, '2026-03-23 18:10:45', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e'),
('96464f42-c5b0-4a10-9769-6eb7a5a40d04', '154b6a4b-aade-4f70-a0ca-10a932d9e0af', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 1, 30000, 7000, '9a4cd7c2-ab90-4d9a-936a-af4669416024', '2026-03-23 17:58:17', NULL),
('9f31460a-56b5-4a56-9171-6eedf1b24151', '154b6a4b-aade-4f70-a0ca-10a932d9e0af', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 1, 10000, 0, NULL, '2026-03-23 18:07:25', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e'),
('f88ac36f-6866-4959-8b17-518854ff387e', '154b6a4b-aade-4f70-a0ca-10a932d9e0af', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 4, 40000, 0, NULL, '2026-03-23 18:04:18', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e');

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

--
-- Volcado de datos para la tabla `detalle_pedidos`
--

INSERT INTO `detalle_pedidos` (`id_detalle_pedido`, `pedido_id`, `producto_id`, `precio`, `comision`, `genera_comision`, `hostess_id`, `habitacion_id`, `cantidad`, `subtotal`, `fecha_crea`) VALUES
('0f27039e-996a-4a2a-8ab7-72233410249c', 'ad16d85e-56f4-4869-b273-a245f9b8a9cc', '5c4a9d31-dcfa-4713-9fd9-fcf20856861d', 10000, 0, 0, NULL, NULL, 1, 10000, '2026-03-23 06:56:22'),
('42582e8c-bab4-401c-9fcf-7ca3f327dbbc', 'a3d5fc67-ada5-46d8-a4c1-48fdccc94dd6', '5c4a9d31-dcfa-4713-9fd9-fcf20856861d', 10000, 0, 0, NULL, NULL, 2, 20000, '2026-03-23 06:48:24'),
('5a475303-31e8-44c5-a950-0de5ac9466d4', 'a3d5fc67-ada5-46d8-a4c1-48fdccc94dd6', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 0, 0, NULL, NULL, 2, 20000, '2026-03-23 06:48:24'),
('e8fe2924-b811-4496-9f5a-22f4444ad6ec', 'ad16d85e-56f4-4869-b273-a245f9b8a9cc', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 0, 0, NULL, NULL, 1, 10000, '2026-03-23 06:56:22');

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

--
-- Volcado de datos para la tabla `detalle_pedidos_anfitrionas`
--

INSERT INTO `detalle_pedidos_anfitrionas` (`id_detalle_anfitriona`, `detalle_pedido_id`, `anfitriona_id`, `fecha_crea`) VALUES
('23af3c56-18e9-4805-85ad-3b8d1fcd989f', 0, 9, '2026-03-19 04:47:34'),
('2e9e6d59-a4ca-40fd-b2c8-a46eeb63e110', 2147483647, 9, '2026-03-19 16:42:24'),
('402e0df6-7184-478b-b688-ae1661df8798', 871, 9, '2026-03-19 15:51:22'),
('6de86b39-0f10-4ee3-8575-8b5a54dc2986', 0, 9, '0000-00-00 00:00:00'),
('879ec399-098d-4642-a1b2-c09f5ff82f35', 0, 9, '2026-03-16 17:55:11'),
('9ffcc512-6422-4eb7-8aff-d226022abdd0', 0, 9, '2026-03-19 16:02:35'),
('edcf84c1-da62-48c5-8efb-ec13300988e5', 44, 9, '2026-03-19 12:33:59');

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

--
-- Volcado de datos para la tabla `detalle_propinas`
--

INSERT INTO `detalle_propinas` (`id_detalle_propina`, `propina_id`, `usuario_id`, `monto`, `fecha_crea`, `fecha_mod`, `estado`) VALUES
('0e7da072-42a2-4b21-a181-5566ece6ee0f', '7427bd44-fd07-4d71-b2e8-50481a89145c', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 1500, '2026-03-19 17:31:15', NULL, 1),
('16e1acce-762d-4c4f-9d6e-0ce414433254', '6642b56e-36dd-43f5-91e8-3aca956dc266', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 8500, '2026-03-23 18:28:26', NULL, 1),
('19e903fe-6576-4a31-98f9-891d51b053c1', '1d305143-89aa-4e3c-b786-0d77ed542e2d', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 1500, '2026-03-19 16:04:54', NULL, 1),
('1b1579b1-caa6-4285-9ca6-13050b6e2ba0', '0f161ffd-c13e-41c5-a422-3d2755379fac', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 1500, '2026-03-17 13:53:26', NULL, 1),
('243f728f-3b50-4a5f-b9cf-f2880ca6c12a', 'ee14813f-6171-4353-9bfe-f7675200d039', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 2000, '2026-03-21 17:16:50', NULL, 1),
('29b4b9c0-49c6-4d67-bcc6-a5da8875f2d8', '4f2f5ffa-efa2-479d-83b1-4d7742dd0938', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 1500, '2026-03-19 15:51:37', NULL, 1),
('3f0775f4-5d1d-4f42-bc3f-39bb14bf7446', '68ed8419-6027-45b9-a564-0f66192804b0', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 1500, '2026-03-17 12:29:37', NULL, 1),
('50375b0e-13f4-4b43-b8b0-dbe3e1e21bee', '4c9cb886-f717-45d9-a792-c8c59b54aca5', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 4500, '0000-00-00 00:00:00', NULL, 1),
('565142c7-402d-4073-8490-1e401a5281b7', '24dcc797-d88d-496b-885e-7f9d5515c163', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 1500, '2026-03-19 12:32:55', NULL, 1),
('604c7151-b85c-4a4d-823d-f0c0898a0dd9', '96b13f70-281b-47a4-8e46-788fa47295ad', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 3000, '2026-03-19 12:35:49', NULL, 1),
('6357c28b-e58b-4a40-9ec7-b7857401afe5', '0f161ffd-c13e-41c5-a422-3d2755379fac', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 1500, '2026-03-17 13:53:26', NULL, 1),
('6390dfa3-59a8-4999-b457-9e11573bb962', '07a86187-201f-459f-8ce0-105521ae9ceb', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 1000, '2026-03-16 16:21:54', NULL, 1),
('6a1421bc-380b-4885-b8ef-d4cc839b843c', 'e317679a-b449-486e-a036-0815eaa147db', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 2000, '2026-03-17 12:28:10', NULL, 1),
('83e6beb2-a7bc-4514-b093-b18a4f1900e1', '9f817507-1258-4b0a-aad5-9d0c80d10394', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 8000, '2026-03-19 16:43:23', NULL, 1),
('86882e2e-6c40-4b94-858f-9b47da6ad9a6', '9f817507-1258-4b0a-aad5-9d0c80d10394', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 8000, '2026-03-19 16:43:23', NULL, 1),
('8ce7caa8-0525-48d1-8800-fabf609ac00c', '24dcc797-d88d-496b-885e-7f9d5515c163', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 1500, '2026-03-19 12:32:55', NULL, 1),
('96a5d0e3-1421-4b69-a72c-78b6bfd0e1cd', 'ee14813f-6171-4353-9bfe-f7675200d039', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 2000, '2026-03-21 17:16:50', NULL, 1),
('aac96bbb-2d63-4b0e-a690-0238801de5ed', 'e317679a-b449-486e-a036-0815eaa147db', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 2000, '2026-03-17 12:28:10', NULL, 1),
('adaf598f-a76d-4171-9358-12ca2ec0028f', '6642b56e-36dd-43f5-91e8-3aca956dc266', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 8500, '2026-03-23 18:28:26', NULL, 1),
('b440ecf2-5633-4475-9b14-49eb1caf3d4c', '07a86187-201f-459f-8ce0-105521ae9ceb', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 1000, '2026-03-16 16:21:54', NULL, 1),
('c9dde4d5-e09c-494c-8359-d10ce6d9aefb', '96b13f70-281b-47a4-8e46-788fa47295ad', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 3000, '2026-03-19 12:35:49', NULL, 1),
('ca79cc5e-a8c6-42df-8b23-921cabbacd03', '1d305143-89aa-4e3c-b786-0d77ed542e2d', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 1500, '2026-03-19 16:04:54', NULL, 1),
('cd197a48-8a54-40f2-bf6e-7c6aafd5fdf2', '4f2f5ffa-efa2-479d-83b1-4d7742dd0938', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 1500, '2026-03-19 15:51:37', NULL, 1),
('cef5084f-052f-439a-b182-2e86f87f7a97', 'a6cf83ef-665a-4891-af13-d98441ae56c0', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 3000, '0000-00-00 00:00:00', NULL, 1),
('d0991c5b-9347-4d4e-8a6f-e93987104dec', 'a6cf83ef-665a-4891-af13-d98441ae56c0', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 3000, '0000-00-00 00:00:00', NULL, 1),
('d6f377c4-e5b7-41dd-95f0-ca208a20b50f', '68ed8419-6027-45b9-a564-0f66192804b0', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 1500, '2026-03-17 12:29:37', NULL, 1),
('dca04493-c8d6-4756-a070-e77d8abfa09e', '4c9cb886-f717-45d9-a792-c8c59b54aca5', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 4500, '0000-00-00 00:00:00', NULL, 1),
('dd44dacc-bee3-401b-8a5a-c3bc85b9d376', '7427bd44-fd07-4d71-b2e8-50481a89145c', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 1500, '2026-03-19 17:31:15', NULL, 1);

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

--
-- Volcado de datos para la tabla `detalle_servicios`
--

INSERT INTO `detalle_servicios` (`id_detalle_servicio`, `usuario_id`, `comision`, `servicio_id`, `fecha_crea`) VALUES
('', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000.00, '20d4c49b-38ab-4db0-a0f4-162f3532ba4b', '2026-03-19 18:04:03'),
('1de40b0a-dadd-4819-83e5-4c27abd02243', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000.00, '8b1cfa2c-9502-430c-a02d-5c417d568d2c', '0000-00-00 00:00:00'),
('4535877d-0bae-4346-80c1-c3bbef28f420', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000.00, '707afd26-6f96-4607-9eeb-cd92b45d392b', '0000-00-00 00:00:00'),
('5ac2e2fa-3bf8-4b71-9472-2d256d763bb0', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000.00, '2cf9f64a-dd93-45b4-8f66-b80d90dfc7e0', '0000-00-00 00:00:00'),
('5b4f422e-0f82-4ce0-b59b-1ea930294680', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 0.00, 'b8d3d8d4-2e97-42a7-ac70-a17bb100717e', '2026-03-20 00:40:47'),
('68dc9440-5627-46ab-9005-1311b23ded8c', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 50000.00, 'c0538b08-c466-4b50-9b04-fb266daed9dd', '0000-00-00 00:00:00'),
('7fb311a1-ee97-4eb3-b34d-ff789b5f4fac', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 0.00, '11800fb7-7082-4816-bf13-1816ffe54c14', '0000-00-00 00:00:00'),
('87c9c15e-087a-4620-af14-948775c19347', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000.00, '2438c1b0-ac27-468a-8edc-2b188c52fa08', '0000-00-00 00:00:00'),
('8a40c3b9-86f4-47c2-bf9e-cef89c9716ae', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000.00, 'd896d094-f21e-42bd-9fc9-d3d0fe67c1b7', '0000-00-00 00:00:00'),
('8e7bd420-2e37-4a4d-9175-cfa80a7a1727', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000.00, '9284777c-56fd-411d-8884-60d0d6ec7053', '0000-00-00 00:00:00'),
('9ebda183-dfb7-4374-b87a-1864071e48dd', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000.00, '9787efe1-7e81-4dc6-8963-914eac3fdc30', '2026-03-20 00:40:02'),
('c7800e92-8d58-4e93-abdf-f0789c184526', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 50000.00, '79f75945-12e2-44ce-8007-8bfbde28ae02', '0000-00-00 00:00:00'),
('d36bd09d-43ca-4fc7-af51-87b741d67315', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000.00, '0b1a2375-899f-42d4-96e1-af852c0fd019', '0000-00-00 00:00:00'),
('e0abd776-fc0e-4b76-a85c-47f69ce6e3da', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000.00, '4f1f0a89-f98d-469c-925d-0937a447be50', '0000-00-00 00:00:00'),
('e1fd5f2c-3ac4-493b-a017-cc0dd5f56564', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 60000.00, 'ae668372-16aa-47c4-800b-5dd51ea64a15', '2026-03-19 18:39:10');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_servicios_clientes`
--

CREATE TABLE `detalle_servicios_clientes` (
  `id` varchar(36) NOT NULL,
  `servicio_id` varchar(36) DEFAULT NULL,
  `cliente_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `detalle_servicios_clientes`
--

INSERT INTO `detalle_servicios_clientes` (`id`, `servicio_id`, `cliente_id`) VALUES
('', '20d4c49b-38ab-4db0-a0f4-162f3532ba4b', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('041682ef-bfc8-480a-ac5c-f3d81eae890f', '11800fb7-7082-4816-bf13-1816ffe54c14', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('3c34fad1-a27a-40b4-8241-c6981f7717a3', '0b1a2375-899f-42d4-96e1-af852c0fd019', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('44367f00-e472-4ec1-90ac-7413b98afbf4', '2cf9f64a-dd93-45b4-8f66-b80d90dfc7e0', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('471bc8df-b7c0-403d-9480-3fc5a6577faa', '9284777c-56fd-411d-8884-60d0d6ec7053', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('4fdb7549-cac3-4cc1-b5de-d58adcb36580', 'd896d094-f21e-42bd-9fc9-d3d0fe67c1b7', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('6592da2c-df3c-4391-a0d2-b5ec060857a4', 'c0538b08-c466-4b50-9b04-fb266daed9dd', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('6dde2e6a-b479-4aee-b5f7-2db4b1b21011', '8b1cfa2c-9502-430c-a02d-5c417d568d2c', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('88b22515-2596-4906-b98e-4ac80c32e1d4', '4f1f0a89-f98d-469c-925d-0937a447be50', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('bfbbb10c-7202-420c-b887-7a6902c08a4d', 'ae668372-16aa-47c4-800b-5dd51ea64a15', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('db27268b-72c1-4b38-bce0-30db1f9a0282', '2438c1b0-ac27-468a-8edc-2b188c52fa08', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('de63a863-b3b5-472d-98c8-532869d0c602', '79f75945-12e2-44ce-8007-8bfbde28ae02', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('e8eb803d-b690-46d4-ae00-2bc84bb2a906', '9787efe1-7e81-4dc6-8963-914eac3fdc30', '0bd66edc-ac8b-4867-a864-42d4c6f2d673'),
('ea2d5887-4dea-4eab-8ebf-506cfd26245e', '707afd26-6f96-4607-9eeb-cd92b45d392b', '0bd66edc-ac8b-4867-a864-42d4c6f2d673');

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

--
-- Volcado de datos para la tabla `detalle_ventas`
--

INSERT INTO `detalle_ventas` (`id_detalle_venta`, `venta_id`, `producto_id`, `precio`, `comision`, `hostess_id`, `cantidad`, `sub_total`, `fecha_crea`) VALUES
('2cb89551-56ed-47e7-bb22-340f2224d94e', 'a8536397-0f24-463d-8be8-dfcb8944a173', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 0, NULL, 1, 10000, '0000-00-00 00:00:00'),
('3cf59403-d183-44f2-b6f3-8199fef112b1', 'eff92926-8098-4ae9-bbbe-24e3a9630a09', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 7000, '9a4cd7c2-ab90-4d9a-936a-af4669416024', 1, 30000, '0000-00-00 00:00:00'),
('40409fb4-ffbd-4062-9255-06a82242f30e', 'c972674f-c1de-4297-aac8-473893a0e28c', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 7000, NULL, 2, 60000, '0000-00-00 00:00:00'),
('50e6c23f-d149-44b5-87f1-d2c88fb8865b', 'aa5a3815-0deb-42fb-bfd6-948742e98d85', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 7000, '9a4cd7c2-ab90-4d9a-936a-af4669416024', 1, 30000, '2026-03-19 15:51:37'),
('53240b03-6cd0-46ba-b532-137238d82967', '9913a309-057f-47c2-a552-379846173a74', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 7000, '9a4cd7c2-ab90-4d9a-936a-af4669416024', 1, 30000, '2026-03-19 16:04:54'),
('578fd79d-b268-40f2-9695-5325750773a0', 'eff92926-8098-4ae9-bbbe-24e3a9630a09', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 0, NULL, 4, 40000, '0000-00-00 00:00:00'),
('57a94aaa-2258-4889-ab01-a98ec572f587', 'fb8de97f-50a8-455c-82dd-1871b85beee8', '5c4a9d31-dcfa-4713-9fd9-fcf20856861d', 10000, 0, NULL, 1, 10000, '2026-03-16 16:21:54'),
('5d33a82c-03a0-4360-ad73-1b15ea79ff49', '34feb918-2a66-4a45-a43c-810228725621', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 7000, NULL, 1, 30000, '2026-03-19 17:31:15'),
('6f567cd0-b969-462c-b23e-0793d6f01689', 'a8536397-0f24-463d-8be8-dfcb8944a173', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 0, NULL, 1, 10000, '0000-00-00 00:00:00'),
('768f7edb-50d3-4da6-8772-3a75c244d568', 'd240ab0f-c941-40ef-93e2-3d31a8288318', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 7000, '9a4cd7c2-ab90-4d9a-936a-af4669416024', 1, 30000, '2026-03-17 13:53:26'),
('848aaea7-a580-4a13-9834-467ca1566749', 'eff92926-8098-4ae9-bbbe-24e3a9630a09', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 7000, '9a4cd7c2-ab90-4d9a-936a-af4669416024', 1, 30000, '0000-00-00 00:00:00'),
('a09c51f8-3f60-4ea7-b99f-c8f762acf3ee', 'a7d1a4d1-ab6d-4113-8508-15d5cf37c01b', '7c19165b-4044-4713-8f53-8f54dcb7da8f', 160000, 60000, '9a4cd7c2-ab90-4d9a-936a-af4669416024', 1, 160000, '2026-03-19 16:43:23'),
('a8253d18-5562-405f-8413-2aea657bf87f', 'fb8de97f-50a8-455c-82dd-1871b85beee8', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 0, NULL, 1, 10000, '2026-03-16 16:21:54'),
('b0690449-060a-45d2-9a82-59e01b2bc0b2', 'c9e5654c-bcf1-41f9-95de-8a784070375a', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 7000, NULL, 1, 30000, '2026-03-17 12:29:37'),
('b4e4bee2-cd0a-4d82-a852-b7951d907be8', 'eff92926-8098-4ae9-bbbe-24e3a9630a09', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 0, NULL, 1, 10000, '0000-00-00 00:00:00'),
('b77ed8d3-794c-4a67-aefe-2049f9ab087c', '8a3bd946-b08f-4cfa-be1d-0c0556faf054', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 0, NULL, 2, 20000, '2026-03-17 12:28:10'),
('cd062ab0-00c2-495e-b0b5-93c49585de68', 'eff92926-8098-4ae9-bbbe-24e3a9630a09', '620e56b3-ca46-4733-8805-0053d4a2d7b4', 10000, 0, NULL, 2, 20000, '0000-00-00 00:00:00'),
('d56fda64-1ebd-42d0-a949-a8048b76f767', '9742a646-671d-4b8c-ac75-40930f76cf00', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 7000, '9a4cd7c2-ab90-4d9a-936a-af4669416024', 1, 30000, '2026-03-19 12:32:55'),
('e3b07d4d-8702-4313-9788-dad3af36596f', 'a504f5d5-7beb-45a8-b0fa-154f12122c2a', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 3500, '9a4cd7c2-ab90-4d9a-936a-af4669416024', 2, 60000, '2026-03-19 12:35:49'),
('f10992af-209c-40bc-8fd5-f22041aecff4', 'bb337d49-1803-4f6c-b973-ed6fc6caa0e8', 'b21f60c6-4c50-4bff-8293-5871f9847b35', 30000, 7000, NULL, 3, 90000, '0000-00-00 00:00:00'),
('f5f31789-b4d3-4433-9b92-6338c3850ec2', 'a8536397-0f24-463d-8be8-dfcb8944a173', '5c4a9d31-dcfa-4713-9fd9-fcf20856861d', 10000, 0, NULL, 2, 20000, '0000-00-00 00:00:00'),
('f7aef0fd-e72c-4221-b621-395317fe63c5', 'eff92926-8098-4ae9-bbbe-24e3a9630a09', '5c4a9d31-dcfa-4713-9fd9-fcf20856861d', 10000, 0, NULL, 3, 30000, '0000-00-00 00:00:00'),
('f7dab3d1-fc69-4a59-9a59-76f9b8927406', '8a3bd946-b08f-4cfa-be1d-0c0556faf054', '5c4a9d31-dcfa-4713-9fd9-fcf20856861d', 10000, 0, NULL, 2, 20000, '2026-03-17 12:28:10'),
('fbb20095-598e-44f2-b56c-3a98b8fef5e9', 'eff92926-8098-4ae9-bbbe-24e3a9630a09', '5c4a9d31-dcfa-4713-9fd9-fcf20856861d', 10000, 0, NULL, 1, 10000, '0000-00-00 00:00:00');

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

--
-- Volcado de datos para la tabla `gratificaciones`
--

INSERT INTO `gratificaciones` (`id`, `fecha_hora`, `usuario_id`, `monto`, `descripcion`, `estado`, `fecha_crea`, `fecha_mod`) VALUES
('633a64d8-0a69-45d7-818f-df984e7a4c98', '2026-03-23 06:11:44', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 6000.00, 'Asistencia atrasada', 1, '2026-03-23 06:11:44', NULL),
('6d8fe18b-2d49-49ed-9efd-04b521510ecc', '2026-03-23 06:55:32', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 6000.00, 'Gratificacion por puntualidad', 1, '2026-03-23 06:55:32', NULL),
('8aac38cb-a113-4764-bd79-bf9126234984', '2026-03-23 06:52:41', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', 10000.00, 'Sfsdfsdf', 1, '2026-03-23 06:52:41', NULL);

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

--
-- Volcado de datos para la tabla `horas_extras`
--

INSERT INTO `horas_extras` (`id_hora_extra`, `usuario_id`, `hora`, `monto`, `total`, `fecha_crea`, `fecha_mod`, `estado`) VALUES
('9396738b-1a02-432d-90ca-d9bda96a0ff5', '3f9041fd-ed80-4b46-a586-d0d1093592d9', 5, 5000, 25000, '2026-03-17 12:17:13', NULL, 1);

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
('03c22231-d42d-45b9-bc51-628e1d41b3e6', '3f9041fd-ed80-4b46-a586-d0d1093592d9', '2026-03-23 05:53:20', 1, '192.168.0.6', 0),
('521f14a3-8ddd-4be4-bb7e-e365e64710d2', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', '2026-03-23 05:52:32', 1, '192.168.0.4', 0),
('c7899e12-3244-44e3-b3ea-4f3354bdac60', 'c9208906-2685-4861-9c50-ba554917850a', '2026-03-24 13:47:41', 1, '127.0.0.1', 0),
('f656be5a-c342-4d0c-812f-0a89b1f40a44', '9a4cd7c2-ab90-4d9a-936a-af4669416024', '2026-03-20 10:23:35', 1, '192.168.0.6', 0);

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

--
-- Volcado de datos para la tabla `pedidos`
--

INSERT INTO `pedidos` (`id_pedido`, `codigo`, `mesero_id`, `cliente_id`, `subtotal`, `total`, `propina`, `total_comision`, `fecha_crea`, `fecha_mod`, `fecha_baja`, `estado`) VALUES
('a3d5fc67-ada5-46d8-a4c1-48fdccc94dd6', 'P34P5PK1', '3f9041fd-ed80-4b46-a586-d0d1093592d9', NULL, 40000, 40000, 4000, 0, '2026-03-23 06:48:24', NULL, NULL, 1),
('ad16d85e-56f4-4869-b273-a245f9b8a9cc', 'UYU02KQM', '3f9041fd-ed80-4b46-a586-d0d1093592d9', NULL, 20000, 20000, 2000, 0, '2026-03-23 06:56:22', NULL, NULL, 1);

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

--
-- Volcado de datos para la tabla `propinas`
--

INSERT INTO `propinas` (`id_propina`, `venta_id`, `propina`, `fecha_crea`, `fecha_mod`, `estado`) VALUES
('07a86187-201f-459f-8ce0-105521ae9ceb', 'fb8de97f-50a8-455c-82dd-1871b85beee8', 2000, '2026-03-16 16:21:54', NULL, 1),
('0f161ffd-c13e-41c5-a422-3d2755379fac', 'd240ab0f-c941-40ef-93e2-3d31a8288318', 3000, '2026-03-17 13:53:26', NULL, 1),
('1d305143-89aa-4e3c-b786-0d77ed542e2d', '9913a309-057f-47c2-a552-379846173a74', 3000, '2026-03-19 16:04:54', NULL, 1),
('24dcc797-d88d-496b-885e-7f9d5515c163', '9742a646-671d-4b8c-ac75-40930f76cf00', 3000, '2026-03-19 12:32:55', NULL, 1),
('4c9cb886-f717-45d9-a792-c8c59b54aca5', 'bb337d49-1803-4f6c-b973-ed6fc6caa0e8', 9000, '0000-00-00 00:00:00', NULL, 1),
('4f2f5ffa-efa2-479d-83b1-4d7742dd0938', 'aa5a3815-0deb-42fb-bfd6-948742e98d85', 3000, '2026-03-19 15:51:37', NULL, 1),
('6642b56e-36dd-43f5-91e8-3aca956dc266', 'eff92926-8098-4ae9-bbbe-24e3a9630a09', 17000, '2026-03-23 18:28:26', NULL, 1),
('68ed8419-6027-45b9-a564-0f66192804b0', 'c9e5654c-bcf1-41f9-95de-8a784070375a', 3000, '2026-03-17 12:29:37', NULL, 1),
('7427bd44-fd07-4d71-b2e8-50481a89145c', '34feb918-2a66-4a45-a43c-810228725621', 3000, '2026-03-19 17:31:15', NULL, 1),
('96b13f70-281b-47a4-8e46-788fa47295ad', 'a504f5d5-7beb-45a8-b0fa-154f12122c2a', 6000, '2026-03-19 12:35:49', NULL, 1),
('9f817507-1258-4b0a-aad5-9d0c80d10394', 'a7d1a4d1-ab6d-4113-8508-15d5cf37c01b', 16000, '2026-03-19 16:43:23', NULL, 1),
('a6cf83ef-665a-4891-af13-d98441ae56c0', 'c972674f-c1de-4297-aac8-473893a0e28c', 6000, '0000-00-00 00:00:00', NULL, 1),
('e317679a-b449-486e-a036-0815eaa147db', '8a3bd946-b08f-4cfa-be1d-0c0556faf054', 4000, '2026-03-17 12:28:10', NULL, 1),
('ee14813f-6171-4353-9bfe-f7675200d039', 'a8536397-0f24-463d-8be8-dfcb8944a173', 4000, '2026-03-21 17:16:50', NULL, 1);

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

--
-- Volcado de datos para la tabla `servicios`
--

INSERT INTO `servicios` (`id_servicio`, `codigo`, `cliente_id`, `habitacion_id`, `precio_habitacion`, `precio_servicio`, `iva`, `sub_total`, `total`, `tiempo`, `metodo_pago`, `caja_id`, `fecha_crea`, `fecha_mod`, `estado`, `created_by`, `paused_at`, `push_notified_5m`, `push_notified_end`) VALUES
('0b1a2375-899f-42d4-96e1-af852c0fd019', '2FQT3WIO', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 200000, 0, 0, 200000, 200000, 5, 'tarjeta', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-20 15:44:12', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('11800fb7-7082-4816-bf13-1816ffe54c14', 'VPZFW5K6', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 30000, 50000, 10000, 80000, 90000, 5, 'tarjeta', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-20 05:42:34', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('20d4c49b-38ab-4db0-a0f4-162f3532ba4b', 'MR06H4Y5', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 200000, 0, 0, 200000, 200000, 5, 'tarjeta', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-19 18:24:19', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('2438c1b0-ac27-468a-8edc-2b188c52fa08', 'PO63SDDN', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 200000, 0, 0, 200000, 200000, 5, 'transferencia', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-20 05:54:15', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('2cf9f64a-dd93-45b4-8f66-b80d90dfc7e0', 'UQTS5197', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 200000, 0, 0, 200000, 200000, 5, 'tarjeta', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-20 05:30:50', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('4f1f0a89-f98d-469c-925d-0937a447be50', 'MLDY6DSZ', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 200000, 0, 0, 200000, 200000, 5, 'tarjeta', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-20 16:30:17', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('707afd26-6f96-4607-9eeb-cd92b45d392b', 'V9WODIBW', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 200000, 0, 0, 200000, 200000, 5, 'efectivo', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-20 05:40:43', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('79f75945-12e2-44ce-8007-8bfbde28ae02', '5LP446VU', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 30000, 50000, 10000, 80000, 90000, 5, 'tarjeta', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-20 17:15:52', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('8b1cfa2c-9502-430c-a02d-5c417d568d2c', 'UU3GD616', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 200000, 0, 0, 200000, 200000, 5, 'prepago', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-23 12:35:41', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('9284777c-56fd-411d-8884-60d0d6ec7053', 'IUCZ5WNH', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 200000, 0, 0, 200000, 200000, 5, 'tarjeta', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-20 17:20:18', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('9787efe1-7e81-4dc6-8963-914eac3fdc30', 'P7Q8FGBJ', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 200000, 0, 0, 200000, 200000, 5, 'transferencia', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '0000-00-00 00:00:00', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', '2026-03-20 05:13:32', 0, 0),
('ae668372-16aa-47c4-800b-5dd51ea64a15', 'IR8FH4I5', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 200000, 0, 0, 200000, 200000, 5, 'tarjeta', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-19 18:55:20', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('b8d3d8d4-2e97-42a7-ac70-a17bb100717e', 'LWUBP5WW', NULL, '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 30000, 50000, 0, 80000, 80000, 10, 'transferencia', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-20 00:56:25', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('c0538b08-c466-4b50-9b04-fb266daed9dd', 'W9RUV8RX', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '64c46699-e58f-4e7a-9e62-25d615720a70', 30000, 50000, 0, 80000, 80000, 15, 'prepago', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-23 11:56:39', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0),
('d896d094-f21e-42bd-9fc9-d3d0fe67c1b7', 'WQREJ60H', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', '473d17c6-a8a5-4488-9ea3-8280cf4bffd1', 200000, 0, 0, 200000, 200000, 5, 'efectivo', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '2026-03-20 15:46:51', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 0, 0);

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

--
-- Volcado de datos para la tabla `servicio_logs`
--

INSERT INTO `servicio_logs` (`id`, `servicio_id`, `tipo_evento`, `descripcion`, `fecha_crea`, `usuario_id`) VALUES
('', '9787efe1-7e81-4dc6-8963-914eac3fdc30', 'PAUSA', 'Servicio pausado automáticamente por inicio de servicio temporal (consumo/champaña).', '2026-03-20 00:40:47', 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e');

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
('3092922f-0287-4b4c-bc83-3a17d0a83865', '987654321', 'Naty', 'Natalia', 'Salas', 'Av/colon', '78965423', 'Soltero/a', 'AFP', 1000, 10000, 600, 'Naty@lasmuñecasderamon.com', '$2b$10$2pZz0QQRH4iRMELfWzsJ/udXmj5rKh3zpTjwtf2IbEmXonxUv1bfO', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'default.png', 1, 1, '0000-00-00 00:00:00', NULL, NULL, NULL, NULL),
('3f9041fd-ed80-4b46-a586-d0d1093592d9', '123456789', 'Sebas', 'Sebastian', 'Mendoza Lopez', 'Av/colon', '75452636', 'Soltero/a', 'AFP', 1000, 15000, 0, 'Sebas@lasmuñecasderamon.com', '$2b$10$La0XcXHc2gZeEv4s3PovQOFMlppejKE1PI1G.fcphGWoBGiyu77cK', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'default.png', 1, 1, '2026-03-16 05:56:38', NULL, NULL, NULL, 'bfbaf62ba473ddd1f5d42f665535b39b'),
('9a4cd7c2-ab90-4d9a-936a-af4669416024', '12345678', 'Lizi', 'Lizeth', 'Villa Perrez', 'Av/colon', '68552233', 'Soltero/a', 'AFP', 1000, 10000, 1000, 'Lizi@lasmuñecasderamon.com', '$2b$10$k9PmvJGAx5hwt/X5BO929.jj77pCd/QSFT79hZum0G6dT3iJv.dR2', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'default.png', 1, 1, '2026-03-16 05:43:37', NULL, NULL, NULL, '90c89e39eb1c9df9e59f3641fb626081e081c1e911c7f9e1b97bea164034f46a'),
('bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', '10101010', 'Pepe', 'Pedro', 'Lopez Montez', 'Av/colon', '74526369', 'Casado/a', 'AFP', 1000, 20000, 0, 'Pepe@lasmuñecasderamon.com', '$2b$10$kYphKdMpGJpxKbAMBEVm2uV8NUoYVzU4Pa.wDwlmqAKQPgZucqc8q', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'default.png', 1, 1, '2026-03-16 05:46:08', NULL, NULL, NULL, NULL),
('c9208906-2685-4861-9c50-ba554917850a', '00000000-0', NULL, 'Jhonatan', 'Ancasi Flores', 'Dirección por defecto', '00000000', 'Soltero', 'Afp', 0, 0, 0, 'admin@lasmuñecasderamon.com', '$2b$12$oLQRjUmRBI0cgmoNBtWJM.9pJfNEOTnPI5Hy1JJ4A9qHJg8iuM3cy', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'default.png', 1, 1, '2026-03-16 04:43:46', NULL, NULL, NULL, NULL);

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

--
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`id_venta`, `codigo`, `cliente_id`, `pedido_id`, `caja_id`, `habitacion_id`, `metodo_pago`, `propina`, `sub_total`, `total`, `total_comision`, `tiempo`, `fecha_crea`, `fecha_mod`, `estado`, `created_by`, `paused_at`, `cuenta_id`, `push_notified_5m`, `push_notified_end`) VALUES
('34feb918-2a66-4a45-a43c-810228725621', 'A5M913WJ', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', NULL, 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', 'b64b7bfe-7b74-4f74-8857-31750a856868', 'efectivo', 3000, 30000, 33000, 7000, 5, '2026-03-19 17:31:15', '2026-03-19 17:36:16', 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0),
('8a3bd946-b08f-4cfa-be1d-0c0556faf054', '4TT77DW7', NULL, NULL, 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', NULL, 'tarjeta', 4000, 40000, 44000, 0, 0, '2026-03-17 12:28:10', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0),
('9742a646-671d-4b8c-ac75-40930f76cf00', '5UZ0DI9B', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', 'c27f7f36-e158-4c19-90dd-752c169510df', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', 'b64b7bfe-7b74-4f74-8857-31750a856868', 'efectivo', 3000, 30000, 33000, 7000, 5, '2026-03-19 12:32:55', '2026-03-19 12:32:57', 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0),
('9913a309-057f-47c2-a552-379846173a74', 'AIXCDKY9', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', 'c3e8d1c3-c016-47e0-a042-27e1cd81132e', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '64c46699-e58f-4e7a-9e62-25d615720a70', 'transferencia', 3000, 30000, 33000, 7000, 5, '2026-03-19 16:04:54', '2026-03-19 16:09:45', 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0),
('a504f5d5-7beb-45a8-b0fa-154f12122c2a', '2GMWJ3E7', NULL, 'f9e6e5bc-57be-4929-a4d8-04254a1754c6', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '64c46699-e58f-4e7a-9e62-25d615720a70', 'tarjeta', 6000, 60000, 66000, 7000, 0, '2026-03-19 12:35:49', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0),
('a7d1a4d1-ab6d-4113-8508-15d5cf37c01b', 'PTB5DN5K', NULL, 'b05018db-c07b-41bf-9af6-4d32a881d158', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', 'b64b7bfe-7b74-4f74-8857-31750a856868', 'tarjeta', 16000, 160000, 176000, 60000, 5, '2026-03-19 16:43:23', '2026-03-19 16:48:14', 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0),
('a8536397-0f24-463d-8be8-dfcb8944a173', '74FORGST', '924503aa-3c67-45a0-9ab6-5a151d4eb6ce', NULL, 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', NULL, 'efectivo', 4000, 40000, 44000, 0, 0, '2026-03-21 17:16:50', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, 'e12b7ce2-95b2-4ba5-99a6-bd00ca74ad1c', 0, 0),
('aa5a3815-0deb-42fb-bfd6-948742e98d85', 'ME93HDVN', NULL, 'd6a043e6-fd03-4bc1-9a13-1701affdc45b', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '64c46699-e58f-4e7a-9e62-25d615720a70', 'efectivo', 3000, 30000, 33000, 7000, 5, '2026-03-19 15:51:37', '2026-03-19 15:56:48', 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0),
('bb337d49-1803-4f6c-b973-ed6fc6caa0e8', 'DCKRTCVW', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', NULL, 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', 'b64b7bfe-7b74-4f74-8857-31750a856868', 'prepago', 9000, 90000, 99000, 21000, 5, '2026-03-23 18:55:16', '2026-03-23 19:00:17', 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0),
('c972674f-c1de-4297-aac8-473893a0e28c', 'HU9I1PGQ', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', NULL, 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', 'b64b7bfe-7b74-4f74-8857-31750a856868', 'efectivo', 6000, 60000, 66000, 14000, 10, '2026-03-20 18:45:10', '2026-03-20 18:55:14', 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0),
('c9e5654c-bcf1-41f9-95de-8a784070375a', 'KTDCG1HG', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', NULL, 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', 'b64b7bfe-7b74-4f74-8857-31750a856868', 'transferencia', 3000, 30000, 33000, 7000, 10, '2026-03-17 12:29:37', '2026-03-17 12:39:38', 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0),
('d240ab0f-c941-40ef-93e2-3d31a8288318', 'P5YYF7CM', NULL, 'a27ccfb5-57c0-47b8-b880-05caabcba2d1', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', '64c46699-e58f-4e7a-9e62-25d615720a70', 'efectivo', 3000, 30000, 33000, 7000, 30, '2026-03-17 13:53:26', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0),
('eff92926-8098-4ae9-bbbe-24e3a9630a09', '5JL1Q8ZA', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', NULL, 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', 'd4288e9f-63e6-4b1d-8fa1-6670042e8827', 'tarjeta', 17000, 170000, 187000, 0, 0, '2026-03-23 18:28:26', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, '154b6a4b-aade-4f70-a0ca-10a932d9e0af', 0, 0),
('fb8de97f-50a8-455c-82dd-1871b85beee8', 'O3BWUEOU', '0bd66edc-ac8b-4867-a864-42d4c6f2d673', 'c881b939-262e-4e85-baa4-821f9ed977e5', 'f4e9472f-162e-4448-8cd7-c7df9668f9fe', NULL, 'efectivo', 2000, 20000, 22000, 0, 0, '2026-03-16 16:21:54', NULL, 1, 'bc06c9d3-2c8b-409c-8c24-2f0da9a8b06e', NULL, NULL, 0, 0);

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

--
-- Volcado de datos para la tabla `ventas_usuarios`
--

INSERT INTO `ventas_usuarios` (`id_usuario_venta`, `usuario_id`, `venta_id`, `fecha_crea`) VALUES
('0190316a-78fa-4a58-877f-5614f913eb4c', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 'bb337d49-1803-4f6c-b973-ed6fc6caa0e8', '0000-00-00 00:00:00'),
('15a2809e-08f6-450a-9997-f1ece6ef7aff', '9a4cd7c2-ab90-4d9a-936a-af4669416024', '9913a309-057f-47c2-a552-379846173a74', '2026-03-19 16:04:54'),
('2621a05e-2d1b-4777-828b-4c18a5c9e906', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 'c972674f-c1de-4297-aac8-473893a0e28c', '0000-00-00 00:00:00'),
('2f7f4e29-2fbd-42f3-8789-0f7a0fe48171', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 'aa5a3815-0deb-42fb-bfd6-948742e98d85', '2026-03-19 15:51:37'),
('5c770175-f00f-4bd0-8e4c-248606e40d48', '9a4cd7c2-ab90-4d9a-936a-af4669416024', '9742a646-671d-4b8c-ac75-40930f76cf00', '2026-03-19 12:32:55'),
('66c4126d-fb21-4902-a8d1-31d19f46f616', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 'a7d1a4d1-ab6d-4113-8508-15d5cf37c01b', '2026-03-19 16:43:23'),
('68e76a78-bfff-43a7-bd0f-9d793d1f3e79', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 'd240ab0f-c941-40ef-93e2-3d31a8288318', '2026-03-17 13:53:26'),
('6f3119dd-c180-4533-9c39-3001f50c4919', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 'eff92926-8098-4ae9-bbbe-24e3a9630a09', '0000-00-00 00:00:00'),
('79584036-8f03-41d3-8c36-cec24af75b6c', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 'c9e5654c-bcf1-41f9-95de-8a784070375a', '2026-03-17 12:29:37'),
('cbe97bea-d284-4d69-b380-174a2b36b9a0', '9a4cd7c2-ab90-4d9a-936a-af4669416024', 'a504f5d5-7beb-45a8-b0fa-154f12122c2a', '2026-03-19 12:35:49'),
('e794e6f6-88c5-4596-a07d-b31a7af0b79d', '9a4cd7c2-ab90-4d9a-936a-af4669416024', '34feb918-2a66-4a45-a43c-810228725621', '2026-03-19 17:31:15');

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
  ADD KEY `fk_detalle_pedidos_pedido_id` (`pedido_id`);

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
  ADD PRIMARY KEY (`id_hora_extra`);

--
-- Indices de la tabla `logins`
--
ALTER TABLE `logins`
  ADD PRIMARY KEY (`id_login`);

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

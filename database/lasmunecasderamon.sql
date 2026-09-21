-- phpMyAdmin SQL Dump
-- version 5.2.2deb1+deb13u1
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 20-09-2026 a las 00:30:17
-- Versión del servidor: 8.4.9
-- Versión de PHP: 8.4.24

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
  `id_anticipo` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monto` int NOT NULL,
  `motivo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `asistencia` int NOT NULL DEFAULT '0',
  `comision` int NOT NULL DEFAULT '0',
  `propina` int NOT NULL DEFAULT '0',
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `fecha_aprobacion` datetime DEFAULT NULL,
  `fecha_cobro` datetime DEFAULT NULL,
  `entregado_por` int DEFAULT NULL,
  `fecha_entrega` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `anticipos`
--

INSERT INTO `anticipos` (`id_anticipo`, `usuario_id`, `monto`, `motivo`, `asistencia`, `comision`, `propina`, `fecha_crea`, `fecha_mod`, `estado`, `fecha_aprobacion`, `fecha_cobro`, `entregado_por`, `fecha_entrega`) VALUES
('84323c3a-8f86-4bd8-af01-05a76790a05c', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 50, 'Anticipo de prueba', 0, 0, 0, '2026-08-09 07:04:40', NULL, 1, NULL, NULL, NULL, NULL),
('99036ca2-f48a-4247-b83b-ae18540a8568', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 50, 'Anticipo de prueba', 0, 0, 0, '2026-08-09 07:09:20', NULL, 1, NULL, NULL, NULL, NULL),
('e5b2926f-bfbc-4f06-a10e-00bddca9f40b', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 50, 'Anticipo de prueba', 0, 0, 0, '2026-08-09 06:54:34', NULL, 1, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `anticipo_historial`
--

CREATE TABLE `anticipo_historial` (
  `id` bigint NOT NULL,
  `anticipo_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accion` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'accion realizada: solicitud, aprobado, rechazado, entregado, etc.',
  `usuario_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'usuario que realizo la accion (admin/cajero)',
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `anticipo_historial`
--

INSERT INTO `anticipo_historial` (`id`, `anticipo_id`, `accion`, `usuario_id`, `fecha_crea`) VALUES
(1, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(2, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(3, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(4, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(5, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(6, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(7, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(8, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(9, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(10, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(11, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(12, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(13, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(14, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(15, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(16, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(17, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(18, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(19, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(20, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(21, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(22, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(23, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(24, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(25, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(26, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(27, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(28, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(29, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(30, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(31, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(32, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(33, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(34, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(35, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(36, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20'),
(37, 'e5b2926f-bfbc-4f06-a10e-00bddca9f40b', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 06:54:34'),
(38, '84323c3a-8f86-4bd8-af01-05a76790a05c', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:04:40'),
(39, '99036ca2-f48a-4247-b83b-ae18540a8568', 'solicitud', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-08-09 07:09:20');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asistencias`
--

CREATE TABLE `asistencias` (
  `id_asistencia` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `hora` time NOT NULL,
  `fecha` date NOT NULL,
  `fecha_pago` datetime DEFAULT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `asistencias`
--

INSERT INTO `asistencias` (`id_asistencia`, `hora`, `fecha`, `fecha_pago`, `usuario_id`, `estado`) VALUES
('38b6ec3b-0c7d-4ac3-8c26-87c4d0c01e98', '03:04:40', '2026-08-09', NULL, '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 1),
('dda0f2e0-8454-424c-bacb-6ce57fdedb7c', '03:09:20', '2026-08-09', NULL, '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 1),
('e77027fe-224e-4ced-adf7-3be2bbbcfc98', '02:54:34', '2026-08-09', NULL, '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `resource_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `resource_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `resource_type`, `resource_id`, `details`, `ip_address`, `created_at`) VALUES
('00bf2d33-cd5d-436f-9e96-890d1200cdc9', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/clients', 'clients', NULL, '{\"body\":{\"run\":\"\",\"name\":\"Luis\",\"lastName\":\"Asdasdasd\",\"phone\":\"321321\",\"device_date\":\"2026-09-19T20:20:01.465Z\"}}', '189.28.65.116', '2026-09-19 17:20:01'),
('01c308e1-8777-43cb-8cd0-6ad526ba89ea', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'CREATE_SALE', 'sales', '182b5162-f6bd-44f7-a7e0-4d6418f0afd5', '{\"total\":24000,\"metodo_pago\":\"tarjeta\",\"codigo\":\"G6IO2W8C\"}', NULL, '2026-08-09 15:43:21'),
('0363f1d1-0274-4c7c-82ab-c4ce6a180990', NULL, 'SECURITY_ALERT:failed_logins', 'security', NULL, '{\"severity\":\"medium\",\"message\":\"Múltiples intentos fallidos de login (3/5) para \\\"Ricardorafaelbracho@gmail.com\\\"\",\"identifier\":\"Ricardorafaelbracho@gmail.com\",\"ip\":\"186.189.71.228\",\"attemptCount\":3,\"threshold\":5,\"remaining\":2}', '186.189.71.228', '2026-09-13 16:50:35'),
('04026138-aa17-4836-855c-c200a96c704d', NULL, 'SECURITY_ALERT:failed_logins', 'security', NULL, '{\"severity\":\"medium\",\"message\":\"Múltiples intentos fallidos de login (3/5) para \\\"mamu1342.12@gmail.com\\\"\",\"identifier\":\"mamu1342.12@gmail.com\",\"ip\":\"181.160.56.246\",\"attemptCount\":3,\"threshold\":5,\"remaining\":2}', '181.160.56.246', '2026-07-29 22:26:28'),
('059e5a62-4d6d-4cf3-81d5-e8436a4bac0c', NULL, 'SECURITY_ALERT:failed_logins', 'security', NULL, '{\"severity\":\"medium\",\"message\":\"Múltiples intentos fallidos de login (2/5) para \\\"mamu1342.12@gmail.com\\\"\",\"identifier\":\"mamu1342.12@gmail.com\",\"ip\":\"181.160.56.246\",\"attemptCount\":2,\"threshold\":5,\"remaining\":3}', '181.160.56.246', '2026-07-29 22:26:25'),
('091387ea-d41b-4217-b00c-0b95469b2379', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/products', 'system', NULL, '{\"body\":null}', '189.28.65.152', '2026-07-13 05:28:59'),
('1497b976-e63d-48f9-97c8-dc6bc5396ad5', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'CREATE_SALE', 'sales', '48bb6479-af85-4fa3-a9ff-3f399658747a', '{\"total\":22000,\"metodo_pago\":\"prepago\",\"codigo\":\"D65ZFWER\"}', NULL, '2026-09-19 17:24:05'),
('2447bf5d-09c6-44d8-9459-f2a6da8fe171', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/configurations', 'system', NULL, '{}', '189.28.65.152', '2026-07-13 00:37:14'),
('244b6e27-9b99-49ba-8a16-6e1e2a008ed5', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/cashregister', 'finances', NULL, '{\"body\":{\"id_caja\":\"f1103cd3-f11f-457b-9db2-57966ab1a561\",\"monto_cierre\":1000,\"usuario_id_cierre\":\"641f3837-3fc2-4ddf-8d03-de7501a62756\"}}', '127.0.0.1', '2026-08-09 15:28:19'),
('25b6ea84-5dc0-4a58-8b30-032536fdfe44', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/products', 'system', NULL, '{\"body\":null}', '189.28.65.152', '2026-07-13 05:33:31'),
('26caf2e0-1b09-4d91-babe-c05fc9165e46', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/clients', 'clients', NULL, '{\"body\":{\"run\":\"\",\"name\":\"Luis Asdasd\",\"lastName\":\"Asdasdasd\",\"phone\":\"321321\",\"device_date\":\"2026-09-19T20:40:46.708Z\"}}', '189.28.65.116', '2026-09-19 17:40:46'),
('27d8c600-9b4b-45bd-a96f-d297d9f012b2', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'CREATE_SALE', 'sales', '989e2c5b-bc32-42aa-b984-f68a6f6fe953', '{\"total\":24000,\"metodo_pago\":\"tarjeta\",\"codigo\":\"GMZ9M1JO\"}', NULL, '2026-08-09 15:14:34'),
('2888d2fd-6a54-4834-b8e1-90e06f4da4f2', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/overtime', 'system', NULL, '{\"body\":{\"usuario_id\":\"6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb\",\"hora\":5,\"monto\":10000,\"device_date\":\"2026-09-19T20:44:57.647Z\"}}', '189.28.65.116', '2026-09-19 17:44:57'),
('28cffecc-807e-44dd-b530-46c7f992b1c8', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/products', 'products', NULL, '{\"body\":{\"max_anfitrionas\":0,\"device_date\":\"2026-09-19T20:15:45.630Z\"}}', '189.28.65.116', '2026-09-19 17:15:45'),
('295c1d08-a349-45dd-b77a-67e3bc106dc4', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/categories/reorder', 'products', NULL, '{\"body\":{\"category_orders\":[{\"id\":\"06552233-2400-40ad-bd1d-fffe2769fe74\",\"display_order\":0},{\"id\":\"ab4206d5-b6c0-439b-84d8-5f2326ffd74d\",\"display_order\":1},{\"id\":\"32f29d6e-dcb0-45b2-8d07-9ff9ba876926\",\"display_order\":2},{\"id\":\"4101431f-c5d0-4745-8252-6d8707847d69\",\"display_order\":3}],\"device_date\":\"2026-07-20T13:33:07.525Z\"}}', '127.0.0.1', '2026-07-20 09:33:07'),
('2ec2673b-9f73-4ebd-b168-79841a28372b', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/clients', 'clients', NULL, '{\"body\":{\"run\":\"10.541.058-2\",\"name\":\"Jhon Carlos\",\"lastName\":\"Ancasi Flores\",\"phone\":\"67909084\",\"device_date\":\"2026-07-16T15:43:24.558Z\"}}', '::1', '2026-07-16 11:43:24'),
('2f44523f-fc8c-465b-a4b1-fc783ea1eee9', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/products', 'system', NULL, '{\"body\":null}', '189.28.65.152', '2026-07-13 05:32:00'),
('321ec933-5d03-4a68-b2e3-7e007eca9055', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/categories', 'products', NULL, '{\"body\":null}', '127.0.0.1', '2026-07-20 09:33:01'),
('3b6afe9c-fc1a-4d9a-97d3-35d50958fcd6', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'CREATE_SALE', 'sales', '8e7284dc-2d11-4a5a-96bc-0c2ede58322b', '{\"total\":24000,\"metodo_pago\":\"tarjeta\",\"codigo\":\"NNW50MK8\"}', NULL, '2026-08-09 15:19:37'),
('4498b42f-a607-4d09-a820-02726d9b14ee', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'CREATE_SALE', 'sales', 'caab2345-7923-496e-8c82-0babb4616844', '{\"total\":24000,\"metodo_pago\":\"tarjeta\",\"codigo\":\"NSHTDGGP\"}', NULL, '2026-08-09 15:28:29'),
('45c483b5-df04-4400-af89-3566cf61dd9b', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/products', 'system', NULL, '{\"body\":null}', '189.28.65.152', '2026-07-13 05:35:47'),
('482d139a-6171-4787-b6ed-ca03f90bf27f', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'CREATE_SALE', 'sales', 'a07b5c9e-af99-4ea1-87b1-d7c8ec3ae3f5', '{\"total\":24000,\"metodo_pago\":\"tarjeta\",\"codigo\":\"UA9X1BCE\"}', NULL, '2026-08-09 15:19:29'),
('552bce61-2bff-4e87-a3fa-e4da5420a1a9', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/rooms/reorder', 'rooms', NULL, '{\"body\":{\"room_orders\":[{\"id\":\"38699f74-2717-465b-a6c4-dcfa0ce8c319\",\"display_order\":1},{\"id\":\"40866998-ba4a-47e2-96f8-edf9b299189a\",\"display_order\":2},{\"id\":\"40d6da04-b563-4fba-b698-5fe46e67d857\",\"display_order\":3},{\"id\":\"cc44f542-a0f5-48c8-a239-d1040cce2c0f\",\"display_order\":4},{\"id\":\"49a38e08-e87a-4c6c-a091-15fe770d350c\",\"display_order\":5},{\"id\":\"6b2842aa-2b1d-4e62-8d65-3528617d3b15\",\"display_order\":6},{\"id\":\"7170a56b-6b4d-4e5a-a333-3e9807bc5206\",\"display_order\":7},{\"id\":\"c3c383c5-5136-4513-9444-7d236ea8a913\",\"display_order\":8}],\"device_date\":\"2026-08-08T21:46:26.101Z\"}}', '127.0.0.1', '2026-08-08 17:46:28'),
('55ed745c-fcc8-43b4-bacb-23bd4bba8541', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/rooms', 'system', NULL, '{\"body\":{\"name\":\"Vip 3\",\"price\":0,\"time\":0,\"device_date\":\"2026-07-13T05:27:38.703Z\"}}', '189.28.65.152', '2026-07-13 01:27:40'),
('563f35dd-d940-4e86-b69f-fe3109f6f0f4', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/rooms', 'system', NULL, '{}', '189.28.65.152', '2026-07-13 00:38:17'),
('60095aa7-5300-45a2-b1a7-b75671b37b56', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/gratificaciones', 'system', NULL, '{\"body\":{\"usuario_id\":\"1f5a13f4-3834-45e2-bb8d-4b73727aad7f\",\"monto\":5000,\"descripcion\":\"Baile al cliente\",\"device_date\":\"2026-09-19T20:43:28.697Z\"}}', '189.28.65.116', '2026-09-19 17:43:28'),
('637c0f84-c70e-4390-a9a5-277a949941a2', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/cashregister', 'finances', NULL, '{\"body\":{\"usuario_id_apertura\":\"641f3837-3fc2-4ddf-8d03-de7501a62756\",\"monto_apertura\":50000}}', '127.0.0.1', '2026-08-09 15:28:20'),
('651cd001-efa1-48cd-a9ab-1a40cfa65588', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/products', 'system', NULL, '{\"body\":null}', '189.28.65.152', '2026-07-13 04:53:08'),
('67a60637-e2e9-465a-9c55-63a7723482fb', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/clients/prepago', 'clients', NULL, '{\"body\":{\"cliente_id\":\"50f9086d-44de-4b29-8d5d-2422ed12fe2a\",\"monto\":500,\"tipo\":\"CARGA\",\"metodo_pago\":\"mixto\",\"pagos_mixtos\":[{\"metodo\":\"efectivo\",\"monto\":200},{\"metodo\":\"transferencia\",\"monto\":300}],\"device_date\":\"2026-09-19T20:20:55.343Z\"}}', '189.28.65.116', '2026-09-19 17:20:55'),
('78d627c2-70c1-419f-926b-84ba97848895', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/configurations', 'settings', NULL, '{\"body\":{\"configs\":[{\"clave\":\"asistencia_hora_inicio\",\"valor\":\"21\"},{\"clave\":\"asistencia_hora_fin\",\"valor\":\"23\"}],\"device_date\":\"2026-09-19T20:12:51.801Z\"}}', '189.28.65.116', '2026-09-19 17:12:51'),
('79b6530a-14ff-4ebc-88bd-f25601a9574e', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/sales', 'sales', NULL, '{\"body\":{\"sub_total\":20000,\"total\":24000,\"propina\":2000,\"cargo_tarjeta\":2000,\"total_comision\":7000,\"metodo_pago\":\"tarjeta\",\"detalles\":[{\"producto_id\":\"c6403a4b-d560-48da-872f-90bbf5476221\",\"precio\":20000,\"comision\":7000,\"cantidad\":1,\"sub_total\":20000}]}}', '127.0.0.1', '2026-08-09 15:14:32'),
('7ad6d28b-fe7d-4313-b124-70ebd8521a83', NULL, 'SECURITY_ALERT:failed_logins', 'security', NULL, '{\"severity\":\"high\",\"message\":\"Múltiples intentos fallidos de login (4/5) para \\\"Ricardorafaelbracho@gmail.com\\\"\",\"identifier\":\"Ricardorafaelbracho@gmail.com\",\"ip\":\"186.189.71.228\",\"attemptCount\":4,\"threshold\":5,\"remaining\":1}', '186.189.71.228', '2026-09-13 16:50:36'),
('7aee7ad6-6178-4ef9-9b60-131a392f07fc', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/categories/reorder', 'products', NULL, '{\"body\":{\"category_orders\":[{\"id\":\"ab4206d5-b6c0-439b-84d8-5f2326ffd74d\",\"display_order\":0},{\"id\":\"32f29d6e-dcb0-45b2-8d07-9ff9ba876926\",\"display_order\":1},{\"id\":\"06552233-2400-40ad-bd1d-fffe2769fe74\",\"display_order\":2},{\"id\":\"4101431f-c5d0-4745-8252-6d8707847d69\",\"display_order\":3}],\"device_date\":\"2026-07-20T13:33:04.383Z\"}}', '127.0.0.1', '2026-07-20 09:33:06'),
('81e5f3dc-f3cb-4939-8cee-733d02a751fd', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/cashregister', 'finances', NULL, '{\"body\":{\"id_caja\":\"f1103cd3-f11f-457b-9db2-57966ab1a561\",\"usuario_id_cierre\":\"641f3837-3fc2-4ddf-8d03-de7501a62756\",\"fecha_cierre\":\"2026-09-19 17:25:44\",\"monto_cierre\":51500,\"device_date\":\"2026-09-19T20:25:44.313Z\"}}', '189.28.65.116', '2026-09-19 17:25:44'),
('83c768fd-b843-4f70-9d24-d7510e9f9b68', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/categories', 'products', NULL, '{\"body\":null}', '127.0.0.1', '2026-07-20 09:32:58'),
('8b35e201-77b2-47df-8af4-8b4ad0b0ce78', NULL, 'SECURITY_ALERT:failed_logins', 'security', NULL, '{\"severity\":\"medium\",\"message\":\"Múltiples intentos fallidos de login (2/5) para \\\"Ricardorafaelbracho@gmail.com\\\"\",\"identifier\":\"Ricardorafaelbracho@gmail.com\",\"ip\":\"186.189.71.228\",\"attemptCount\":2,\"threshold\":5,\"remaining\":3}', '186.189.71.228', '2026-09-13 16:50:32'),
('91d9a480-7278-467e-ba34-2ff56c21af53', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/products', 'system', NULL, '{\"body\":null}', '189.28.65.152', '2026-07-13 05:37:10'),
('926f2740-a3ce-4e20-ba48-d0f9a1509584', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/clients', 'clients', NULL, '{\"body\":{\"run\":\"3.516.465-4\",\"name\":\"Luis Asdasd\",\"lastName\":\"Asdasdasd\",\"phone\":\"321321\",\"device_date\":\"2026-09-19T20:40:56.950Z\"}}', '189.28.65.116', '2026-09-19 17:40:56'),
('9fa9c710-d03f-4d00-94af-f1142d1a2c61', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/cashregister', 'finances', NULL, '{\"body\":{\"id_caja\":\"f1103cd3-f11f-457b-9db2-57966ab1a561\",\"monto_cierre\":1000,\"usuario_id_cierre\":\"641f3837-3fc2-4ddf-8d03-de7501a62756\"}}', '127.0.0.1', '2026-08-09 15:43:12'),
('afb86e27-3910-4681-b460-94619ad56353', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/sales', 'sales', NULL, '{\"body\":{\"sub_total\":20000,\"total\":24000,\"propina\":2000,\"cargo_tarjeta\":2000,\"total_comision\":7000,\"metodo_pago\":\"tarjeta\",\"detalles\":[{\"producto_id\":\"c6403a4b-d560-48da-872f-90bbf5476221\",\"precio\":20000,\"comision\":7000,\"cantidad\":1,\"sub_total\":20000}]}}', '127.0.0.1', '2026-08-09 15:26:24'),
('b1a71e29-c08d-4f2f-9b6a-2f3c840b999d', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/cashregister', 'finances', NULL, '{\"body\":{\"usuario_id_apertura\":\"641f3837-3fc2-4ddf-8d03-de7501a62756\",\"monto_apertura\":50000}}', '127.0.0.1', '2026-08-09 15:43:13'),
('b39197c9-6c6d-49ac-88c6-d1d51895e828', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/sales', 'sales', NULL, '{\"body\":{\"cliente_id\":\"50f9086d-44de-4b29-8d5d-2422ed12fe2a\",\"metodo_pago\":\"prepago\",\"propina\":2000,\"sub_total\":20000,\"total\":22000,\"detalles\":[{\"producto_id\":\"2cd4a2ba-f015-4664-9247-81de487c7335\",\"precio\":10000,\"comision\":0,\"cantidad\":2,\"sub_total\":20000,\"isChampagne\":false}],\"usuarios\":[],\"device_date\":\"2026-09-19T20:24:05.995Z\"}}', '189.28.65.116', '2026-09-19 17:24:05'),
('b42770e8-fbc8-4ae3-bdef-4c8900637f81', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/cashregister', 'finances', NULL, '{\"body\":{\"monto_apertura\":1000,\"usuario_id_apertura\":\"641f3837-3fc2-4ddf-8d03-de7501a62756\",\"device_date\":\"2026-07-21T16:49:32.083Z\"}}', '2800:320:ce15:4400:19c8:3a81:d8b4:30ea', '2026-07-21 12:49:32'),
('b5747237-2d5b-4d0f-927c-797c01d66c90', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/sales', 'sales', NULL, '{\"body\":{\"sub_total\":20000,\"total\":24000,\"propina\":2000,\"cargo_tarjeta\":2000,\"total_comision\":7000,\"metodo_pago\":\"tarjeta\",\"detalles\":[{\"producto_id\":\"c6403a4b-d560-48da-872f-90bbf5476221\",\"precio\":20000,\"comision\":7000,\"cantidad\":1,\"sub_total\":20000}]}}', '127.0.0.1', '2026-08-09 15:19:28'),
('b8beccf8-3d38-43bd-9479-bdec7eaca90f', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/configurations', 'settings', NULL, '{\"body\":{\"configs\":[{\"clave\":\"asistencia_hora_inicio\",\"valor\":\"0\"},{\"clave\":\"asistencia_hora_fin\",\"valor\":\"23\"}],\"device_date\":\"2026-09-19T20:09:35.333Z\"}}', '189.28.65.116', '2026-09-19 17:09:35'),
('bdf1b2c3-e615-4074-bb51-fa63f9492c0e', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/rooms', 'system', NULL, '{}', '189.28.65.152', '2026-07-13 00:38:30'),
('c307a37c-a6aa-40f8-b656-02354d347de4', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/cashregister', 'finances', NULL, '{\"body\":{\"monto_apertura\":10000,\"usuario_id_apertura\":\"641f3837-3fc2-4ddf-8d03-de7501a62756\",\"device_date\":\"2026-09-19T20:43:08.913Z\"}}', '189.28.65.116', '2026-09-19 17:43:08'),
('c578d913-bce8-430c-a889-868717b4f6eb', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/sales', 'sales', NULL, '{\"body\":{\"sub_total\":20000,\"total\":24000,\"propina\":2000,\"cargo_tarjeta\":2000,\"total_comision\":7000,\"metodo_pago\":\"tarjeta\",\"detalles\":[{\"producto_id\":\"c6403a4b-d560-48da-872f-90bbf5476221\",\"precio\":20000,\"comision\":7000,\"cantidad\":1,\"sub_total\":20000}]}}', '127.0.0.1', '2026-08-09 15:43:20'),
('c95adf97-e61a-4b9b-bb95-c9e310cc5461', NULL, 'SECURITY_ALERT:failed_logins', 'security', NULL, '{\"severity\":\"high\",\"message\":\"Cuenta bloqueada temporalmente: 5 intentos fallidos de login para \\\"Ricardorafaelbracho@gmail.com\\\"\",\"identifier\":\"Ricardorafaelbracho@gmail.com\",\"ip\":\"186.189.71.228\",\"attemptCount\":5,\"windowMinutes\":15,\"lockoutMinutes\":15}', '186.189.71.228', '2026-09-13 16:53:23'),
('d66da62a-b649-4ad5-9898-c643280d7e75', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/clients/prepago', 'clients', NULL, '{\"body\":{\"cliente_id\":\"50f9086d-44de-4b29-8d5d-2422ed12fe2a\",\"monto\":50000,\"tipo\":\"CARGA\",\"metodo_pago\":\"efectivo\",\"device_date\":\"2026-09-19T20:23:36.435Z\"}}', '189.28.65.116', '2026-09-19 17:23:36'),
('d7221ca7-523d-4017-ab4a-00d46a141501', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/rooms/reorder', 'rooms', NULL, '{\"body\":{\"room_orders\":[{\"id\":\"38699f74-2717-465b-a6c4-dcfa0ce8c319\",\"display_order\":1},{\"id\":\"40866998-ba4a-47e2-96f8-edf9b299189a\",\"display_order\":2},{\"id\":\"cc44f542-a0f5-48c8-a239-d1040cce2c0f\",\"display_order\":3},{\"id\":\"40d6da04-b563-4fba-b698-5fe46e67d857\",\"display_order\":4},{\"id\":\"49a38e08-e87a-4c6c-a091-15fe770d350c\",\"display_order\":5},{\"id\":\"6b2842aa-2b1d-4e62-8d65-3528617d3b15\",\"display_order\":6},{\"id\":\"7170a56b-6b4d-4e5a-a333-3e9807bc5206\",\"display_order\":7},{\"id\":\"c3c383c5-5136-4513-9444-7d236ea8a913\",\"display_order\":8}],\"device_date\":\"2026-08-08T21:46:27.819Z\"}}', '127.0.0.1', '2026-08-08 17:46:28'),
('d90b0c78-ad07-476b-ab9a-0fd3b4255905', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 'PUT /api/users', 'system', NULL, '{\"body\":{\"id\":\"6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb\",\"nombre\":\"Pablo\",\"apellido\":\"Lopez Reinoso\",\"email\":\"Pepe@lasmuñecasderamon.com\",\"telefono\":\"78459632\",\"direccion\":\"Av Gan Chaco\",\"estado_civil\":\"Casado/a\",\"run\":\"10101010\",\"nick\":\"Pepe\",\"rol_id\":\"8bb76943-c1ec-46ae-ab32-76d35e9726e0\",\"role\":\"Cajero\",\"foto\":\"user_1782013719410.webp\",\"status\":1,\"estado_servicio\":0,\"created_at\":\"undefined 00:00:00\",\"device_date\":\"2026-09-19T21:39:42.788Z\"}}', '189.28.65.116', '2026-09-19 18:39:43'),
('d9bd2d6e-048e-4a14-8808-1687d2062c1a', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/products', 'system', NULL, '{\"body\":null}', '172.23.224.1', '2026-07-13 05:36:18'),
('e50bea83-9c65-49f7-8fb3-912fa06179f8', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'CREATE_SALE', 'sales', 'e92e474c-35d8-4419-a7d5-7a7f29504b02', '{\"total\":24000,\"metodo_pago\":\"tarjeta\",\"codigo\":\"1RLXO42E\"}', NULL, '2026-08-09 15:26:26'),
('f29d5e07-6e2c-4ca3-b5ba-c3bc8aaf2fe9', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/sales', 'sales', NULL, '{\"body\":{\"sub_total\":20000,\"total\":24000,\"propina\":2000,\"cargo_tarjeta\":2000,\"total_comision\":7000,\"metodo_pago\":\"tarjeta\",\"detalles\":[{\"producto_id\":\"c6403a4b-d560-48da-872f-90bbf5476221\",\"precio\":20000,\"comision\":7000,\"cantidad\":1,\"sub_total\":20000}]}}', '127.0.0.1', '2026-08-09 15:19:36'),
('f7a10ea3-87a2-4a92-a1f2-46f3f8c77637', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/sales', 'sales', NULL, '{\"body\":{\"sub_total\":20000,\"total\":24000,\"propina\":2000,\"cargo_tarjeta\":2000,\"total_comision\":7000,\"metodo_pago\":\"tarjeta\",\"detalles\":[{\"producto_id\":\"c6403a4b-d560-48da-872f-90bbf5476221\",\"precio\":20000,\"comision\":7000,\"cantidad\":1,\"sub_total\":20000}]}}', '127.0.0.1', '2026-08-09 15:28:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `backups`
--

CREATE TABLE `backups` (
  `id_backup` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nombre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `tablas_incluidas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `registros_count` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `tamano_bytes` int NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `estado` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cajas`
--

CREATE TABLE `cajas` (
  `id_caja` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_apertura` datetime NOT NULL,
  `usuario_id_apertura` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monto_apertura` int NOT NULL,
  `efectivo` int NOT NULL,
  `tarjeta` int NOT NULL,
  `transferencia` int NOT NULL DEFAULT '0',
  `prepago` int DEFAULT '0',
  `usuario_id_cierre` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  `monto_cierre` int NOT NULL,
  `venta` int NOT NULL DEFAULT '0',
  `cargo_tarjeta` int NOT NULL DEFAULT '0',
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

INSERT INTO `cajas` (`id_caja`, `fecha_apertura`, `usuario_id_apertura`, `monto_apertura`, `efectivo`, `tarjeta`, `transferencia`, `prepago`, `usuario_id_cierre`, `fecha_cierre`, `monto_cierre`, `venta`, `cargo_tarjeta`, `servicio`, `devolucion`, `iva`, `comision`, `propina`, `anticipo`, `estado`) VALUES
('7332c7da-3bcc-4f53-afc2-a22d9f177372', '2026-09-19 17:43:08', '641f3837-3fc2-4ddf-8d03-de7501a62756', 10000, 0, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1),
('f1103cd3-f11f-457b-9db2-57966ab1a561', '2026-07-21 16:49:32', '641f3837-3fc2-4ddf-8d03-de7501a62756', 1000, 50200, 0, 300, 22000, '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-09-19 17:25:44', 51500, 20000, 0, 0, 0, 0, 0, 2000, 0, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id_categoria` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Sin descripción',
  `estado` int NOT NULL DEFAULT '1',
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL,
  `display_order` int DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id_categoria`, `nombre`, `descripcion`, `estado`, `fecha_crea`, `fecha_mod`, `fecha_baja`, `display_order`) VALUES
('06552233-2400-40ad-bd1d-fffe2769fe74', 'Trago Chica', 'Trago chica', 1, '2026-05-21 23:14:50', '2026-07-20 09:33:07', NULL, 0),
('32f29d6e-dcb0-45b2-8d07-9ff9ba876926', 'Wisky Trago', '', 1, '2026-05-21 23:13:11', '2026-07-20 09:33:07', NULL, 2),
('4101431f-c5d0-4745-8252-6d8707847d69', 'Champaña', '', 1, '2026-05-21 23:12:54', '2026-07-20 09:33:07', NULL, 3),
('ab4206d5-b6c0-439b-84d8-5f2326ffd74d', 'Cervezas', '', 1, '2026-05-21 23:12:34', '2026-07-20 09:33:07', NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id_cliente` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `run` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `saldo` int DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id_cliente`, `run`, `nombre`, `apellido`, `telefono`, `fecha_crea`, `fecha_mod`, `estado`, `saldo`) VALUES
('388dbc43-6879-4d43-9e1e-63f688226c66', '10.541.058-2', 'Jhon Carlos', 'Ancasi Flores', '67909084', '2026-07-16 11:43:26', NULL, 1, 0),
('50f9086d-44de-4b29-8d5d-2422ed12fe2a', '3.516.465-4', 'Luis Asdasd', 'Asdasdasd', '321321', '2026-09-19 17:20:01', '2026-09-19 17:40:56', 1, 28500);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes_prepago_movimientos`
--

CREATE TABLE `clientes_prepago_movimientos` (
  `id_movimiento` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('CARGA','CONSUMO','DEVOLUCION') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `monto` int NOT NULL,
  `metodo_pago` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `venta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `metadatos` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes_prepago_movimientos`
--

INSERT INTO `clientes_prepago_movimientos` (`id_movimiento`, `cliente_id`, `tipo`, `monto`, `metodo_pago`, `venta_id`, `usuario_id`, `fecha_crea`, `metadatos`) VALUES
('59e03706-970c-4bc6-95e8-28b76275190f', '50f9086d-44de-4b29-8d5d-2422ed12fe2a', 'CARGA', 500, 'mixto', NULL, '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-09-19 17:20:55', '{\"pagos_mixtos\":[{\"metodo\":\"efectivo\",\"monto\":200},{\"metodo\":\"transferencia\",\"monto\":300}]}'),
('7bb63e77-df55-4954-8d71-73d53c7c7224', '50f9086d-44de-4b29-8d5d-2422ed12fe2a', 'CARGA', 50000, 'efectivo', NULL, '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-09-19 17:23:36', NULL),
('b734563b-5e8b-4b98-83c3-bce735d030da', '50f9086d-44de-4b29-8d5d-2422ed12fe2a', 'CONSUMO', 22000, 'prepago', '48bb6479-af85-4fa3-a9ff-3f399658747a', '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-09-19 17:24:05', '{\"venta_id\":\"48bb6479-af85-4fa3-a9ff-3f399658747a\",\"codigo\":\"D65ZFWER\",\"concepto\":\"Pago venta D65ZFWER\"}');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `codigos`
--

CREATE TABLE `codigos` (
  `id_codigo` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `codigos`
--

INSERT INTO `codigos` (`id_codigo`, `codigo`, `fecha_crea`, `estado`) VALUES
('6a300270-fba3-400a-9652-280013508885', '3600', '2026-05-27 02:35:21', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comisiones`
--

CREATE TABLE `comisiones` (
  `id_comision` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `venta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `servicio_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monto` int NOT NULL DEFAULT '0',
  `estado` int NOT NULL DEFAULT '1',
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuraciones`
--

CREATE TABLE `configuraciones` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `clave` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `descripcion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `categoria` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general',
  `tipo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_mod` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `configuraciones`
--

INSERT INTO `configuraciones` (`id`, `clave`, `valor`, `descripcion`, `categoria`, `tipo`, `fecha_crea`, `fecha_mod`) VALUES
('a8d797b8-1bb1-4b25-99ba-ed94afdab710', 'asistencia_hora_inicio', '21', NULL, 'asistencia', 'number', '2026-07-11 09:50:08', '2026-09-19 17:12:51'),
('ee280d6e-1b14-4b21-830e-7b1e0a9d37d5', 'asistencia_hora_fin', '23', NULL, 'asistencia', 'number', '2026-07-11 09:50:09', '2026-09-19 17:12:51'),
('f7195551-2cec-11f1-8130-f83dc65328af', 'empresa_nombre', 'Las Muñecas de Ramón', 'Nombre de la empresa', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719aabd-2cec-11f1-8130-f83dc65328af', 'empresa_rut', '', 'RUT de la empresa', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e05d-2cec-11f1-8130-f83dc65328af', 'empresa_direccion', '', 'Dirección de la empresa', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e31f-2cec-11f1-8130-f83dc65328af', 'empresa_telefono', '', 'Teléfono de contacto', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e3aa-2cec-11f1-8130-f83dc65328af', 'empresa_email', '', 'Email de contacto', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e435-2cec-11f1-8130-f83dc65328af', 'empresa_facebook', '', 'Facebook URL', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e4b1-2cec-11f1-8130-f83dc65328af', 'empresa_instagram', '', 'Instagram URL', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e52c-2cec-11f1-8130-f83dc65328af', 'empresa_whatsapp', '', 'WhatsApp', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e5b3-2cec-11f1-8130-f83dc65328af', 'impuesto_iva', '20', 'Porcentaje de IVA', 'facturacion', 'number', '2026-03-31 06:32:46', '2026-07-13 00:37:15'),
('f719e636-2cec-11f1-8130-f83dc65328af', 'impuesto_propina', '10', 'Porcentaje de propina por defecto', 'facturacion', 'number', '2026-03-31 06:32:46', '2026-07-13 00:37:15'),
('f719e6b7-2cec-11f1-8130-f83dc65328af', 'moneda', 'CLP', 'Código de moneda', 'facturacion', 'text', '2026-03-31 06:32:46', '2026-07-13 00:37:15'),
('f719e730-2cec-11f1-8130-f83dc65328af', 'facturacion_activada', 'true', 'Si la facturación está activa', 'facturacion', 'boolean', '2026-03-31 06:32:46', '2026-07-13 00:37:15'),
('f719e7ab-2cec-11f1-8130-f83dc65328af', 'resolucion_sii', '', 'Número de resolución SII', 'facturacion', 'text', '2026-03-31 06:32:46', '2026-07-13 00:37:15'),
('f719e832-2cec-11f1-8130-f83dc65328af', 'ambiente', 'produccion', 'Ambiente: desarrollo o produccion', 'sistema', 'text', '2026-03-31 06:32:46', NULL),
('f719e8a9-2cec-11f1-8130-f83dc65328af', 'timezone', 'America/Santiago', 'Zona horaria', 'sistema', 'text', '2026-03-31 06:32:46', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuentas`
--

CREATE TABLE `cuentas` (
  `id_cuenta` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_comision` int NOT NULL,
  `habitacion_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sub_total` int NOT NULL,
  `total` int NOT NULL,
  `metodo_pago` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pedido_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `servicio_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `tiempo` int DEFAULT '0',
  `tiempo_actual` int DEFAULT '0',
  `tiempo_inicio_actual` datetime DEFAULT NULL,
  `habitaciones_historial` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cobrado_por` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `propina` int DEFAULT NULL,
  `push_notified_5m` tinyint DEFAULT '0',
  `push_notified_end` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuentas_usuarios`
--

CREATE TABLE `cuentas_usuarios` (
  `id_cuenta_usuario` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cuenta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_comisiones`
--

CREATE TABLE `detalle_comisiones` (
  `id_detalle_comision` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comision_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comision` int NOT NULL DEFAULT '0',
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_cuentas`
--

CREATE TABLE `detalle_cuentas` (
  `id_detalle_cuenta` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cuenta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `producto_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `precio` int NOT NULL,
  `cantidad` int NOT NULL,
  `sub_total` int NOT NULL,
  `comision` int NOT NULL,
  `hostess_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_devoluciones_servicios`
--

CREATE TABLE `detalle_devoluciones_servicios` (
  `id_detalle_devolucion` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `devolucion_servicio_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monto` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_devoluciones_ventas`
--

CREATE TABLE `detalle_devoluciones_ventas` (
  `id_detalle_devolucion` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `devolucion_venta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `producto_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cantidad` int NOT NULL,
  `precio` int NOT NULL,
  `comision` int NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_pedidos`
--

CREATE TABLE `detalle_pedidos` (
  `id_detalle_pedido` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pedido_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `producto_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `precio` int NOT NULL,
  `comision` int NOT NULL,
  `genera_comision` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indica si el producto genera comisión para las anfitrionas (1=Sí, 0=No)',
  `hostess_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `habitacion_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cantidad` int NOT NULL,
  `subtotal` int NOT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_pedidos_anfitrionas`
--

CREATE TABLE `detalle_pedidos_anfitrionas` (
  `id_detalle_anfitriona` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `detalle_pedido_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `anfitriona_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_propinas`
--

CREATE TABLE `detalle_propinas` (
  `id_detalle_propina` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `propina_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monto` int NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_servicios`
--

CREATE TABLE `detalle_servicios` (
  `id_detalle_servicio` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comision` int NOT NULL DEFAULT '0',
  `servicio_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_servicios_clientes`
--

CREATE TABLE `detalle_servicios_clientes` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `servicio_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_ventas`
--

CREATE TABLE `detalle_ventas` (
  `id_detalle_venta` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `venta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `producto_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `precio` int NOT NULL,
  `comision` int NOT NULL,
  `hostess_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cantidad` int NOT NULL,
  `sub_total` int NOT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `detalle_ventas`
--

INSERT INTO `detalle_ventas` (`id_detalle_venta`, `venta_id`, `producto_id`, `precio`, `comision`, `hostess_id`, `cantidad`, `sub_total`, `fecha_crea`) VALUES
('395cc689-7140-4e60-a2fc-420c2f6a4d35', '48bb6479-af85-4fa3-a9ff-3f399658747a', '2cd4a2ba-f015-4664-9247-81de487c7335', 10000, 0, NULL, 2, 20000, '2026-09-19 17:24:05');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devoluciones_servicios`
--

CREATE TABLE `devoluciones_servicios` (
  `id_devolucion` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `servicio_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pieza_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total` int NOT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devoluciones_ventas`
--

CREATE TABLE `devoluciones_ventas` (
  `id_devolucion_venta` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `venta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total` int NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devoluciones_ventas_usuarios`
--

CREATE TABLE `devoluciones_ventas_usuarios` (
  `id_devolucion_usuario` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `detalle_devolucion_venta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `error_logs`
--

CREATE TABLE `error_logs` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `stack_trace` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `request_body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fecha_crea` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `error_logs`
--

INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('00810305-83f8-44e5-a460-46c1030ad399', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5701:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:28:33'),
('0347965f-06f8-4827-95bd-2d8086b2f1d9', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:37:15'),
('03d12fff-23d2-4ff3-9197-f4ba8ce7110d', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:37:19'),
('06489b11-9d06-41c6-aae8-f010aceb0283', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:37:00'),
('098cfb05-fdaf-4e67-b459-69d4dd5acc20', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 15:26:56'),
('0da2406b-6d77-40cf-8084-cf7fb2a14685', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:37:03'),
('14fbde21-45aa-46ac-ad21-60efeb44a9ff', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:36:56'),
('16824a1e-6b1c-4978-90b3-08b60340452e', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:36:55'),
('1fcf99ea-062d-47ed-8e32-cbead1756788', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 15:26:27'),
('2906508b-74e2-4bd2-a073-31521d54b33c', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 15:26:27');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('2cd32ff5-79b0-45df-a055-76e394ed447c', 'GET /api/dashboard/composite', 'Pool is closed.', 'Error: Pool is closed.\n    at PromisePool.query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\mysql2\\lib\\promise\\pool.js:36:22)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:602:114)\n    at query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:628:12)\n    at StatsQueries.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0ydg9mi._.js:6686:146)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async StatsRepository.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0ydg9mi._.js:6900:16)\n    at async StatsService.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0ydg9mi._.js:6945:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0kkq.8w._.js:6966:18\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-14 07:07:53'),
('2e9308d3-ac9f-4b47-9d0e-67269da5e181', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 15:26:22'),
('3a46a4ed-5620-4408-88db-fb86d1a4eea5', 'GET /api/sales', 'Error en la base de datos: Error al obtener lista de ventas', 'DatabaseError: Error en la base de datos: Error al obtener lista de ventas\n    at SaleQueries.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__1faji6o._.js:3205:19)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async SaleRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__1faji6o._.js:3582:16)\n    at async SaleService.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__1faji6o._.js:5677:16)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__1faji6o._.js:5773:18\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__1faji6o._.js:1311:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40131)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47411)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_1pua99-._.js:17767:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:228552)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_1pua99-._.js:17830:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_1pua99-._.js:17884:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1462:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1514:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1564:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1044:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:935:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-08-09 15:53:38'),
('3cc390d0-4f80-42e4-920c-f57c3a8f38ee', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 15:28:30'),
('40e33c96-50bd-4c66-bfdf-a62025c28c33', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 15:28:44'),
('458c9f2a-d85c-4bec-b736-f5180538be38', 'GET /api/cashregister/status', 'Pool is closed.', 'Error: Pool is closed.\n    at PromisePool.query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\mysql2\\lib\\promise\\pool.js:36:22)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0oj9eo0._.js:602:114)\n    at query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0oj9eo0._.js:628:12)\n    at StatsQueries.getCajaGeneralStats (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6416:165)\n    at StatsRepository.getCajaGeneralStats (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6888:181)\n    at StatsService.getCajaGeneralStats (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6933:178)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__11lbzk1._.js:6966:171\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-15 09:47:20'),
('492232ff-688d-435a-a92d-3cb44321a66b', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:37:15'),
('4a0b3dc0-3857-425e-bf4f-4bce2dbec728', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 15:29:23'),
('4c64c0c2-218d-4bf8-b003-9f014e493975', 'GET /api/debug/slow-queries', 'You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'sql, params_count, duration_ms, query_type, query_count,\n                avg_que\' at line 1', 'Error: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'sql, params_count, duration_ms, query_type, query_count,\n                avg_que\' at line 1\n    at PromisePool.query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\mysql2\\lib\\promise\\pool.js:36:22)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:698:114)\n    at query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:726:22)\n    at QueryLogRepository.getRecent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:569:13)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0v5qrf7._.js:1454:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0v5qrf7._.js:1318:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_08zvk98._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_08zvk98._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_08zvk98._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-17 10:45:01'),
('5023d2d5-6097-4fca-b065-34baa801ce7e', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 13:35:52');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('582157bf-9967-4455-b7e1-26d99e61bc78', 'GET /api/cashregister/status', 'Pool is closed.', 'Error: Pool is closed.\n    at PromisePool.query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\mysql2\\lib\\promise\\pool.js:36:22)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0oj9eo0._.js:602:114)\n    at query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0oj9eo0._.js:628:12)\n    at StatsQueries.getCajaGeneralStats (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6416:165)\n    at StatsRepository.getCajaGeneralStats (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6888:181)\n    at StatsService.getCajaGeneralStats (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6933:178)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__11lbzk1._.js:6966:171\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-15 09:47:33'),
('59c4c336-1737-4ccf-885d-f1c2babf1787', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:37:01'),
('5faa523b-d2fe-481a-a27d-0c85b4ff19ad', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:36:57'),
('61fb9a31-3449-4060-b572-ffebe16a82fa', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5701:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:16:25'),
('62187f7f-0f01-4e2d-8cd7-52e19262084a', 'GET /api/monitoring/slow-queries', 'You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'sql, params_count, duration_ms, query_type, query_count,\n                avg_que\' at line 1', 'Error: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'sql, params_count, duration_ms, query_type, query_count,\n                avg_que\' at line 1\n    at PromisePool.query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\mysql2\\lib\\promise\\pool.js:36:22)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:698:114)\n    at query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:726:22)\n    at QueryLogRepository.getRecent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:569:13)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__03hgkjs._.js:1460:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0v5qrf7._.js:1318:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0sf6km_._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0sf6km_._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0sf6km_._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-17 10:45:25'),
('675c243f-df88-49b3-913d-99e8dafc1507', 'GET /api/auth/me', 'Pool is closed.', 'Error: Pool is closed.\n    at PromisePool.execute (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\mysql2\\lib\\promise\\pool.js:54:22)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:602:76)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:615:20)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async UserRepository.getById (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__114lk17._.js:2205:25)\n    at async UserService.getById (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__114lk17._.js:2462:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__114lk17._.js:2495:22\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_03cxwzb._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_03cxwzb._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_03cxwzb._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-14 12:26:35'),
('6d109fcc-9ab3-49fb-aebd-bf7f79f15d87', 'GET /api/configurations', 'Pool is closed.', 'Error: Pool is closed.\n    at PromisePool.query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\mysql2\\lib\\promise\\pool.js:36:22)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__114lk17._.js:602:114)\n    at query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__114lk17._.js:628:12)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1350:160\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__114lk17._.js:1267:16\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__114lk17._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0223_k7._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0223_k7._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0223_k7._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-14 12:35:25'),
('72c352d7-c370-4b13-81d9-59ce2c405c2d', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 14:45:38'),
('73f5dd20-9e98-4eaf-a191-a5b5d631e6d4', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5701:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:16:23'),
('74210077-6936-4afc-86d6-18087c3de1e6', 'GET /api/cashregister/status', 'Error en la base de datos: Error al obtener estadísticas generales de caja', 'DatabaseError: Error en la base de datos: Error al obtener estadísticas generales de caja\n    at StatsQueries.getCajaGeneralStats (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0gt3oyy._.js:7294:19)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async StatsRepository.getCajaGeneralStats (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0gt3oyy._.js:7676:16)\n    at async StatsService.getCajaGeneralStats (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0gt3oyy._.js:7721:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0gt3oyy._.js:7754:19\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__1-7j5gv._.js:1196:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40131)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47411)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0q3g_mq._.js:17767:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:228552)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0q3g_mq._.js:17830:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0q3g_mq._.js:17884:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1462:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1514:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1564:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1044:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:935:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-07-20 12:50:21'),
('816adb78-b1e4-46c4-a38c-87ebacc2c8ef', 'GET /api/rooms', 'Pool is closed.', 'Error: Pool is closed.\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12mq4in._.js:658:114)\n    at query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12mq4in._.js:684:18)\n    at RoomRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__1lbo26z._.js:5214:162)\n    at RoomService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__08uqjph._.js:2281:176)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__08uqjph._.js:2372:168\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12mq4in._.js:1196:36\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40131)', NULL, '2026-07-20 12:38:32');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('9025ad78-5c24-48c3-9fbb-f308ca6f1094', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 15:28:38'),
('9a913584-6c4d-4daa-9af0-68fd654d42bb', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:36:55'),
('9ddef8b3-5383-4453-b0b2-3f9ce7b03dcd', 'GET /api/solicitudes-servicios', 'Pool is closed.', 'Error: Pool is closed.\n    at PromisePool.execute (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\mysql2\\lib\\promise\\pool.js:54:22)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0oj9eo0._.js:602:76)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0oj9eo0._.js:615:20)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async ServiceRequestRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:4504:21)\n    at async ServiceRequestService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__03asv_i._.js:3638:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__03asv_i._.js:3687:18\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0q81q_s._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0q81q_s._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0q81q_s._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-15 09:47:19'),
('a00819cf-8696-467c-8f12-f95361198779', 'GET /api/dashboard/composite', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5701:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async StatsQueries.getPendingOrders (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6554:24)\n    at async StatsQueries.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6768:25)\n    at async StatsRepository.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6900:16)\n    at async StatsService.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6945:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0kkq.8w._.js:6966:18\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:16:24'),
('a020873f-6e76-4788-953f-d8afb23783e4', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 15:28:56'),
('a1b7b41d-1cb2-4e89-ad70-c0c0f9a91e68', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:37:04'),
('a711163f-0614-4a0f-bb2f-70d5d225c79c', 'GET /api/debug/slow-queries', 'You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'sql, params_count, duration_ms, query_type, query_count,\n                avg_que\' at line 1', 'Error: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'sql, params_count, duration_ms, query_type, query_count,\n                avg_que\' at line 1\n    at PromisePool.query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\mysql2\\lib\\promise\\pool.js:36:22)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:698:114)\n    at query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:726:22)\n    at QueryLogRepository.getRecent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:569:13)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0v5qrf7._.js:1454:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0v5qrf7._.js:1318:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_08zvk98._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_08zvk98._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_08zvk98._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-17 10:45:25'),
('ac4b7ae4-ba2a-482b-b04b-7a8424139415', 'PUT /api/products', 'Unknown column \'max_anfitrionas\' in \'field list\'', 'Error: Unknown column \'max_anfitrionas\' in \'field list\'\n    at i3 (/var/www/lasmunecasderamon/.next/server/chunks/_1lobuhu._.js:62:66964)\n    at i7 (/var/www/lasmunecasderamon/.next/server/chunks/_1lobuhu._.js:62:67379)\n    at Function.update (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0pax9nn._.js:12:6357)\n    at i.update (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__11o7f6c._.js:18:1329)\n    at Function.updateProduct (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__11o7f6c._.js:28:1713)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async /var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0u4ccfz._.js:28:4153\n    at async /var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0pax9nn._.js:12:5129\n    at async rJ.do (/var/www/lasmunecasderamon/node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js:5:20930)\n    at async rJ.handle (/var/www/lasmunecasderamon/node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js:5:25785)', NULL, '2026-09-19 17:15:45'),
('ac69309c-0456-4b01-af16-5355bb76fdb1', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:36:52'),
('b5378b51-a7fb-4229-9041-657db6072ec4', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:37:16'),
('b690361c-804c-4dd1-bf44-7187c718d741', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:37:17');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('c1afc4fd-26e8-4c2f-b729-f934476d65f6', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:36:51'),
('c4a5b59f-8c08-455e-a5cf-81db35901cb4', 'GET /api/monitoring/slow-queries', 'You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'sql, params_count, duration_ms, query_type, query_count,\n                avg_que\' at line 1', 'Error: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near \'sql, params_count, duration_ms, query_type, query_count,\n                avg_que\' at line 1\n    at PromisePool.query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\mysql2\\lib\\promise\\pool.js:36:22)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:698:114)\n    at query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:726:22)\n    at QueryLogRepository.getRecent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__06mutzn._.js:569:13)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__03hgkjs._.js:1460:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0v5qrf7._.js:1318:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0sf6km_._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0sf6km_._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0sf6km_._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-17 10:45:03'),
('d143d315-57e8-43fa-a4ec-144324820bfa', 'GET /api/solicitudes-servicios', 'Error en la base de datos: Error al obtener solicitudes de servicio', 'DatabaseError: Error en la base de datos: Error al obtener solicitudes de servicio\n    at ServiceRequestRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0an3t6-._.js:5064:19)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async ServiceRequestService.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0an3t6-._.js:5295:16)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0an3t6-._.js:5344:18\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0an3t6-._.js:1311:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40131)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47411)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_1u-clxw._.js:17767:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:228552)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_1u-clxw._.js:17830:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_1u-clxw._.js:17884:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1462:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1514:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1564:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1044:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:935:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-08-09 15:53:17'),
('d145465d-214a-48e3-974f-36e5e1c1054a', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0274~v9._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 15:26:50'),
('d8f29d1c-78e3-479f-99be-bfa649849900', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:37:08'),
('da430326-9ada-4c70-8456-cb68d87b23b2', 'GET /api/dashboard/composite', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5701:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async StatsQueries.getPendingOrders (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6554:24)\n    at async StatsQueries.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6768:25)\n    at async StatsRepository.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6900:16)\n    at async StatsService.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6945:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0kkq.8w._.js:6966:18\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:28:32'),
('e2501cde-e36d-4caa-9e5e-7fc47ebfd387', 'GET /api/dashboard/composite', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5701:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async StatsQueries.getPendingOrders (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6554:24)\n    at async StatsQueries.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6768:25)\n    at async StatsRepository.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6900:16)\n    at async StatsService.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6945:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0kkq.8w._.js:6966:18\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:28:28'),
('e5fd58dc-9091-4702-9406-c3c7ce9edb7a', 'GET /api/timers/active', 'Pool is closed.', 'Error: Pool is closed.\n    at PromisePool.execute (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\mysql2\\lib\\promise\\pool.js:54:22)\n    at executeQuery (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0oj9eo0._.js:602:76)\n    at query (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0oj9eo0._.js:628:12)\n    at TimerRepository.getActive (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-zsa.4._.js:3515:146)\n    at TimerService.getActive (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-zsa.4._.js:3664:178)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-zsa.4._.js:3701:170\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-15 09:47:25'),
('e627a6b5-f72f-4eb6-95f8-e3de65574692', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:36:59'),
('e9496849-9ae2-4c1b-bc75-04d21ab48e0a', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3044:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3065:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__12hn~-i._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:37:23');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('f0584532-e76b-4de9-ae26-e75fbe6a8106', 'GET /api/dashboard/composite', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5701:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async StatsQueries.getPendingOrders (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6554:24)\n    at async StatsQueries.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6768:25)\n    at async StatsRepository.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6900:16)\n    at async StatsService.getDashboardComposite (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:6945:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0kkq.8w._.js:6966:18\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0tdpklt._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:28:37'),
('f2553a8c-e45a-4e0c-afc8-bf027469aa5a', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5701:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:28:58'),
('f8827a5c-84b6-470a-bbf1-aa0bb3839b56', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5701:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:28:29'),
('ff865c81-62fb-4113-97a8-905896833d96', 'GET /api/orders', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"mesero_nick\"\n    ],\n    \"message\": \"Invalid input: expected string, received null\"\n  }\n]\n    at OrderRepository.mapOrderFromDB (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5701:165)\n    at D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:40\n    at Array.map (<anonymous>)\n    at OrderRepository.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__04m5myh._.js:5722:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async OrderService.getAll (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3282:16)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0jtoqyy._.js:3320:20\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dz3q9w._.js:1158:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmunecasderamon\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:227:13)', NULL, '2026-07-13 12:28:26');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `gratificaciones`
--

CREATE TABLE `gratificaciones` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monto` int NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `estado` int NOT NULL DEFAULT '1',
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `gratificaciones`
--

INSERT INTO `gratificaciones` (`id`, `usuario_id`, `monto`, `descripcion`, `estado`, `fecha_crea`, `fecha_mod`) VALUES
('8d5cac49-5f37-4821-a0af-63218fe535fb', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 5000, 'Baile al cliente', 1, '2026-09-19 17:43:28', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `habitaciones`
--

CREATE TABLE `habitaciones` (
  `id_habitacion` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `precio` int NOT NULL,
  `tiempo` int NOT NULL,
  `comision_anfitriona` int DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `habitaciones`
--

INSERT INTO `habitaciones` (`id_habitacion`, `nombre`, `display_order`, `precio`, `tiempo`, `comision_anfitriona`, `estado`, `fecha_crea`, `fecha_mod`, `fecha_baja`) VALUES
('38699f74-2717-465b-a6c4-dcfa0ce8c319', 'Vip 3', 0, 0, 0, NULL, 1, '2026-07-13 01:27:40', '2026-08-08 17:46:28', NULL),
('40866998-ba4a-47e2-96f8-edf9b299189a', 'Privado 1', 1, 30000, 2, NULL, 1, '2026-05-21 23:32:30', '2026-08-08 17:46:28', NULL),
('40d6da04-b563-4fba-b698-5fe46e67d857', 'Vip 2', 0, 0, 0, 0, 1, '2026-07-13 00:38:30', '2026-08-08 17:46:28', NULL),
('49a38e08-e87a-4c6c-a091-15fe770d350c', 'Privado 3', 3, 30000, 2, NULL, 1, '2026-05-21 23:33:17', '2026-08-08 17:46:28', NULL),
('6b2842aa-2b1d-4e62-8d65-3528617d3b15', 'Vip 1', 4, 0, 0, 0, 1, '2026-05-21 23:33:53', '2026-08-08 17:46:28', NULL),
('7170a56b-6b4d-4e5a-a333-3e9807bc5206', 'Privado 5', 5, 30000, 2, NULL, 1, '2026-05-21 23:34:22', '2026-08-08 17:46:28', NULL),
('c3c383c5-5136-4513-9444-7d236ea8a913', 'Jacuzzi 6', 6, 500000, 15, 100000, 1, '2026-05-21 23:34:49', '2026-08-08 17:46:28', NULL),
('cc44f542-a0f5-48c8-a239-d1040cce2c0f', 'Privado 2', 2, 30000, 2, NULL, 1, '2026-05-21 23:32:48', '2026-08-08 17:46:28', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `horas_extras`
--

CREATE TABLE `horas_extras` (
  `id_hora_extra` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hora` int NOT NULL,
  `monto` int NOT NULL,
  `total` int NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `horas_extras`
--

INSERT INTO `horas_extras` (`id_hora_extra`, `usuario_id`, `hora`, `monto`, `total`, `fecha_crea`, `fecha_mod`, `estado`) VALUES
('16d9ec3f-59fc-47d7-b443-e3cacc381b18', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 5, 10000, 50000, '2026-09-19 17:44:57', NULL, 1),
('40b964ae-2b88-404d-b3bf-e3d8d7eb189d', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 2, 100, 200, '2026-08-09 06:54:34', NULL, 1),
('8b05d40e-f957-4cb6-b668-0e766deefa83', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 2, 100, 200, '2026-08-09 07:04:40', NULL, 1),
('ba44a687-fbe2-4692-9dd8-d41a8c03d9f5', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 2, 100, 200, '2026-08-09 07:09:20', NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `logins`
--

CREATE TABLE `logins` (
  `id_login` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_login` datetime NOT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `en_local` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `logins`
--

INSERT INTO `logins` (`id_login`, `usuario_id`, `last_login`, `estado`, `ip_address`, `en_local`) VALUES
('1954154e-5372-4763-aa89-3f21a5426e22', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-07-13 11:40:24', 0, NULL, 1),
('5b5fef1b-fc42-42c6-a649-6e84ba7c0d5f', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-07-13 11:40:49', 0, NULL, 1),
('b22c6265-b393-4cc4-9d9d-43a4956858c6', '56f3469c-a6ee-4263-9c4e-9a3063021346', '2026-08-08 17:47:12', 0, NULL, 0),
('df040a7a-7f2e-4866-a05d-679afaaac632', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', '2026-09-19 18:29:04', 1, NULL, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rol_destinatario` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensaje` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `datos` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `leida` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_crea` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_leida` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `notificaciones`
--

INSERT INTO `notificaciones` (`id`, `usuario_id`, `rol_destinatario`, `tipo`, `titulo`, `mensaje`, `datos`, `leida`, `fecha_crea`, `fecha_leida`) VALUES
('162a4909-d306-443c-8efa-ccf580285cef', '641f3837-3fc2-4ddf-8d03-de7501a62756', NULL, 'security_alert_high', '🔒 🟠 Advertencia: Intentos de login fallidos', 'Cuenta bloqueada temporalmente: 5 intentos fallidos de login para \"Ricardorafaelbracho@gmail.com\"', '{\"type\":\"failed_logins\",\"severity\":\"high\",\"details\":{\"identifier\":\"Ricardorafaelbracho@gmail.com\",\"ip\":\"186.189.71.228\",\"attemptCount\":5,\"windowMinutes\":15,\"lockoutMinutes\":15},\"timestamp\":\"2026-09-13 16:53:23\"}', 0, '2026-09-13 16:53:23', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `id_pedido` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mesero_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal` int NOT NULL,
  `total` int NOT NULL,
  `propina` int NOT NULL DEFAULT '0',
  `total_comision` int NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos_usuarios`
--

CREATE TABLE `pedidos_usuarios` (
  `id_pedido_usuario` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pedido_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permissions`
--

CREATE TABLE `permissions` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `module` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
('d296d908-c60f-4360-a359-861bc3a631fc', 'Procesar anticipos', 'Procesar anticipos', 'advances', 'process', '2026-05-22 06:39:57', '2026-05-22 06:39:57', NULL),
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
  `id_producto` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `precio` int NOT NULL,
  `comision` int NOT NULL,
  `descripcion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Sin descripcion',
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `foto` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default.png'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `codigo`, `nombre`, `categoria_id`, `display_order`, `precio`, `comision`, `descripcion`, `fecha_crea`, `fecha_mod`, `fecha_baja`, `estado`, `foto`) VALUES
('258d0063-81a3-48c1-b3bb-af83859bb3df', '98F59VOC', 'Champaña $120.000', '4101431f-c5d0-4745-8252-6d8707847d69', 1, 120000, 40000, 'Champaña chicas', '2026-05-21 23:41:17', '2026-05-22 00:57:20', NULL, 1, 'product_1779421276990.webp'),
('2cd4a2ba-f015-4664-9247-81de487c7335', 'V2SLT7FC', 'Corona 330ml', 'ab4206d5-b6c0-439b-84d8-5f2326ffd74d', 1, 10000, 0, 'Cerveza cliente', '2026-05-21 23:18:21', '2026-07-13 05:37:10', NULL, 1, 'product_2cd4a2ba-f015-4664-9247-81de487c7335_1783935430219.webp'),
('511697be-1839-44ed-960b-d1dbd4a3f99e', '5CZMO95O', 'Trago $30.000', '06552233-2400-40ad-bd1d-fffe2769fe74', 2, 30000, 10000, 'Trago $30.000', '2026-05-21 23:48:10', '2026-05-21 23:49:20', NULL, 1, 'product_1779421690206.webp'),
('7f1e2214-e07a-493e-87ee-f4565ec170a1', 'GNQMQZC2', 'Trago $40.000', '06552233-2400-40ad-bd1d-fffe2769fe74', 3, 40000, 15000, 'Ttrago chica', '2026-05-21 23:49:06', '2026-05-21 23:49:20', NULL, 1, 'product_1779421746149.webp'),
('8b1d4b9a-9b35-4fe7-9cb3-55b0dda5991c', 'TWJAMQ20', 'Champaña $200.000', '4101431f-c5d0-4745-8252-6d8707847d69', 3, 200000, 80000, 'Champaña chicas', '2026-05-21 23:43:43', '2026-05-21 23:45:32', NULL, 1, 'product_1779421422966.webp'),
('9ef83b37-47c0-4c42-919e-312a949e2006', 'EUQKVVJW', 'Jhony Walker Red Label', '32f29d6e-dcb0-45b2-8d07-9ff9ba876926', 0, 10000, 0, 'Wisky rojo cliente', '2026-05-21 23:52:52', NULL, NULL, 1, 'product_1779421970432.webp'),
('b26bc303-2b2a-4f4c-966a-e55df36e4a2e', 'SO5P4ELX', 'Champaña $160.000', '4101431f-c5d0-4745-8252-6d8707847d69', 2, 160000, 60000, 'Champaña chicas', '2026-05-21 23:42:16', '2026-05-21 23:45:32', NULL, 1, 'product_1779421336111.webp'),
('b5b86489-0b94-440f-ae7b-0823793f53cf', 'DWKQ6FZ0', 'Heineken 330ml', 'ab4206d5-b6c0-439b-84d8-5f2326ffd74d', 3, 10000, 0, 'Cerveza indivicual cliente', '2026-05-21 23:29:58', '2026-05-22 02:58:20', NULL, 1, 'product_b5b86489-0b94-440f-ae7b-0823793f53cf_1779432694165.webp'),
('c6403a4b-d560-48da-872f-90bbf5476221', 'HDPPN5M6', 'Trago $20.000', '06552233-2400-40ad-bd1d-fffe2769fe74', 1, 20000, 7000, 'Trago chica', '2026-05-21 23:47:22', '2026-05-21 23:49:20', NULL, 1, 'product_1779421642355.webp'),
('cba22e0d-943a-4a2f-9158-6d12b03cca57', '9S0JLCNF', 'Champaña $240.000', '4101431f-c5d0-4745-8252-6d8707847d69', 4, 240000, 100000, 'Champaña chicas', '2026-05-21 23:44:58', '2026-05-21 23:45:32', NULL, 1, 'product_cba22e0d-943a-4a2f-9158-6d12b03cca57_1779421520425.webp'),
('dedd81c0-ff6b-467f-a58d-82a56edd3972', 'IV7Y3PO4', 'Paceña', 'ab4206d5-b6c0-439b-84d8-5f2326ffd74d', 2, 10000, 0, '', '2026-05-22 00:30:54', '2026-05-22 02:58:20', NULL, 1, 'product_1779424250532.webp');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `propinas`
--

CREATE TABLE `propinas` (
  `id_propina` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `venta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `propina` int NOT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `propinas`
--

INSERT INTO `propinas` (`id_propina`, `venta_id`, `propina`, `fecha_crea`, `fecha_mod`, `estado`) VALUES
('ade39a51-d95a-4062-b543-512a18455a8c', '48bb6479-af85-4fa3-a9ff-3f399658747a', 2000, '2026-09-19 17:24:05', NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `query_logs`
--

CREATE TABLE `query_logs` (
  `id` bigint NOT NULL,
  `sql` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Query text (truncated to 500 chars)',
  `params_count` int NOT NULL DEFAULT '0',
  `duration_ms` decimal(10,1) NOT NULL COMMENT 'Query duration in milliseconds',
  `query_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'query, transaction_query, or transaction',
  `query_count` int DEFAULT NULL COMMENT 'For transaction level logs: number of queries in transaction',
  `avg_query_ms` decimal(10,1) DEFAULT NULL COMMENT 'For transaction level logs: average query time',
  `total_query_time_ms` decimal(10,1) DEFAULT NULL COMMENT 'For transaction level logs: total query time',
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Slow queries (>50ms) registradas automaticamente por db.ts';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `retiros_caja`
--

CREATE TABLE `retiros_caja` (
  `id_retiro` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `caja_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monto` int NOT NULL,
  `motivo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_retiro` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id_rol` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` int NOT NULL DEFAULT '1',
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
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permission_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
('077ffa4a-201c-43a6-b3a2-c2efcb9d7ffa', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '3a2d75fe-61a0-4332-b5b3-59e647c4409a', '2026-05-22 06:39:58', '2026-05-22 06:39:58'),
('07bbaa37-e110-4add-9eca-20281f7be698', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '8600dd14-135d-441f-83ad-61d3189eee22', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('09897075-5bf1-479a-8de4-fded153ac493', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '3da800d8-d6d8-4e1b-84a8-3f9aa5b3347e', '2026-05-22 06:39:58', '2026-05-22 06:39:58'),
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
('1ce990d2-a378-4a61-81b5-ea070d43e1cb', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '50f47425-1305-41d8-8e48-66752616070e', '2026-05-22 06:39:36', '2026-05-22 06:39:36'),
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
('28c27b74-0d4d-471a-867f-2fae4e4adebf', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'bd72a8df-37ad-4b55-a6f2-0defd0ac5173', '2026-05-22 06:40:00', '2026-05-22 06:40:00'),
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
('3c30895f-bfc4-4efd-b018-7d38187787c6', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'f8f83e81-eade-414e-85c4-6c7754cd2509', '2026-05-22 06:39:59', '2026-05-22 06:39:59'),
('3d608f4b-8ed1-4ab6-8c70-82c533f60186', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '3de31373-cc05-4203-a7ec-376ec4823df0', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('41827c68-79e8-44ff-8557-a289b8c47580', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '144321cb-2f96-4c27-a025-208bfcec01d3', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('4401cfb5-88f1-44e2-889d-52d0c83e71a1', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'b9e41d5d-cf31-4bf2-84c5-7d6af56219d7', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('4483c00a-07d2-49c5-a3f5-119d42243846', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '145bfa46-2b45-424c-9ee2-233a0a6973a0', '2026-05-22 06:40:01', '2026-05-22 06:40:01'),
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
('55afb7a7-08b8-4d70-b58b-1df13da208be', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '3dee3ac6-e672-4d03-8b66-a084b44ae044', '2026-05-22 06:39:36', '2026-05-22 06:39:36'),
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
('694b1cb5-d75d-4428-a1f6-acee7554bbb7', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9ee5a439-ab97-410f-a1ed-59b91ec72d6e', '2026-05-22 06:39:38', '2026-05-22 06:39:38'),
('6a15be39-cd73-436a-b80d-d4975533041a', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '9e1a00a9-9ed5-41e9-b597-aeb21baf7a42', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('6b2fed1f-f8de-40c5-93a4-00e5968cefe8', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '6e9ac863-cda0-43b6-995c-12cf047d6eee', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('6d3f5a09-3fdb-4ad6-99fb-73d6f38ad9fb', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'e41b780d-74d5-4316-a614-86808f4dacd5', '2026-05-22 06:40:00', '2026-05-22 06:40:00'),
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
('9057611b-3390-4837-baf9-301b3780a9fb', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '75a787b0-e49b-4725-86e5-fdc50b3818d0', '2026-05-22 06:39:36', '2026-05-22 06:39:36'),
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
('c53a2068-ce23-4bff-b7c8-628267a8db3a', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '5b040973-2dee-4b04-8d2d-d986c80f0d61', '2026-05-22 06:39:59', '2026-05-22 06:39:59'),
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
('d96ef095-5ed6-46ca-849f-328e50d73bd5', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '814d8b48-b2df-42d7-9bb8-687197437f52', '2026-05-22 06:39:59', '2026-05-22 06:39:59'),
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
('ea011594-9dff-42f6-991a-a33f834d2ee1', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '646bfaca-57bb-4eef-8070-96dd5845e517', '2026-05-22 06:39:37', '2026-05-22 06:39:37'),
('eb50c7a5-d72c-4ac3-9b30-769c04023d0b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'cfcc1b1e-09da-4ddd-877a-3a4120c5e4af', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('eb6625c5-13b6-4b77-ab26-e09aa5aa49ef', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '9b742701-f143-481a-8efb-5f80df07d5c8', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('ec4ed94f-929b-4939-a40e-531ea2f55558', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'd296d908-c60f-4360-a359-861bc3a631fc', '2026-05-22 06:39:57', '2026-05-22 06:39:57'),
('ef398c13-65ee-4be2-bc8f-bfbb0ae9103b', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'b0736fc1-5edd-47d3-b0d2-164e2cc3acb3', '2026-05-22 06:39:36', '2026-05-22 06:39:36'),
('ef4f25bc-bbb2-4ee8-b718-7147cfa8906e', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'ba986d57-791a-4b4e-8727-b777e0b3ff20', '2026-03-16 16:04:39', '2026-03-16 16:04:39'),
('f00feb40-47b6-4ab0-aa0a-6bacf5705e33', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'bedf373f-2044-4696-9311-f5f456f47820', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f1f79136-734a-487c-9222-7825bac97fea', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', '8600dd14-135d-441f-83ad-61d3189eee22', '2026-03-16 16:10:45', '2026-03-16 16:10:45'),
('f201baf3-5867-4a60-84cd-b2a86b3ba183', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'f8f83e81-eade-414e-85c4-6c7754cd2509', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f29606ac-0952-47fc-a499-cee51a0c5c2b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '208d766e-6d5b-477c-a7eb-e480bff7467e', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f50a0216-fd37-4cc1-9f05-a580d44dad79', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '64d6b9a4-4850-43e7-bd10-6f39b7d0cbff', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f55aa3ea-09e4-475c-b615-5cd5390392c7', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'e725e3dd-2650-41da-adb9-64df9097a14b', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f5eaa7da-2d5d-4d5e-b453-268324595632', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '50e30209-2afc-445c-ba21-0f5a0e7d82c3', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('f63ad432-94d9-4340-9797-0727468785f9', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'a1a6139d-60f8-446f-9518-80913511f1b4', '2026-05-22 06:39:59', '2026-05-22 06:39:59'),
('f70ad152-86b2-4827-a66d-1200475dcd5b', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '191040bf-222c-4f15-b553-eb895b7b731a', '2026-03-16 15:59:31', '2026-03-16 15:59:31'),
('fc3d2a55-c397-43e4-afdf-b76e3d97b7ca', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', '5b040973-2dee-4b04-8d2d-d986c80f0d61', '2026-03-16 15:59:31', '2026-03-16 15:59:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicios`
--

CREATE TABLE `servicios` (
  `id_servicio` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `habitacion_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `precio_habitacion` int NOT NULL,
  `precio_servicio` int NOT NULL,
  `iva` int NOT NULL DEFAULT '0',
  `sub_total` int NOT NULL,
  `total` int NOT NULL,
  `tiempo` int NOT NULL,
  `metodo_pago` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `caja_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `es_temporal` tinyint(1) NOT NULL DEFAULT '0',
  `servicio_original_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paused_at` datetime DEFAULT NULL,
  `push_notified_5m` tinyint(1) DEFAULT '0',
  `push_notified_end` tinyint(1) DEFAULT '0',
  `pagos_mixtos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicio_logs`
--

CREATE TABLE `servicio_logs` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `servicio_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_evento` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fecha_crea` datetime NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_anticipos`
--

CREATE TABLE `solicitudes_anticipos` (
  `id_solicitud` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `motivo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `estado` enum('pendiente','confirmada','rechazada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `motivo_rechazo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `admin_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_anulacion_cuentas`
--

CREATE TABLE `solicitudes_anulacion_cuentas` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `cuenta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `monto` decimal(12,2) NOT NULL DEFAULT '0.00',
  `motivo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `requested_by` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `approved_by` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `estado` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pendiente',
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_anulacion_servicios`
--

CREATE TABLE `solicitudes_anulacion_servicios` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `servicio_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('pendiente','confirmada','rechazada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `fecha_solicitud` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `solicitado_por` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Usuario del Sistema',
  `motivo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Motivo no especificado'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_anulacion_ventas`
--

CREATE TABLE `solicitudes_anulacion_ventas` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `venta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('pendiente','confirmada','rechazada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `fecha_solicitud` datetime NOT NULL,
  `solicitado_por` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Usuario del Sistema',
  `motivo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Motivo no especificado',
  `monto` decimal(12,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_atencion`
--

CREATE TABLE `solicitudes_atencion` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `anfitriona_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `habitacion_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `servicio_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `estado` tinyint DEFAULT '0',
  `atendido_por` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_crea` datetime DEFAULT NULL,
  `fecha_acepta` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_servicios`
--

CREATE TABLE `solicitudes_servicios` (
  `id_solicitud` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `habitacion_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `precio_servicio` decimal(10,2) NOT NULL DEFAULT '0.00',
  `iva` int NOT NULL DEFAULT '0',
  `precio_habitacion` decimal(10,2) NOT NULL DEFAULT '0.00',
  `comision_anfitriona` decimal(10,2) NOT NULL DEFAULT '0.00',
  `anfitrionas_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `num_clientes` int NOT NULL DEFAULT '1',
  `metodo_pago` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tiempo` int NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `solicitado_por` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('pendiente','aprobada','rechazada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `motivo_rechazo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `procesado_por` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_solicitud` datetime NOT NULL,
  `fecha_procesamiento` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `run` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nick` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_civil` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `afp` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `aporte` int NOT NULL,
  `sueldo` int NOT NULL,
  `descuento` int NOT NULL DEFAULT '0',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default.png',
  `estado` int NOT NULL DEFAULT '1',
  `estado_servicio` int NOT NULL DEFAULT '1',
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `fecha_baja` datetime DEFAULT NULL,
  `push_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qr_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `force_password_change` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `run`, `nick`, `nombre`, `apellido`, `direccion`, `telefono`, `estado_civil`, `afp`, `aporte`, `sueldo`, `descuento`, `email`, `password`, `rol_id`, `foto`, `estado`, `estado_servicio`, `fecha_crea`, `fecha_mod`, `fecha_baja`, `push_token`, `qr_token`, `force_password_change`) VALUES
('1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '12345678', 'Lizi', 'Lizeth', 'Villa Pardo', 'Av Germán bush', '68536989', 'Casado/a', 'AFP', 1500, 15000, 0, 'Lizi@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$/G2PaeoDepu7s1o1SRMNsw$RZUVeJYCejAVhsImgcQf/DeC9lWvaMgevdOPpMz5QnA', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'default.png', 1, 0, '0000-00-00 00:00:00', '2026-06-16 11:02:35', NULL, NULL, '35b8c70755fc551e4e8e3c88597ef47f', 0),
('56f3469c-a6ee-4263-9c4e-9a3063021346', '123456789', 'Sebas', 'Sebastias Fernando', 'Flores Llamos', 'Av/colon', '75415263', 'Casado/a', 'AFP', 2000, 25000, 0, 'Sebas@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$T6XCARAtuQpgNzqp4gBIvg$4VRkDGZx7cSnEegccMGK3wVyvaJPT1zmtXGdq2wlWq4', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'default.png', 1, 0, '0000-00-00 00:00:00', '2026-04-05 08:35:40', NULL, NULL, 'be84cce18de6a2086b01177606599431', 0),
('641f3837-3fc2-4ddf-8d03-de7501a62756', 'REMOVED_PASSWORD', 'Admin', 'Jhonatan', 'Ancasi Flores', 'Av/colon', '72419112', 'Soltero/a', 'AFP', 0, 0, 0, 'Admin@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$L761WxD3Zy3zFDs9nYqiOA$8WETDSyxTxZOkdoOWzLitBZo9lFkIW40W2OkHMUgnjQ', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'default.png', 1, 1, '2026-03-25 22:15:59', NULL, NULL, NULL, NULL, 0),
('6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', '10101010', 'Pepe', 'Pablo', 'Lopez Reinoso', 'Av Gan Chaco', '78459632', 'Casado/a', 'AFP', 2000, 20000, 0, 'Pepe@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$Wq+GlJ45/jAAIXCzMtLZag$R83cC3G6d0ccZAQyvsLwoHKyplvR+ZrDqcUpQN6sFBU', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'user_1782013719410.webp', 1, 0, '0000-00-00 00:00:00', '2026-09-19 18:39:44', NULL, NULL, '7d98845bb271f126d9ee37e610807444', 0),
('d3bb0229-9c64-4d6d-b239-c1ae93b2adb3', '145923999', 'Lola', 'Paola', 'Mendez Perez', 'Av/colon', '75965412', 'Soltero/a', 'AFP', 1500, 15000, 0, 'Lola@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$5m5I68vh5zjLGCCGroSq5g$QgHZtOdlYlNkVpqLYuoTEho5R2nQefgSflDhzOuQsGc', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'user_1774587802530.webp', 1, 0, '2026-03-27 01:45:30', '2026-07-10 13:52:34', NULL, NULL, '218fd3b8494542f3f549d914dcfd9d11', 0),
('dec5d722-ead5-4c75-80d5-8be64856f0c5', '987654321', 'Sami', 'Samanta', 'Cordova', 'Av/colon', '78456532', 'Soltero/a', 'AFP', 1500, 15000, 500, 'Sami@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$fV8JKIsBBnW83PX/uW4YuA$bXaI+WzVe+OczGAPpkmVngrGWgoIZNmYzeA0tiWS0yA', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'default.png', 1, 0, '2026-03-27 01:23:08', '2026-04-06 13:26:29', NULL, NULL, '482100ac3b3a6950827dbc1c464c1064', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id_venta` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pedido_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `caja_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `habitacion_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metodo_pago` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `propina` int NOT NULL,
  `cargo_tarjeta` int NOT NULL DEFAULT '0',
  `sub_total` int NOT NULL,
  `total` int NOT NULL,
  `total_comision` int NOT NULL DEFAULT '0',
  `tiempo` int DEFAULT '0',
  `fecha_crea` datetime NOT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `estado` int NOT NULL DEFAULT '1',
  `created_by` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paused_at` datetime DEFAULT NULL,
  `cuenta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `push_notified_5m` tinyint DEFAULT '0',
  `push_notified_end` tinyint DEFAULT '0',
  `pagos_mixtos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`id_venta`, `codigo`, `cliente_id`, `pedido_id`, `caja_id`, `habitacion_id`, `metodo_pago`, `propina`, `cargo_tarjeta`, `sub_total`, `total`, `total_comision`, `tiempo`, `fecha_crea`, `fecha_mod`, `estado`, `created_by`, `paused_at`, `cuenta_id`, `push_notified_5m`, `push_notified_end`, `pagos_mixtos`) VALUES
('48bb6479-af85-4fa3-a9ff-3f399658747a', 'D65ZFWER', '50f9086d-44de-4b29-8d5d-2422ed12fe2a', NULL, 'f1103cd3-f11f-457b-9db2-57966ab1a561', NULL, 'prepago', 2000, 0, 20000, 22000, 0, 0, '2026-09-19 17:24:05', NULL, 1, '641f3837-3fc2-4ddf-8d03-de7501a62756', NULL, NULL, 0, 0, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas_usuarios`
--

CREATE TABLE `ventas_usuarios` (
  `id_usuario_venta` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `venta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_crea` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta_logs`
--

CREATE TABLE `venta_logs` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `venta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `tipo_evento` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `fecha_crea` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `_migrations`
--

CREATE TABLE `_migrations` (
  `id` int NOT NULL,
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `executed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `_migrations`
--

INSERT INTO `_migrations` (`id`, `filename`, `executed_at`) VALUES
(1, 'add_habitacion_to_detalle_pedidos.sql', '2026-03-25 10:22:06'),
(2, 'create_gratificaciones.sql', '2026-03-25 10:22:06'),
(3, 'create_notificaciones_table.sql', '2026-03-25 10:22:06'),
(4, 'add_pagos_mixtos_to_ventas.sql', '2026-04-01 14:16:23'),
(5, 'add_cuenta_timer_history.sql', '2026-04-02 15:25:08'),
(6, 'create_solicitudes_anulacion_cuentas.sql', '2026-04-02 15:25:08'),
(7, 'add_monto_to_solicitudes_anulacion_cuentas.sql', '2026-04-02 15:41:26');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `anticipos`
--
ALTER TABLE `anticipos`
  ADD PRIMARY KEY (`id_anticipo`),
  ADD KEY `idx_entregado_por` (`entregado_por`),
  ADD KEY `idx_anticipos_usuario_estado` (`usuario_id`,`estado`),
  ADD KEY `idx_anticipos_fecha_crea` (`fecha_crea` DESC);

--
-- Indices de la tabla `anticipo_historial`
--
ALTER TABLE `anticipo_historial`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_anticipo_historial_anticipo_id` (`anticipo_id`),
  ADD KEY `fk_anticipo_historial_usuario_id` (`usuario_id`);

--
-- Indices de la tabla `asistencias`
--
ALTER TABLE `asistencias`
  ADD PRIMARY KEY (`id_asistencia`),
  ADD KEY `idx_asistencias_usuario_estado` (`usuario_id`,`estado`);

--
-- Indices de la tabla `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `cajas`
--
ALTER TABLE `cajas`
  ADD PRIMARY KEY (`id_caja`),
  ADD KEY `idx_cajas_estado` (`estado`);

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
  ADD PRIMARY KEY (`id_comision`),
  ADD KEY `idx_comisiones_venta_id` (`venta_id`),
  ADD KEY `idx_comisiones_servicio_id` (`servicio_id`);

--
-- Indices de la tabla `configuraciones`
--
ALTER TABLE `configuraciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clave` (`clave`),
  ADD UNIQUE KEY `idx_clave` (`clave`),
  ADD KEY `idx_categoria` (`categoria`);

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
  ADD KEY `fk_detalle_comisiones_comision_id` (`comision_id`),
  ADD KEY `idx_detalle_comisiones_usuario_id` (`usuario_id`);

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
  ADD PRIMARY KEY (`id_detalle_propina`),
  ADD KEY `idx_detalle_propinas_usuario_id` (`usuario_id`);

--
-- Indices de la tabla `detalle_servicios`
--
ALTER TABLE `detalle_servicios`
  ADD PRIMARY KEY (`id_detalle_servicio`),
  ADD KEY `idx_detalle_servicios_servicio_id` (`servicio_id`),
  ADD KEY `idx_detalle_servicios_usuario_id` (`usuario_id`);

--
-- Indices de la tabla `detalle_servicios_clientes`
--
ALTER TABLE `detalle_servicios_clientes`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  ADD PRIMARY KEY (`id_detalle_venta`),
  ADD KEY `idx_detalle_ventas_venta_id` (`venta_id`),
  ADD KEY `idx_detalle_ventas_producto_id` (`producto_id`),
  ADD KEY `idx_detalle_ventas_hostess_id` (`hostess_id`);

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
  ADD KEY `idx_gratificaciones_usuario` (`usuario_id`);

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
  ADD KEY `idx_horas_extras_usuario_id` (`usuario_id`);

--
-- Indices de la tabla `logins`
--
ALTER TABLE `logins`
  ADD PRIMARY KEY (`id_login`),
  ADD KEY `fk_login_usuarios` (`usuario_id`),
  ADD KEY `idx_logins_usuario_id` (`usuario_id`);

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
  ADD KEY `fk_pedidos_cliente_id` (`cliente_id`),
  ADD KEY `idx_pedidos_estado` (`estado`),
  ADD KEY `idx_pedidos_mesero_id` (`mesero_id`);

--
-- Indices de la tabla `pedidos_usuarios`
--
ALTER TABLE `pedidos_usuarios`
  ADD PRIMARY KEY (`id_pedido_usuario`),
  ADD KEY `fk_pedidos_usuarios_pedido_id` (`pedido_id`),
  ADD KEY `idx_pedidos_usuarios_usuario_id` (`usuario_id`),
  ADD KEY `idx_pedidos_usuarios_pedido_id` (`pedido_id`);

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
  ADD PRIMARY KEY (`id_propina`),
  ADD KEY `idx_propinas_venta_id` (`venta_id`);

--
-- Indices de la tabla `query_logs`
--
ALTER TABLE `query_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_query_logs_created_at` (`created_at`),
  ADD KEY `idx_query_logs_duration_ms` (`duration_ms`),
  ADD KEY `idx_query_logs_type` (`query_type`);

--
-- Indices de la tabla `retiros_caja`
--
ALTER TABLE `retiros_caja`
  ADD PRIMARY KEY (`id_retiro`),
  ADD KEY `fk_retiros_caja_caja_id` (`caja_id`),
  ADD KEY `idx_retiros_caja_caja_id` (`caja_id`);

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
  ADD KEY `fk_servicios_created_by` (`created_by`),
  ADD KEY `idx_servicios_estado_fecha` (`estado`,`fecha_crea`),
  ADD KEY `idx_servicios_caja_estado_fecha` (`caja_id`,`estado`,`fecha_crea`);

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
-- Indices de la tabla `solicitudes_anulacion_cuentas`
--
ALTER TABLE `solicitudes_anulacion_cuentas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_solicitudes_anulacion_cuentas_cuenta` (`cuenta_id`),
  ADD KEY `idx_solicitudes_anulacion_cuentas_estado` (`estado`);

--
-- Indices de la tabla `solicitudes_anulacion_servicios`
--
ALTER TABLE `solicitudes_anulacion_servicios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_solicitudes_anulacion_servicios_servicio_id` (`servicio_id`);

--
-- Indices de la tabla `solicitudes_anulacion_ventas`
--
ALTER TABLE `solicitudes_anulacion_ventas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_solicitudes_anulacion_venta_id` (`venta_id`);

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
  ADD KEY `fk_solicitudes_servicios_solicitado_por` (`solicitado_por`),
  ADD KEY `idx_solicitudes_servicios_estado` (`estado`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD KEY `fk_usuarios_rol_id` (`rol_id`),
  ADD KEY `idx_usuarios_fecha_crea` (`fecha_crea` DESC);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id_venta`),
  ADD KEY `fk_ventas_created_by` (`created_by`),
  ADD KEY `idx_ventas_estado_fecha` (`estado`,`fecha_crea`),
  ADD KEY `idx_ventas_caja_estado_fecha` (`caja_id`,`estado`,`fecha_crea`);

--
-- Indices de la tabla `ventas_usuarios`
--
ALTER TABLE `ventas_usuarios`
  ADD PRIMARY KEY (`id_usuario_venta`),
  ADD KEY `fk_ventas_usuarios_usuario_id` (`usuario_id`),
  ADD KEY `fk_ventas_usuarios_venta_id` (`venta_id`),
  ADD KEY `idx_ventas_usuarios_venta_id` (`venta_id`),
  ADD KEY `idx_ventas_usuarios_usuario_id` (`usuario_id`);

--
-- Indices de la tabla `venta_logs`
--
ALTER TABLE `venta_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `venta_id` (`venta_id`);

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
-- AUTO_INCREMENT de la tabla `anticipo_historial`
--
ALTER TABLE `anticipo_historial`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT de la tabla `query_logs`
--
ALTER TABLE `query_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=513747;

--
-- AUTO_INCREMENT de la tabla `_migrations`
--
ALTER TABLE `_migrations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `anticipo_historial`
--
ALTER TABLE `anticipo_historial`
  ADD CONSTRAINT `fk_anticipo_historial_anticipo` FOREIGN KEY (`anticipo_id`) REFERENCES `anticipos` (`id_anticipo`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_anticipo_historial_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_detalle_pedidos_habitaciones` FOREIGN KEY (`habitacion_id`) REFERENCES `habitaciones` (`id_habitacion`) ON DELETE SET NULL ON UPDATE CASCADE,
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
-- Filtros para la tabla `logins`
--
ALTER TABLE `logins`
  ADD CONSTRAINT `fk_login_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`);

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

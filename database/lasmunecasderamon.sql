-- phpMyAdmin SQL Dump
-- version 5.2.2deb1+deb13u1
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 20-06-2026 a las 07:19:18
-- Versión del servidor: 8.4.9
-- Versión de PHP: 8.4.21

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
('6cedee0c-2fa6-4932-9ce8-469a1c4986cb', '56f3469c-a6ee-4263-9c4e-9a3063021346', 5000, 'Anticipo de sueldo ', 0, 0, 0, '2026-05-27 03:16:56', '2026-05-27 03:17:43', 1, '2026-05-27 03:17:43', NULL, NULL, NULL),
('e8227a9f-a7a3-4926-bc41-d19f33850bd7', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 500, 'Adelantado de sueldo', 0, 0, 0, '2026-06-18 17:43:58', '2026-06-18 17:44:41', 1, '2026-06-18 17:44:41', NULL, NULL, NULL);

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
(1, '6cedee0c-2fa6-4932-9ce8-469a1c4986cb', 'solicitud', '56f3469c-a6ee-4263-9c4e-9a3063021346', '2026-05-27 03:16:56'),
(2, '6cedee0c-2fa6-4932-9ce8-469a1c4986cb', 'aprobado', NULL, '2026-05-27 03:17:43'),
(3, '6cedee0c-2fa6-4932-9ce8-469a1c4986cb', 'solicitud', '56f3469c-a6ee-4263-9c4e-9a3063021346', '2026-05-27 03:16:56'),
(4, '6cedee0c-2fa6-4932-9ce8-469a1c4986cb', 'aprobado', NULL, '2026-05-27 03:17:43'),
(5, 'e8227a9f-a7a3-4926-bc41-d19f33850bd7', 'solicitud', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', '2026-06-18 17:43:58'),
(6, 'e8227a9f-a7a3-4926-bc41-d19f33850bd7', 'aprobado', '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-06-18 17:44:41');

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
('0465dea9-d043-496f-b2f3-835061c6d979', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/49a38e08-e87a-4c6c-a091-15fe770d350c', 'system', NULL, '{\"params\":{\"id\":\"49a38e08-e87a-4c6c-a091-15fe770d350c\"}}', '192.168.0.5', '2026-05-27 03:14:09'),
('055d3583-c7b3-43d1-aba6-6442f21e57d1', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 'PUT /api/orders/afa71557-8c41-4e88-9cf1-958f32144d94', 'system', NULL, '{\"params\":{\"id\":\"afa71557-8c41-4e88-9cf1-958f32144d94\"}}', '2800:320:ce18:8c00:903e:651f:228:daf7', '2026-06-15 16:58:47'),
('06136ea3-782f-4c75-88c2-b35b119328c2', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/solicitudes-servicios/eda737e5-fed6-4dc0-82f5-59bf1feabdc9/aprobar', 'orders', NULL, '{\"params\":{\"id\":\"eda737e5-fed6-4dc0-82f5-59bf1feabdc9\"}}', '192.168.0.5', '2026-05-27 03:21:24'),
('0a239b17-5efb-44ed-9fbc-aae1d5ed9664', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 'PUT /api/users', 'system', NULL, '{}', '189.28.81.123', '2026-06-16 11:02:35'),
('0c602acb-3401-495b-b692-2d0cc40e47f6', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 'POST /api/notifications', 'system', NULL, '{}', '189.28.81.123', '2026-06-19 15:25:14'),
('11d89d9e-2bb4-4865-b17e-b13db6dcaa8c', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'CREATE_SALE', 'sales', 'e3290475-7dde-4b27-b9f5-2c053cc3f2c2', '{\"total\":33000,\"metodo_pago\":\"tarjeta\",\"codigo\":\"1G9OOCR9\"}', NULL, '2026-05-27 02:44:02'),
('13308c23-3940-43a1-85f5-d62f1e799a17', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 'POST /api/clients', 'clients', NULL, '{}', '2800:320:ce18:8c00:c093:f4e1:d4a5:f465', '2026-06-18 18:23:04'),
('135c4b99-3970-4c0b-8be4-cc915f4cee48', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/ff39fcfd-e376-44ea-b9b5-a53db883cfe7', 'system', NULL, '{\"params\":{\"id\":\"ff39fcfd-e376-44ea-b9b5-a53db883cfe7\"}}', '172.17.0.1', '2026-06-01 14:27:47'),
('13704cdf-d04d-4e96-96f2-83c26db52252', '56f3469c-a6ee-4263-9c4e-9a3063021346', 'POST /api/orders', 'system', NULL, '{}', '2800:cd0:13f:b335:54b2:a4ff:fe42:5da3', '2026-06-12 20:49:55'),
('143bd8c6-d457-4b20-ad2d-08e30c95be44', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/servicios', 'system', NULL, '{}', '172.17.0.1', '2026-06-01 14:10:03'),
('16867231-7052-4ff3-b237-c464428836c0', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 'POST /api/sales', 'system', NULL, '{}', '2800:320:ce18:8c00:903e:651f:228:daf7', '2026-06-15 16:58:47'),
('20e464f0-2428-4af5-bdba-7dea3894f1d6', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/servicios/temporal', 'system', NULL, '{}', '172.17.0.1', '2026-06-01 14:27:42'),
('2323818b-2699-4c12-ac29-e0c49501c053', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/c3c383c5-5136-4513-9444-7d236ea8a913', 'system', NULL, '{\"params\":{\"id\":\"c3c383c5-5136-4513-9444-7d236ea8a913\"}}', '172.17.0.1', '2026-06-01 14:10:14'),
('244a1398-7b15-4cca-bc7f-467e9f84473c', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/c3c383c5-5136-4513-9444-7d236ea8a913', 'system', NULL, '{\"params\":{\"id\":\"c3c383c5-5136-4513-9444-7d236ea8a913\"}}', '192.168.0.7', '2026-05-30 07:20:06'),
('24ba47d5-e61c-44c6-878b-dea9fa16be1d', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/c3c383c5-5136-4513-9444-7d236ea8a913', 'system', NULL, '{\"params\":{\"id\":\"c3c383c5-5136-4513-9444-7d236ea8a913\"}}', '192.168.0.7', '2026-05-30 07:24:26'),
('29dded72-f83e-408b-916a-180e262224b1', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/servicios/temporal', 'system', NULL, '{}', '192.168.0.7', '2026-05-30 07:21:03'),
('2f4f1af6-015e-4fa6-bb24-1d8dbf0f7a1d', '56f3469c-a6ee-4263-9c4e-9a3063021346', 'POST /api/orders', 'system', NULL, '{}', '192.168.0.2', '2026-05-27 03:07:33'),
('3230cd98-6d74-47ea-9345-483b0d2fb14a', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/49a38e08-e87a-4c6c-a091-15fe770d350c', 'system', NULL, '{\"params\":{\"id\":\"49a38e08-e87a-4c6c-a091-15fe770d350c\"}}', '192.168.0.5', '2026-05-27 03:23:24'),
('32f9e6ef-6993-4b57-a79a-e29378286fd3', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/49a38e08-e87a-4c6c-a091-15fe770d350c', 'system', NULL, '{\"params\":{\"id\":\"49a38e08-e87a-4c6c-a091-15fe770d350c\"}}', '192.168.0.5', '2026-05-27 03:14:09'),
('33be1e63-5b24-4a97-973d-b52726a08fcc', '56f3469c-a6ee-4263-9c4e-9a3063021346', 'POST /api/orders', 'system', NULL, '{}', '192.168.0.2', '2026-05-27 02:54:42'),
('34fdc997-ace7-44be-87c4-2a596dd72026', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'DELETE /api/orders/a459df81-609e-4d66-9e31-6d7bf11acbca', 'system', NULL, '{\"params\":{\"id\":\"a459df81-609e-4d66-9e31-6d7bf11acbca\"}}', '192.168.0.5', '2026-05-27 03:03:44'),
('36037db2-83cc-40e5-8e1e-b086ad4959d8', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 'POST /api/notifications', 'system', NULL, '{}', '189.28.81.123', '2026-06-19 15:37:42'),
('3b24be6c-717e-449a-977b-95492ba04148', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/40866998-ba4a-47e2-96f8-edf9b299189a', 'system', NULL, '{\"params\":{\"id\":\"40866998-ba4a-47e2-96f8-edf9b299189a\"}}', '192.168.0.5', '2026-05-27 02:59:50'),
('40e9a9f0-911e-475c-8bee-08374e0fef0c', '56f3469c-a6ee-4263-9c4e-9a3063021346', 'POST /api/solicitudes-servicios', 'system', NULL, '{}', '192.168.0.2', '2026-05-27 03:20:48'),
('410f8036-5fdb-4ae4-93fa-a771992bd06e', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/694ead87-2850-46d5-b94b-743ddb9e5408', 'system', NULL, '{\"params\":{\"id\":\"694ead87-2850-46d5-b94b-743ddb9e5408\"}}', '192.168.0.7', '2026-05-30 07:20:44'),
('4815cd4f-e729-4ea9-838f-e7012ed78ccf', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/c3c383c5-5136-4513-9444-7d236ea8a913', 'system', NULL, '{\"params\":{\"id\":\"c3c383c5-5136-4513-9444-7d236ea8a913\"}}', '172.17.0.1', '2026-06-01 14:41:14'),
('49d2ec18-81ca-475f-a8f8-269db255069a', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/c3c383c5-5136-4513-9444-7d236ea8a913', 'system', NULL, '{\"params\":{\"id\":\"c3c383c5-5136-4513-9444-7d236ea8a913\"}}', '172.17.0.1', '2026-06-01 14:26:19'),
('5261faa1-ed42-445a-b627-56d7e74c7f7d', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/orders/4caee060-c487-45b4-8825-68786bbfb81b', 'system', NULL, '{\"params\":{\"id\":\"4caee060-c487-45b4-8825-68786bbfb81b\"}}', '192.168.0.5', '2026-05-27 03:14:08'),
('5b686e47-2f65-4e31-845d-062e61c4d9a6', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 'POST /api/gratificaciones', 'system', NULL, '{}', '2800:320:ce18:8c00:c093:f4e1:d4a5:f465', '2026-06-18 17:32:45'),
('5d83ebce-9ea9-4287-a156-09c1860d1edb', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/694ead87-2850-46d5-b94b-743ddb9e5408', 'system', NULL, '{\"params\":{\"id\":\"694ead87-2850-46d5-b94b-743ddb9e5408\"}}', '192.168.0.7', '2026-05-30 07:23:48'),
('5e166235-aa40-495c-a494-68ee3aa40169', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/c3c383c5-5136-4513-9444-7d236ea8a913', 'system', NULL, '{\"params\":{\"id\":\"c3c383c5-5136-4513-9444-7d236ea8a913\"}}', '172.17.0.1', '2026-06-01 14:25:22'),
('6073b234-98ee-42b5-8589-55e987cfe07f', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/28dcba8c-f938-432e-9752-70f7d6ae7953', 'system', NULL, '{\"params\":{\"id\":\"28dcba8c-f938-432e-9752-70f7d6ae7953\"}}', '192.168.0.5', '2026-05-27 03:23:24'),
('622dd8c5-2517-46b6-91bc-1e1e85df75ed', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/848bd817-5740-4297-9fde-0fc20b5f9a5b', 'system', NULL, '{\"params\":{\"id\":\"848bd817-5740-4297-9fde-0fc20b5f9a5b\"}}', '172.17.0.1', '2026-06-01 14:25:33'),
('6346c18c-4ab6-41a7-ab1e-d0f71f3197dc', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/49a38e08-e87a-4c6c-a091-15fe770d350c', 'system', NULL, '{\"params\":{\"id\":\"49a38e08-e87a-4c6c-a091-15fe770d350c\"}}', '192.168.0.5', '2026-05-27 03:21:25'),
('63edca60-e5d7-4619-9d32-fbf274a66f35', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/c3c383c5-5136-4513-9444-7d236ea8a913', 'system', NULL, '{\"params\":{\"id\":\"c3c383c5-5136-4513-9444-7d236ea8a913\"}}', '192.168.0.7', '2026-05-30 07:23:48'),
('6aadc714-dde7-4c94-8cd4-9a3fe3c78a59', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/ff39fcfd-e376-44ea-b9b5-a53db883cfe7', 'system', NULL, '{\"params\":{\"id\":\"ff39fcfd-e376-44ea-b9b5-a53db883cfe7\"}}', '172.17.0.1', '2026-06-01 14:27:03'),
('6cc090a3-5529-4e7a-ad5b-2fcace952974', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 'POST /api/anticipos/solicitudes', 'system', NULL, '{}', '2800:320:ce18:8c00:c093:f4e1:d4a5:f465', '2026-06-18 17:43:58'),
('6ff77bf7-e289-48c0-a4e6-2bb48ce7abc6', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/40866998-ba4a-47e2-96f8-edf9b299189a', 'system', NULL, '{\"params\":{\"id\":\"40866998-ba4a-47e2-96f8-edf9b299189a\"}}', '192.168.0.5', '2026-05-27 03:04:49'),
('70d9f2ff-0ca8-47b8-8bb9-8eed15128ee5', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 'POST /api/notifications', 'system', NULL, '{}', '189.28.81.123', '2026-06-19 15:46:23'),
('7194ca20-e16b-4100-943c-d298614044d4', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/orders/52b4a2bb-bb19-481c-8dc3-36036603f003', 'system', NULL, '{\"params\":{\"id\":\"52b4a2bb-bb19-481c-8dc3-36036603f003\"}}', '192.168.0.5', '2026-05-27 02:59:50'),
('7498cb61-e01a-4eae-b1c5-b33b99b89f95', '56f3469c-a6ee-4263-9c4e-9a3063021346', 'POST /api/orders', 'system', NULL, '{}', '2800:cd0:136:e876:2093:48ff:fec6:2d31', '2026-06-12 20:51:06'),
('76ad54da-c1b1-46d0-9de5-a947299cb046', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/cashregister', 'finances', NULL, '{}', '192.168.0.5', '2026-05-27 02:43:27'),
('779a91ae-5f9a-4b15-9edb-07b7ddaf5731', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/sales', 'system', NULL, '{}', '192.168.0.5', '2026-05-27 02:44:01'),
('788fcc9b-589f-4a1d-af9c-d28237e2277c', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/sales', 'system', NULL, '{}', '192.168.0.5', '2026-05-27 02:55:54'),
('78d28f99-9e62-4e54-8a1e-7a1c3670d3db', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/694ead87-2850-46d5-b94b-743ddb9e5408', 'system', NULL, '{\"params\":{\"id\":\"694ead87-2850-46d5-b94b-743ddb9e5408\"}}', '192.168.0.7', '2026-05-30 07:21:13'),
('791aa146-5f8d-4a84-9dd3-7cd0f2eb23b1', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/694ead87-2850-46d5-b94b-743ddb9e5408', 'system', NULL, '{\"params\":{\"id\":\"694ead87-2850-46d5-b94b-743ddb9e5408\"}}', '192.168.0.7', '2026-05-30 07:24:26'),
('7e2e9032-c67a-4771-8459-e57de20e1d1f', '56f3469c-a6ee-4263-9c4e-9a3063021346', 'POST /api/orders', 'system', NULL, '{}', '192.168.0.2', '2026-05-27 02:41:11'),
('7f2c809f-9e50-44a7-bd46-64ec29b3f82f', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/anticipos/6cedee0c-2fa6-4932-9ce8-469a1c4986cb', 'advances', NULL, '{\"params\":{\"id\":\"6cedee0c-2fa6-4932-9ce8-469a1c4986cb\"}}', '192.168.0.5', '2026-05-27 03:17:43'),
('802ef8c2-6a9b-47e8-a277-6a6a119d09e2', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/c3c383c5-5136-4513-9444-7d236ea8a913', 'system', NULL, '{\"params\":{\"id\":\"c3c383c5-5136-4513-9444-7d236ea8a913\"}}', '192.168.0.7', '2026-05-30 07:25:03'),
('881f8db1-25ce-4bf2-8dfe-6ffe94243422', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/sales', 'system', NULL, '{}', '192.168.0.5', '2026-05-27 03:14:06'),
('88eb8937-9a60-484b-ab11-5462d9c48361', '56f3469c-a6ee-4263-9c4e-9a3063021346', 'POST /api/orders', 'system', NULL, '{}', '192.168.0.2', '2026-05-27 03:07:34'),
('8b3d066e-3f41-4a47-b3c6-8253dcd2f7d0', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/694ead87-2850-46d5-b94b-743ddb9e5408', 'system', NULL, '{\"params\":{\"id\":\"694ead87-2850-46d5-b94b-743ddb9e5408\"}}', '192.168.0.7', '2026-05-30 07:23:45'),
('8fbcd8cd-72da-46d9-80b6-68f9aecc92e9', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/6d72be68-0450-44d6-b7bc-f04b69905437', 'system', NULL, '{\"params\":{\"id\":\"6d72be68-0450-44d6-b7bc-f04b69905437\"}}', '172.17.0.1', '2026-06-01 14:30:22'),
('90070136-6136-40ff-ae28-51936b32bdae', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 'PUT /api/users', 'system', NULL, '{}', '2800:320:ce18:8c00:a4bc:a2d7:4c1d:e8c8', '2026-06-16 10:47:44'),
('910b690c-2492-44f5-9d4e-4489759f559c', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/sales', 'system', NULL, '{}', '192.168.0.5', '2026-05-27 02:59:48'),
('93a8dea1-9e69-40d2-ae43-6293ba36c811', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/694ead87-2850-46d5-b94b-743ddb9e5408', 'system', NULL, '{\"params\":{\"id\":\"694ead87-2850-46d5-b94b-743ddb9e5408\"}}', '192.168.0.7', '2026-05-30 07:25:03'),
('948a96f8-16dc-45a0-aeca-0a9c7e49d366', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 'POST /api/clients/prepago', 'clients', NULL, '{}', '2800:320:ce18:8c00:c093:f4e1:d4a5:f465', '2026-06-18 18:29:28'),
('96ce5e9c-4b65-4d97-95be-6901b5509950', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/ventas/f4f28443-836c-4100-810d-fa914fe9995b', 'system', NULL, '{\"params\":{\"id\":\"f4f28443-836c-4100-810d-fa914fe9995b\"}}', '192.168.0.5', '2026-05-27 03:04:49'),
('981e4475-8a8e-4762-9c12-6316f1ddf28a', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/694ead87-2850-46d5-b94b-743ddb9e5408', 'system', NULL, '{\"params\":{\"id\":\"694ead87-2850-46d5-b94b-743ddb9e5408\"}}', '192.168.0.7', '2026-05-30 07:20:44'),
('9bbd13b6-63b3-4535-86a4-25a087441a7b', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/servicios', 'system', NULL, '{}', '192.168.0.7', '2026-05-30 07:20:01'),
('9c865d04-779c-459c-a070-d71c7e8b9554', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/694ead87-2850-46d5-b94b-743ddb9e5408', 'system', NULL, '{\"params\":{\"id\":\"694ead87-2850-46d5-b94b-743ddb9e5408\"}}', '192.168.0.7', '2026-05-30 07:23:48'),
('9e1d1134-3fd7-42ea-a4d7-ccbb1e53e727', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/40866998-ba4a-47e2-96f8-edf9b299189a', 'system', NULL, '{\"params\":{\"id\":\"40866998-ba4a-47e2-96f8-edf9b299189a\"}}', '192.168.0.5', '2026-05-27 02:59:50'),
('9ebee59d-35bd-4e91-87e7-9c0b7f5623da', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/anticipos/e8227a9f-a7a3-4926-bc41-d19f33850bd7', 'advances', NULL, '{\"params\":{\"id\":\"e8227a9f-a7a3-4926-bc41-d19f33850bd7\"}}', '2800:320:ce18:8c00:805f:ff07:7af6:8463', '2026-06-18 17:44:41'),
('a187cb40-bb69-4dfd-9412-e328eecaeb51', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/servicios', 'system', NULL, '{}', '172.17.0.1', '2026-06-01 14:26:13'),
('a9be30ea-b565-47f5-af0e-930582e412f2', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/ff39fcfd-e376-44ea-b9b5-a53db883cfe7', 'system', NULL, '{\"params\":{\"id\":\"ff39fcfd-e376-44ea-b9b5-a53db883cfe7\"}}', '172.17.0.1', '2026-06-01 14:41:14'),
('b244411e-e3af-49d5-a923-14434d9b635a', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/clients', 'clients', NULL, '{}', '172.17.0.1', '2026-06-01 13:46:03'),
('b41983a4-7118-4db8-af90-52dd49a32365', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/ff39fcfd-e376-44ea-b9b5-a53db883cfe7', 'system', NULL, '{\"params\":{\"id\":\"ff39fcfd-e376-44ea-b9b5-a53db883cfe7\"}}', '172.17.0.1', '2026-06-01 14:27:47'),
('b713e9a8-9ea0-46a4-b97a-fd35996f7807', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'CREATE_SALE', 'sales', 'f4f28443-836c-4100-810d-fa914fe9995b', '{\"total\":33000,\"metodo_pago\":\"efectivo\",\"codigo\":\"KAN7A68B\"}', NULL, '2026-05-27 02:59:49'),
('b7ea5b59-f79c-4633-b019-513db5197127', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/694ead87-2850-46d5-b94b-743ddb9e5408', 'system', NULL, '{\"params\":{\"id\":\"694ead87-2850-46d5-b94b-743ddb9e5408\"}}', '192.168.0.7', '2026-05-30 07:21:13'),
('b84e0621-3854-47a8-a3a4-0b4cd8741441', '56f3469c-a6ee-4263-9c4e-9a3063021346', 'POST /api/orders', 'system', NULL, '{}', '192.168.0.2', '2026-05-27 03:13:45'),
('c069a6b2-b7d7-4f72-873e-40a9f7fdb361', '56f3469c-a6ee-4263-9c4e-9a3063021346', 'POST /api/orders', 'system', NULL, '{}', '2800:320:ce18:8c00:a4bc:a2d7:4c1d:e8c8', '2026-06-15 16:57:52'),
('c0fe0b24-d100-4c30-aa78-9a9d8b9b8efd', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/ff39fcfd-e376-44ea-b9b5-a53db883cfe7', 'system', NULL, '{\"params\":{\"id\":\"ff39fcfd-e376-44ea-b9b5-a53db883cfe7\"}}', '172.17.0.1', '2026-06-01 14:27:03'),
('c3dc23e8-027c-4f2b-b415-4626b3751b0d', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'POST /api/cashregister/retiros', 'finances', NULL, '{}', '192.168.0.5', '2026-05-27 03:38:04'),
('c4c2d74a-34ef-456d-9476-d951e7accc67', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/servicios/d7d480f6-6b06-4a72-8b38-fb1cf77c0821', 'system', NULL, '{\"params\":{\"id\":\"d7d480f6-6b06-4a72-8b38-fb1cf77c0821\"}}', '192.168.0.7', '2026-05-30 07:23:29'),
('c60b13f2-00f5-4a2f-8f52-acf70c18234d', '56f3469c-a6ee-4263-9c4e-9a3063021346', 'POST /api/orders', 'system', NULL, '{}', '192.168.0.2', '2026-05-27 03:01:53'),
('c987b3ad-44c6-4d7c-ba53-fff024206182', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/rooms/49a38e08-e87a-4c6c-a091-15fe770d350c', 'system', NULL, '{\"params\":{\"id\":\"49a38e08-e87a-4c6c-a091-15fe770d350c\"}}', '192.168.0.5', '2026-05-27 03:19:06'),
('e66898f0-3448-4bab-89b7-a090423fc80b', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 'CREATE_SALE', 'sales', 'e014a678-da7a-4ddb-88a9-393311f0ad22', '{\"total\":33000,\"metodo_pago\":\"tarjeta\",\"codigo\":\"S3SV9RKF\"}', NULL, '2026-06-15 16:58:47'),
('ebb6a245-3215-444e-818a-1429683dc634', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PUT /api/orders/6d759b18-57ef-4de7-915d-fa83c497737b', 'system', NULL, '{\"params\":{\"id\":\"6d759b18-57ef-4de7-915d-fa83c497737b\"}}', '192.168.0.5', '2026-05-27 02:44:03'),
('ee19c5e0-5785-47aa-84fc-f40826c0fd9f', '56f3469c-a6ee-4263-9c4e-9a3063021346', 'POST /api/anticipos/solicitudes', 'system', NULL, '{}', '192.168.0.2', '2026-05-27 03:16:56'),
('f0bb0382-6155-4e23-9ea9-0e728ec8d716', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'PATCH /api/ventas/ff4fc225-a97f-4c05-95c4-ee8b8a518726', 'system', NULL, '{\"params\":{\"id\":\"ff4fc225-a97f-4c05-95c4-ee8b8a518726\"}}', '192.168.0.5', '2026-05-27 03:19:06'),
('faeced07-b31c-4e76-b9e4-e0759819e4fc', '641f3837-3fc2-4ddf-8d03-de7501a62756', 'CREATE_SALE', 'sales', 'ff4fc225-a97f-4c05-95c4-ee8b8a518726', '{\"total\":44000,\"metodo_pago\":\"efectivo\",\"codigo\":\"2U38I9J9\"}', NULL, '2026-05-27 03:14:07');

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

INSERT INTO `cajas` (`id_caja`, `fecha_apertura`, `usuario_id_apertura`, `monto_apertura`, `efectivo`, `tarjeta`, `transferencia`, `prepago`, `usuario_id_cierre`, `fecha_cierre`, `monto_cierre`, `venta`, `servicio`, `devolucion`, `iva`, `comision`, `propina`, `anticipo`, `estado`) VALUES
('1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', '2026-05-27 02:43:27', '641f3837-3fc2-4ddf-8d03-de7501a62756', 10000, 1227000, 1066000, 80000, 0, NULL, NULL, 0, 130000, 1740000, 0, 0, 575000, 13000, 0, 1);

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
('06552233-2400-40ad-bd1d-fffe2769fe74', 'Trago Chica', 'Trago chica', 1, '2026-05-21 23:14:50', '2026-05-22 02:57:59', NULL, 3),
('32f29d6e-dcb0-45b2-8d07-9ff9ba876926', 'Wisky Trago', '', 1, '2026-05-21 23:13:11', '2026-05-22 02:57:59', NULL, 1),
('4101431f-c5d0-4745-8252-6d8707847d69', 'Champaña', '', 1, '2026-05-21 23:12:54', '2026-05-22 02:57:59', NULL, 2),
('ab4206d5-b6c0-439b-84d8-5f2326ffd74d', 'Cervezas', '', 1, '2026-05-21 23:12:34', '2026-05-22 02:57:59', NULL, 0);

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
('89d12f77-e6b3-4f34-9c0f-4b2dcb9bd6fd', '', 'Marcelo', 'Lopez Perez', '', '2026-06-01 13:46:04', NULL, 1, 0),
('96bb5f8d-e2fb-4c0f-98a5-565a5ebc1bd7', '12345678', 'Mario', 'Ancasi ', '7569359', '2026-06-18 18:23:04', NULL, 1, 500000);

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
('efcb4dcb-23cf-46d7-bc49-d2665c75bcec', '96bb5f8d-e2fb-4c0f-98a5-565a5ebc1bd7', 'CARGA', 500000, 'efectivo', NULL, '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', '2026-06-18 18:29:28', NULL);

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

--
-- Volcado de datos para la tabla `comisiones`
--

INSERT INTO `comisiones` (`id_comision`, `venta_id`, `servicio_id`, `monto`, `estado`, `fecha_crea`, `fecha_mod`) VALUES
('0f8e2f2c-418e-402e-95d5-dd3677521261', NULL, '694ead87-2850-46d5-b94b-743ddb9e5408', 100000, 1, '2026-05-30 07:20:01', NULL),
('6a6918c4-2737-49fd-97b8-98fd0be4363b', NULL, '28dcba8c-f938-432e-9752-70f7d6ae7953', 50000, 1, '2026-05-27 03:21:24', NULL),
('75b9bd4b-a322-4923-ac95-d331b32d32fd', NULL, '6d72be68-0450-44d6-b7bc-f04b69905437', 100000, 1, '2026-06-01 14:27:39', NULL),
('77d433d5-bab6-42dc-ae08-5e48e5a37ed3', 'f4f28443-836c-4100-810d-fa914fe9995b', NULL, 10000, 1, '2026-05-27 02:59:48', NULL),
('7fcecccf-6096-4d9d-8583-be92bfba1009', NULL, '848bd817-5740-4297-9fde-0fc20b5f9a5b', 100000, 1, '2026-06-01 14:10:03', NULL),
('aa27aae1-ee4c-43a7-9c90-b3128266e454', NULL, 'ff39fcfd-e376-44ea-b9b5-a53db883cfe7', 100000, 1, '2026-06-01 14:26:13', NULL),
('c9e72f80-c8e2-43bf-ad77-d7d4001259dc', 'ff4fc225-a97f-4c05-95c4-ee8b8a518726', NULL, 15000, 1, '2026-05-27 03:14:07', NULL),
('e5d8cf7f-ad44-4db8-8574-51742e2191df', NULL, 'd7d480f6-6b06-4a72-8b38-fb1cf77c0821', 100000, 1, '2026-05-30 07:21:03', NULL);

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
('f7195551-2cec-11f1-8130-f83dc65328af', 'empresa_nombre', 'Las Muñecas de Ramón', 'Nombre de la empresa', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719aabd-2cec-11f1-8130-f83dc65328af', 'empresa_rut', '', 'RUT de la empresa', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e05d-2cec-11f1-8130-f83dc65328af', 'empresa_direccion', '', 'Dirección de la empresa', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e31f-2cec-11f1-8130-f83dc65328af', 'empresa_telefono', '', 'Teléfono de contacto', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e3aa-2cec-11f1-8130-f83dc65328af', 'empresa_email', '', 'Email de contacto', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e435-2cec-11f1-8130-f83dc65328af', 'empresa_facebook', '', 'Facebook URL', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e4b1-2cec-11f1-8130-f83dc65328af', 'empresa_instagram', '', 'Instagram URL', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e52c-2cec-11f1-8130-f83dc65328af', 'empresa_whatsapp', '', 'WhatsApp', 'empresa', 'text', '2026-03-31 06:32:46', NULL),
('f719e5b3-2cec-11f1-8130-f83dc65328af', 'impuesto_iva', '19', 'Porcentaje de IVA', 'facturacion', 'number', '2026-03-31 06:32:46', NULL),
('f719e636-2cec-11f1-8130-f83dc65328af', 'impuesto_propina', '10', 'Porcentaje de propina por defecto', 'facturacion', 'number', '2026-03-31 06:32:46', NULL),
('f719e6b7-2cec-11f1-8130-f83dc65328af', 'moneda', 'CLP', 'Código de moneda', 'facturacion', 'text', '2026-03-31 06:32:46', NULL),
('f719e730-2cec-11f1-8130-f83dc65328af', 'facturacion_activada', 'true', 'Si la facturación está activa', 'facturacion', 'boolean', '2026-03-31 06:32:46', NULL),
('f719e7ab-2cec-11f1-8130-f83dc65328af', 'resolucion_sii', '', 'Número de resolución SII', 'facturacion', 'text', '2026-03-31 06:32:46', NULL),
('f719e832-2cec-11f1-8130-f83dc65328af', 'ambiente', 'produccion', 'Ambiente: desarrollo o produccion', 'sistema', 'text', '2026-03-31 06:32:46', NULL),
('f719e8a9-2cec-11f1-8130-f83dc65328af', 'timezone', 'America/Santiago', 'Zona horaria', 'sistema', 'text', '2026-03-31 06:32:46', NULL),
('f719e8b0-2cec-11f1-8130-f83dc65328af', 'threshold_producto_caro', '30000', 'Precio mínimo para considerar un producto como "caro" (requiere habitación + anfitriona)', 'comisiones', 'number', '2026-03-31 06:32:46', NULL),
('f719e8b1-2cec-11f1-8130-f83dc65328af', 'split_tarjeta_venta', '51', 'Porcentaje del pago con tarjeta que se registra como venta', 'comisiones', 'number', '2026-03-31 06:32:46', NULL),
('f719e8b2-2cec-11f1-8130-f83dc65328af', 'split_tarjeta_propina', '49', 'Porcentaje del pago con tarjeta que se registra como propina', 'comisiones', 'number', '2026-03-31 06:32:46', NULL),
('f719e8b3-2cec-11f1-8130-f83dc65328af', 'admin_whatsapp', '', 'Número de WhatsApp para notificaciones al administrador', 'sistema', 'text', '2026-03-31 06:32:46', NULL);

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

--
-- Volcado de datos para la tabla `detalle_comisiones`
--

INSERT INTO `detalle_comisiones` (`id_detalle_comision`, `comision_id`, `usuario_id`, `comision`, `fecha_crea`, `fecha_mod`, `estado`) VALUES
('3102234b-ba89-408d-8a38-6e6c259b534d', 'aa27aae1-ee4c-43a7-9c90-b3128266e454', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 100000, '2026-06-01 14:26:13', NULL, 1),
('3a7a48a1-8333-4a06-9c67-3645c7b143cb', '75b9bd4b-a322-4923-ac95-d331b32d32fd', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 100000, '2026-06-01 14:27:39', NULL, 1),
('95a6e1fb-61dd-4eb9-a179-da632557ef65', '77d433d5-bab6-42dc-ae08-5e48e5a37ed3', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 10000, '2026-05-27 02:59:48', NULL, 1),
('98061e95-758b-41d3-ad63-03cf865cb578', 'c9e72f80-c8e2-43bf-ad77-d7d4001259dc', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 15000, '2026-05-27 03:14:07', NULL, 1),
('bcb18b81-bbe2-431b-8842-72485f7fa1ab', 'e5d8cf7f-ad44-4db8-8574-51742e2191df', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 100000, '2026-05-30 07:21:03', NULL, 1),
('c42af156-48cc-41e1-84d9-8248320d8e5f', '6a6918c4-2737-49fd-97b8-98fd0be4363b', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 50000, '2026-05-27 03:21:24', NULL, 1),
('d13c8b6f-4791-470f-8c87-e52784bb6e56', '7fcecccf-6096-4d9d-8583-be92bfba1009', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 100000, '2026-06-01 14:10:03', NULL, 1),
('fbb20b2d-48ac-451c-93ca-73f85c07bb4d', '0f8e2f2c-418e-402e-95d5-dd3677521261', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 100000, '2026-05-30 07:20:01', NULL, 1);

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

--
-- Volcado de datos para la tabla `detalle_pedidos`
--

INSERT INTO `detalle_pedidos` (`id_detalle_pedido`, `pedido_id`, `producto_id`, `precio`, `comision`, `genera_comision`, `hostess_id`, `habitacion_id`, `cantidad`, `subtotal`, `fecha_crea`) VALUES
('172e0438-d42b-4e3d-b52e-b0837fafa55d', 'afa71557-8c41-4e88-9cf1-958f32144d94', '2cd4a2ba-f015-4664-9247-81de487c7335', 10000, 0, 0, NULL, NULL, 1, 10000, '2026-06-15 16:57:51'),
('350b7499-f19b-4b89-bff9-99f1370dc8c8', '6d759b18-57ef-4de7-915d-fa83c497737b', 'b5b86489-0b94-440f-ae7b-0823793f53cf', 10000, 0, 0, NULL, NULL, 1, 10000, '2026-05-27 02:41:12'),
('469e7ccc-62de-4205-b486-20dfa8a3198a', '52b4a2bb-bb19-481c-8dc3-36036603f003', '511697be-1839-44ed-960b-d1dbd4a3f99e', 30000, 10000, 1, '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '40866998-ba4a-47e2-96f8-edf9b299189a', 1, 30000, '2026-05-27 02:54:42'),
('5ab2cf22-f6c5-4c17-bf9a-eb1deb1b28e7', 'def70538-8a36-46e1-96e5-40d03f0e22b1', '9ef83b37-47c0-4c42-919e-312a949e2006', 10000, 0, 0, NULL, NULL, 1, 10000, '2026-06-12 20:51:06'),
('5ad2ed76-8fa7-4ce7-ae95-186672230119', '6d759b18-57ef-4de7-915d-fa83c497737b', 'dedd81c0-ff6b-467f-a58d-82a56edd3972', 10000, 0, 0, NULL, NULL, 1, 10000, '2026-05-27 02:41:12'),
('6fc09252-a976-49d8-b4a7-4c150cd6a2e2', 'afa71557-8c41-4e88-9cf1-958f32144d94', 'b5b86489-0b94-440f-ae7b-0823793f53cf', 10000, 0, 0, NULL, NULL, 1, 10000, '2026-06-15 16:57:51'),
('8f6bed6b-f9e6-4094-9dcd-9a056abae9e7', '6d759b18-57ef-4de7-915d-fa83c497737b', '2cd4a2ba-f015-4664-9247-81de487c7335', 10000, 0, 0, NULL, NULL, 1, 10000, '2026-05-27 02:41:12'),
('c6d06843-0a65-447f-adb8-e5c061c53fec', 'befea001-49c0-4da8-bad1-355c981371bc', 'b5b86489-0b94-440f-ae7b-0823793f53cf', 10000, 0, 0, NULL, NULL, 1, 10000, '2026-06-12 20:49:55'),
('d55c4644-e1d6-4381-b448-987dc2fc37b4', 'afa71557-8c41-4e88-9cf1-958f32144d94', 'dedd81c0-ff6b-467f-a58d-82a56edd3972', 10000, 0, 0, NULL, NULL, 1, 10000, '2026-06-15 16:57:51'),
('d6ace8b6-498d-4e8b-8348-01f732b57391', '4caee060-c487-45b4-8825-68786bbfb81b', '7f1e2214-e07a-493e-87ee-f4565ec170a1', 40000, 15000, 1, '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '49a38e08-e87a-4c6c-a091-15fe770d350c', 1, 40000, '2026-05-27 03:13:45');

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

--
-- Volcado de datos para la tabla `detalle_pedidos_anfitrionas`
--

INSERT INTO `detalle_pedidos_anfitrionas` (`id_detalle_anfitriona`, `detalle_pedido_id`, `anfitriona_id`, `fecha_crea`) VALUES
('53e00d69-d860-4554-8502-07a864fdce61', 'd6ace8b6-498d-4e8b-8348-01f732b57391', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-05-27 03:13:45');

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

--
-- Volcado de datos para la tabla `detalle_propinas`
--

INSERT INTO `detalle_propinas` (`id_detalle_propina`, `propina_id`, `usuario_id`, `monto`, `fecha_crea`, `fecha_mod`, `estado`) VALUES
('0e66781e-33e1-4453-9d62-e130e48e3c9d', '0c475fd4-6c51-4c56-a4f2-747f09e7cef1', '56f3469c-a6ee-4263-9c4e-9a3063021346', 3000, '2026-05-27 02:59:49', NULL, 1),
('2a459aa7-ac71-48c4-80b1-906b5d59aa28', '747d7612-336a-4fdc-8d8e-d7d4acdc804a', '56f3469c-a6ee-4263-9c4e-9a3063021346', 1500, '2026-06-15 16:58:47', NULL, 1),
('38417392-fcf9-4619-b077-d161b30dd5e2', '47f0880e-bb4a-4368-86c3-c3c84f4205a6', '56f3469c-a6ee-4263-9c4e-9a3063021346', 3000, '2026-05-27 02:44:02', NULL, 1),
('a140d94a-bafc-446f-828e-93615be4fb7a', 'c27b8da4-2958-461f-84c5-e0902922309e', '56f3469c-a6ee-4263-9c4e-9a3063021346', 4000, '2026-05-27 03:14:07', NULL, 1),
('bbe00dd1-68e6-459b-941d-307b876120ee', '747d7612-336a-4fdc-8d8e-d7d4acdc804a', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 1500, '2026-06-15 16:58:47', NULL, 1);

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

--
-- Volcado de datos para la tabla `detalle_servicios`
--

INSERT INTO `detalle_servicios` (`id_detalle_servicio`, `usuario_id`, `comision`, `servicio_id`, `fecha_crea`) VALUES
('202b9eec-f401-44a2-9983-cfff3a9434e0', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 50000, '28dcba8c-f938-432e-9752-70f7d6ae7953', '2026-05-27 03:21:24'),
('6ccc9727-3f02-4890-bef4-fb68dc762ced', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 100000, '6d72be68-0450-44d6-b7bc-f04b69905437', '2026-06-01 14:27:39'),
('953619ac-5677-41bb-a72c-2f17fc05e4ae', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 100000, 'd7d480f6-6b06-4a72-8b38-fb1cf77c0821', '2026-05-30 07:21:03'),
('a431d555-ebab-470d-b8a3-663447183775', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 100000, '848bd817-5740-4297-9fde-0fc20b5f9a5b', '2026-06-01 14:10:03'),
('b0d02b4d-cc01-4bb1-add4-a765e927bcc5', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 100000, 'ff39fcfd-e376-44ea-b9b5-a53db883cfe7', '2026-06-01 14:26:13'),
('c68fd354-7424-400d-9503-74c2c7f2a2a6', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 100000, '694ead87-2850-46d5-b94b-743ddb9e5408', '2026-05-30 07:20:01');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_servicios_clientes`
--

CREATE TABLE `detalle_servicios_clientes` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `servicio_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `detalle_servicios_clientes`
--

INSERT INTO `detalle_servicios_clientes` (`id`, `servicio_id`, `cliente_id`) VALUES
('6556d3ba-7058-4a97-9e07-01a8e01fcc17', '848bd817-5740-4297-9fde-0fc20b5f9a5b', '89d12f77-e6b3-4f34-9c0f-4b2dcb9bd6fd'),
('864727a3-8df5-4aa9-a064-4afc780de081', 'ff39fcfd-e376-44ea-b9b5-a53db883cfe7', '89d12f77-e6b3-4f34-9c0f-4b2dcb9bd6fd'),
('a8a9fce6-6569-414d-89fe-4d06df653a45', '6d72be68-0450-44d6-b7bc-f04b69905437', '89d12f77-e6b3-4f34-9c0f-4b2dcb9bd6fd');

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
('493c7431-3eb0-4a2a-aae6-93e281563de1', 'e014a678-da7a-4ddb-88a9-393311f0ad22', 'dedd81c0-ff6b-467f-a58d-82a56edd3972', 10000, 0, NULL, 1, 10000, '2026-06-15 16:58:47'),
('49c4d10f-d648-4978-979d-b1dbaf6c8d53', 'ff4fc225-a97f-4c05-95c4-ee8b8a518726', '7f1e2214-e07a-493e-87ee-f4565ec170a1', 40000, 15000, '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 1, 40000, '2026-05-27 03:14:06'),
('67891c78-5d71-4040-ad2b-6fa71a0eb42f', 'e3290475-7dde-4b27-b9f5-2c053cc3f2c2', '2cd4a2ba-f015-4664-9247-81de487c7335', 10000, 0, NULL, 1, 10000, '2026-05-27 02:44:01'),
('976e8bc2-467f-48f7-89a1-813628f4ee34', 'e014a678-da7a-4ddb-88a9-393311f0ad22', 'b5b86489-0b94-440f-ae7b-0823793f53cf', 10000, 0, NULL, 1, 10000, '2026-06-15 16:58:47'),
('d96220b8-ff24-40b9-b4e9-c93b959e3afa', 'e3290475-7dde-4b27-b9f5-2c053cc3f2c2', 'b5b86489-0b94-440f-ae7b-0823793f53cf', 10000, 0, NULL, 1, 10000, '2026-05-27 02:44:01'),
('e706472d-0ed1-4f5b-a8c6-78fece916649', 'f4f28443-836c-4100-810d-fa914fe9995b', '511697be-1839-44ed-960b-d1dbd4a3f99e', 30000, 10000, '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', 1, 30000, '2026-05-27 02:59:48'),
('f2963755-d579-4ece-a3df-4c301f06f3ee', 'e3290475-7dde-4b27-b9f5-2c053cc3f2c2', 'dedd81c0-ff6b-467f-a58d-82a56edd3972', 10000, 0, NULL, 1, 10000, '2026-05-27 02:44:01'),
('f946f186-5e6e-4b91-9c01-1e43086c47a6', 'e014a678-da7a-4ddb-88a9-393311f0ad22', '2cd4a2ba-f015-4664-9247-81de487c7335', 10000, 0, NULL, 1, 10000, '2026-06-15 16:58:47');

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
('008dee6e-314c-4cd1-b2ee-87f0a06b6bdf', 'GET /api/orders', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11768:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:584:39)\n    at OrderRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:2987:164)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:3211:182\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:1112:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 03:58:23'),
('09de528e-baa3-44d6-b1aa-68d1807203f6', 'GET /api/caja/stats', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0_a6-q3._.js:588:63)\n    at StatsRepository.getCajaGeneralStats (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0_a6-q3._.js:6373:165)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0_a6-q3._.js:6987:19\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0_a6-q3._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0nmo2ak._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0nmo2ak._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0nmo2ak._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 05:56:45'),
('143ee131-e8dc-4092-8dd7-18913d478f70', 'GET /api/timers/active', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0hsa6xh._.js:665:63)\n    at TimerRepository.getActive (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3508:146)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3656:180\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0hsa6xh._.js:1189:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-06-01 16:01:48'),
('2400f6d7-4ef2-40ca-8270-6d9bdf01129e', 'GET /api/cashregister/status', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:665:63)\n    at StatsRepository.getCajaGeneralStats (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dknp7e._.js:6454:165)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0dknp7e._.js:7066:19\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:1189:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-06-01 14:02:10'),
('24b26d56-ffd0-45eb-a658-48be62da0570', 'GET /api/cashregister', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]\n    at CashRegisterRepository.mapCajaFromDB (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2090:163)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:40\n    at Array.map (<anonymous>)\n    at CashRegisterRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2369:18)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:24'),
('28d4a2c1-a355-41e8-8714-20e1bc044791', 'GET /api/cashregister', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]\n    at CashRegisterRepository.mapCajaFromDB (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2090:163)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:40\n    at Array.map (<anonymous>)\n    at CashRegisterRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2369:18)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:12'),
('294fa902-6925-4405-89f6-1e99019e166c', 'GET /api/cashregister', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]\n    at CashRegisterRepository.mapCajaFromDB (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2090:163)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:40\n    at Array.map (<anonymous>)\n    at CashRegisterRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2369:18)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:16'),
('2e89f2c0-4b32-407f-afcd-395a94f0e9e3', 'GET /api/timers/active', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:665:63)\n    at TimerRepository.getActive (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3508:146)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3656:180\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:1189:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-06-01 15:44:46'),
('30d06314-03e9-444c-9c94-30d91d5d9cd9', 'GET /api/events/detail/6cedee0c-2fa6-4932-9ce8-469a1c4986cb', 'Unknown column \'a.observacion\' in \'field list\'', 'Error: Unknown column \'a.observacion\' in \'field list\'\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u-2wda._.js:588:63)\n    at getAnticipoDetail (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1568:161)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1233:26\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u-2wda._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:50'),
('379512cd-80f2-4a31-85f4-4e195a9bd27e', 'POST /api/notifications', 'Table \'lasmunecasderamon.push_tokens\' doesn\'t exist', 'Error: Table \'lasmunecasderamon.push_tokens\' doesn\'t exist\n    at s.execute (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0mybgcg._.js:41:254725)\n    at iW (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0mybgcg._.js:41:321549)\n    at Function.registerToken (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0xdwr7l._.js:50:688)\n    at /var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__05p8bbn._.js:16:1720\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async /var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0m_r7t9._.js:12:1473\n    at async rB.do (/var/www/lasmunecasderamon/node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js:5:20926)\n    at async rB.handle (/var/www/lasmunecasderamon/node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js:5:25709)\n    at async u (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__05p8bbn._.js:16:4994)\n    at async rB.handleResponse (/var/www/lasmunecasderamon/node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js:1:119077)', NULL, '2026-06-19 15:37:42');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('398abf2f-a112-4de1-acdb-50ed364abd95', 'GET /api/events/detail/6cedee0c-2fa6-4932-9ce8-469a1c4986cb', 'Unknown column \'a.observacion\' in \'field list\'', 'Error: Unknown column \'a.observacion\' in \'field list\'\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u-2wda._.js:588:63)\n    at getAnticipoDetail (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1568:161)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1233:26\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u-2wda._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:49'),
('459cb4a2-71e4-43c6-8975-8db0b0baa7ce', 'POST /api/orders', 'Incorrect integer value: \'a1c4d8c7-edef-41e3-8d2f-ad774e1354a4\' for column \'detalle_pedido_id\' at row 1', 'Error: Incorrect integer value: \'a1c4d8c7-edef-41e3-8d2f-ad774e1354a4\' for column \'detalle_pedido_id\' at row 1\n    at PromisePoolConnection.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11352:26)\n    at trx (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:607:45)\n    at BaseRepository.insert (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:2909:15)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:3069:185\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async withTransaction (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:610:24)\n    at async OrderRepository.create (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:3039:9)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:3218:20\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 03:07:34'),
('46b0b48d-cf0d-4834-82a8-606460d0e88a', 'POST /api/notifications', 'Table \'lasmunecasderamon.push_tokens\' doesn\'t exist', 'Error: Table \'lasmunecasderamon.push_tokens\' doesn\'t exist\n    at s.execute (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0mybgcg._.js:41:254725)\n    at iW (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0mybgcg._.js:41:321549)\n    at Function.registerToken (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0xdwr7l._.js:50:688)\n    at /var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__05p8bbn._.js:16:1720\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async /var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0m_r7t9._.js:12:1473\n    at async rB.do (/var/www/lasmunecasderamon/node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js:5:20926)\n    at async rB.handle (/var/www/lasmunecasderamon/node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js:5:25709)\n    at async u (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__05p8bbn._.js:16:4994)\n    at async rB.handleResponse (/var/www/lasmunecasderamon/node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js:1:119077)', NULL, '2026-06-19 15:46:23'),
('492ae1c6-e5cb-4a10-9705-4184b524d056', 'GET /api/cashregister', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]\n    at CashRegisterRepository.mapCajaFromDB (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2090:163)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:40\n    at Array.map (<anonymous>)\n    at CashRegisterRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2369:18)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:20'),
('4b8fb288-96ca-4b8f-99a0-28545bb60e12', 'GET /api/auth/me', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:665:63)\n    at UserRepository.getById (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__01c1tki._.js:2212:164)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__01c1tki._.js:2334:182\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:1266:16\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:1189:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_03cxwzb._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_03cxwzb._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_03cxwzb._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-06-01 14:25:49'),
('511a1bf2-63bc-4ebd-b797-eda10886514d', 'GET /api/timers/active', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:665:63)\n    at TimerRepository.getActive (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3463:146)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3656:180\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:1189:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-06-01 14:11:30'),
('563f8484-8ff4-4fbc-a7c0-75b99844271f', 'GET /api/events/detail/6cedee0c-2fa6-4932-9ce8-469a1c4986cb', 'Table \'lasmunecasderamon.anticipo_historial\' doesn\'t exist', 'Error: Table \'lasmunecasderamon.anticipo_historial\' doesn\'t exist\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:588:63)\n    at getAnticipoDetail (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1578:162)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1233:20\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 06:00:53'),
('5666d4e2-8615-45ae-8fbf-ed4598d31a89', 'GET /api/cashregister/status', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11768:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:588:101)\n    at StatsRepository.getCajaGeneralStats (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:6376:146)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:6972:19\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 03:45:03'),
('5c387388-5f1e-4618-b57a-d1dcbb40d0cc', 'GET /api/cashregister', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]\n    at CashRegisterRepository.mapCajaFromDB (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2090:163)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:40\n    at Array.map (<anonymous>)\n    at CashRegisterRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2369:18)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:27'),
('5ffb7338-6de1-4bc6-bf13-668d73febe9a', 'GET /api/events/detail/a140d94a-bafc-446f-828e-93615be4fb7a', 'Unknown column \'dv.usuario_id\' in \'on clause\'', 'Error: Unknown column \'dv.usuario_id\' in \'on clause\'\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:588:63)\n    at getPropinaDetail (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1306:167)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1224:20\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:14:55'),
('6000eff2-cf5d-42dc-ad24-4c1ae7bd104e', 'GET /api/timers/active', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__03v5q-j._.js:665:63)\n    at TimerRepository.getActive (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3508:146)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3656:180\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__03v5q-j._.js:1189:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-06-01 13:36:48');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('687c8429-045a-43a6-8bd6-bf07b677cef0', 'GET /api/cashregister', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]\n    at CashRegisterRepository.mapCajaFromDB (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2090:163)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:40\n    at Array.map (<anonymous>)\n    at CashRegisterRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2369:18)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:13'),
('7030424e-f52d-455f-b532-87e19dfb6609', 'GET /api/events/detail/a140d94a-bafc-446f-828e-93615be4fb7a', 'Unknown column \'h.numero\' in \'field list\'', 'Error: Unknown column \'h.numero\' in \'field list\'\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u-2wda._.js:588:63)\n    at getPropinaDetail (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1262:165)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1224:26\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u-2wda._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:55'),
('7064e750-ad0d-487b-b0cb-6eb543e4991c', 'GET /api/timers/active', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:665:63)\n    at TimerRepository.getActive (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3508:146)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3656:180\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:1189:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-06-01 15:46:21'),
('76b7c3a4-81a0-4ffb-9492-3740e1212dc9', 'GET /api/cashregister/status', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11768:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:588:101)\n    at StatsRepository.getCajaGeneralStats (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:6376:146)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:6972:19\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 03:44:29'),
('8b4aa9fc-2568-4a08-a056-38949bbe7bf5', 'GET /api/events/detail/6cedee0c-2fa6-4932-9ce8-469a1c4986cb', 'Table \'lasmunecasderamon.anticipo_historial\' doesn\'t exist', 'Error: Table \'lasmunecasderamon.anticipo_historial\' doesn\'t exist\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:588:63)\n    at getAnticipoDetail (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1578:162)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1233:20\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 06:00:52'),
('92b93ac9-e36b-4792-91d8-1296eb2c6ebb', 'GET /api/events/stats', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u8mbek._.js:588:63)\n    at EventRepository.getStats (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__01wm6ad._.js:1245:146)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0k9jpzv._.js:1418:18\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u8mbek._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0nbm5~7._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0nbm5~7._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0nbm5~7._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 06:31:27'),
('9832d507-6a7e-441b-bb59-64f064a5e2c3', 'GET /api/events/detail/6cedee0c-2fa6-4932-9ce8-469a1c4986cb', 'Table \'lasmunecasderamon.anticipo_historial\' doesn\'t exist', 'Error: Table \'lasmunecasderamon.anticipo_historial\' doesn\'t exist\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:588:63)\n    at getAnticipoDetail (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1578:162)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1233:20\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 05:57:55'),
('9d21be33-081c-4147-aac6-f7b2b2fceb37', 'POST /api/notifications', 'Table \'lasmunecasderamon.push_tokens\' doesn\'t exist', 'Error: Table \'lasmunecasderamon.push_tokens\' doesn\'t exist\n    at s.execute (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0mybgcg._.js:41:254725)\n    at iW (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0mybgcg._.js:41:321549)\n    at Function.registerToken (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0xdwr7l._.js:50:688)\n    at /var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__05p8bbn._.js:16:1720\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async /var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__0m_r7t9._.js:12:1473\n    at async rB.do (/var/www/lasmunecasderamon/node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js:5:20926)\n    at async rB.handle (/var/www/lasmunecasderamon/node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js:5:25709)\n    at async u (/var/www/lasmunecasderamon/.next/server/chunks/[root-of-the-server]__05p8bbn._.js:16:4994)\n    at async rB.handleResponse (/var/www/lasmunecasderamon/node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js:1:119077)', NULL, '2026-06-19 15:25:14'),
('9d74d74f-5d18-4b98-bf96-17959cd03dbf', 'GET /api/sales', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11768:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u8mbek._.js:584:39)\n    at SaleRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u8mbek._.js:2903:161)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u8mbek._.js:4093:178\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u8mbek._.js:1112:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_05mel6e._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_05mel6e._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_05mel6e._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 06:52:40'),
('aa48d665-788f-4df4-9c0a-b6bb65809155', 'GET /api/cashregister/status', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11768:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:588:101)\n    at StatsRepository.getCajaGeneralStats (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:6389:146)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:6985:19\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 05:07:47'),
('aaa7b1b9-8b13-42dd-b0d0-1fe2db9ea93a', 'GET /api/timers/active', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0w17ewi._.js:588:63)\n    at TimerRepository.getActive (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0w17ewi._.js:3427:146)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0w17ewi._.js:3575:180\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0w17ewi._.js:1112:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 06:52:40');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('b0785ffc-958e-4e3e-a767-40355a57fb27', 'POST /api/sales', '[\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"habitacion_id\"\n    ],\n    \"message\": \"Invalid input: expected string, received number\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"habitacion_id\"\n    ],\n    \"message\": \"Invalid input: expected string, received number\"\n  }\n]\n    at SaleService.createSale (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u8mbek._.js:3795:180)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u8mbek._.js:4083:170\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u8mbek._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_05mel6e._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_05mel6e._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_05mel6e._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 02:55:54'),
('b6a5d530-b37e-4aa7-b6fc-854eb756e2f9', 'GET /api/events/detail/a140d94a-bafc-446f-828e-93615be4fb7a', 'Unknown column \'dv.usuario_id\' in \'on clause\'', 'Error: Unknown column \'dv.usuario_id\' in \'on clause\'\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:588:63)\n    at getPropinaDetail (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1306:167)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1224:20\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:14:56'),
('bb5f978f-21f5-4bdc-9778-7a56a366289c', 'GET /api/cashregister', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]\n    at CashRegisterRepository.mapCajaFromDB (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2090:163)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:40\n    at Array.map (<anonymous>)\n    at CashRegisterRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2369:18)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:23'),
('bb662a4b-61aa-40d3-9a55-a184187fdf58', 'GET /api/notifications/pending-count', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:665:63)\n    at NotificationRepository.getPendingCount (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0b-0r-e._.js:1330:160)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0b-0r-e._.js:1374:195\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:1266:16\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:1189:30\n    at async AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0hylx.8._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0hylx.8._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_0hylx.8._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-06-01 14:40:48'),
('bcc3235d-ce04-4b92-a47b-921c42ad0632', 'GET /api/cashregister', '[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]', 'ZodError: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"retiro_total\"\n    ],\n    \"message\": \"Invalid input: expected number, received string\"\n  }\n]\n    at CashRegisterRepository.mapCajaFromDB (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2090:163)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:40\n    at Array.map (<anonymous>)\n    at CashRegisterRepository.getAll (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2229:24)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async module.exports.GET.module (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:2369:18)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0a~9vyw._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0zn4x7w._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:31'),
('c6c55f70-dc7a-456f-897a-3230ffe49c4f', 'GET /api/events/stats', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u8mbek._.js:588:63)\n    at EventRepository.getStats (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__01wm6ad._.js:1245:146)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0k9jpzv._.js:1418:18\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u8mbek._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0nbm5~7._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0nbm5~7._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0nbm5~7._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 06:20:57'),
('c89b3102-4e6c-4edd-a058-8b72f31d39ef', 'GET /api/events/detail/6cedee0c-2fa6-4932-9ce8-469a1c4986cb', 'Table \'lasmunecasderamon.anticipo_historial\' doesn\'t exist', 'Error: Table \'lasmunecasderamon.anticipo_historial\' doesn\'t exist\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:588:63)\n    at getAnticipoDetail (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1578:162)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1233:20\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 05:57:55'),
('c907e2bf-406a-4a15-b29e-7aa7bcbc66ed', 'GET /api/cashregister/status', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:588:63)\n    at StatsRepository.getCajaGeneralStats (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:6316:168)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:6972:181\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:1112:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 03:44:45'),
('c9d0fbc8-4117-45fa-a4c9-3b25f7a728d2', 'GET /api/timers/active', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0hsa6xh._.js:665:63)\n    at TimerRepository.getActive (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3463:146)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3656:180\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0hsa6xh._.js:1189:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-06-01 15:51:41'),
('e37fdf6e-ffde-466d-a098-ce94394b9f17', 'POST /api/orders', 'Data truncated for column \'detalle_pedido_id\' at row 1', 'Error: Data truncated for column \'detalle_pedido_id\' at row 1\n    at PromisePoolConnection.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11352:26)\n    at trx (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:607:45)\n    at BaseRepository.insert (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:2909:15)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:3069:185\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async withTransaction (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:610:24)\n    at async OrderRepository.create (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:3039:9)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:3218:20\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0-7z8c8._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0p_qomu._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 03:07:35');
INSERT INTO `error_logs` (`id`, `endpoint`, `error_message`, `stack_trace`, `request_body`, `fecha_crea`) VALUES
('e87bcfae-d50f-4966-931c-ba5b21d1a36b', 'GET /api/timers/active', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.execute (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0hsa6xh._.js:665:63)\n    at TimerRepository.getActive (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3508:146)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vidam7._.js:3656:180\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\[root-of-the-server]__0hsa6xh._.js:1189:36\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:59:14)\n    at AppRouteRouteModule.do (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40179)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:50078\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:195:36\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NoopTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18093)\n    at ProxyTracer.startActiveSpan (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:18854)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:103\n    at NoopContextManager.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:7062)\n    at ContextAPI.with (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\@opentelemetry\\api\\index.js:1:518)\n    at NextTracerImpl.trace (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\trace\\tracer.js:164:28)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:49917\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47440\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47397\n    at AsyncLocalStorage.run (node:internal/async_local_storage/async_context_frame:63:14)\n    at AppRouteRouteModule.handle (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47351)\n    at async responseGenerator (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17747:32)\n    at async Module.handler (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\.next\\dev\\server\\chunks\\node_modules_next_01cbgxo._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (D:\\DEV\\lasmuñecasderamon.com\\lasmunecasderamon-dashboard\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-06-01 16:02:46'),
('f23d8822-8966-4e53-8d3a-a60c714b8ca5', 'GET /api/cashregister/status', 'read ECONNRESET', 'Error: read ECONNRESET\n    at PromisePool.query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11768:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:588:101)\n    at StatsRepository.getCajaGeneralStats (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:6389:146)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:6985:19\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0vf8id8._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_036r1cn._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 06:20:57'),
('fba4a5ec-b3e2-4dbc-b0c4-c50218531090', 'GET /api/events/detail/a140d94a-bafc-446f-828e-93615be4fb7a', 'Unknown column \'h.numero\' in \'field list\'', 'Error: Unknown column \'h.numero\' in \'field list\'\n    at PromisePool.execute (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_mysql2_0_b5.ib._.js:11783:26)\n    at query (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u-2wda._.js:588:63)\n    at getPropinaDetail (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1262:165)\n    at E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0lpbltd._.js:1224:26\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\[root-of-the-server]__0u-2wda._.js:1112:30\n    at async AppRouteRouteModule.do (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:40115)\n    at async AppRouteRouteModule.handle (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:5:47321)\n    at async responseGenerator (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17684:38)\n    at async AppRouteRouteModule.handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\compiled\\next-server\\app-route-turbo.runtime.dev.js:1:227216)\n    at async handleResponse (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17747:32)\n    at async Module.handler (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\.next\\dev\\server\\chunks\\node_modules_next_0cmxla3._.js:17801:13)\n    at async DevServer.renderToResponseWithComponentsImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1454:9)\n    at async DevServer.renderPageComponent (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1506:24)\n    at async DevServer.renderToResponseImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1556:32)\n    at async DevServer.pipeImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:1043:25)\n    at async NextNodeServer.handleCatchallRenderRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\next-server.js:338:17)\n    at async DevServer.handleRequestImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\base-server.js:934:17)\n    at async E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:394:20\n    at async Span.traceAsyncFn (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\trace\\trace.js:164:20)\n    at async DevServer.handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\dev\\next-dev-server.js:390:24)\n    at async invokeRender (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:266:21)\n    at async handleRequest (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:465:24)\n    at async requestHandlerImpl (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\router-server.js:514:13)\n    at async Server.requestListener (E:\\Proyects\\lasmunecasderamon.com\\lasmunecasderamon\\node_modules\\next\\dist\\server\\lib\\start-server.js:225:13)', NULL, '2026-05-27 04:02:56');

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
('a9abdeee-010b-4042-a676-e8ed747a09f5', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', 60000, 'Tensión a clientes VIP', 2, '2026-06-18 17:32:45', NULL);

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
('40866998-ba4a-47e2-96f8-edf9b299189a', 'Privado 1', 1, 30000, 2, NULL, 1, '2026-05-21 23:32:30', '2026-05-27 03:04:49', NULL),
('49a38e08-e87a-4c6c-a091-15fe770d350c', 'Privado 3', 3, 30000, 2, NULL, 1, '2026-05-21 23:33:17', '2026-05-27 03:23:24', NULL),
('6b2842aa-2b1d-4e62-8d65-3528617d3b15', 'Vip 4', 4, 0, 0, 0, 1, '2026-05-21 23:33:53', '2026-05-27 02:32:20', NULL),
('7170a56b-6b4d-4e5a-a333-3e9807bc5206', 'Privado 5', 5, 30000, 2, NULL, 1, '2026-05-21 23:34:22', '2026-05-21 23:39:13', NULL),
('c3c383c5-5136-4513-9444-7d236ea8a913', 'Jacuzzi 6', 6, 500000, 15, 100000, 1, '2026-05-21 23:34:49', '2026-06-01 14:41:15', NULL),
('cc44f542-a0f5-48c8-a239-d1040cce2c0f', 'Privado 2', 2, 30000, 2, NULL, 1, '2026-05-21 23:32:48', '2026-05-21 23:39:13', NULL);

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
('19805179-bc99-4039-9620-d0c2b839f67a', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', '2026-06-13 12:23:53', 0, NULL, 0),
('923b6917-1d01-4e38-9eb1-d93787b345ba', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '2026-06-16 10:07:51', 1, '2800:320:ce18:8c00:a4bc:a2d7:4c1d:e8c8', 1),
('97d663ca-0330-42ce-b669-5632f9d966da', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', '2026-06-19 15:22:17', 1, NULL, 0),
('a5c7e3d5-d3d3-4f2d-8ae7-dfdc233bc21b', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', '2026-06-18 16:06:12', 0, NULL, 0),
('f0e2b488-822b-4b64-8870-1cb1d57b0ed4', '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', '2026-06-15 16:49:57', 0, NULL, 0);

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

--
-- Volcado de datos para la tabla `pedidos`
--

INSERT INTO `pedidos` (`id_pedido`, `codigo`, `mesero_id`, `cliente_id`, `subtotal`, `total`, `propina`, `total_comision`, `fecha_crea`, `fecha_mod`, `fecha_baja`, `estado`) VALUES
('4caee060-c487-45b4-8825-68786bbfb81b', 'YK9FWMEA', '56f3469c-a6ee-4263-9c4e-9a3063021346', NULL, 40000, 40000, 4000, 15000, '2026-05-27 03:13:45', NULL, NULL, 0),
('52b4a2bb-bb19-481c-8dc3-36036603f003', 'VZQK8RQ5', '56f3469c-a6ee-4263-9c4e-9a3063021346', NULL, 30000, 30000, 3000, 10000, '2026-05-27 02:54:42', NULL, NULL, 0),
('6d759b18-57ef-4de7-915d-fa83c497737b', 'O2M7ED99', '56f3469c-a6ee-4263-9c4e-9a3063021346', NULL, 30000, 30000, 3000, 0, '2026-05-27 02:41:12', NULL, NULL, 0),
('afa71557-8c41-4e88-9cf1-958f32144d94', '1BWDGLGD', '56f3469c-a6ee-4263-9c4e-9a3063021346', NULL, 30000, 30000, 3000, 0, '2026-06-15 16:57:51', NULL, NULL, 0),
('befea001-49c0-4da8-bad1-355c981371bc', 'L7TDRXM0', '56f3469c-a6ee-4263-9c4e-9a3063021346', NULL, 10000, 10000, 0, 0, '2026-06-12 20:49:55', NULL, NULL, 1),
('def70538-8a36-46e1-96e5-40d03f0e22b1', 'N5LZQ3P3', '56f3469c-a6ee-4263-9c4e-9a3063021346', NULL, 10000, 10000, 0, 0, '2026-06-12 20:51:06', NULL, NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos_usuarios`
--

CREATE TABLE `pedidos_usuarios` (
  `id_pedido_usuario` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pedido_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pedidos_usuarios`
--

INSERT INTO `pedidos_usuarios` (`id_pedido_usuario`, `usuario_id`, `pedido_id`) VALUES
('ba347e3d-ad21-4aa1-bbf6-b300af5e41d9', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '52b4a2bb-bb19-481c-8dc3-36036603f003'),
('e60727b7-9fb0-4186-af93-e2c9dc80e93a', '1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '4caee060-c487-45b4-8825-68786bbfb81b');

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
  `foto` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default.png',
  `max_anfitrionas` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `codigo`, `nombre`, `categoria_id`, `display_order`, `precio`, `comision`, `descripcion`, `fecha_crea`, `fecha_mod`, `fecha_baja`, `estado`, `foto`) VALUES
('258d0063-81a3-48c1-b3bb-af83859bb3df', '98F59VOC', 'Champaña $120.000', '4101431f-c5d0-4745-8252-6d8707847d69', 1, 120000, 40000, 'Champaña chicas', '2026-05-21 23:41:17', '2026-05-22 00:57:20', NULL, 1, 'product_1779421276990.webp'),
('2cd4a2ba-f015-4664-9247-81de487c7335', 'V2SLT7FC', 'Corona 330ml', 'ab4206d5-b6c0-439b-84d8-5f2326ffd74d', 1, 10000, 0, 'Cerveza cliente', '2026-05-21 23:18:21', '2026-05-22 02:58:20', NULL, 1, 'product_2cd4a2ba-f015-4664-9247-81de487c7335_1779425174957.webp'),
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
('0c475fd4-6c51-4c56-a4f2-747f09e7cef1', 'f4f28443-836c-4100-810d-fa914fe9995b', 3000, '2026-05-27 02:59:49', NULL, 1),
('47f0880e-bb4a-4368-86c3-c3c84f4205a6', 'e3290475-7dde-4b27-b9f5-2c053cc3f2c2', 3000, '2026-05-27 02:44:02', NULL, 1),
('747d7612-336a-4fdc-8d8e-d7d4acdc804a', 'e014a678-da7a-4ddb-88a9-393311f0ad22', 3000, '2026-06-15 16:58:47', NULL, 1),
('c27b8da4-2958-461f-84c5-e0902922309e', 'ff4fc225-a97f-4c05-95c4-ee8b8a518726', 4000, '2026-05-27 03:14:07', NULL, 1);

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

--
-- Volcado de datos para la tabla `retiros_caja`
--

INSERT INTO `retiros_caja` (`id_retiro`, `caja_id`, `monto`, `motivo`, `usuario_id`, `fecha_retiro`) VALUES
('9e838704-39f8-4fb4-b59b-0003752c8066', '1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', 10000, 'gastos', '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-05-27 03:38:05');

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

--
-- Volcado de datos para la tabla `servicios`
--

INSERT INTO `servicios` (`id_servicio`, `codigo`, `cliente_id`, `habitacion_id`, `precio_habitacion`, `precio_servicio`, `iva`, `sub_total`, `total`, `tiempo`, `metodo_pago`, `caja_id`, `fecha_crea`, `fecha_mod`, `estado`, `es_temporal`, `servicio_original_id`, `created_by`, `paused_at`, `push_notified_5m`, `push_notified_end`, `pagos_mixtos`) VALUES
('28dcba8c-f938-432e-9752-70f7d6ae7953', 'EMUUKQ8M', NULL, '49a38e08-e87a-4c6c-a091-15fe770d350c', 30000, 50000, 0, 80000, 80000, 2, 'transferencia', '1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', '2026-05-27 03:21:24', '2026-05-27 03:23:25', 1, 0, NULL, '641f3837-3fc2-4ddf-8d03-de7501a62756', NULL, 0, 0, NULL),
('694ead87-2850-46d5-b94b-743ddb9e5408', 'PJXYA3I4', NULL, 'c3c383c5-5136-4513-9444-7d236ea8a913', 500000, 0, 0, 0, 500000, 15, 'tarjeta', '1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', '2026-05-30 07:22:24', '2026-05-30 07:25:03', 1, 0, NULL, '641f3837-3fc2-4ddf-8d03-de7501a62756', NULL, 0, 0, NULL),
('6d72be68-0450-44d6-b7bc-f04b69905437', '5PWVWH3V', '89d12f77-e6b3-4f34-9c0f-4b2dcb9bd6fd', 'c3c383c5-5136-4513-9444-7d236ea8a913', 30000, 50000, 0, 50000, 80000, 2, 'efectivo', '1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', '2026-06-01 14:27:39', '2026-06-01 14:30:22', 0, 1, 'ff39fcfd-e376-44ea-b9b5-a53db883cfe7', '641f3837-3fc2-4ddf-8d03-de7501a62756', NULL, 0, 0, NULL),
('848bd817-5740-4297-9fde-0fc20b5f9a5b', '8YNAUOPC', '89d12f77-e6b3-4f34-9c0f-4b2dcb9bd6fd', 'c3c383c5-5136-4513-9444-7d236ea8a913', 500000, 0, 0, 0, 500000, 15, 'tarjeta', '1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', '2026-06-01 14:10:03', '2026-06-01 14:25:34', 1, 0, NULL, '641f3837-3fc2-4ddf-8d03-de7501a62756', NULL, 0, 0, NULL),
('d7d480f6-6b06-4a72-8b38-fb1cf77c0821', 'OIKMODIU', NULL, 'c3c383c5-5136-4513-9444-7d236ea8a913', 30000, 50000, 0, 50000, 80000, 2, 'efectivo', '1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', '2026-05-30 07:21:03', '2026-05-30 07:23:30', 0, 1, '694ead87-2850-46d5-b94b-743ddb9e5408', '641f3837-3fc2-4ddf-8d03-de7501a62756', NULL, 0, 0, NULL),
('ff39fcfd-e376-44ea-b9b5-a53db883cfe7', 'Q7NJUBUD', '89d12f77-e6b3-4f34-9c0f-4b2dcb9bd6fd', 'c3c383c5-5136-4513-9444-7d236ea8a913', 500000, 0, 0, 0, 500000, 15, 'efectivo', '1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', '2026-06-01 14:29:29', '2026-06-01 14:41:14', 1, 0, NULL, '641f3837-3fc2-4ddf-8d03-de7501a62756', NULL, 0, 0, NULL);

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

--
-- Volcado de datos para la tabla `solicitudes_servicios`
--

INSERT INTO `solicitudes_servicios` (`id_solicitud`, `codigo`, `cliente_id`, `habitacion_id`, `precio_servicio`, `iva`, `precio_habitacion`, `comision_anfitriona`, `anfitrionas_ids`, `num_clientes`, `metodo_pago`, `tiempo`, `total`, `solicitado_por`, `estado`, `motivo_rechazo`, `procesado_por`, `fecha_solicitud`, `fecha_procesamiento`) VALUES
('eda737e5-fed6-4dc0-82f5-59bf1feabdc9', 'GO7G8SO4', NULL, '49a38e08-e87a-4c6c-a091-15fe770d350c', 50000.00, 0, 30000.00, 0.00, '[\"1f5a13f4-3834-45e2-bb8d-4b73727aad7f\"]', 1, 'transferencia', 2, 80000.00, '56f3469c-a6ee-4263-9c4e-9a3063021346', 'aprobada', NULL, '641f3837-3fc2-4ddf-8d03-de7501a62756', '2026-05-27 03:20:49', '2026-05-27 03:21:25');

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
  `qr_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `run`, `nick`, `nombre`, `apellido`, `direccion`, `telefono`, `estado_civil`, `afp`, `aporte`, `sueldo`, `descuento`, `email`, `password`, `rol_id`, `foto`, `estado`, `estado_servicio`, `fecha_crea`, `fecha_mod`, `fecha_baja`, `push_token`, `qr_token`) VALUES
('1f5a13f4-3834-45e2-bb8d-4b73727aad7f', '12345678', 'Lizi', 'Lizeth', 'Villa Pardo', 'Av Germán bush', '68536989', 'Casado/a', 'AFP', 1500, 15000, 0, 'Lizi@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$/G2PaeoDepu7s1o1SRMNsw$RZUVeJYCejAVhsImgcQf/DeC9lWvaMgevdOPpMz5QnA', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'default.png', 1, 0, '0000-00-00 00:00:00', '2026-06-16 11:02:35', NULL, NULL, '35b8c70755fc551e4e8e3c88597ef47f'),
('56f3469c-a6ee-4263-9c4e-9a3063021346', '123456789', 'Sebas', 'Sebastias Fernando', 'Flores Llamos', 'Av/colon', '75415263', 'Casado/a', 'AFP', 2000, 25000, 0, 'Sebas@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$T6XCARAtuQpgNzqp4gBIvg$4VRkDGZx7cSnEegccMGK3wVyvaJPT1zmtXGdq2wlWq4', 'fbd81d2c-52fc-463b-b4cf-076fc9302e20', 'default.png', 1, 0, '0000-00-00 00:00:00', '2026-04-05 08:35:40', NULL, NULL, 'be84cce18de6a2086b01177606599431'),
('641f3837-3fc2-4ddf-8d03-de7501a62756', '10571705', 'Admin', 'Jhonatan', 'Ancasi Flores', 'Av/colon', '72419112', 'Soltero/a', 'AFP', 0, 0, 0, 'Admin@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$L761WxD3Zy3zFDs9nYqiOA$8WETDSyxTxZOkdoOWzLitBZo9lFkIW40W2OkHMUgnjQ', '3c4ae24a-700a-436d-8bb8-d44e6d45b007', 'default.png', 1, 1, '2026-03-25 22:15:59', NULL, NULL, NULL, NULL),
('6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', '10101010', 'Pepe', 'Pablo', 'Lopez Reinoso', 'Av Gan Chaco', '78459632', 'Casado/a', 'AFP', 2000, 20000, 0, 'Pepe@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$wXXDwLVsgNV4TrbKougnhw$c6slf00yQlUPt2PYKsoD3MlG8UG/+bf2HGpK9Pa5Qf8', '8bb76943-c1ec-46ae-ab32-76d35e9726e0', 'default.png', 1, 0, '0000-00-00 00:00:00', '2026-06-02 10:37:57', NULL, NULL, '7d98845bb271f126d9ee37e610807444'),
('d3bb0229-9c64-4d6d-b239-c1ae93b2adb3', '145923999', 'Lola', 'Paola', 'Mendez Perez', 'Av/colon', '75965412', 'Soltero/a', 'AFP', 1500, 15000, 0, 'Lola@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$5m5I68vh5zjLGCCGroSq5g$QgHZtOdlYlNkVpqLYuoTEho5R2nQefgSflDhzOuQsGc', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'user_1774587802530.webp', 1, 0, '2026-03-27 01:45:30', '2026-05-21 23:57:48', NULL, NULL, '218fd3b8494542f3f549d914dcfd9d11'),
('dec5d722-ead5-4c75-80d5-8be64856f0c5', '987654321', 'Sami', 'Samanta', 'Cordova', 'Av/colon', '78456532', 'Soltero/a', 'AFP', 1500, 15000, 500, 'Sami@lasmuñecasderamon.com', '$argon2id$v=19$m=65536,t=3,p=4$fV8JKIsBBnW83PX/uW4YuA$bXaI+WzVe+OczGAPpkmVngrGWgoIZNmYzeA0tiWS0yA', '0b178ca4-559a-43f1-bacf-25cb7eecb3e2', 'default.png', 1, 0, '2026-03-27 01:23:08', '2026-04-06 13:26:29', NULL, NULL, '482100ac3b3a6950827dbc1c464c1064');

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

INSERT INTO `ventas` (`id_venta`, `codigo`, `cliente_id`, `pedido_id`, `caja_id`, `habitacion_id`, `metodo_pago`, `propina`, `sub_total`, `total`, `total_comision`, `tiempo`, `fecha_crea`, `fecha_mod`, `estado`, `created_by`, `paused_at`, `cuenta_id`, `push_notified_5m`, `push_notified_end`, `pagos_mixtos`) VALUES
('e014a678-da7a-4ddb-88a9-393311f0ad22', 'S3SV9RKF', NULL, 'afa71557-8c41-4e88-9cf1-958f32144d94', '1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', NULL, 'tarjeta', 3000, 30000, 33000, 0, 0, '2026-06-15 16:58:47', NULL, 1, '6d1c09f9-920b-4aa5-a3cf-0c70685f0ccb', NULL, NULL, 0, 0, NULL),
('e3290475-7dde-4b27-b9f5-2c053cc3f2c2', '1G9OOCR9', NULL, '6d759b18-57ef-4de7-915d-fa83c497737b', '1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', NULL, 'tarjeta', 3000, 30000, 33000, 0, 0, '2026-05-27 02:44:01', NULL, 1, '641f3837-3fc2-4ddf-8d03-de7501a62756', NULL, NULL, 0, 0, NULL),
('f4f28443-836c-4100-810d-fa914fe9995b', 'KAN7A68B', NULL, '52b4a2bb-bb19-481c-8dc3-36036603f003', '1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', '40866998-ba4a-47e2-96f8-edf9b299189a', 'efectivo', 3000, 30000, 33000, 10000, 5, '2026-05-27 02:59:48', '2026-05-27 03:04:49', 1, '641f3837-3fc2-4ddf-8d03-de7501a62756', NULL, NULL, 0, 0, NULL),
('ff4fc225-a97f-4c05-95c4-ee8b8a518726', '2U38I9J9', NULL, '4caee060-c487-45b4-8825-68786bbfb81b', '1ea1a680-cb6f-4109-a25b-4fe4eb54b5e3', '49a38e08-e87a-4c6c-a091-15fe770d350c', 'efectivo', 4000, 40000, 44000, 15000, 5, '2026-05-27 03:14:06', '2026-05-27 03:19:06', 1, '641f3837-3fc2-4ddf-8d03-de7501a62756', NULL, NULL, 0, 0, NULL);

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
  ADD KEY `idx_entregado_por` (`entregado_por`);

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
  ADD KEY `idx_detalle_ventas_producto_id` (`producto_id`);

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
  ADD PRIMARY KEY (`id_hora_extra`);

--
-- Indices de la tabla `logins`
--
ALTER TABLE `logins`
  ADD PRIMARY KEY (`id_login`),
  ADD KEY `fk_login_usuarios` (`usuario_id`);

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
  ADD KEY `fk_servicios_created_by` (`created_by`),
  ADD KEY `idx_servicios_estado_fecha` (`estado`,`fecha_crea`);

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
  ADD KEY `fk_ventas_created_by` (`created_by`),
  ADD KEY `idx_ventas_estado_fecha` (`estado`,`fecha_crea`);

--
-- Indices de la tabla `ventas_usuarios`
--
ALTER TABLE `ventas_usuarios`
  ADD PRIMARY KEY (`id_usuario_venta`),
  ADD KEY `fk_ventas_usuarios_usuario_id` (`usuario_id`),
  ADD KEY `fk_ventas_usuarios_venta_id` (`venta_id`);

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
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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

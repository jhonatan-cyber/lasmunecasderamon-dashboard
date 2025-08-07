import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { Client } from "@/types/client";
import { RowDataPacket } from "mysql2/promise";



// Simulación de base de datos temporal
interface ClientWithRowData extends Client, RowDataPacket {}

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Obtener lista de clientes
 *     description: Obtiene la lista completa de clientes del sistema con paginación y filtros
 *     tags: [Clientes]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de elementos por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda (nombre, email, teléfono)
 *       - in: query
 *         name: estado
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: Filtrar por estado (0=inactivo, 1=activo)
 *     responses:
 *       200:
 *         description: Lista de clientes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Client'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     pages:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Crear nuevo cliente
 *     description: Crea un nuevo cliente en el sistema
 *     tags: [Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - email
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Juan Pérez"
 *                 description: Nombre completo del cliente
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan@example.com"
 *                 description: Email del cliente
 *               telefono:
 *                 type: string
 *                 example: "+1234567890"
 *                 description: Número de teléfono
 *               direccion:
 *                 type: string
 *                 example: "Calle 123, Ciudad"
 *                 description: Dirección del cliente
 *               estado:
 *                 type: integer
 *                 default: 1
 *                 example: 1
 *                 description: Estado del cliente (0=inactivo, 1=activo)
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Client'
 *                 message:
 *                   type: string
 *                   example: "Cliente creado exitosamente"
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Cliente ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method, query: queryParams, body } = req;
    switch (method) {
      case "GET": {
        if (queryParams.id) {
          const id = parseInt(queryParams.id as string);
          const results = await query(
            "CALL get_client_by_id(?)",
            [id]
          ) as any[];
          const clients = Array.isArray(results[0]) ? results[0] : results;
          if (clients.length === 0) {
            return res.status(404).json({ message: "Cliente no encontrado" });
          }
          const client = clients[0];
          return res.status(200).json({
            id: client.id_cliente,
            run: client.run,
            name: client.nombre,
            lastName: client.apellido,
            phone: client.telefono,
            created_at: client.fecha_crea,
            updated_at: client.fecha_mod,
            status: client.estado,
          });
        } else {
          const results = await query(
            "CALL get_all_client()"
          ) as any[];
          const clients = Array.isArray(results[0]) ? results[0] : results;
          const formattedClients = clients.map((client) => ({
            id: client.id_cliente,
            run: client.run,
            name: client.nombre,
            lastName: client.apellido,
            phone: client.telefono,
            created_at: client.fecha_crea,
            updated_at: client.fecha_mod,
            status: client.estado,
          }));
          return res.status(200).json(formattedClients);
        }
      }

      case "POST": {
        const { run = "", name, lastName, phone = "" } = body;
        if (!name || !lastName) {
          return res
            .status(400)
            .json({ message: "Faltan parámetros requeridos" });
        }
        await query("CALL add_client(?, ?, ?, ?)", [
          run,
          name,
          lastName,
          phone,
        ]);
        const dbResponse = await query("SELECT LAST_INSERT_ID() as id");
        console.log("DB response al crear cliente:", dbResponse);
        return res
          .status(201)
          .json({ message: "Cliente creado correctamente", dbResponse });
      }

      case "PUT": {
        const { run, name, lastName, phone, id } = body;
        if (!id || !name || !lastName) {
          return res
            .status(400)
            .json({ message: "Faltan parámetros requeridos" });
        }
        await query("CALL update_client(?, ?, ?, ?, ?)", [
          run,
          name,
          lastName,
          phone,
          id,
        ]);
        return res
          .status(200)
          .json({ message: "Cliente actualizado correctamente" });
      }
      case "DELETE": {
        const { id } = queryParams;
        if (!id || Array.isArray(id)) {
          return res.status(400).json({ message: "ID de cliente no válido" });
        }
        try {
          await query("CALL delete_client(?)", [id]);
          return res
            .status(200)
            .json({ message: "Cliente eliminado correctamente" });
        } catch (error) {
          console.error("Error al eliminar el cliente:", error);
          return res
            .status(500)
            .json({ message: "Error al eliminar el cliente" });
        }
      }
    }
  } catch (error) {
    console.error("Error en API de clientes:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

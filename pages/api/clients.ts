import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { Client } from "@/types/client";
import { RowDataPacket } from "mysql2/promise";

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

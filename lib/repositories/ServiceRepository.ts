import {
  approveAnulacionServicio,
  getAllServicios,
  rawInsertServicio,
  updateServicio,
  updateServicioStatus,
  deleteServicio,
  getServiciosByDates,
  getServiciosByUser,
  getServicioById,
  requestAnulacionServicio,
  processAnulacionServicio
} from './service/ServiceQueries';

export class ServiceRepository {
  static approveAnulacion = approveAnulacionServicio;
  static getAll = getAllServicios;
  static rawInsert = rawInsertServicio;
  static updateService = updateServicio;
  static updateStatus = updateServicioStatus;
  static delete = deleteServicio;
  static getByDates = getServiciosByDates;
  static getByUser = getServiciosByUser;
  static getById = getServicioById;
  static requestAnulacion = requestAnulacionServicio;
  static processAnulacion = processAnulacionServicio;
}

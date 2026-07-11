import {
  getAllAnticipos,
  getAnticiposByUser,
  getAnticiposByDates,
  grantAnticipo,
  requestAnticipo,
  updateAnticipoStatus,
  processSolicitudAnticipo,
  deliverAnticipo
} from './anticipo/AnticipoQueries';

export class AnticipoRepository {
  static getAll = getAllAnticipos;
  static getByUser = getAnticiposByUser;
  static getByDates = getAnticiposByDates;
  static grant = grantAnticipo;
  static request = requestAnticipo;
  static updateStatus = updateAnticipoStatus;
  static processSolicitud = processSolicitudAnticipo;
  static deliverAnticipo = deliverAnticipo;
}

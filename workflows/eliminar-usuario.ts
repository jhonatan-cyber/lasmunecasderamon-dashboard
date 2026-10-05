import 'server-only';
import { UserService } from '@/modules/identidad';
import { eliminarPlantillasLocales } from '@/modules/asistencia';
import { enUnaUnidad } from '@/lib/transaccion/contrato';

export async function eliminarUsuario(id: string | number) {
  const usuarioId = String(id);
  const usuario = await UserService.getById(usuarioId);
  return enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      if (usuario) await eliminarPlantillasLocales(usuarioId, contexto);
      await UserService.delete(usuarioId, contexto);
    })
  );
}

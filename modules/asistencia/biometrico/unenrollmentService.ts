import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { obtenerResumenUsuario, quitarModalidadesBiometricas } from '@/modules/identidad';
import { eliminarPlantillasUsuario } from './unenrollmentRepositorio';
import { NotFoundError } from '@/lib/errors/errors';

export async function desenrolarUsuario(usuarioId: string) {
  const usuario = await obtenerResumenUsuario(usuarioId);
  if (!usuario) throw new NotFoundError('Usuario', usuarioId);
  await enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      await eliminarPlantillasUsuario(usuarioId, contexto);
      await quitarModalidadesBiometricas(usuarioId, contexto);
    })
  );
  return { ok: true, mensaje: 'Usuario desenrolado del sistema correctamente.' };
}

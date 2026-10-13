import * as repositorio from './repositorio';
export function ocuparAnfitrionasServicio(
  ...args: Parameters<typeof repositorio.ocuparAnfitrionasServicio>
) {
  return repositorio.ocuparAnfitrionasServicio(...args);
}

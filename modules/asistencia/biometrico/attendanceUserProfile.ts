export const ATTENDANCE_USER_FIELDS = {
  doorCount: 172,
  doors: 176,
  timeCount: 304,
  times: 308,
  validFrom: 952,
  validTo: 976
} as const;

export function completarPerfilAsistencia(
  info: Buffer,
  year = new Date().getUTCFullYear()
): boolean {
  const fields = ATTENDANCE_USER_FIELDS;
  let changed = false;
  if (info.readInt32LE(fields.doorCount) === 0) {
    info.writeInt32LE(1, fields.doorCount);
    info.writeInt32LE(0, fields.doors);
    changed = true;
  }
  if (info.readInt32LE(fields.timeCount) === 0) {
    const doors = info.readInt32LE(fields.doorCount);
    if (doors < 1 || doors > 32) throw new Error('Cantidad de canales del lector inválida');
    info.writeInt32LE(doors, fields.timeCount);
    for (let i = 0; i < doors; i++) info.writeInt32LE(255, fields.times + i * 4);
    changed = true;
  }
  for (const [offset, date] of [
    [fields.validFrom, [year, 1, 1, 0, 0, 0]],
    [fields.validTo, [year + 10, 12, 31, 23, 59, 59]]
  ] as const) {
    if (info.readInt32LE(offset) !== 0) continue;
    date.forEach((value, index) => info.writeInt32LE(value, offset + index * 4));
    changed = true;
  }
  return changed;
}

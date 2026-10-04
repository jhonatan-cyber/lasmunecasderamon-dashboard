// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { completarPerfilAsistencia } from '@/modules/asistencia/biometrico/attendanceUserProfile';

describe('perfil de asistencia del lector', () => {
  it('conserva permisos restringidos y vigencia existente incluso si venció', () => {
    const info = Buffer.alloc(65536);
    info.writeInt32LE(2, 172);
    info.writeInt32LE(3, 176);
    info.writeInt32LE(4, 180);
    info.writeInt32LE(2, 304);
    info.writeInt32LE(7, 308);
    info.writeInt32LE(8, 312);
    info.writeInt32LE(2020, 952);
    info.writeInt32LE(2021, 976);
    const antes = Buffer.from(info);
    expect(completarPerfilAsistencia(info, 2026)).toBe(false);
    expect(info).toEqual(antes);
  });

  it('asigna un horario por canal cuando solo faltan los horarios', () => {
    const info = Buffer.alloc(65536);
    info.writeInt32LE(2, 172);
    info.writeInt32LE(3, 176);
    info.writeInt32LE(4, 180);
    completarPerfilAsistencia(info, 2026);
    expect(info.readInt32LE(304)).toBe(2);
    expect(info.readInt32LE(308)).toBe(255);
    expect(info.readInt32LE(312)).toBe(255);
    expect(info.readInt32LE(176)).toBe(3);
    expect(info.readInt32LE(180)).toBe(4);
  });
});

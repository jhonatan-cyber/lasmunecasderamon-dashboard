import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import { getEmployeeModules } from '@/lib/constants/employee-modules';
const dashboard = process.cwd();
const expo = process.env.EXPO_PARITY_ROOT || path.resolve(dashboard, '../lasmunecasderamon-app');
it.each(['cajero', 'barman', 'garzon', 'anfitriona'])(
  'mantiene los módulos personales de %s disponibles en ambas plataformas',
  role => {
    const modules = getEmployeeModules(role);
    expect(modules.map(item => item.key)).toEqual(
      role === 'anfitriona'
        ? ['asistencias', 'anticipos', 'comisiones', 'servicios', 'calendar']
        : ['asistencias', 'anticipos', 'propinas', 'horas-extras', 'calendar']
    );
    for (const item of modules) {
      expect(
        fs.existsSync(path.join(dashboard, 'app', item.href.slice(1), 'page.tsx')),
        item.href
      ).toBe(true);
      if (item.key === 'calendar') {
        expect(
          fs.readFileSync(path.join(expo, 'components/screens/HomeScreen.tsx'), 'utf8')
        ).toContain('PremiumCalendar');
        continue;
      }
      const screen = item.key === 'asistencias' ? 'asistencia' : item.key;
      expect(
        fs.existsSync(path.join(expo, 'app/(app)', role, '(tabs)', screen + '.tsx')),
        role + '/' + screen
      ).toBe(true);
    }
  }
);
it.each(['cajero', 'barman', 'garzon'])(
  'comparte las pantallas de propinas y horas extras de %s en Expo',
  role => {
    for (const [file, screen] of [
      ['propinas', 'PropinasScreen'],
      ['horas-extras', 'HorasExtrasScreen']
    ])
      expect(
        fs.readFileSync(path.join(expo, 'app/(app)', role, '(tabs)', file + '.tsx'), 'utf8')
      ).toContain('@/components/screens/' + screen);
  }
);

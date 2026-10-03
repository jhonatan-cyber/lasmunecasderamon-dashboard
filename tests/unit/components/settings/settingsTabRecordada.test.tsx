import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Settings from '@/app/settings/page';

// Cada tab se sustituye por un panel con su nombre: el test así no depende de los
// fetch que hace cada configuración real, sólo de qué panel está montado.
vi.mock('@/components/settings/SettingsCompanyTab', () => ({
  SettingsCompanyTab: () => <div>panel-empresa</div>
}));
vi.mock('@/components/settings/SettingsBillingTab', () => ({
  SettingsBillingTab: () => <div>panel-facturacion</div>
}));
vi.mock('@/components/settings/SettingsPermissionsTab', () => ({
  SettingsPermissionsTab: () => <div>panel-permisos</div>
}));
vi.mock('@/components/settings/SettingsMaintenanceTab', () => ({
  SettingsMaintenanceTab: () => <div>panel-mantenimiento</div>
}));
vi.mock('@/components/settings/SettingsLogsTab', () => ({
  SettingsLogsTab: () => <div>panel-logs</div>
}));
vi.mock('@/components/settings/SettingsAttendanceTab', () => ({
  SettingsAttendanceTab: () => <div>panel-asistencia</div>
}));
vi.mock('@/components/settings/SettingsBarTab', () => ({
  SettingsBarTab: () => <div>panel-bar</div>
}));
vi.mock('@/components/settings/SettingsWhatsAppTab', () => ({
  SettingsWhatsAppTab: () => <div>panel-whatsapp</div>
}));
vi.mock('@/components/settings/KioskDevices', () => ({ KioskDevices: () => <div>kiosk</div> }));
vi.mock('@/components/settings/BiometricDevices', () => ({
  BiometricDevices: () => <div>biometrico-dispositivos</div>
}));
vi.mock('@/components/settings/BiometricStatus', () => ({
  BiometricStatus: () => <div>biometrico-estado</div>
}));
vi.mock('@/components/settings/SettingsBottleHostessCard', () => ({
  SettingsBottleHostessCard: () => <div>card-anfitrionas</div>
}));
vi.mock('@/components/settings/SettingsServiceLevelsCard', () => ({
  SettingsServiceLevelsCard: () => <div>card-niveles</div>
}));

beforeEach(() => {
  window.localStorage.clear();
});

/**
 * Un click de verdad es mousedown → mouseup → click, y Radix cambia de tab en el
 * mousedown: con `fireEvent.click` a secas el tab no se movería y el test probaría otra
 * cosa que la que hace el usuario.
 */
function abrirTab(nombre: string) {
  const trigger = screen.getByRole('tab', { name: nombre });
  fireEvent.mouseDown(trigger);
  fireEvent.click(trigger);
}

afterEach(() => {
  cleanup();
});

describe('pestaña activa de Configuraciones', () => {
  it('abre en Empresa la primera vez', async () => {
    render(<Settings />);

    expect(await screen.findByText('panel-empresa')).toBeInTheDocument();
    expect(screen.queryByText('panel-bar')).not.toBeInTheDocument();
  });

  it('al recargar vuelve al tab que estaba abierto, no al primero', async () => {
    render(<Settings />);
    abrirTab('Bar');
    expect(await screen.findByText('panel-bar')).toBeInTheDocument();

    // Recarga: la página se desmonta y vuelve a montar desde cero.
    cleanup();
    render(<Settings />);

    expect(await screen.findByText('panel-bar')).toBeInTheDocument();
    expect(screen.queryByText('panel-empresa')).not.toBeInTheDocument();
  });

  it('el tab elegido queda guardado para la próxima visita', async () => {
    render(<Settings />);
    abrirTab('Logs');

    expect(await screen.findByText('panel-logs')).toBeInTheDocument();
    expect(window.localStorage.getItem('settings_tab')).toBe('logs');
  });

  it('un tab guardado que ya no existe no deja la página en blanco', async () => {
    window.localStorage.setItem('settings_tab', 'tab-eliminado');

    render(<Settings />);

    expect(await screen.findByText('panel-empresa')).toBeInTheDocument();
  });

  it('cada tab de la lista tiene su panel: ninguno queda vacío al elegirlo', () => {
    render(<Settings />);

    const triggers = screen.getAllByRole('tab');
    const paneles = document.querySelectorAll('[role="tabpanel"]');
    // La lista TABS dibuja los triggers y es la que valida el valor guardado: un tab
    // agregado sin su TabsContent se guardaría bien y abriría una página en blanco.
    expect(paneles).toHaveLength(triggers.length);
    triggers.forEach((trigger, i) => {
      expect(trigger.getAttribute('aria-controls')).toBe(paneles[i].id);
    });
  });
});

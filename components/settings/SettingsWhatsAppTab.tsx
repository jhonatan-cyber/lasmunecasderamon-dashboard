'use client';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';

import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import { MessageCircle, Save, ShieldCheck, Send, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

const AUTH_TOKEN_MASK = '••••••••••••';

interface TwilioForm {
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_whatsapp_number: string;
  admin_whatsapp: string;
}

const VACIO: TwilioForm = {
  twilio_account_sid: '',
  twilio_auth_token: '',
  twilio_whatsapp_number: '',
  admin_whatsapp: ''
};

interface AdminWhatsAppForm {
  usuarioId: string;
  nombre: string;
  nick: string | null;
  destino: string;
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
  activo: boolean;
  /** Fila recién agregada en pantalla: todavía no existe en la base. */
  nuevo: boolean;
}

interface AdminDisponible {
  id: string;
  nombre: string;
  nick: string | null;
}

export function SettingsWhatsAppTab() {
  const { user } = useAuth();
  const [form, setForm] = useState<TwilioForm>(VACIO);
  const [tokenGuardado, setTokenGuardado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pollUntil, setPollUntil] = useState(0);
  const [admins, setAdmins] = useState<AdminWhatsAppForm[]>([]);
  const [disponibles, setDisponibles] = useState<AdminDisponible[]>([]);
  const [seleccion, setSeleccion] = useState('global');
  const [guardandoAdmin, setGuardandoAdmin] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{
      message_sid: string;
      destino: string | null;
      tipo: string;
      estado: string;
      error_code: string | null;
    }>
  >([]);
  const [urls, setUrls] = useState({ incomingUrl: '', statusCallbackUrl: '' });
  const [testResult, setTestResult] = useState('');

  const loadAdmins = useCallback(async () => {
    const response = await fetch('/api/whatsapp/administradores', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success)
      throw new Error('No se pudo consultar los administradores');
    setAdmins(
      (result.data.administradores as AdminWhatsAppForm[]).map(admin => ({
        ...admin,
        nuevo: false
      }))
    );
    setDisponibles(result.data.disponibles);
  }, []);

  const loadHistory = useCallback(async () => {
    const response = await fetch('/api/whatsapp/test', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error('No se pudo consultar el seguimiento');
    setHistory(result.data.messages);
    setUrls({
      incomingUrl: result.data.incomingUrl,
      statusCallbackUrl: result.data.statusCallbackUrl
    });
  }, []);
  useEffect(() => {
    void loadHistory().catch(() => {});
  }, [loadHistory]);
  useEffect(() => {
    if (!pollUntil) return;
    const timer = setInterval(() => {
      if (Date.now() >= pollUntil) {
        clearInterval(timer);
        return;
      }
      void loadHistory().catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [pollUntil, loadHistory]);
  const handleTest = async () => {
    setTesting(true);
    setTestResult('');
    try {
      const response = await fetch('/api/whatsapp/test', { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo enviar la prueba');
      const { enviados = 0, total = 0 } = result.data ?? {};
      const message = `Twilio aceptó la prueba para ${enviados} de ${total} administrador(es). Revisa abajo si fue entregada o leída.`;
      setTestResult(message);
      toast.success('Prueba aceptada por Twilio');
      setPollUntil(Date.now() + 60_000);
      await loadHistory().catch(() =>
        toast.error('Twilio aceptó la prueba, pero no se pudo actualizar su seguimiento.')
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo enviar la prueba';
      setTestResult(message);
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [configResponse, adminsResponse] = await Promise.all([
          fetch('/api/configurations'),
          fetch('/api/whatsapp/administradores', { cache: 'no-store' })
        ]);
        const result = await configResponse.json();
        if (!cancelled && result.success) {
          const integraciones = result.data?.integraciones || {};
          const token = integraciones.twilio_auth_token ?? '';
          setForm({
            twilio_account_sid: String(integraciones.twilio_account_sid ?? ''),
            twilio_auth_token: String(token),
            twilio_whatsapp_number: String(integraciones.twilio_whatsapp_number ?? ''),
            admin_whatsapp: String(result.data?.sistema?.admin_whatsapp ?? '')
          });
          setTokenGuardado(String(token) === AUTH_TOKEN_MASK);
        }
        const adminsResult = await adminsResponse.json();
        if (!cancelled && adminsResponse.ok && adminsResult.success) {
          setAdmins(
            (adminsResult.data.administradores as AdminWhatsAppForm[]).map(admin => ({
              ...admin,
              nuevo: false
            }))
          );
          setDisponibles(adminsResult.data.disponibles);
        }
      } catch (error) {
        logger.captureException(error, { context: 'SettingsWhatsAppTab:fetch' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    const admin = form.admin_whatsapp.trim();
    if (admin && !/^\+?\d{7,15}$/.test(admin.replace('whatsapp:', ''))) {
      toast.error('WhatsApp administrador: número inválido (ej: 59172419112)');
      return;
    }
    const numero = form.twilio_whatsapp_number.trim();
    if (numero && !/^\+?\d{7,15}$/.test(numero.replace('whatsapp:', ''))) {
      toast.error('Número de WhatsApp de Twilio inválido (ej: whatsapp:+14155238886)');
      return;
    }
    const sid = form.twilio_account_sid.trim();
    if (sid && !/^AC[0-9a-f]{32}$/i.test(sid)) {
      toast.error('Account SID inválido: debe empezar con AC y tener 32 caracteres');
      return;
    }
    try {
      setSaving(true);
      const response = await fetch('/api/configurations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: [
            { clave: 'twilio_account_sid', valor: sid },
            { clave: 'twilio_auth_token', valor: form.twilio_auth_token.trim() },
            { clave: 'twilio_whatsapp_number', valor: numero },
            { clave: 'admin_whatsapp', valor: admin }
          ]
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Error al guardar');
      }
      setForm({
        twilio_account_sid: sid,
        twilio_auth_token: form.twilio_auth_token.trim(),
        twilio_whatsapp_number: numero,
        admin_whatsapp: admin
      });
      setTokenGuardado(
        form.twilio_auth_token.trim() === AUTH_TOKEN_MASK || form.twilio_auth_token.trim() === ''
          ? tokenGuardado
          : true
      );
      setDirty(false);
      toast.success('Configuración de WhatsApp guardada');
    } catch (error) {
      logger.captureException(error, { context: 'SettingsWhatsAppTab:save' });
      toast.error('Error al guardar la configuración de WhatsApp');
    } finally {
      setSaving(false);
    }
  };

  const setTextoAdmin =
    (usuarioId: string, campo: keyof AdminWhatsAppForm) =>
    (evento: ChangeEvent<HTMLInputElement>) => {
      setAdmins(prev =>
        prev.map(admin =>
          admin.usuarioId === usuarioId ? { ...admin, [campo]: evento.target.value } : admin
        )
      );
    };

  const alternarActivo = (usuarioId: string) => {
    setAdmins(prev =>
      prev.map(admin =>
        admin.usuarioId === usuarioId ? { ...admin, activo: !admin.activo } : admin
      )
    );
  };

  const seleccionarAdmin = (valor: string) => {
    setSeleccion(valor);
    if (valor === 'global' || admins.some(admin => admin.usuarioId === valor)) return;
    const elegido = disponibles.find(disponible => disponible.id === valor);
    if (!elegido) return;
    setAdmins(prev => [
      ...prev,
      {
        usuarioId: elegido.id,
        nombre: elegido.nombre,
        nick: elegido.nick,
        destino: '',
        accountSid: '',
        authToken: '',
        whatsappNumber: '',
        activo: true,
        nuevo: true
      }
    ]);
  };

  /*
   * Al abrir la pestaña dejamos elegido al administrador que está logueado, para
   * que vea y edite su propio WhatsApp sin tener que buscarse en la lista. Sólo
   * ocurre una vez, cuando ya cargaron los administradores.
   */
  const preseleccionadoRef = useRef(false);
  useEffect(() => {
    if (preseleccionadoRef.current || loading || !user) return;
    const usuarioId = String(user.id);
    const estaEnOpciones =
      admins.some(admin => admin.usuarioId === usuarioId) ||
      disponibles.some(disponible => disponible.id === usuarioId);
    if (!estaEnOpciones) return;
    preseleccionadoRef.current = true;
    seleccionarAdmin(usuarioId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, admins, disponibles]);

  const guardarAdmin = async (admin: AdminWhatsAppForm) => {
    const destino = admin.destino.trim();
    if (!/^\+?\d{7,15}$/.test(destino.replace('whatsapp:', ''))) {
      toast.error(`${admin.nombre}: el WhatsApp de destino no es válido`);
      return;
    }
    try {
      setGuardandoAdmin(admin.usuarioId);
      const response = await fetch('/api/whatsapp/administradores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: admin.usuarioId,
          destino,
          accountSid: admin.accountSid.trim(),
          authToken: admin.authToken.trim(),
          whatsappNumber: admin.whatsappNumber.trim(),
          activo: admin.activo
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error?.message || 'Error al guardar');
      }
      await loadAdmins();
      toast.success(`WhatsApp de ${admin.nombre} guardado`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar';
      toast.error(message);
    } finally {
      setGuardandoAdmin(null);
    }
  };

  const setText = (campo: keyof TwilioForm) => (evento: ChangeEvent<HTMLInputElement>) => {
    setDirty(true);
    setForm(prev => ({ ...prev, [campo]: evento.target.value }));
  };

  const campos: Array<{
    id: string;
    campo: keyof TwilioForm;
    etiqueta: string;
    ayuda: string;
    tipo?: 'text' | 'password';
    placeholder: string;
  }> = [
    {
      id: 'twilio-account-sid',
      campo: 'twilio_account_sid',
      etiqueta: 'Account SID',
      ayuda: 'Cuenta de Twilio. Vacío = variable TWILIO_ACCOUNT_SID del .env.',
      placeholder: 'AC00000000000000000000000000000000'
    },
    {
      id: 'twilio-auth-token',
      campo: 'twilio_auth_token',
      etiqueta: 'Auth Token',
      ayuda: tokenGuardado
        ? 'Guardado. Se muestra oculto: pega uno nuevo solo si lo vas a cambiar.'
        : 'Vacío = variable TWILIO_AUTH_TOKEN del .env.',
      tipo: 'password',
      placeholder: tokenGuardado ? 'Token guardado' : 'Token de Twilio'
    },
    {
      id: 'twilio-whatsapp-number',
      campo: 'twilio_whatsapp_number',
      etiqueta: 'Número que envía (origen)',
      ayuda: 'WhatsApp Business de Twilio. Vacío = variable TWILIO_WHATSAPP_NUMBER del .env.',
      placeholder: 'whatsapp:+14155238886'
    },
    {
      id: 'admin-whatsapp',
      campo: 'admin_whatsapp',
      etiqueta: 'WhatsApp del administrador (destino)',
      ayuda:
        'Recibe anulaciones, anticipos y cierres de caja. Vacío = ADMIN_WHATSAPP_NUMBER del .env.',
      placeholder: 'ej: 56987904824'
    }
  ];

  const nuevosDisponibles = disponibles.filter(
    disponible => !admins.some(admin => admin.usuarioId === disponible.id)
  );

  const adminSeleccionado = admins.find(admin => admin.usuarioId === seleccion) ?? null;

  const opcionesSelector: AdminDisponible[] = [
    ...admins.map(admin => ({ id: admin.usuarioId, nombre: admin.nombre, nick: admin.nick })),
    ...nuevosDisponibles
  ];

  const camposAdmin: Array<{
    campo: keyof AdminWhatsAppForm;
    etiqueta: string;
    placeholder: string;
    tipo?: 'text' | 'password';
  }> = [
    {
      campo: 'destino',
      etiqueta: 'WhatsApp destino',
      placeholder: 'ej: 56987904824'
    },
    {
      campo: 'whatsappNumber',
      etiqueta: 'Número que envía (opcional)',
      placeholder: 'whatsapp:+14155238886'
    },
    {
      campo: 'accountSid',
      etiqueta: 'Account SID (opcional)',
      placeholder: 'AC00000000000000000000000000000000'
    },
    {
      campo: 'authToken',
      etiqueta: 'Auth Token (opcional)',
      placeholder: 'Token de Twilio',
      tipo: 'password'
    }
  ];

  return (
    <div className='space-y-6'>
      <Card className='border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-xl font-bold dark:text-white'>
            <MessageCircle className='h-5 w-5 text-neutral-500' />
            WhatsApp / Twilio
          </CardTitle>
          <CardDescription className='text-neutral-500 dark:text-neutral-400'>
            Conexión con Twilio para enviar y recibir WhatsApp. Se guardan en la base de datos y
            mandan sobre las variables del .env: si un campo queda vacío, se usa la variable de
            entorno correspondiente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='text-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto'></div>
              <p aria-live='polite' className='text-sm text-gray-600 mt-2'>
                Cargando configuración...
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl'>
                <Label
                  htmlFor='whatsapp-config-owner'
                  className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
                >
                  Configurando WhatsApp de
                </Label>
                <NativeSelect
                  id='whatsapp-config-owner'
                  value={seleccion}
                  onChange={evento => seleccionarAdmin(evento.target.value)}
                  disabled={saving || testing}
                  className='mt-1.5 w-full text-sm text-neutral-900 dark:text-white'
                >
                  <option value='global'>Configuración global (respaldo)</option>
                  {opcionesSelector.map(admin => (
                    <option key={admin.id} value={admin.id}>
                      {admin.nombre}
                      {admin.nick ? ` (@${admin.nick})` : ''}
                    </option>
                  ))}
                </NativeSelect>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-1.5'>
                  {adminSeleccionado
                    ? `Estás editando la cuenta y el número de ${adminSeleccionado.nombre}. La configuración global solo se usa si este administrador no deja datos propios.`
                    : 'Aplica a todos los administradores que no tengan su propia cuenta configurada.'}
                </p>
              </div>

              {adminSeleccionado ? (
                <div className='space-y-4'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    {camposAdmin.map(campo => {
                      const id = `${campo.campo}-${adminSeleccionado.usuarioId}`;
                      return (
                        <div
                          key={id}
                          className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl'
                        >
                          <Label
                            htmlFor={id}
                            className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
                          >
                            {campo.etiqueta}
                          </Label>
                          <Input
                            id={id}
                            type={campo.tipo || 'text'}
                            value={String(adminSeleccionado[campo.campo] ?? '')}
                            onChange={setTextoAdmin(adminSeleccionado.usuarioId, campo.campo)}
                            placeholder={campo.placeholder}
                            autoComplete='off'
                            disabled={guardandoAdmin === adminSeleccionado.usuarioId}
                            className='mt-1.5 w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm'
                          />
                        </div>
                      );
                    })}
                  </div>
                  <Label className='flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300'>
                    <Checkbox
                      checked={adminSeleccionado.activo}
                      disabled={guardandoAdmin === adminSeleccionado.usuarioId}
                      onCheckedChange={() => alternarActivo(adminSeleccionado.usuarioId)}
                    />
                    Recibe avisos de WhatsApp
                  </Label>
                </div>
              ) : (
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {campos.map(campo => (
                    <div
                      key={campo.id}
                      className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl'
                    >
                      <Label
                        htmlFor={campo.id}
                        className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
                      >
                        {campo.etiqueta}
                      </Label>
                      <Input
                        id={campo.id}
                        type={campo.tipo || 'text'}
                        disabled={saving || testing}
                        value={form[campo.campo]}
                        onChange={setText(campo.campo)}
                        placeholder={campo.placeholder}
                        autoComplete='off'
                        className='mt-1.5 w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm'
                      />
                      <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-1.5'>
                        {campo.ayuda}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && (
            <div className='mt-6 space-y-4 border-t border-neutral-200 dark:border-neutral-800 pt-4'>
              <div className='flex flex-wrap items-center gap-3'>
                <Button
                  variant='unstyled'
                  onClick={handleTest}
                  disabled={saving || testing || dirty}
                  className='flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50'
                >
                  <Send className='h-4 w-4' />
                  {testing ? 'Enviando prueba...' : 'Enviar mensaje de prueba'}
                </Button>
                <p className='text-xs text-neutral-500'>
                  {dirty
                    ? 'Guarda los cambios antes de probar.'
                    : 'Se envía a todos los administradores configurados con la configuración guardada.'}
                </p>
              </div>
              {testResult && (
                <p role='status' className='text-sm'>
                  {testResult}
                </p>
              )}
              <div className='space-y-2 text-sm'>
                <p className='font-semibold'>URLs para Twilio · método POST</p>
                {Object.entries(urls).map(([key, url]) => (
                  <div key={key}>
                    <Label htmlFor={`whatsapp-${key}`} className='text-xs text-neutral-500'>
                      {key === 'incomingUrl' ? 'When a message comes in' : 'Status callback URL'}
                    </Label>
                    <Input
                      id={`whatsapp-${key}`}
                      readOnly
                      value={url}
                      className='mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-xs'
                    />
                  </div>
                ))}
                <p className='text-xs text-neutral-500'>
                  En el Sandbox, el destinatario debe unirse usando el código de Twilio y enviarle
                  un mensaje antes de la prueba.
                </p>
              </div>
              <div>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold'>Estado de los últimos mensajes</p>
                  <Button
                    variant='unstyled'
                    aria-label='Actualizar estados de WhatsApp'
                    onClick={() => {
                      void loadHistory().catch(() =>
                        toast.error('No se pudo actualizar el seguimiento')
                      );
                    }}
                    className='rounded-full border p-2'
                  >
                    <RefreshCw className='h-4 w-4' />
                  </Button>
                </div>
                {history.length === 0 ? (
                  <EmptyState
                    variant='text'
                    className='mt-2'
                    title='Todavía no hay mensajes registrados.'
                  />
                ) : (
                  <ul className='mt-2 divide-y divide-neutral-200 dark:divide-neutral-800'>
                    {history.map(message => (
                      <li
                        key={message.message_sid}
                        className='flex flex-wrap items-center justify-between gap-2 py-2 text-sm'
                      >
                        <span>
                          {message.tipo === 'prueba' ? 'Prueba' : 'Mensaje'} ·{' '}
                          {message.destino || 'Destino no informado'}
                        </span>
                        <span>
                          {(
                            {
                              accepted: 'Aceptado por Twilio',
                              scheduled: 'Programado',
                              queued: 'En cola',
                              sending: 'Enviando',
                              sent: 'Enviado',
                              delivered: 'Entregado',
                              read: 'Leído',
                              failed: 'Falló',
                              undelivered: 'No entregado',
                              canceled: 'Cancelado'
                            } as Record<string, string>
                          )[message.estado] || message.estado}
                          {message.error_code ? ` · Error ${message.error_code}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className='flex items-start gap-2 mt-4 text-xs text-neutral-500 dark:text-neutral-400'>
            <ShieldCheck className='h-4 w-4 shrink-0 mt-0.5' />
            <p>
              El Auth Token nunca se muestra en claro y los cambios quedan registrados en el log de
              auditoría.
            </p>
          </div>

          <div className='flex justify-end pt-4'>
            <Button
              variant='unstyled'
              onClick={() => (adminSeleccionado ? guardarAdmin(adminSeleccionado) : handleSave())}
              disabled={
                saving ||
                loading ||
                testing ||
                (adminSeleccionado ? guardandoAdmin === adminSeleccionado.usuarioId : false)
              }
              className='flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white hover:scale-105 active:scale-95 transition-all duration-200 rounded-full font-bold disabled:opacity-50'
            >
              <Save className='h-4 w-4' />
              {adminSeleccionado
                ? guardandoAdmin === adminSeleccionado.usuarioId
                  ? 'Guardando...'
                  : 'Guardar administrador'
                : saving
                  ? 'Guardando...'
                  : 'Guardar Cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

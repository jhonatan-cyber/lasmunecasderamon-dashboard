'use client';

import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { MessageCircle, Save, ShieldCheck, Send, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';

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

export function SettingsWhatsAppTab() {
  const [form, setForm] = useState<TwilioForm>(VACIO);
  const [tokenGuardado, setTokenGuardado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pollUntil, setPollUntil] = useState(0);
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
      const message = result.data.seguimientoGuardado
        ? `Prueba aceptada por Twilio para ${result.data.destino}. Revisa abajo si fue entregada o leída.`
        : 'Twilio aceptó la prueba, pero no se pudo guardar su seguimiento. Actualiza el historial para comprobar el callback.';
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
        const response = await fetch('/api/configurations');
        const result = await response.json();
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

  return (
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
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {campos.map(campo => (
              <div
                key={campo.id}
                className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700'
              >
                <label
                  htmlFor={campo.id}
                  className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
                >
                  {campo.etiqueta}
                </label>
                <input
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

        {!loading && (
          <div className='mt-6 space-y-4 border-t border-neutral-200 dark:border-neutral-800 pt-4'>
            <div className='flex flex-wrap items-center gap-3'>
              <button
                onClick={handleTest}
                disabled={saving || testing || dirty}
                className='flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50'
              >
                <Send className='h-4 w-4' />
                {testing ? 'Enviando prueba...' : 'Enviar mensaje de prueba'}
              </button>
              <p className='text-xs text-neutral-500'>
                {dirty
                  ? 'Guarda los cambios antes de probar.'
                  : 'Se envía al WhatsApp del administrador con la configuración guardada.'}
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
                  <label htmlFor={`whatsapp-${key}`} className='text-xs text-neutral-500'>
                    {key === 'incomingUrl' ? 'When a message comes in' : 'Status callback URL'}
                  </label>
                  <input
                    id={`whatsapp-${key}`}
                    readOnly
                    value={url}
                    className='mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-xs'
                  />
                </div>
              ))}
              <p className='text-xs text-neutral-500'>
                En el Sandbox, el destinatario debe unirse usando el código de Twilio y enviarle un
                mensaje antes de la prueba.
              </p>
            </div>
            <div>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-sm font-semibold'>Estado de los últimos mensajes</p>
                <button
                  aria-label='Actualizar estados de WhatsApp'
                  onClick={() => {
                    void loadHistory().catch(() =>
                      toast.error('No se pudo actualizar el seguimiento')
                    );
                  }}
                  className='rounded-full border p-2'
                >
                  <RefreshCw className='h-4 w-4' />
                </button>
              </div>
              {history.length === 0 ? (
                <p className='mt-2 text-sm text-neutral-500'>
                  Todavía no hay mensajes registrados.
                </p>
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
          <button
            onClick={handleSave}
            disabled={saving || loading || testing}
            className='flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white hover:scale-105 active:scale-95 transition-all duration-200 rounded-full font-bold disabled:opacity-50'
          >
            <Save className='h-4 w-4' />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

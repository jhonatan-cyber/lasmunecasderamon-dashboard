import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
vi.mock('@/lib/utils/logger', () => ({ default: { info: vi.fn() } }));
afterEach(cleanup);
const props = (complete = false, modo: 'whatsapp' | 'usuarios' = 'whatsapp') => ({
  form: {
    step: 'login' as const,
    view: 'recovery' as const,
    loading: false,
    recoveryLoading: false,
    recoveryComplete: complete,
    recoveryMode: modo,
    recoveryRun: '12345678-9',
    setRecoveryRun: vi.fn(),
    codigo: '',
    setCodigo: vi.fn(),
    hasUsers: true
  },
  credentials: { loginData: { email: '', password: '' }, setLoginData: vi.fn() },
  password: { showPassword: false, setShowPassword: vi.fn() },
  inputRefs: {
    emailInputRef: React.createRef<HTMLInputElement>(),
    passwordInputRef: React.createRef<HTMLInputElement>(),
    submitButtonRef: React.createRef<HTMLButtonElement>()
  },
  handlers: {
    handleLogin: vi.fn(),
    handlePasswordRecovery: vi.fn(),
    handleVerifyCode: vi.fn(),
    handleKeyDown: vi.fn(),
    handlePasswordKeyDown: vi.fn()
  },
  theme: { theme: 'system', toggleTheme: vi.fn(), setThemeMode: vi.fn() },
  callbacks: {
    onShowRegister: vi.fn(),
    onSetStep: vi.fn(),
    onSetView: vi.fn(),
    onResetRecovery: vi.fn()
  }
});
describe('recuperación del login', () => {
  it('muestra Reset usuarios debajo de WhatsApp y selecciona ese modo', () => {
    const p = props();
    render(<LoginForm {...p} />);
    const whatsapp = screen.getByRole('button', { name: 'Enviar clave por WhatsApp' });
    const reset = screen.getByRole('button', { name: 'Reset usuarios' });
    expect(whatsapp.compareDocumentPosition(reset) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText('RUT / RUN / CI')).toHaveValue('12345678-9');
    fireEvent.click(reset);
    expect(p.handlers.handlePasswordRecovery).toHaveBeenCalledWith(undefined, 'usuarios');
    expect(screen.getByText(/WhatsApp: solo para el administrador/)).toBeInTheDocument();
  });
  it('el resultado del reset explica la clave RUT', () => {
    render(<LoginForm {...props(true, 'usuarios')} />);
    expect(screen.getByText('Restablecimiento de usuario')).toBeInTheDocument();
    expect(screen.getByText(/su contraseña será su RUT registrado/)).toBeInTheDocument();
    expect(screen.queryByText('Revisa tu WhatsApp')).not.toBeInTheDocument();
  });
});

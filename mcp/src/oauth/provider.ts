import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import type {
  OAuthServerProvider,
  AuthorizationParams
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest
} from '@modelcontextprotocol/sdk/shared/auth.js';
import {
  InvalidGrantError,
  InvalidRequestError,
  InvalidScopeError,
  InvalidTokenError,
  InvalidClientMetadataError
} from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { Sesion } from '../api-client.js';
import { sesionDelDashboard } from '../api-client.js';
import { OAuthStore } from './store.js';
import { EMAIL_DOMAIN, loginView } from './login-view.js';
import { validarAdministrador } from '../admin.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const random = () => randomBytes(32).toString('base64url');
const ACCESS_MS = 15 * 60 * 1000;
const GRANT_MS = 7 * 24 * 60 * 60 * 1000;
export const SCOPES = ['mcp:read', 'mcp:write'];
type Pending = { clientId: string; clientName: string; params: AuthorizationParams; csrf: string };
type Grant = {
  clientId: string;
  scopes: string[];
  resource: string;
  sesion: Sesion;
  expires: number;
};
type Code = { grantId: string; challenge: string; redirect: string };
type Token = {
  grantId: string;
  clientId: string;
  expires: number;
  scopes: string[];
  used?: boolean;
};
export class DashboardOAuthProvider implements OAuthServerProvider {
  private sesiones = new Map<string, { sesion: Sesion; expires: number }>();
  constructor(
    readonly store: OAuthStore,
    readonly issuer: URL,
    readonly resource: URL,
    readonly dashboard: URL
  ) {}

  clientsStore = {
    getClient: (id: string) => this.store.get<OAuthClientInformationFull>('client', id),
    registerClient: (
      input: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>
    ) => {
      if (
        input.token_endpoint_auth_method &&
        !['none', 'client_secret_post'].includes(input.token_endpoint_auth_method)
      ) {
        throw new InvalidClientMetadataError('Métodos admitidos: none y client_secret_post.');
      }
      for (const raw of input.redirect_uris) {
        const url = new URL(raw);
        if (
          url.hash ||
          url.username ||
          url.password ||
          (url.protocol !== 'https:' &&
            !(
              url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)
            ))
        ) {
          throw new InvalidClientMetadataError(
            'Los redirects deben usar HTTPS o loopback local, sin fragmentos ni credenciales.'
          );
        }
      }
      const client = {
        ...input,
        client_id: randomUUID(),
        client_id_issued_at: Math.floor(Date.now() / 1000)
      };
      this.store.put('client', client.client_id, client, Date.now() + 30 * GRANT_MS);
      return client;
    }
  };

  private validarRecurso(resource?: URL) {
    if (!resource || resource.href !== this.resource.href)
      throw new InvalidRequestError('resource debe identificar este servidor MCP.');
  }
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response) {
    this.validarRecurso(params.resource);
    if (!/^[A-Za-z0-9_-]{43}$/.test(params.codeChallenge))
      throw new InvalidRequestError('PKCE S256 obligatorio.');
    const scopes = params.scopes?.length ? [...new Set(params.scopes)] : ['mcp:read'];
    if (!scopes.includes('mcp:read') || scopes.some(scope => !SCOPES.includes(scope)))
      throw new InvalidScopeError('Scopes permitidos: mcp:read y mcp:write.');
    const id = random();
    const pending: Pending = {
      clientId: client.client_id,
      clientName: client.client_name || 'Cliente MCP',
      params: { ...params, scopes },
      csrf: random()
    };
    this.store.put('pending', id, pending, Date.now() + 10 * 60 * 1000);
    res.cookie(`mcp_oauth_${id}`, pending.csrf, {
      httpOnly: true,
      secure: this.issuer.protocol === 'https:',
      sameSite: 'strict',
      path: '/oauth/consent',
      maxAge: 10 * 60 * 1000
    });
    this.render(res, id, pending);
  }
  private render(res: Response, id: string, pending: Pending, error = '') {
    const nonce = random();
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; img-src ${this.dashboard.origin}; form-action 'self' ${new URL(pending.params.redirectUri).origin}; frame-ancestors 'none'; base-uri 'none'`
    );
    res.type('html').send(
      loginView({
        nonce,
        dashboard: this.dashboard,
        flow: id,
        csrf: pending.csrf,
        client: pending.clientName,
        redirect: pending.params.redirectUri,
        write: !!pending.params.scopes?.includes('mcp:write'),
        error
      })
    );
  }
  async consent(req: Request, res: Response) {
    const { flow, csrf, decision, email, password, codigo } = req.body ?? {};
    if (typeof flow !== 'string') throw new InvalidRequestError('Flujo inválido.');
    const pending = this.store.get<Pending>('pending', flow);
    const cookie = req.headers.cookie
      ?.split(';')
      .map(part => part.trim())
      .find(part => part.startsWith(`mcp_oauth_${flow}=`))
      ?.split('=')
      .slice(1)
      .join('=');
    if (
      !pending ||
      csrf !== pending.csrf ||
      cookie !== pending.csrf ||
      req.headers.origin !== this.issuer.origin
    )
      throw new InvalidRequestError('Solicitud expirada o protección CSRF inválida.');
    const redirect = new URL(pending.params.redirectUri);
    // El POST termina navegando al callback registrado del cliente OAuth.
    // form-action 'self' también bloquea ese redirect en el navegador.
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'none'; form-action 'self' ${redirect.origin}; frame-ancestors 'none'; base-uri 'none'`
    );
    redirect.searchParams.set('iss', this.issuer.href);
    if (pending.params.state) redirect.searchParams.set('state', pending.params.state);
    if (decision === 'deny') {
      this.store.delete('pending', flow);
      redirect.searchParams.set('error', 'access_denied');
      res.redirect(303, redirect.href);
      return;
    }
    if (decision !== 'allow' || typeof email !== 'string' || typeof password !== 'string')
      throw new InvalidRequestError('Datos de autorización inválidos.');
    const response = await fetch(new URL('/api/auth/login', this.dashboard), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'error',
      body: JSON.stringify({
        email: email.trim().includes('@') ? email.trim() : email.trim() + EMAIL_DOMAIN,
        password,
        ...(typeof codigo === 'string' && codigo ? { codigo } : {})
      }),
      signal: AbortSignal.timeout(20_000)
    });
    const result = await response.json();
    if (!response.ok || !result.success || !result.token || !result.refreshToken) {
      this.render(
        res.status(401),
        flow,
        pending,
        result.requiereCodigo
          ? 'Se requiere el código de turno y la asistencia.'
          : 'No se pudo iniciar sesión. Revisa tus credenciales.'
      );
      return;
    }
    const perfil = await fetch(new URL('/api/mcp/admin/session', this.dashboard), {
      headers: { Authorization: `Bearer ${result.token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(20_000)
    });
    if (!perfil.ok) {
      this.render(res.status(403), flow, pending, 'No se pudo verificar el administrador.');
      return;
    }
    try {
      validarAdministrador(await perfil.json());
    } catch {
      this.render(res.status(403), flow, pending, 'Este MCP es exclusivo para administradores.');
      return;
    }
    // Consume sólo después de autenticar. El segundo POST concurrente nunca obtiene otro código.
    if (!this.store.get('pending', flow)) throw new InvalidRequestError('Este flujo ya fue usado.');
    this.store.delete('pending', flow);
    const grantId = randomUUID();
    const expires = Date.now() + GRANT_MS;
    this.store.put(
      'grant',
      grantId,
      {
        clientId: pending.clientId,
        scopes: pending.params.scopes!,
        resource: this.resource.href,
        sesion: sesionDelDashboard(result.token, result.refreshToken),
        expires
      } satisfies Grant,
      expires
    );
    const code = random();
    this.store.put(
      'code',
      hash(code),
      {
        grantId,
        challenge: pending.params.codeChallenge,
        redirect: pending.params.redirectUri
      } satisfies Code,
      Date.now() + 60_000
    );
    redirect.searchParams.set('code', code);
    res.clearCookie(`mcp_oauth_${flow}`, {
      path: '/oauth/consent',
      secure: this.issuer.protocol === 'https:',
      sameSite: 'strict'
    });
    res.redirect(303, redirect.href);
  }
  private getGrant(id: string) {
    const grant = this.store.get<Grant>('grant', id);
    if (!grant) throw new InvalidGrantError('Autorización expirada o revocada.');
    return grant;
  }
  async challengeForAuthorizationCode(client: OAuthClientInformationFull, code: string) {
    const record = this.store.get<Code>('code', hash(code));
    if (!record || this.getGrant(record.grantId).clientId !== client.client_id)
      throw new InvalidGrantError('Código inválido.');
    return record.challenge;
  }
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    code: string,
    _verifier?: string,
    redirect?: string,
    resource?: URL
  ): Promise<OAuthTokens> {
    this.validarRecurso(resource);
    const record = this.store.get<Code>('code', hash(code));
    // El router oficial valida PKCE S256 con challengeForAuthorizationCode antes
    // de invocar este método; no entrega el verifier después de validarlo.
    if (!record) throw new InvalidGrantError('Código inválido o ya utilizado.');
    const grant = this.getGrant(record.grantId);
    if (grant.clientId !== client.client_id || redirect !== record.redirect)
      throw new InvalidGrantError('Cliente o redirect inválido.');
    this.store.delete('code', hash(code));
    return this.issue(record.grantId, grant);
  }
  private issue(grantId: string, grant: Grant): OAuthTokens {
    const access = random(),
      refresh = random();
    const expires = Math.min(Date.now() + ACCESS_MS, grant.expires);
    this.store.put(
      'access',
      hash(access),
      { grantId, clientId: grant.clientId, scopes: grant.scopes, expires } satisfies Token,
      expires
    );
    this.store.put(
      'refresh',
      hash(refresh),
      {
        grantId,
        clientId: grant.clientId,
        scopes: grant.scopes,
        expires: grant.expires
      } satisfies Token,
      grant.expires
    );
    return {
      access_token: access,
      refresh_token: refresh,
      token_type: 'Bearer',
      expires_in: Math.max(0, Math.floor((expires - Date.now()) / 1000)),
      scope: grant.scopes.join(' ')
    };
  }
  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refresh: string,
    scopes?: string[],
    resource?: URL
  ) {
    this.validarRecurso(resource);
    const record = this.store.get<Token>('refresh', hash(refresh));
    if (!record || record.clientId !== client.client_id)
      throw new InvalidGrantError('Refresh token inválido.');
    if (record.used) {
      this.store.delete('grant', record.grantId);
      this.sesiones.delete(record.grantId);
      throw new InvalidGrantError('Refresh token reutilizado: autorización revocada.');
    }
    const grant = this.getGrant(record.grantId);
    const requested = scopes?.length ? scopes : record.scopes;
    if (!requested.includes('mcp:read') || requested.some(scope => !record.scopes.includes(scope)))
      throw new InvalidScopeError('No se pueden ampliar permisos al renovar.');
    this.store.put('refresh', hash(refresh), { ...record, used: true }, record.expires);
    return this.issue(record.grantId, { ...grant, scopes: requested });
  }
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const record = this.store.get<Token>('access', hash(token));
    const grant = record && this.store.get<Grant>('grant', record.grantId);
    if (!record || !grant || grant.resource !== this.resource.href)
      throw new InvalidTokenError('Token MCP inválido, expirado o revocado.');
    return {
      token,
      clientId: record.clientId,
      scopes: record.scopes,
      expiresAt: Math.floor(record.expires / 1000),
      resource: this.resource,
      extra: { grantId: record.grantId }
    };
  }
  async revokeToken(client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest) {
    const record =
      this.store.get<Token>('refresh', hash(request.token)) ??
      this.store.get<Token>('access', hash(request.token));
    if (record?.clientId === client.client_id) {
      this.store.delete('grant', record.grantId);
      this.sesiones.delete(record.grantId);
    }
  }
  session(grantId: string) {
    this.limpiarSesiones();
    const grant = this.getGrant(grantId);
    let session = this.sesiones.get(grantId)?.sesion;
    if (!session) {
      session = grant.sesion;
      this.sesiones.set(grantId, { sesion: session, expires: grant.expires });
    }
    return session;
  }
  saveSession(grantId: string) {
    this.limpiarSesiones();
    const grant = this.store.get<Grant>('grant', grantId);
    const sesion = this.sesiones.get(grantId)?.sesion;
    if (!grant) this.sesiones.delete(grantId);
    if (grant && sesion) {
      const { token, refreshToken, expiraEn } = sesion;
      this.store.put(
        'grant',
        grantId,
        { ...grant, sesion: { token, refreshToken, expiraEn } },
        grant.expires
      );
    }
  }

  /** Limpieza diferida sin temporizadores que mantengan vivo el proceso. */
  limpiarSesiones(now = Date.now()) {
    for (const [id, entrada] of this.sesiones) {
      if (entrada.expires <= now) this.sesiones.delete(id);
    }
  }
}


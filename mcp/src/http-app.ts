import express, { type ErrorRequestHandler } from 'express';
import {
  mcpAuthRouter,
  createOAuthMetadata,
  mcpAuthMetadataRouter
} from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { OAuthError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { crearServidor } from './server.js';
import { ApiError, conSesion } from './api-client.js';
import { exigirAdministrador } from './admin.js';
import { DashboardOAuthProvider, SCOPES } from './oauth/provider.js';
import { OAuthStore } from './oauth/store.js';

export type HttpOptions = {
  issuer: URL;
  dashboard: URL;
  database: string;
  key: Buffer;
  browserOrigins?: string[];
  trustedProxies?: string[];
};
export function crearAppHttp(options: HttpOptions) {
  for (const url of [options.issuer, options.dashboard]) {
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))
    ) {
      throw new Error('OAuth requiere HTTPS; HTTP sólo está permitido en loopback local.');
    }
  }
  if (options.issuer.pathname !== '/')
    throw new Error('MCP_PUBLIC_URL debe ser el origen público, sin subruta.');
  const resource = new URL('/mcp', options.issuer);
  const store = new OAuthStore(options.database, options.key);
  const provider = new DashboardOAuthProvider(store, options.issuer, resource, options.dashboard);
  const app = express();
  // Sólo direcciones/subredes explícitas; nunca confiar en cualquier remitente.
  app.set('trust proxy', options.trustedProxies ?? []);
  app.disable('x-powered-by');
  // Host fijo evita DNS rebinding y Origin en /mcp se valida antes de autenticar.
  app.use((req, res, next) => {
    if (req.headers.host !== options.issuer.host) {
      res.status(403).json({ error: 'invalid_host' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // El navegador necesita conservar Origin en el POST del formulario para validar CSRF.
    // same-origin no envía el referrer al callback de otro origen.
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
    );
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: false, limit: '8kb' }));
  app.use('/authorize', (_req, res, next) => {
    const redirect = res.redirect;
    res.redirect = function (statusOrUrl: number | string, url?: string) {
      const target = new URL(typeof statusOrUrl === 'string' ? statusOrUrl : url!);
      target.searchParams.set('iss', options.issuer.href);
      return redirect.call(res, typeof statusOrUrl === 'number' ? statusOrUrl : 302, target.href);
    } as typeof res.redirect;
    next();
  });
  app.use('/token', (req, res, next) => {
    if (
      req.body?.grant_type === 'authorization_code' &&
      (typeof req.body.code_verifier !== 'string' ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(req.body.code_verifier))
    ) {
      res
        .status(400)
        .json({ error: 'invalid_grant', error_description: 'PKCE verifier inválido.' });
      return;
    }
    next();
  });
  const authOptions = {
    provider,
    issuerUrl: options.issuer,
    resourceServerUrl: resource,
    scopesSupported: SCOPES,
    resourceName: 'Las Muñecas de Ramon'
  };
  // Anuncia issuer en las respuestas de autorización (RFC 9207).
  const metadata = {
    ...createOAuthMetadata(authOptions),
    authorization_response_iss_parameter_supported: true,
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    revocation_endpoint_auth_methods_supported: ['none', 'client_secret_post']
  };
  app.use(
    mcpAuthMetadataRouter({
      oauthMetadata: metadata,
      resourceServerUrl: resource,
      scopesSupported: SCOPES
    })
  );
  app.use(mcpAuthRouter(authOptions));
  // Límite de intentos de login separado del endpoint OAuth del SDK.
  const attempts = new Map<string, { count: number; until: number }>();
  app.post('/oauth/consent', async (req, res, next) => {
    const now = Date.now();
    for (const [ip, value] of attempts) if (value.until <= now) attempts.delete(ip);
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const attempt = attempts.get(ip) ?? { count: 0, until: now + 15 * 60 * 1000 };
    attempts.set(ip, attempt);
    if (++attempt.count > 20) {
      res.setHeader('Retry-After', String(Math.ceil((attempt.until - now) / 1000)));
      res.status(429).json({ error: 'too_many_requests' });
      return;
    }
    try {
      await provider.consent(req, res);
    } catch (error) {
      next(error);
    }
  });
  const origins = new Set([options.issuer.origin, ...(options.browserOrigins ?? [])]);
  app.use('/mcp', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) {
      res.status(403).json({ error: 'invalid_origin' });
      return;
    }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, MCP-Protocol-Version, Mcp-Session-Id'
      );
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Expose-Headers', 'WWW-Authenticate, MCP-Protocol-Version');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(
    '/mcp',
    requireBearerAuth({
      verifier: provider,
      requiredScopes: ['mcp:read'],
      expectedResource: resource,
      resourceMetadataUrl: new URL('/.well-known/oauth-protected-resource/mcp', options.issuer).href
    })
  );
  app.post('/mcp', async (req, res, next) => {
    const grantId = String(req.auth?.extra?.grantId ?? '');
    const server = crearServidor({ escritura: req.auth?.scopes.includes('mcp:write') ?? false });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await conSesion(provider.session(grantId), async () => {
        await exigirAdministrador();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      });
    } catch (error) {
      next(error);
    } finally {
      provider.saveSession(grantId);
    }
  });
  app.all('/mcp', (_req, res) => {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.sendStatus(405);
  });
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (res.headersSent) return;
    if (error instanceof ApiError) {
      res.status(error.estado === 403 ? 403 : error.estado === 401 ? 401 : 502)
        .json({ error: error.codigo, error_description: error.message });
      return;
    }
    if (error instanceof OAuthError) {
      res.status(400).json(error.toResponseObject());
      return;
    }
    console.error(
      '[lasmunecas-mcp] Error de solicitud:',
      error instanceof Error ? error.name : 'Error'
    );
    res
      .status(500)
      .json({ error: 'server_error', error_description: 'No se pudo completar la solicitud.' });
  };
  app.use(errors);
  return { app, provider, store };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server =>
  new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  });
const jwt = user =>
  `header.${Buffer.from(JSON.stringify({ sub: user, exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.signature`;

test('OAuth remoto: flujo real HTTP, aislamiento, rotación y persistencia', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-oauth-'));
  const key = randomBytes(32),
    database = join(directory, 'oauth.sqlite');
  let writes = 0;
  let lastLoginEmail;
  const roles = new Map([['cajero@example.test', 'Cajero']]);
  const backend = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (req.url === '/api/auth/login') {
      const body = JSON.parse(Buffer.concat(chunks).toString());
      lastLoginEmail = body.email;
      res.end(
        JSON.stringify(
          body.password === 'secret'
            ? {
                success: true,
                token: jwt(body.email),
                refreshToken: `internal-refresh-${body.email}`
              }
            : { success: false }
        )
      );
    } else if (req.url === '/api/auth/me' || req.url === '/api/mcp/admin/session') {
      const token = req.headers.authorization?.split(' ')[1];
      const user = token && JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).sub;
      res.end(JSON.stringify({ success: true, data: { id: user, role: roles.get(user) ?? 'Administrador' } }));
    } else if (req.url === '/api/ping') res.end(JSON.stringify({ ok: true }));
    else if (req.url === '/api/cuentas/denied/cobrar') {
      res.statusCode = 403;
      res.end(JSON.stringify({ success: false, message: 'Sin permiso finances.write' }));
    } else {
      if (req.method === 'POST') writes++;
      res.end(JSON.stringify({ success: true, data: [] }));
    }
  });
  await listen(backend);
  process.env.MCP_BASE_URL = `http://127.0.0.1:${backend.address().port}`;
  process.env.MCP_EMAIL = 'must-not-be-used';
  process.env.MCP_PASSWORD = 'must-not-be-used';
  const { crearAppHttp } = await import('../dist/http-app.js');
  let application;
  const http = createServer((req, res) => application.app(req, res));
  await listen(http);
  const issuer = new URL(`http://127.0.0.1:${http.address().port}/`);
  const resource = new URL('/mcp', issuer).href;
  const options = { issuer, dashboard: new URL(process.env.MCP_BASE_URL), database, key };
  application = crearAppHttp(options);
  t.after(async () => {
    await close(http);
    await close(backend);
    application.store.close();
    await rm(directory, { recursive: true, force: true });
  });
  const request = (path, init) => fetch(new URL(path, issuer), init);
  const form = body => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    redirect: 'manual'
  });
  async function register() {
    const response = await request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Prueba MCP',
        redirect_uris: ['http://127.0.0.1:9010/callback'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code']
      })
    });
    assert.equal(response.status, 201);
    return response.json();
  }
  const client = await register();
  async function begin(scopes = 'mcp:read', clientId = client.client_id) {
    const verifier = randomBytes(32).toString('base64url');
    const response = await request(
      `/authorize?${new URLSearchParams({ client_id: clientId, redirect_uri: client.redirect_uris[0], response_type: 'code', code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url'), resource, scope: scopes, state: 'state-original' })}`
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('referrer-policy'), 'same-origin');
    const html = await response.text();
    return {
      flow: html.match(/name="flow" value="([^"]+)"/)[1],
      csrf: html.match(/name="csrf" value="([^"]+)"/)[1],
      cookie: response.headers.get('set-cookie').split(';')[0],
      verifier
    };
  }
  async function consent(flow, user = 'a@example.test', extra = {}) {
    const init = form({
      flow: flow.flow,
      csrf: flow.csrf,
      email: user,
      password: 'secret',
      decision: 'allow',
      ...extra
    });
    init.headers = { ...init.headers, Cookie: flow.cookie, Origin: issuer.origin };
    return request('/oauth/consent', init);
  }
  async function code(scopes = 'mcp:read', user) {
    const flow = await begin(scopes);
    const response = await consent(flow, user);
    assert.equal(response.status, 303);
    const redirect = new URL(response.headers.get('location'));
    assert.equal(redirect.searchParams.get('state'), 'state-original');
    assert.equal(redirect.searchParams.get('iss'), issuer.href);
    return { ...flow, code: redirect.searchParams.get('code') };
  }
  const exchange = (flow, extra = {}) =>
    request(
      '/token',
      form({
        client_id: client.client_id,
        grant_type: 'authorization_code',
        code: flow.code,
        code_verifier: flow.verifier,
        redirect_uri: client.redirect_uris[0],
        resource,
        ...extra
      })
    );
  await t.test(
    'login acepta usuario y completa el dominio, conserva emails completos',
    async () => {
      await consent(await begin(), ' admin ');
      assert.equal(lastLoginEmail, 'admin@lasmuñecasderamon.com');
      await consent(await begin(), ' custom@example.test ');
      assert.equal(lastLoginEmail, 'custom@example.test');
    }
  );
  async function connect(token) {
    const sdk = new Client({ name: 'test-http', version: '1' });
    await sdk.connect(
      new StreamableHTTPClientTransport(new URL(resource), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } }
      })
    );
    t.after(() => sdk.close());
    return sdk;
  }
  await t.test('descubrimiento, desafío 401, Origin y JWT del dashboard rechazados', async () => {
    const metadata = await (await request('/.well-known/oauth-authorization-server')).json();
    assert.deepEqual(metadata.code_challenge_methods_supported, ['S256']);
    assert.equal(metadata.authorization_response_iss_parameter_supported, true);
    const protectedMetadata = await (
      await request('/.well-known/oauth-protected-resource/mcp')
    ).json();
    assert.equal(protectedMetadata.resource, resource);
    assert.deepEqual(protectedMetadata.authorization_servers, [issuer.href]);
    const unauth = await request('/mcp', { method: 'POST' });
    assert.equal(unauth.status, 401);
    assert.match(unauth.headers.get('www-authenticate'), /oauth-protected-resource\/mcp/);
    assert.equal(
      (
        await request('/mcp', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt('admin')}` }
        })
      ).status,
      401
    );
    assert.equal(
      (await request('/mcp', { method: 'POST', headers: { Origin: 'https://evil.example' } }))
        .status,
      403
    );
    assert.throws(
      () => crearAppHttp({ ...options, issuer: new URL('http://192.168.0.12:3001') }),
      /HTTPS/
    );
  });
  await t.test('consentimiento con CSRF, denegación y contraseña inválida', async () => {
    const flow = await begin();
    assert.equal((await consent(flow, undefined, { csrf: 'incorrecto' })).status, 400);
    assert.equal((await consent(flow, undefined, { password: 'incorrecto' })).status, 401);
    const denied = await consent(flow, undefined, { decision: 'deny' });
    assert.equal(
      new URL(denied.headers.get('location')).searchParams.get('error'),
      'access_denied'
    );
  });
  await t.test('OAuth rechaza cajeros incluso con contraseña válida', async () => {
    const response = await consent(await begin(), 'cajero@example.test');
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('location'), null);
    assert.match(await response.text(), /exclusivo para administradores/);
  });
  let tokens;
  await t.test('PKCE, resource, redirect, client binding y código de un solo uso', async () => {
    const flow = await code();
    assert.equal(
      (await exchange(flow, { code_verifier: randomBytes(32).toString('base64url') })).status,
      400
    );
    assert.equal((await exchange(flow, { resource: 'https://otro.example/mcp' })).status, 400);
    assert.equal(
      (await exchange(flow, { redirect_uri: 'http://127.0.0.1:9010/otro' })).status,
      400
    );
    const other = await register();
    assert.equal((await exchange(flow, { client_id: other.client_id })).status, 400);
    const valid = await exchange(flow);
    assert.equal(valid.status, 200, await valid.clone().text());
    tokens = await valid.json();
    assert.notEqual(tokens.access_token, jwt('a@example.test'));
    assert.equal((await exchange(flow)).status, 400);
  });
  await t.test('lectura no permite cobrar y las cuentas concurrentes se aíslan', async () => {
    const a = await connect(tokens.access_token);
    const listing = await a.listTools();
    assert.equal(listing.tools.length, 23);
    assert.ok(
      !listing.tools.some(tool => tool.name === 'cobrar_cuenta' || tool.name === 'typecheck' || tool.name === 'resolver_solicitud')
    );
    assert.equal((await a.callTool({ name: 'cobrar_cuenta', arguments: {} })).isError, true);
    assert.equal(writes, 0);
    const bTokens = await (
      await exchange(await code('mcp:read mcp:write', 'b@example.test'))
    ).json();
    const b = await connect(bTokens.access_token);
    assert.ok((await b.listTools()).tools.some(tool => tool.name === 'cobrar_cuenta'));
    const [ra, rb] = await Promise.all([
      a.callTool({ name: 'verificar_conexion', arguments: {} }),
      b.callTool({ name: 'verificar_conexion', arguments: {} })
    ]);
    assert.equal(ra.structuredContent.autenticacion.usuario.id, 'a@example.test');
    assert.equal(rb.structuredContent.autenticacion.usuario.id, 'b@example.test');
    const denied = await b.callTool({
      name: 'cobrar_cuenta',
      arguments: {
        id: 'denied',
        metodoPago: 'efectivo',
        montoFinal: 100,
        confirmar: true,
        // Sin este UUID válido el esquema rechaza antes de llegar al backend y
        // el 403 que este test quiere probar nunca ocurriría.
        operacion_id: randomUUID()
      }
    });
    assert.equal(denied.isError, true);
    assert.match(denied.content[0].text, /403/);
    assert.equal(writes, 0);
  });
  await t.test('cambio de rol bloquea una autorización OAuth existente', async () => {
    const fresh = await (await exchange(await code('mcp:read mcp:write', 'demoted@example.test'))).json();
    const sdk = await connect(fresh.access_token);
    roles.set('demoted@example.test', 'Cajero');
    assert.equal((await request('/mcp', { method: 'POST', headers: { Authorization: `Bearer ${fresh.access_token}` }, body: '{}' })).status, 403);
    await assert.rejects(sdk.listTools());
    assert.equal(writes, 0);
  });
  await t.test('persistencia cifrada y reinicio conserva autorizaciones', async () => {
    application.store.close();
    const { OAuthStore } = await import('../dist/oauth/store.js');
    const { DashboardOAuthProvider } = await import('../dist/oauth/provider.js');
    const reopened = new OAuthStore(database, key);
    const provider = new DashboardOAuthProvider(
      reopened,
      issuer,
      new URL(resource),
      options.dashboard
    );
    assert.ok((await provider.verifyAccessToken(tokens.access_token)).clientId);
    reopened.close();
    const bytes = await readFile(database);
    assert.equal(bytes.includes(Buffer.from('internal-refresh-')), false);
    assert.equal(bytes.includes(Buffer.from(jwt('a@example.test'))), false);
    application = crearAppHttp(options);
  });
  await t.test('rotación, scopes sin escalamiento y revocación por replay', async () => {
    const renew = extra =>
      request(
        '/token',
        form({
          client_id: client.client_id,
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
          resource,
          ...extra
        })
      );
    assert.equal((await renew({ scope: 'mcp:read mcp:write' })).status, 400);
    const renewed = await renew();
    assert.equal(renewed.status, 200);
    const rotated = await renewed.json();
    assert.notEqual(rotated.refresh_token, tokens.refresh_token);
    assert.equal((await renew()).status, 400);
    assert.equal(
      (
        await request('/mcp', {
          method: 'POST',
          headers: { Authorization: `Bearer ${rotated.access_token}` }
        })
      ).status,
      401
    );
  });
  await t.test('códigos y access tokens expirados se rechazan', async () => {
    const expiredCode = await code();
    const codeHash = createHash('sha256').update(expiredCode.code).digest('hex');
    const record = application.store.get('code', codeHash);
    application.store.put('code', codeHash, record, Date.now() - 1);
    assert.equal((await exchange(expiredCode)).status, 400);
    const fresh = await (await exchange(await code())).json();
    const accessHash = createHash('sha256').update(fresh.access_token).digest('hex');
    const access = application.store.get('access', accessHash);
    application.store.put('access', accessHash, access, Date.now() - 1);
    assert.equal(
      (
        await request('/mcp', {
          method: 'POST',
          headers: { Authorization: `Bearer ${fresh.access_token}` }
        })
      ).status,
      401
    );
  });
  await t.test('revocación explícita del consentimiento', async () => {
    const fresh = await (await exchange(await code())).json();
    assert.equal(
      (await request('/revoke', form({ client_id: client.client_id, token: fresh.refresh_token })))
        .status,
      200
    );
    assert.equal(
      (
        await request('/mcp', {
          method: 'POST',
          headers: { Authorization: `Bearer ${fresh.access_token}` }
        })
      ).status,
      401
    );
  });
});

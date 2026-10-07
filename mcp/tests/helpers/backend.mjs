import { createServer } from 'node:http';

export async function backendAdministrador(t) {
  let role = 'Administrador';
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
    if (req.url === '/api/auth/login') res.end(JSON.stringify({ success: true, token }));
    else if (req.url === '/api/auth/me' || req.url === '/api/mcp/admin/session') res.end(JSON.stringify({ success: true, user: { id: 'admin-test', role } }));
    else res.end(JSON.stringify({ success: true, data: [] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return {
    env: { MCP_BASE_URL: `http://127.0.0.1:${server.address().port}`, MCP_EMAIL: 'admin@test', MCP_PASSWORD: 'test' },
    setRole: value => { role = value; }
  };
}

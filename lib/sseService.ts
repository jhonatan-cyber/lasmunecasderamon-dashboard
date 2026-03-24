/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';

interface SSEMessage {
  type: string;
  data?: any;
  timestamp: string;
}

class SSEManager {
  private clients: Set<NextApiResponse> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    const globalInstance = global as any;
    if (globalInstance.__sseManager) {
      return globalInstance.__sseManager;
    }
    globalInstance.__sseManager = this;
  }

  public registerClient(req: NextApiRequest, res: NextApiResponse) {
    console.log(`[SSEManager] 📱 Registrando cliente. IP: ${req.socket.remoteAddress}, Host: ${req.headers.host}, Agent: ${req.headers['user-agent']}`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Accel-Buffering', 'no');

    console.log(`[SSEManager] 📱 Registrando nuevo cliente. Total antes: ${this.clients.size}`);
    this.clients.add(res);
    this.startHeartbeat();
    console.log(`[SSEManager] ✅ Cliente registrado. Total ahora: ${this.clients.size}`);

    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    req.on('close', () => {
      this.removeClient(res);
    });

    req.on('error', () => {
      this.removeClient(res);
    });
  }

  public broadcast(type: string, data: any = {}) {
    const message: SSEMessage = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    const payload = `data: ${JSON.stringify(message)}\n\n`;
    const deadClients: NextApiResponse[] = [];

    console.log(`[SSEManager] 📣 Enviando evento '${type}' a ${this.clients.size} clientes.`);
    this.clients.forEach(client => {
      try {
        if (!client.writableEnded) {
          client.write(payload);
          if ((client as any).flush) {
             (client as any).flush();
          }
        }
      } catch (err) {
        deadClients.push(client);
      }
    });

    deadClients.forEach(client => this.removeClient(client));
  }

  private sendToClient(res: NextApiResponse, message: SSEMessage) {
    try {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    } catch (err) {
      this.removeClient(res);
    }
  }

  private removeClient(res: NextApiResponse) {
    this.clients.delete(res);
    if (this.clients.size === 0 && this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.clients.size === 0) {
        clearInterval(this.heartbeatInterval!);
        this.heartbeatInterval = null;
        return;
      }
      this.broadcast('ping');
    }, 30000); // 30 segundos
  }

  public get sseClients() {
    return this.clients;
  }
}

export const sseManager = new SSEManager();

export const sendNotificationToAll = (type: string, data: any) => {
  sseManager.broadcast(type, data);
};

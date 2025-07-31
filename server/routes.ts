import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";
import { SignalingMessageSchema } from "@shared/schema";

interface Client {
  id: string;
  ws: WebSocket;
  lastSeen: Date;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for signaling
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, Client>();

  // Cleanup disconnected clients every 30 seconds
  setInterval(() => {
    const now = new Date();
    const clientsArray = Array.from(clients.entries());
    for (const [id, client] of clientsArray) {
      if (now.getTime() - client.lastSeen.getTime() > 60000) { // 1 minute timeout
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close();
        }
        clients.delete(id);
      }
    }
  }, 30000);

  wss.on('connection', (ws) => {
    const clientId = nanoid(10).toUpperCase().replace(/(.{3})/g, '$1-').slice(0, -1); // Format: ABC-123-XYZ
    const client: Client = {
      id: clientId,
      ws,
      lastSeen: new Date(),
    };
    
    clients.set(clientId, client);
    console.log(`Client connected: ${clientId}`);

    // Send connection ID to client
    ws.send(JSON.stringify({
      type: 'connection-id',
      connectionId: clientId,
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        const validatedMessage = SignalingMessageSchema.parse(message);
        
        client.lastSeen = new Date();

        switch (validatedMessage.type) {
          case 'connection-request':
            handleConnectionRequest(validatedMessage, client);
            break;
          
          case 'offer':
          case 'answer':
          case 'ice-candidate':
            relaySignalingMessage(validatedMessage, client);
            break;
          
          default:
            console.log('Unknown message type:', validatedMessage.type);
        }
      } catch (error) {
        console.error('Invalid message received:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId}`);
      clients.delete(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      clients.delete(clientId);
    });
  });

  function handleConnectionRequest(message: any, sender: Client) {
    const { targetId, connectionId } = message;
    const targetClient = clients.get(targetId);

    if (!targetClient) {
      sender.ws.send(JSON.stringify({
        type: 'connection-response',
        success: false,
        error: 'Target device not found or offline',
      }));
      return;
    }

    if (targetClient.ws.readyState !== WebSocket.OPEN) {
      sender.ws.send(JSON.stringify({
        type: 'connection-response',
        success: false,
        error: 'Target device is not available',
      }));
      return;
    }

    // Forward connection request to target
    targetClient.ws.send(JSON.stringify({
      type: 'incoming-connection',
      fromId: connectionId,
      fromConnectionId: sender.id,
    }));

    sender.ws.send(JSON.stringify({
      type: 'connection-response',
      success: true,
      message: 'Connection request sent',
    }));
  }

  function relaySignalingMessage(message: any, sender: Client) {
    const { targetId } = message;
    if (!targetId) return;

    const targetClient = clients.get(targetId);
    if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
      // Add sender ID to the message
      const relayedMessage = {
        ...message,
        fromId: sender.id,
      };
      targetClient.ws.send(JSON.stringify(relayedMessage));
    }
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      connectedClients: clients.size,
      timestamp: new Date().toISOString(),
    });
  });

  return httpServer;
}

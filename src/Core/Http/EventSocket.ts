import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PING_INTERVAL = 30000;
export const EVENT_MESSAGE = 'beatmapset_event';

export class EventSocket {
    private static wss: WebSocketServer | null = null;

    static start(server: Server): void {
        const wss = new WebSocketServer({ server, path: '/api/ws' });
        this.wss = wss;

        // proxies close idle connections
        setInterval(() => {
            for (const client of wss.clients) {
                client.ping();
            }
        }, PING_INTERVAL);

        process.on('message', (msg: { type: string; data: string }) => {
            if (msg?.type === EVENT_MESSAGE) {
                EventSocket.broadcast(msg.data);
            }
        });
    }

    static broadcast(message: string): void {
        if (!this.wss) {
            return;
        }
        for (const client of this.wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }
}
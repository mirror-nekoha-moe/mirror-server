import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PING_INTERVAL = 30000;
export const EVENT_MESSAGE = 'beatmapset_event';

export class EventSocket {
    private static wss: WebSocketServer | null = null;

    /**
     * @api {get} /api/ws Beatmapset events (WebSocket)
     * @apiName events
     * @apiGroup Events
     * @apiDescription Sends every beatmapset event from osu! as JSON.
     * @apiSuccess {String} source     events or beatmapset_events
     * @apiSuccess {String} type       osu! event type
     * @apiSuccess {Object} event      osu! event
     * @apiSuccess {Object} beatmapset Beatmapset with beatmaps (see /api/beatmapset/:id for structure)
     * @apiExample {js} Example usage:
     *     const ws = new WebSocket('wss://mirror.nekoha.moe/api/ws');
     */
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
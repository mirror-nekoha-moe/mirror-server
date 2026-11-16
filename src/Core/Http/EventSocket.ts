import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PING_INTERVAL = 30000;
export const EVENT_MESSAGE = 'beatmapset_event';

function sendToAll(wss: WebSocketServer, message: string): void {
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

export class EventSocket {
    private static allEvents: WebSocketServer | null = null;
    private static beatmapsetEvents: WebSocketServer | null = null;

    /**
     * @api {get} /api/event osu! events (WebSocket)
     * @apiName event
     * @apiGroup Events
     * @apiDescription Sends every osu! event as JSON. /api/ws is the same.
     * @apiSuccess {String} source     events or beatmapset_events
     * @apiSuccess {String} type       osu! event type
     * @apiSuccess {Object} event      osu! event
     * @apiSuccess {Object} beatmapset Beatmapset with beatmaps (see /api/beatmapset/:id for structure), null for events without a beatmapset
     * @apiExample {js} Example usage:
     *     const ws = new WebSocket('wss://mirror.nekoha.moe/api/event');
     */

    /**
     * @api {get} /api/event/beatmapset Beatmapset events (WebSocket)
     * @apiName eventBeatmapset
     * @apiGroup Events
     * @apiDescription Same as /api/event, only beatmapset events.
     * @apiSuccess {String} source     events or beatmapset_events
     * @apiSuccess {String} type       osu! event type
     * @apiSuccess {Object} event      osu! event
     * @apiSuccess {Object} beatmapset Beatmapset with beatmaps (see /api/beatmapset/:id for structure)
     * @apiExample {js} Example usage:
     *     const ws = new WebSocket('wss://mirror.nekoha.moe/api/event/beatmapset');
     */
    static start(server: Server): void {
        const allEvents = new WebSocketServer({ noServer: true });
        const beatmapsetEvents = new WebSocketServer({ noServer: true });
        this.allEvents = allEvents;
        this.beatmapsetEvents = beatmapsetEvents;

        server.on('upgrade', (req, socket, head) => {
            const path = (req.url ?? '').split('?')[0];

            let wss = null;
            if (path === '/api/ws' || path === '/api/event') {
                wss = allEvents;
            } else if (path === '/api/event/beatmapset') {
                wss = beatmapsetEvents;
            }

            if (!wss) {
                socket.destroy();
                return;
            }
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req);
            });
        });

        // proxies close idle connections
        setInterval(() => {
            for (const client of allEvents.clients) {
                client.ping();
            }
            for (const client of beatmapsetEvents.clients) {
                client.ping();
            }
        }, PING_INTERVAL);

        process.on('message', (msg: { type: string; data: string; isBeatmapset: boolean }) => {
            if (msg?.type === EVENT_MESSAGE) {
                EventSocket.broadcast(msg.data, msg.isBeatmapset);
            }
        });
    }

    static broadcast(message: string, isBeatmapset: boolean): void {
        if (this.allEvents) {
            sendToAll(this.allEvents, message);
        }
        if (isBeatmapset && this.beatmapsetEvents) {
            sendToAll(this.beatmapsetEvents, message);
        }
    }
}
import { Environment } from '@Bootstrap/Environment';

export class QbitService {
    static async getTorrentStats(): Promise<Map<string, { seeds: number; leechers: number; magnet: string }>> {
        const stats = new Map<string, { seeds: number; leechers: number; magnet: string }>();
        const url = Environment.env.QBIT_URL;
        if (!url) {
            return stats;
        }

        const login = await fetch(`${url}/api/v2/auth/login`, {
            method: 'POST',
            body: new URLSearchParams({
                username: Environment.env.QBIT_USERNAME,
                password: Environment.env.QBIT_PASSWORD,
            }),
        });
        const cookie = login.headers.get('set-cookie');
        if (!cookie) {
            throw new Error('qBittorrent login failed');
        }
        const session = cookie.split(';')[0];

        const res = await fetch(`${url}/api/v2/torrents/info`, {
            headers: { Cookie: session },
        });
        const torrents = await res.json() as {
            name: string;
            num_complete: number;
            num_incomplete: number;
            magnet_uri: string;
        }[];

        for (const torrent of torrents) {
            stats.set(torrent.name, {
                seeds: torrent.num_complete,
                leechers: torrent.num_incomplete,
                magnet: torrent.magnet_uri,
            });
        }
        return stats;
    }
}
import { Cache } from '@Core/Cache/Cache';
import { StatsRepository } from '@Repository/StatsRepository';

const FLUSH_INTERVAL_MS = 30 * 1000;
const LIVE_FLUSH_INTERVAL_MS = 5 * 1000;
const LIVE_WINDOW_MINUTES = 10;
const LIVE_KEY_TTL_SECONDS = 15 * 60;

function currentMinute(): number {
    return Math.floor(Date.now() / 60000);
}

function liveKey(minute: number): string {
    return `api-requests-minute:${minute}`;
}

export class RequestStatsService {
    private static pendingRequests = 0;
    private static pendingBytes = 0;
    private static pendingByMinute = new Map<number, number>();

    static count(bytes: number): void {
        RequestStatsService.pendingRequests++;
        RequestStatsService.pendingBytes += bytes;

        const minute = currentMinute();
        const minuteCount = RequestStatsService.pendingByMinute.get(minute) ?? 0;
        RequestStatsService.pendingByMinute.set(minute, minuteCount + 1);
    }

    static start(): void {
        setInterval(() => RequestStatsService.flush(), FLUSH_INTERVAL_MS);
        setInterval(() => RequestStatsService.flushLive(), LIVE_FLUSH_INTERVAL_MS);
    }

    // current minute is incomplete, skip it
    static async getRequestsPerSecond(): Promise<number> {
        const now = currentMinute();
        const keys = [];
        for (let i = 1; i <= LIVE_WINDOW_MINUTES; i++) {
            keys.push(liveKey(now - i));
        }

        const counts = await Cache.getNumbers(keys);
        let total = 0;
        for (const count of counts) {
            total += count;
        }
        const windowSeconds = LIVE_WINDOW_MINUTES * 60;
        return total / windowSeconds;
    }

    // workers add up in valkey
    private static flushLive(): void {
        const pending = RequestStatsService.pendingByMinute;
        RequestStatsService.pendingByMinute = new Map();

        for (const [minute, count] of pending) {
            Cache.incrementBy(liveKey(minute), count, LIVE_KEY_TTL_SECONDS)
                .catch((err) => console.error('Failed to update live request count:', err));
        }
    }

    private static flush(): void {
        const count = RequestStatsService.pendingRequests;
        const bytes = RequestStatsService.pendingBytes;
        if (count === 0) {
            return;
        }
        RequestStatsService.pendingRequests = 0;
        RequestStatsService.pendingBytes = 0;

        StatsRepository.addApiRequests(count, bytes)
            .catch((err) => {
                // retry on the next flush
                RequestStatsService.pendingRequests += count;
                RequestStatsService.pendingBytes += bytes;
                console.error('Failed to update api_request_stats:', err);
            });
    }
}
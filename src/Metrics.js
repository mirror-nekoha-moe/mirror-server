import client from 'prom-client';
import cluster from 'cluster';

export const register = new client.Registry();
register.setDefaultLabels({ service: 'mirror-server' });

client.collectDefaultMetrics({ register });

if (cluster.isWorker) {
    client.AggregatorRegistry.setRegistries(register);
    new client.AggregatorRegistry();
}

export const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register],
});

export const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

export const httpErrorsTotal = new client.Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP error responses, labeled by method, route and status_code',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

export const upGauge = new client.Gauge({
    name: 'mirror_server_up',
    help: 'Always 1 while this mirror-server worker process is running',
    aggregator: 'max',
    registers: [register],
});
upGauge.set(1);

export const cacheOperationsTotal = new client.Counter({
    name: 'mirror_cache_operations_total',
    help: 'Total number of Redis cache lookups, labeled by endpoint and result (hit/miss)',
    labelNames: ['endpoint', 'result'],
    registers: [register],
});

export function trackCache(endpoint, hit) {
    cacheOperationsTotal.inc({ endpoint, result: hit ? 'hit' : 'miss' });
}

export const contentDeliveryTotal = new client.Counter({
    name: 'mirror_content_delivery_total',
    help: 'Total number of content items served, labeled by type',
    labelNames: ['type'],
    registers: [register],
});

export function trackDelivery(type) {
    contentDeliveryTotal.inc({ type });
}

export const downloadBytesTotal = new client.Counter({
    name: 'mirror_download_bytes_total',
    help: 'Total number of bytes served via beatmapset downloads',
    registers: [register],
});

export const beatmapCount = new client.Gauge({
    name: 'mirror_beatmap_count',
    help: 'Total number of individual beatmaps stored',
    aggregator: 'max',
    registers: [register],
});

export const beatmapsetCount = new client.Gauge({
    name: 'mirror_beatmapset_count',
    help: 'Total number of beatmapsets stored',
    aggregator: 'max',
    registers: [register],
});

export function trackStats(stats) {
    if (!stats) {
        return;
    }
    if (stats.beatmap_count !== undefined) {
        beatmapCount.set(Number(stats.beatmap_count));
    }
    if (stats.beatmapset_count !== undefined) {
        beatmapsetCount.set(Number(stats.beatmapset_count));
    }
}

export function metricsMiddleware(req, res, next) {
    // Skip metrics requests
    if (req.path === '/metrics') {
        return next();
    }

    const end = httpRequestDuration.startTimer();

    res.on('finish', () => {
        const route = req.route?.path || req.path;
        const labels = {
            method: req.method,
            route,
            status_code: res.statusCode
        };
        httpRequestsTotal.inc(labels);
        if (res.statusCode >= 400) {
            httpErrorsTotal.inc(labels);
        }
        end(labels);
    });

    next();
}

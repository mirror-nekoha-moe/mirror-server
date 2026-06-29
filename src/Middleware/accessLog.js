import { pool } from '../Constants.js';

const logQueue = [];
const MAX_QUEUE_SIZE = 10000;
const FLUSH_INTERVAL_MS = 2000;

const PATH_BLACKLIST = new Set([
    '/metrics'
]);

const UA_BLACKLIST = [
    /prometheus/i
];

function shouldSkipLog(req) {
    const path = req.path;
    const ua = req.get('User-Agent') || '';

    // exact path match
    if (PATH_BLACKLIST.has(path)) return true;

    // user-agent regex match
    for (const rule of UA_BLACKLIST) {
        if (rule.test(ua)) return true;
    }
    return false;
}

export function accessLog(req, res, next) {
    if (shouldSkipLog(req)) {
        return next();
    }
    const start = process.hrtime.bigint();
    let bytesSent = 0;

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = function (chunk, encoding, callback) {
        if (chunk) bytesSent += Buffer.byteLength(chunk);
        return originalWrite(chunk, encoding, callback);
    };

    res.end = function (chunk, encoding, callback) {
        if (chunk) bytesSent += Buffer.byteLength(chunk);
        return originalEnd(chunk, encoding, callback);
    };

    res.on('finish', () => {
        const durationMs =
            Number(process.hrtime.bigint() - start) / 1_000_000;

        if (logQueue.length >= MAX_QUEUE_SIZE) {
            logQueue.shift();
        }

        logQueue.push({
            remote_ip: req.ip,
            method: req.method,
            path: req.path,
            query: req.originalUrl.includes('?')
                ? req.originalUrl.split('?')[1]
                : null,
            url: req.originalUrl,
            status: res.statusCode,
            bytes_sent: bytesSent,
            user_agent: req.get('User-Agent'),
            referer: req.get('Referer'),
            http_version: `HTTP/${req.httpVersion}`,
            response_time_ms: Math.round(durationMs),
            host: req.get('Host')
        });
    });

    next();
}

// WORKER
setInterval(async () => {
    if (logQueue.length === 0) return;

    const batch = logQueue.splice(0, logQueue.length);

    const values = [];
    const params = [];

    batch.forEach((log, i) => {
        const base = i * 12;

        values.push(
            `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12})`
        );

        params.push(
            log.remote_ip,
            log.method,
            log.path,
            log.query,
            log.url,
            log.status,
            log.bytes_sent,
            log.user_agent,
            log.referer,
            log.http_version,
            log.response_time_ms,
            log.host
        );
    });

    try {
        await pool.query(`
            INSERT INTO access_log (
                remote_ip,
                method,
                path,
                query,
                url,
                status,
                bytes_sent,
                user_agent,
                referer,
                http_version,
                response_time_ms,
                host
            )
            VALUES ${values.join(',')}
        `, params);

    } catch (err) {
        console.error('Batch access_log insert failed:', err);
    }

}, FLUSH_INTERVAL_MS);
import cluster from 'cluster';
import http from 'http';
import client from 'prom-client';
import { cpus } from 'os';
import { runMigrations } from './Migration/Database.js';
import { pool } from './Constants.js';

const METRICS_PORT = process.env.METRICS_PORT || 30728;

if (cluster.isPrimary) {
    console.log(`Primary process ${process.pid}`);
    
    // Ensure Database Schema 
    await runMigrations(pool);

    for (let i = 0; i < cpus().length; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died, restarting...`);
        cluster.fork();
    });

    // Serve cluster-wide metrics from the primary process
    const aggregatorRegistry = new client.AggregatorRegistry();
    http.createServer(async (req, res) => {
        if (req.url !== '/metrics') {
            res.writeHead(404);
            return res.end('Not Found');
        }
        try {
            const metrics = await aggregatorRegistry.clusterMetrics();
            res.writeHead(200, {
                'Content-Type': aggregatorRegistry.contentType
            });
            res.end(metrics);
        } catch (err) {
            res.writeHead(500);
            res.end(err.message);
        }
    }).listen(METRICS_PORT, () => {
        console.log(`Cluster-wide metrics listening on port ${METRICS_PORT}`);
    });
} else {
    await import('./Bootstrap.js');
}
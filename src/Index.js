import cluster from 'cluster';
import { cpus } from 'os';
import { runMigrations } from './Migration/Database.js';
import { pool } from './Constants.js';

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
} else {
    await import('./Bootstrap.js');
}
import cluster from 'cluster';
import { cpus } from 'os';

if (cluster.isPrimary) {
    const numCPUs = cpus().length;
    console.log(`Primary process ${process.pid} is running`);
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died, restarting...`);
        cluster.fork();
    });
} else {
    await import('./Bootstrap.js');
}
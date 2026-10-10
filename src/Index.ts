import cluster from 'cluster';
import { cpus } from 'os';
import { Environment } from '@Bootstrap/Environment';

async function startPrimary(): Promise<void> {
    const { SchemaUpdater } = await import('@Core/Database/SchemaUpdater');

    console.log(`[ mirror-server - v${process.env.npm_package_version} ]`);
    console.log(`Primary process ${process.pid}`);

    await SchemaUpdater.initialize();

    const workerCount = cpus().length;
    for (let i = 0; i < workerCount; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died, restarting...`);
        cluster.fork();
    });

}

async function startWorker(): Promise<void> {
    const { HttpServer } = await import('@Core/Http/Server');
    HttpServer.start();
}

async function main(): Promise<void> {
    // load env before any import that reads it
    Environment.initialize();

    if (cluster.isPrimary) {
        await startPrimary();
    } else {
        await startWorker();
    }
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
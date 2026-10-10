import express from 'express';
import cors from 'cors';
import { Environment } from '@Bootstrap/Environment';
import { registerRoutes } from '@Route/Routes';

export class HttpServer {
    static start(): void {
        const app = express();

        app.use(cors());
        app.use(express.json());

        registerRoutes(app);

        app.listen(Environment.env.PORT, () => {
            console.log(`Mirror API server listening on port ${Environment.env.PORT} with PID=${process.pid}`);
        });
    }
}
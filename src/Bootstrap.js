import express from 'express';
import cors from 'cors';

import { app, port } from './Constants.js';
import { accessLog } from './Middleware/accessLog.js';
import { metricsMiddleware } from './Metrics.js';

// Middleware
app.use(cors());
app.use(express.json());
app.use(accessLog);
app.use(metricsMiddleware);

import ('./EndpointRegister.js');

app.listen(port, () => {
    console.log(`Mirror API server listening on port ${port} with PID=${process.pid}`);
});
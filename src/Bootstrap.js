import express from 'express';
import cors from 'cors';

import { app, port } from './Constants.js';

// Middleware
app.use(cors());
app.use(express.json());

import ('./EndpointRegister.js');

app.listen(port, () => {
    console.log(`Mirror API server listening on port ${port} with PID=${process.pid}`);
});
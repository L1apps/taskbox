
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './database.js';
import { createApiRouter } from './api.js'; // Import the router factory

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


async function startServer() {
  try {
    const db = await initializeDatabase();

    // Create and mount the API router
    const apiRouter = createApiRouter(db);
    app.use('/api', apiRouter);

    // --- Static file serving ---
    // Serve the built React app
    app.use(express.static(path.join(__dirname, 'dist')));

    // The "catchall" handler for client-side routing
    // This sends index.html for any request that doesn't match an API route or a static file
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
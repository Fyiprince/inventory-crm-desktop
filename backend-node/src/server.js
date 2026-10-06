require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env'),
});

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

const PORT = process.env.PORT || 8002;
const HOST = process.env.HOST || '0.0.0.0';

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------

app.use(
  cors({
    origin: '*',
    credentials: false,
  })
);

app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(morgan('tiny'));

// -----------------------------------------------------------------------------
// API ROUTES
// -----------------------------------------------------------------------------
//
// IMPORTANT:
// The /api prefix is the main API entry point used by the Electron app.
// Do NOT mount the router at "/" because "/" is reserved for the React SPA.
//
// -----------------------------------------------------------------------------

app.use('/api', routes);

// -----------------------------------------------------------------------------
// STATIC REACT FRONTEND
// -----------------------------------------------------------------------------
//
// Electron sets:
// STATIC_DIR = <resources>/frontend/build
//
// In development this can also be supplied manually.
//
// -----------------------------------------------------------------------------

if (process.env.STATIC_DIR) {
  const staticDir = path.resolve(process.env.STATIC_DIR);

  console.log('[inventory-crm] STATIC_DIR:', staticDir);

  if (fs.existsSync(staticDir)) {
    console.log('[inventory-crm] Static frontend found:', staticDir);

    // Serve React build assets.
    app.use(
      express.static(staticDir, {
        index: false,
      })
    );

    // -------------------------------------------------------------------------
    // React SPA fallback
    // -------------------------------------------------------------------------
    //
    // Any GET request that is NOT an /api request and does not match a static
    // file should receive index.html.
    //
    // This allows React Router to work inside Electron.
    //
    app.get(/^\/(?!api(?:\/|$)).*/, (req, res, next) => {
      const indexFile = path.join(staticDir, 'index.html');

      if (fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
      }

      next();
    });

    // Root explicitly serves React.
    app.get('/', (req, res) => {
      const indexFile = path.join(staticDir, 'index.html');

      if (fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
      }

      res.status(404).send('Frontend build not found.');
    });
  } else {
    console.error(
      '[inventory-crm] STATIC_DIR does not exist:',
      staticDir
    );

    app.get('/', (req, res) => {
      res.status(500).json({
        error: 'Frontend build not found',
        staticDir,
      });
    });
  }
} else {
  console.log(
    '[inventory-crm] STATIC_DIR not configured. Running API-only mode.'
  );
}

// -----------------------------------------------------------------------------
// Error handling
// -----------------------------------------------------------------------------

app.use(notFound);
app.use(errorHandler);

// -----------------------------------------------------------------------------
// Start server
// -----------------------------------------------------------------------------

const server = app.listen(PORT, HOST, () => {
  const address = server.address();
  const actualPort =
    typeof address === 'object' && address
      ? address.port
      : PORT;

  console.log(
    `[inventory-crm] Node/Express server listening on ${HOST}:${actualPort}`
  );

  if (process.send) {
    process.send({
      type: 'ready',
      port: Number(actualPort),
    });
  }
});

// -----------------------------------------------------------------------------
// Graceful shutdown
// -----------------------------------------------------------------------------

const shutdown = () => {
  console.log('[inventory-crm] Shutting down...');

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(0);
  }, 2000).unref();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('message', (msg) => {
  if (msg === 'shutdown') {
    shutdown();
  }
});
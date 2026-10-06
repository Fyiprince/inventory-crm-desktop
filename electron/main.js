/**
 * Electron main process for Inventory CRM
 *
 * Production architecture:
 *
 * Electron
 *    |
 *    +---- starts Express backend
 *    |          |
 *    |          +---- API
 *    |          +---- React production build
 *    |
 *    +---- BrowserWindow -> http://127.0.0.1:<port>
 *
 * The React app is served by Express.
 */

const {
  app,
  BrowserWindow,
  Menu,
  shell,
  dialog,
  ipcMain,
} = require('electron');

const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');
const isDev = !app.isPackaged;

// -----------------------------------------------------------------------------
// IMPORTANT
// -----------------------------------------------------------------------------
//
// We intentionally do NOT use !app.isPackaged to decide whether the frontend
// should run on port 3000.
//
// `npm start` launches Electron without packaging, but we still want to test
// the complete production-style application using the built React frontend.
//
// `npm run dev` can still use ELECTRON_START_URL when explicitly supplied.
//
// -----------------------------------------------------------------------------

const isPackaged = app.isPackaged;

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

const APP_ROOT = isPackaged
  ? process.resourcesPath
  : path.resolve(__dirname, '..');

const BACKEND_DIR = path.join(
  APP_ROOT,
  'backend-node'
);

const SERVER_ENTRY = path.join(
  BACKEND_DIR,
  'src',
  'server.js'
);

const PRISMA_DIR = path.join(
  BACKEND_DIR,
  'prisma'
);

const TEMPLATE_DB = path.join(
  PRISMA_DIR,
  'template.db'
);

const FRONTEND_BUILD = path.join(
  APP_ROOT,
  'frontend',
  'build'
);

// -----------------------------------------------------------------------------
// User data
// -----------------------------------------------------------------------------

const USER_DATA = app.getPath('userData');

const DB_FILE = path.join(
  USER_DATA,
  'crm.db'
);

const BACKUP_DIR = path.join(
  USER_DATA,
  'backups'
);

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------

let mainWindow = null;
let backendChild = null;
let backendPort = null;

app.isQuitting = false;

// -----------------------------------------------------------------------------
// Utility: get free local TCP port
// -----------------------------------------------------------------------------

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.unref();

    server.on('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      const port =
        typeof address === 'object' && address
          ? address.port
          : null;

      server.close(() => {
        if (!port) {
          reject(new Error('Could not determine free port.'));
          return;
        }

        resolve(port);
      });
    });
  });
}

// -----------------------------------------------------------------------------
// Database initialization
// -----------------------------------------------------------------------------

function ensureDatabase() {
  if (!fs.existsSync(USER_DATA)) {
    fs.mkdirSync(USER_DATA, {
      recursive: true,
    });
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, {
      recursive: true,
    });
  }

  if (!fs.existsSync(DB_FILE)) {
    if (fs.existsSync(TEMPLATE_DB)) {
      fs.copyFileSync(
        TEMPLATE_DB,
        DB_FILE
      );

      console.log(
        '[electron] Database initialized from template:',
        DB_FILE
      );
    } else {
      console.warn(
        '[electron] template.db not found.'
      );

      // Prisma will initialize/use the database according to its schema.
      fs.writeFileSync(
        DB_FILE,
        ''
      );
    }
  }
}

// -----------------------------------------------------------------------------
// HTTP readiness check
// -----------------------------------------------------------------------------

function waitForHttp(
  port,
  timeoutMs = 20000
) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const retry = () => {
      if (
        Date.now() - started >
        timeoutMs
      ) {
        reject(
          new Error(
            `Backend did not become ready on port ${port}.`
          )
        );

        return;
      }

      setTimeout(
        tick,
        300
      );
    };

    const tick = () => {
      const request = http.get(
        `http://127.0.0.1:${port}/api/health`,
        (response) => {
          response.resume();

          if (
            response.statusCode >= 200 &&
            response.statusCode < 500
          ) {
            resolve();
            return;
          }

          retry();
        }
      );

      request.on(
        'error',
        retry
      );

      request.setTimeout(
        1000,
        () => {
          request.destroy();
          retry();
        }
      );
    };

    tick();
  });
}

// -----------------------------------------------------------------------------
// Start Express backend
// -----------------------------------------------------------------------------

async function startBackend() {
  // ---------------------------------------------------------------------------
  // Validate required files first
  // ---------------------------------------------------------------------------

  if (!fs.existsSync(BACKEND_DIR)) {
    throw new Error(
      `Backend directory not found:\n${BACKEND_DIR}`
    );
  }

  if (!fs.existsSync(SERVER_ENTRY)) {
    throw new Error(
      `Backend server.js not found:\n${SERVER_ENTRY}`
    );
  }

  if (!fs.existsSync(FRONTEND_BUILD)) {
    throw new Error(
      `React frontend build not found:\n${FRONTEND_BUILD}\n\nRun "npm run build" first.`
    );
  }

  const indexFile = path.join(
    FRONTEND_BUILD,
    'index.html'
  );

  if (!fs.existsSync(indexFile)) {
    throw new Error(
      `React index.html not found:\n${indexFile}\n\nRun "npm run build" first.`
    );
  }

  // ---------------------------------------------------------------------------
  // Database
  // ---------------------------------------------------------------------------

  ensureDatabase();

  // ---------------------------------------------------------------------------
  // Port
  // ---------------------------------------------------------------------------
  // Ask the OS for an ephemeral port (0). The backend reports the actual
  // bound port through IPC after listen() succeeds. This removes the
  // fixed-port/race-condition problem on other PCs.

  backendPort = 8002;

  // ---------------------------------------------------------------------------
  // Environment
  // ---------------------------------------------------------------------------

  const backendEnv = {
    ...process.env,

    NODE_ENV: 'production',

    PORT: String(
      backendPort
    ),

    HOST: '127.0.0.1',

    DATABASE_URL:
      `file:${DB_FILE}`,

    BACKUP_DIR:
      BACKUP_DIR,

    STATIC_DIR:
      FRONTEND_BUILD,

    // Electron binary must behave as Node for child_process.fork().
    ELECTRON_RUN_AS_NODE: '1',
  };

  console.log(
    '[electron] ========================================'
  );

  console.log(
    '[electron] Starting Inventory CRM backend'
  );

  console.log(
    '[electron] Packaged:',
    isPackaged
  );

  console.log(
    '[electron] Backend:',
    SERVER_ENTRY
  );

  console.log(
    '[electron] Frontend:',
    FRONTEND_BUILD
  );

  console.log(
    '[electron] Database:',
    DB_FILE
  );

  console.log(
    '[electron] Port:',
    backendPort
  );

  console.log(
    '[electron] ========================================'
  );

  // ---------------------------------------------------------------------------
  // Fork backend
  // ---------------------------------------------------------------------------

  backendChild = fork(
    SERVER_ENTRY,
    [],
    {
      cwd: BACKEND_DIR,

      env: backendEnv,

      stdio: [
        'ignore',
        'pipe',
        'pipe',
        'ipc',
      ],

      execPath:
        process.execPath,
    }
  );

  // ---------------------------------------------------------------------------
  // Backend stdout
  // ---------------------------------------------------------------------------

  if (backendChild.stdout) {
    backendChild.stdout.on(
      'data',
      (data) => {
        process.stdout.write(
          `[backend] ${data}`
        );
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Backend stderr
  // ---------------------------------------------------------------------------

  if (backendChild.stderr) {
    backendChild.stderr.on(
      'data',
      (data) => {
        process.stderr.write(
          `[backend:error] ${data}`
        );
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Backend errors
  // ---------------------------------------------------------------------------

  backendChild.on(
    'error',
    (error) => {
      console.error(
        '[electron] Backend process error:',
        error
      );
    }
  );

  // ---------------------------------------------------------------------------
  // Backend exit
  // ---------------------------------------------------------------------------

  backendChild.on(
    'exit',
    (code, signal) => {
      console.log(
        '[electron] Backend exited:',
        {
          code,
          signal,
        }
      );

      backendChild = null;

      if (
        mainWindow &&
        !app.isQuitting
      ) {
        dialog.showErrorBox(
          'Inventory CRM',
          'The local backend server stopped unexpectedly.'
        );

        app.quit();
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Wait for backend to report the actual bound port
  // ---------------------------------------------------------------------------

  

  await waitForHttp(backendPort);

  console.log(
    `[electron] Backend ready: http://127.0.0.1:${backendPort}`
  );
}

// -----------------------------------------------------------------------------
// Stop backend
// -----------------------------------------------------------------------------

function stopBackend() {
  if (!backendChild) {
    return;
  }

  const child = backendChild;

  backendChild = null;

  try {
    if (child.connected) {
      child.send(
        'shutdown'
      );
    }
  } catch (error) {
    console.warn(
      '[electron] Could not send shutdown:',
      error.message
    );
  }

  setTimeout(() => {
    try {
      if (!child.killed) {
        child.kill();
      }
    } catch (_) {}
  }, 1000);

  setTimeout(() => {
    try {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    } catch (_) {}
  }, 3000);
}

// -----------------------------------------------------------------------------
// Create Electron window
// -----------------------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,

    height: 900,

    minWidth: 1100,

    minHeight: 700,

    show: false,

    backgroundColor: '#FAFAFA',

    title: 'Inventory CRM',

    webPreferences: {
      preload: path.join(
        __dirname,
        'preload.js'
      ),

      contextIsolation: true,

      nodeIntegration: false,

      sandbox: false,
    },
  });

  // ---------------------------------------------------------------------------
  // ALWAYS use Express backend for the normal Electron application.
  //
  // Only use ELECTRON_START_URL when explicitly provided.
  //
  // This means:
  //
  // npm start
  //     -> Express + React build
  //
  // npm run dist:win
  //     -> Express + React build
  //
  // npm run dev
  //     -> Can explicitly use React dev server if desired.
  // ---------------------------------------------------------------------------

  const startUrl =
    process.env.ELECTRON_START_URL ||
    `http://127.0.0.1:${backendPort}`;

  console.log(
    '[electron] Loading application:',
    startUrl
  );

  mainWindow.loadURL(
    startUrl
  );

  // ---------------------------------------------------------------------------
  // Load failure
  // ---------------------------------------------------------------------------

  mainWindow.webContents.on(
    'did-fail-load',
    (
      event,
      errorCode,
      errorDescription,
      validatedURL
    ) => {
      console.error(
        '[electron] Failed to load:',
        {
          errorCode,
          errorDescription,
          validatedURL,
        }
      );
    }
  );

  // ---------------------------------------------------------------------------
  // Renderer crash
  // ---------------------------------------------------------------------------

  mainWindow.webContents.on(
    'render-process-gone',
    (
      event,
      details
    ) => {
      console.error(
        '[electron] Renderer process gone:',
        details
      );
    }
  );

  // ---------------------------------------------------------------------------
  // Show window
  // ---------------------------------------------------------------------------

  mainWindow.once(
    'ready-to-show',
    () => {
      if (mainWindow) {
        mainWindow.show();
      }
    }
  );

  // ---------------------------------------------------------------------------
  // External links
  // ---------------------------------------------------------------------------

  mainWindow.webContents.setWindowOpenHandler(
    ({ url }) => {
      if (
        url.startsWith('http://') ||
        url.startsWith('https://')
      ) {
        shell.openExternal(
          url
        );

        return {
          action: 'deny',
        };
      }

      return {
        action: 'allow',
      };
    }
  );

  // ---------------------------------------------------------------------------
  // Closed
  // ---------------------------------------------------------------------------

  mainWindow.on(
    'closed',
    () => {
      mainWindow = null;
    }
  );
}

// -----------------------------------------------------------------------------
// Application menu
// -----------------------------------------------------------------------------

function buildMenu() {
  const template = [
    {
      label: 'File',

      submenu: [
        {
          label: 'Reload',

          role: 'reload',
        },

        {
          type: 'separator',
        },

        {
          label: 'Quit',

          accelerator:
            process.platform === 'darwin'
              ? 'Cmd+Q'
              : 'Ctrl+Q',

          click: () => {
            app.quit();
          },
        },
      ],
    },

    {
      label: 'Edit',

      submenu: [
        {
          role: 'undo',
        },

        {
          role: 'redo',
        },

        {
          type: 'separator',
        },

        {
          role: 'cut',
        },

        {
          role: 'copy',
        },

        {
          role: 'paste',
        },

        {
          role: 'selectAll',
        },
      ],
    },

    {
      label: 'View',

      submenu: [
        {
          role: 'zoomIn',
        },

        {
          role: 'zoomOut',
        },

        {
          role: 'resetZoom',
        },

        {
          type: 'separator',
        },

        {
          role: 'togglefullscreen',
        },
      ],
    },

    {
      label: 'Help',

      submenu: [
        {
          label: 'About Inventory CRM',

          click: () => {
            dialog.showMessageBox(
              mainWindow,
              {
                message:
                  'Inventory CRM',

                detail:
                  'Offline-first desktop CRM · v1.0\n\nAll data is stored locally in SQLite.',

                type: 'info',
              }
            );
          },
        },

        {
          label: 'Open Data Folder',

          click: () => {
            shell.openPath(
              USER_DATA
            );
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(
    Menu.buildFromTemplate(
      template
    )
  );
}

// -----------------------------------------------------------------------------
// Single instance
// -----------------------------------------------------------------------------

const gotTheLock =
  app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on(
    'second-instance',
    () => {
      if (!mainWindow) {
        return;
      }

      if (
        mainWindow.isMinimized()
      ) {
        mainWindow.restore();
      }

      mainWindow.focus();
    }
  );

  // ---------------------------------------------------------------------------
  // Electron ready
  // ---------------------------------------------------------------------------

  app.whenReady().then(
    async () => {
      buildMenu();

      try {
        await startBackend();

        createWindow();
      } catch (error) {
        console.error(
          '[electron] Startup failed:',
          error
        );

        dialog.showErrorBox(
          'Inventory CRM - Startup Failed',
          `${error.message}\n\nCheck the terminal for more details.`
        );

        app.quit();

        return;
      }

      app.on(
        'activate',
        () => {
          if (
            BrowserWindow.getAllWindows()
              .length === 0
          ) {
            createWindow();
          }
        }
      );
    }
  );

  // ---------------------------------------------------------------------------
  // IPC
  // ---------------------------------------------------------------------------

  ipcMain.handle(
    'app:getPaths',
    () => ({
      userData: USER_DATA,
      dbFile: DB_FILE,
      backupDir: BACKUP_DIR,
    })
  );

  ipcMain.handle(
    'app:openDataFolder',
    () => {
      return shell.openPath(
        USER_DATA
      );
    }
  );

  // ---------------------------------------------------------------------------
  // Shutdown
  // ---------------------------------------------------------------------------

  app.on(
    'before-quit',
    () => {
      app.isQuitting = true;

      stopBackend();
    }
  );

  app.on(
    'window-all-closed',
    () => {
      stopBackend();

      if (
        process.platform !== 'darwin'
      ) {
        app.quit();
      }
    }
  );

  process.on(
    'exit',
    () => {
      stopBackend();
    }
  );

  process.on(
    'SIGTERM',
    () => {
      stopBackend();

      app.quit();
    }
  );

  process.on(
    'SIGINT',
    () => {
      stopBackend();

      app.quit();
    }
  );
}
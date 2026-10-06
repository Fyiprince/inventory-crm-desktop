# Inventory CRM — Recovered & Portable Desktop Build

This project is recovered from the original Windows installer and prepared for local/offline Windows use.

## Portability fix

The packaged Electron app does **not** use a fixed backend port. On every launch the local Express backend asks Windows for an ephemeral free loopback port (`0`), reports the actual port to Electron through IPC, and the React UI opens on that exact local origin. This avoids `EADDRINUSE / port already in use` conflicts.

The backend binds to `127.0.0.1` only. Internet access is not required for normal operation.

## Data isolation

The live SQLite database is stored in Electron's per-user Windows application-data directory, not inside `Program Files`. Backups are stored alongside it. A normal user therefore does not need administrator rights to write CRM data.

## Build the Windows installer

Build the installer on a Windows 10/11 x64 machine with Node.js installed. From the project root, run:

```powershell
BUILD-WINDOWS-SETUP.bat
```

The builder will:

1. Install dependencies.
2. Rebuild the Electron runtime scripts.
3. Rebuild/generate Prisma client and native engines.
4. Build the React frontend.
5. Create an NSIS Windows installer.

The installer will be placed in `dist/`.

### Important

The target PC **does not need Node.js, npm, VS Code, Prisma, or a separate backend installation**. Those are only needed on the PC used to build the installer.

## Preview from source

```powershell
npm run install:all
npm run frontend:build
npm run electron
```

## Installation on another PC

Run the generated `Inventory CRM Setup ... .exe`, choose the installation folder, and create the desktop shortcut. After installation, launch Inventory CRM from the shortcut. The application starts its own local backend automatically and chooses its own free local port.

## Limitations

No software can guarantee compatibility with literally every Windows PC. This build is designed to avoid the common runtime dependencies and fixed-port conflicts: the installer bundles Electron, the React build, Express backend, Prisma runtime/native engines, and SQLite database template. The supported target is Windows 10/11 x64.

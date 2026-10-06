# Recovery report

Source: supplied InventoryCRM-Setup-1.0.0.exe

The installer was a Nullsoft NSIS self-extracting archive. Its embedded 7-Zip payload was extracted successfully.

Recovered from installer:
- Electron runtime shell
- resources/app.asar
- resources/frontend/build
- resources/backend-node/src
- resources/backend-node/prisma/schema.prisma
- resources/backend-node/prisma/seed.js
- resources/backend-node/prisma/template.db
- resources/backend-node/prisma/data/crm.db
- resources/backend-node/backups/crm-2026-09-12T11-15-06-681Z.db
- resources/backend-node/package.json and package-lock.json
- backend node_modules (used only during extraction; intentionally not copied into the source project)

Important discovery:
The React production JavaScript source map contained `sourcesContent` for the application's original source files. Those files were reconstructed into `frontend/src`.

The exact production build from the installer is retained in:
`frontend/build-original/`

A copy is also present in:
`frontend/build/`

The normal source project uses Vite for future builds because the recovered source is standard React/JSX and this avoids tying the rebuilt source tree to the old CRA build toolchain.

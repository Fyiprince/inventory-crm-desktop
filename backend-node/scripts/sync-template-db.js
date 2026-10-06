const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const backendDir = path.resolve(__dirname, '..');
const prismaCliPath = require.resolve('prisma/build/index.js');
const schemaPath = path.join(backendDir, 'prisma', 'schema.prisma');
const templateDbPath = path.join(backendDir, 'prisma', 'template.db');

fs.mkdirSync(path.dirname(templateDbPath), { recursive: true });

const env = {
  ...process.env,
  DATABASE_URL: 'file:./prisma/template.db',
};

const result = spawnSync(
  process.execPath,
  [
    prismaCliPath,
    'db',
    'push',
    '--schema',
    schemaPath,
    '--accept-data-loss',
    '--skip-generate',
  ],
  {
    cwd: backendDir,
    env,
    stdio: 'inherit',
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

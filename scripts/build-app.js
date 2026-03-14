/**
 * build-app.js
 * Installs dependencies and runs `vite build` for today's app.
 */

import fs            from 'fs-extra';
import path          from 'path';
import { execSync }  from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DAY       = parseInt(process.env.DAY || '1', 10);
const APPS      = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps-config/apps.json'), 'utf8'));
const app       = APPS.find(a => a.day === DAY);

if (!app) { console.error(`No app found for day ${DAY}`); process.exit(1); }

const appDir = path.join(ROOT, 'apps', app.slug);

if (!fs.existsSync(appDir)) {
  console.error(`App directory not found: ${appDir}`);
  process.exit(1);
}

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });

console.log(`Building ${app.name}...`);
run('npm install --legacy-peer-deps', appDir);
run('npm run build', appDir);
console.log(`Build complete! Output: dist/${app.slug}/`);

/**
 * update-log.js
 * Appends the deployed app URL and metadata to deployments.md.
 * Also regenerates the portal index page.
 */

import fs   from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DAY       = parseInt(process.env.DAY || '1', 10);
const REPO      = process.env.GITHUB_REPOSITORY || 'your-username/vibe-sprint';
const [owner, repoName] = REPO.split('/');
const BASE_URL  = `https://${owner}.github.io/${repoName}`;
const APPS      = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps-config/apps.json'), 'utf8'));
const app       = APPS.find(a => a.day === DAY);

if (!app) { console.error(`No app for day ${DAY}`); process.exit(1); }

const appUrl    = `${BASE_URL}/${app.slug}/`;
const logPath   = path.join(ROOT, 'deployments.md');
const today     = new Date().toISOString().split('T')[0];

// ── Update deployments.md ──────────────────────────────────────────────
let existing = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';

if (!existing.includes('# 🚀 30-Day Vibe Sprint')) {
  existing = `# 🚀 30-Day Vibe Sprint — Deployments\n\n| Day | App | Category | URL | Date |\n|-----|-----|----------|-----|------|\n` + existing;
}

const row = `| ${app.day} | **${app.name}** | ${app.category} | [Live →](${appUrl}) | ${today} |`;

// Replace existing row for this day or append
const dayPattern = new RegExp(`^\\| ${app.day} \\|.*$`, 'm');
if (dayPattern.test(existing)) {
  existing = existing.replace(dayPattern, row);
} else {
  // Insert after the header row in sorted order
  const lines     = existing.split('\n');
  const tableStart = lines.findIndex(l => l.startsWith('| Day |'));
  const insertAt  = tableStart + 2; // after header + separator
  lines.splice(insertAt, 0, row);
  existing = lines.join('\n');
}

fs.writeFileSync(logPath, existing, 'utf8');
console.log(`Updated deployments.md with Day ${DAY}: ${appUrl}`);

// ── Regenerate portal/index.html ──────────────────────────────────────
const deployed = APPS.map(a => {
  const url    = `${BASE_URL}/${a.slug}/`;
  const isDone = existing.includes(`[Live →](${url})`);
  return { ...a, url, isDone };
});

const categoryColor = {
  health:  '#10b981',
  finance: '#f59e0b',
  focus:   '#8b5cf6',
  utility: '#3b82f6',
  ai:      '#ef4444',
};

const cards = deployed.map(a => `
    <a href="${a.isDone ? a.url : '#'}" class="card ${a.isDone ? 'done' : 'locked'}" ${a.isDone ? `target="_blank"` : ''}>
      <div class="day-badge">Day ${a.day}</div>
      <div class="card-name">${a.name}</div>
      <div class="card-desc">${a.description.slice(0, 80)}…</div>
      <span class="tag" style="background:${categoryColor[a.category]}22;color:${categoryColor[a.category]}">${a.category}</span>
      ${a.isDone ? '<div class="live-badge">Live ↗</div>' : '<div class="locked-badge">Deploying soon…</div>'}
    </a>`).join('');

const portalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>30-Day Vibe Sprint 🚀</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0f0f;color:#e5e5e5;min-height:100vh;padding:2rem 1rem}
    h1{font-size:2rem;font-weight:700;text-align:center;margin-bottom:.5rem}
    .sub{text-align:center;color:#888;margin-bottom:2rem;font-size:.95rem}
    .progress-wrap{max-width:480px;margin:0 auto 2rem;background:#1a1a1a;border-radius:8px;height:8px;overflow:hidden}
    .progress-fill{height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:8px;transition:width .4s}
    .stats{display:flex;gap:1rem;justify-content:center;margin-bottom:2rem;font-size:.85rem;color:#aaa}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;max-width:1200px;margin:0 auto}
    .card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:1.25rem;text-decoration:none;color:inherit;transition:border-color .2s,transform .15s;display:flex;flex-direction:column;gap:.5rem}
    .card.done:hover{border-color:#6366f1;transform:translateY(-2px)}
    .card.locked{opacity:.45;cursor:default}
    .day-badge{font-size:.7rem;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.05em}
    .card-name{font-size:1rem;font-weight:600;color:#f5f5f5}
    .card-desc{font-size:.8rem;color:#888;line-height:1.5;flex:1}
    .tag{font-size:.7rem;font-weight:500;padding:2px 10px;border-radius:20px;width:fit-content}
    .live-badge{font-size:.75rem;font-weight:600;color:#10b981;margin-top:.25rem}
    .locked-badge{font-size:.75rem;color:#555;margin-top:.25rem}
  </style>
</head>
<body>
  <h1>🚀 30-Day Vibe Sprint</h1>
  <p class="sub">One useful app, shipped every single day.</p>
  <div class="progress-wrap"><div class="progress-fill" style="width:${Math.round(deployed.filter(a=>a.isDone).length/30*100)}%"></div></div>
  <div class="stats">
    <span>${deployed.filter(a=>a.isDone).length} / 30 deployed</span>
    <span>·</span>
    <span>${deployed.filter(a=>!a.isDone).length} coming soon</span>
  </div>
  <div class="grid">${cards}</div>
</body>
</html>`;

fs.ensureDirSync(path.join(ROOT, 'portal'));
fs.writeFileSync(path.join(ROOT, 'portal/index.html'), portalHtml, 'utf8');
console.log('Portal index.html regenerated.');

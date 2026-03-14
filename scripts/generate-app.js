/**
 * generate-app.js
 * Reads today's app spec from apps.json, calls Claude API to generate
 * a complete single-file React component, saves it under apps/<slug>/.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs        from 'fs-extra';
import path      from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

const DAY              = parseInt(process.env.DAY || '1', 10);
const FORCE_REGENERATE = process.env.FORCE_REGENERATE === 'true';
const APPS             = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps-config/apps.json'), 'utf8'));
const app              = APPS.find(a => a.day === DAY);

if (!app) { console.error(`No app found for day ${DAY}`); process.exit(1); }

const appDir      = path.join(ROOT, 'apps', app.slug);
const appFile     = path.join(appDir, 'App.jsx');
const alreadyDone = fs.existsSync(appFile);

if (alreadyDone && !FORCE_REGENERATE) {
  console.log(`Day ${DAY} (${app.name}) already generated. Skipping.`);
  process.exit(0);
}

console.log(`Generating Day ${DAY}: ${app.name}...`);

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert React developer building polished, production-quality single-page apps.
RULES — follow ALL without exception:
1. Output ONLY the React component code. No explanation, no markdown fences, no preamble.
2. Use a DEFAULT export named App.
3. Use ONLY React hooks — no external state libraries.
4. Use ONLY Tailwind CSS classes for styling. Do NOT import any CSS files.
5. Store all user data in localStorage with a key prefixed by the app slug.
6. All data fetching uses native fetch() — no axios or other HTTP libs.
7. For AI-powered apps: read the API key from import.meta.env.VITE_ANTHROPIC_API_KEY and call https://api.anthropic.com/v1/messages directly via fetch().
8. The app must work as a standalone page — no React Router.
9. Include charts using only inline SVG or canvas — no chart libraries.
10. Beautiful UI: rounded corners, good typography, subtle shadows, consistent color palette. Support dark mode via Tailwind 'dark' class with a toggle button.
11. Handle loading, empty, and error states gracefully.
12. ONE .jsx file — fully self-contained.`;

const USER_PROMPT = `Build a complete, polished React app for Day ${DAY} of my 30-day vibe code sprint.

App name: ${app.name}
Category: ${app.category}
Description: ${app.description}

Requirements:
- Beautiful modern UI with Tailwind CSS
- Fully functional (not a mock)
- Works offline with localStorage
- Dark mode toggle in top-right
- Mobile-first responsive layout
- Smooth animations where appropriate
- Nice empty state with emoji/illustration

Output the complete App.jsx file ONLY. Start directly with import statements.`;

const message = await client.messages.create({
  model:    'claude-sonnet-4-20250514',
  max_tokens: 8000,
  messages: [{ role: 'user', content: USER_PROMPT }],
  system:   SYSTEM_PROMPT,
});

let code = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
code = code.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();

fs.ensureDirSync(appDir);
fs.writeFileSync(appFile, code, 'utf8');

const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${app.name} · Day ${app.day}</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
  </head>
  <body class="bg-white min-h-screen">
    <div id="root"></div>
    <script type="module" src="/main.jsx"><\/script>
  </body>
</html>`;
fs.writeFileSync(path.join(appDir, 'index.html'), indexHtml, 'utf8');

fs.writeFileSync(path.join(appDir, 'main.jsx'), `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);`, 'utf8');

fs.writeFileSync(path.join(appDir, 'vite.config.js'), `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: '/${app.slug}/',
  build: { outDir: '../../dist/${app.slug}', emptyOutDir: true },
});`, 'utf8');

fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({
  name: app.slug, version: '0.0.1', type: 'module',
  scripts: { dev: 'vite', build: 'vite build' },
  dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
  devDependencies: { '@vitejs/plugin-react': '^4.3.1', vite: '^5.4.2' },
}, null, 2), 'utf8');

console.log(`Done! Tokens used: ${message.usage.input_tokens} in / ${message.usage.output_tokens} out`);

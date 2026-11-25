#!/usr/bin/env node
// Generate project detail pages and per-skill pages from projects/index.json.
//
//   node tools/generate-pages.mjs
//
// - A project page (projects/<slug>.html) is generated for every project that has an
//   "overview" field. Old hand-written project pages (no "overview") are left untouched.
// - A skill page (skills/<slug>.html) is generated for every tech tag used by an ACTIVE
//   project, listing those projects. This matches the SKILLS screen (active-only counts).
//
// Re-run after editing index.json. Matches the site's Press Start 2P / pixel template.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projects = JSON.parse(readFileSync(resolve(ROOT, 'projects/index.json'), 'utf8'));

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const HEAD = (title, rel) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)} - 0xheartcode</title>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${rel}styles/main.css">
    <link rel="stylesheet" href="${rel}styles/project.css">
    <link rel="stylesheet" href="${rel}styles/responsive.css">
    <link rel="stylesheet" href="${rel}styles/mobile-styles.css"></head>`;

const FOOTER = `
        <div class="status-bar" style="text-align: center;">
            <marquee behavior="scroll" direction="left">
                DEVéLOPER: 0xheartcode ▲▼ Press ESC to go back
            </marquee>
        </div>
    </div>`;

function projectPage(p) {
  const statusText = p.status === 'active' ? 'ACTIVE' : 'INACTIVE';
  const techUpper = (p.tech || []).join(' • ').toUpperCase();
  const features = (p.highlights || []).map((h) => `
                    <div class="feature-item">
                        <div class="feature-icon">▲</div>
                        <div class="feature-text">
                            <h3>${esc(h.t)}</h3>
                            <p>${esc(h.d)}</p>
                        </div>
                    </div>`).join('');
  const featuresBlock = features ? `
                <h2>KEY FEATURES</h2>
                <div class="feature-list">${features}
                </div>
` : '';
  const techLines = (p.tech || []).map((t) => `                    <br>[✓] ${esc(t)}`).join('\n');
  const arch = (p.architecture || []).map((a) => `
                    <div class="feature-item">
                        <div class="feature-icon">⬤</div>
                        <div class="feature-text">
                            <h3>${esc(a.t)}</h3>
                            <p>${esc(a.d)}</p>
                        </div>
                    </div>`).join('');
  const archBlock = arch ? `
                <h2>ARCHITECTURE</h2>
                <div class="feature-list">${arch}
                </div>
` : '';
  const detailLines = (p.techDetails || []).map((l) => `                    <br>${esc(l)}`).join('\n');
  const detailBlock = detailLines ? `
                    <br>
                    <br> &gt; ./details.sh
${detailLines}` : '';

  return `${HEAD(p.name, '../')}
<body>
    <div class="container">
        <div class="screen">
            <div class="status-bar">
                PROJECT DETAILS ▲▼ ${esc(p.name)}
            </div>

            <h1>${esc(p.name)}</h1>

            <div class="menu-item" onclick="window.location.href='../index.html#projects'">
                ← BACK TO PROJECTS
            </div>

            <div class="pixel-border">
                <div class="project-info">
                    <div class="project-badge">
                        <div class="badge-icon"></div>
                    </div>
                    <div class="project-stats">
                        <div class="stat">
                            <span class="stat-label">STATUS</span>
                            <span class="stat-value ${p.status === 'active' ? 'active' : 'inactive'}">${statusText}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">TECH</span>
                            <span class="stat-value">${esc(techUpper)}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">LAST UPDATED</span>
                            <span class="stat-value">${esc(p.updated || '')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="pixel-border">
                <h2>PROJECT OVERVIEW</h2>
                <p>${esc(p.overview || p.shortDescription)}</p>
${featuresBlock}${archBlock}
                <h2>TECHNICAL DETAILS</h2>
                <div class="terminal"> &gt; ./tech_stack.sh
${techLines}${detailBlock}
                </div>

                <h2>LINKS</h2>
                <div class="links-grid">
                    <a href="${esc(p.link || '#')}" class="menu-item" target="_blank" rel="noopener">
                        ► GITHUB REPO
                    </a>
                </div>
            </div>

        </div>
${FOOTER}

    <script src="../scripts/project.js"></script>
    <script src="../scripts/mobile-enhancements.js"></script>
</body>
</html>
`;
}

function skillPage(skillName, items) {
  const cards = items.map((p) => `
                    <div class="menu-item" onclick="window.location.href='../projects/${esc(p.slug)}.html'">
                        <h3>${esc(p.name)}</h3>
                        <p>${esc(p.shortDescription)}</p>
                        <small>TECH: ${esc((p.tech || []).slice(0, 2).join(' + '))}</small>
                    </div>`).join('');
  const n = items.length;
  return `${HEAD(skillName, '../')}
<body>
    <div class="container">
        <div class="screen">
            <div class="status-bar">
                SKILL ▲▼ ${esc(skillName)}
            </div>

            <h1>${esc(skillName)}</h1>

            <div class="menu-item" onclick="window.location.href='../index.html#skills'">
                ← BACK TO SKILLS
            </div>

            <div class="pixel-border">
                <h2>USED IN ${n} PROJECT${n === 1 ? '' : 'S'}</h2>
                <div class="project-grid">${cards}
                </div>
            </div>

        </div>
${FOOTER}

    <script src="../scripts/mobile-enhancements.js"></script>
    <script>
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          window.location.href = '../index.html#skills';
        }
      });
    </script>
</body>
</html>
`;
}

// --- generate project pages (only those with an "overview": the enriched/active set) ---
mkdirSync(resolve(ROOT, 'skills'), { recursive: true });
let pCount = 0;
for (const p of projects) {
  if (!p.overview) continue; // leave hand-written pages alone
  writeFileSync(resolve(ROOT, 'projects', `${p.slug}.html`), projectPage(p));
  pCount++;
}

// --- generate skill pages from ACTIVE projects (matches the SKILLS screen counts) ---
const active = projects.filter((p) => p.status === 'active');
const bySkill = new Map();
for (const p of active) {
  for (const t of p.tech || []) {
    if (!bySkill.has(t)) bySkill.set(t, []);
    bySkill.get(t).push(p);
  }
}
let sCount = 0;
for (const [skillName, items] of bySkill) {
  writeFileSync(resolve(ROOT, 'skills', `${slug(skillName)}.html`), skillPage(skillName, items));
  sCount++;
}

console.log(`generated ${pCount} project pages, ${sCount} skill pages`);
console.log('skills:', [...bySkill.keys()].map((s) => `${s} -> skills/${slug(s)}.html`).join('\n        '));

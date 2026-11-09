/* Move every page's ?v= cache-busting number one past the highest already in use.

   Deploys used to carry a number typed by hand, which is easy to set backwards
   by mistake — a lower number than the one already live leaves browsers holding
   the old file. This reads what is there and goes one higher.

   Usage: node bump-version.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const pages = fs.readdirSync(root).filter(f => f.endsWith('.html') && f !== 'ABK-Transfer-Request.html');

let highest = 0;
for (const f of pages){
  const text = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of text.matchAll(/\?v=(\d+)/g)) highest = Math.max(highest, Number(m[1]));
}
const next = highest + 1;

let touched = 0;
for (const f of pages){
  const file = path.join(root, f);
  const before = fs.readFileSync(file, 'utf8');
  // only local assets carry a version; vendor files are pinned by name
  const after = before
    .replace(/href="([\w./-]+\.css)(\?v=\d+)?"/g, (m, p) => `href="${p}?v=${next}"`)
    .replace(/src="((?!vendor\/)[\w./-]+\.js)(\?v=\d+)?"/g, (m, p) => `src="${p}?v=${next}"`);
  if (after !== before){ fs.writeFileSync(file, after); touched++; }
}

console.log(`version ${highest || '(none)'} → ${next}, ${touched} page${touched === 1 ? '' : 's'} updated`);

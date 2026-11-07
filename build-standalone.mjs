/* Bundles the web app into one offline HTML file (ABK-Transfer-Request.html).
   The hosted version is index.html + app.js + assets; this is the same app with
   every asset inlined, for running from a USB stick or a shared drive.

   Usage: node build-standalone.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = p => fs.readFileSync(path.join(root, p));
const text = p => read(p).toString('utf8');
const b64  = p => read(p).toString('base64');

const OUT = 'ABK-Transfer-Request.html';

let html = text('form.html');
const css = text('styles.css')
  .replace("url('assets/IBMPlexSansArabic-Regular.ttf') format('truetype')",
           `url(data:font/ttf;base64,${b64('assets/IBMPlexSansArabic-Regular.ttf')}) format('truetype')`);

// the app fetches its two binaries; inline them as data URLs instead
const app = text('app.js').replace(
  /const \[pdfRes, fontRes\] = await Promise\.all\(\[[\s\S]*?\]\);/,
  `const [pdfRes, fontRes] = await Promise.all([
    fetch('data:application/pdf;base64,${b64('assets/transfer-request.pdf')}'),
    fetch('data:font/ttf;base64,${b64('assets/IBMPlexSansArabic-Regular.ttf')}'),
  ]);`
);
if(!app.includes('data:application/pdf;base64')) throw new Error('could not inline the PDF — did boot() change?');

/* `?v=` cache-busting suffixes may be on any of these, so match them loosely */
const inlineScript = (file, body) =>
  [new RegExp(`<script src="${file.replace('.','\\.')}(\\?v=\\d+)?"></script>`), () => `<script>${body}</script>`];

html = html
  .replace(/<link rel="stylesheet" href="styles\.css(\?v=\d+)?">/, () => `<style>\n${css}\n</style>`)
  .replace(/<img id="pageImg"([^>]*?)src="assets\/preview\.png">/,
           (m, attrs) => `<img id="pageImg"${attrs}src="data:image/png;base64,${b64('assets/preview.png')}">`)
  .replace(...inlineScript('vendor/pdf-lib.min.js',     text('vendor/pdf-lib.min.js')))
  .replace(...inlineScript('vendor/fontkit.umd.min.js', text('vendor/fontkit.umd.min.js')))
  .replace(...inlineScript('vendor/bidi.min.js',        text('vendor/bidi.min.js')))
  .replace(...inlineScript('gate.js',                   text('gate.js')))
  .replace(...inlineScript('form-presets.js',           text('form-presets.js')))
  .replace(...inlineScript('app.js',                    app))
  // the offline file is one page, so there is no hub to go back to
  .replace(/<a class="back"[\s\S]*?<\/a>\s*/, '');

/* nothing may still point at a file on disk, or the offline copy is not offline */
const dangling = html.match(/(?:src|href)="(?!data:|#|https?:)[^"]+"/g);
if(dangling) throw new Error('standalone build still references: ' + dangling.join(', '));

fs.writeFileSync(path.join(root, OUT), html);
console.log('built', OUT, (Buffer.byteLength(html)/1048576).toFixed(2) + ' MB');

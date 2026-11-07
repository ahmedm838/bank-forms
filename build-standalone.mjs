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

let html = text('index.html');
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

html = html
  .replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`)
  .replace('<img id="pageImg" alt="Transfer request form preview" src="assets/preview.png">',
           `<img id="pageImg" alt="Transfer request form preview" src="data:image/png;base64,${b64('assets/preview.png')}">`)
  .replace('<script src="vendor/pdf-lib.min.js"></script>',      () => `<script>${text('vendor/pdf-lib.min.js')}</script>`)
  .replace('<script src="vendor/fontkit.umd.min.js"></script>',  () => `<script>${text('vendor/fontkit.umd.min.js')}</script>`)
  .replace('<script src="vendor/bidi.min.js"></script>',         () => `<script>${text('vendor/bidi.min.js')}</script>`)
  .replace('<script src="app.js"></script>',                     () => `<script>${app}</script>`);

fs.writeFileSync(path.join(root, OUT), html);
console.log('built', OUT, (Buffer.byteLength(html)/1048576).toFixed(2) + ' MB');

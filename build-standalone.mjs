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

/* every form file that the page loads; each has its PDF and preview inlined */
const FORM_FILES = [
  'forms/abk-transfer.js',
  'forms/abk-cheques.js',
  'forms/abk-cheque-egp.js',
  'forms/abk-payroll.js',
  'forms/abk-tax.js',
  'forms/abk-payroll-transfer.js',
];

const MIME = { '.pdf':'application/pdf', '.png':'image/png', '.jpg':'image/jpeg', '.ttf':'font/ttf' };
const dataUrl = p => `data:${MIME[path.extname(p)] || 'application/octet-stream'};base64,${b64(p)}`;

let html = text('form.html');
const css = text('styles.css')
  .replace("url('assets/IBMPlexSansArabic-Regular.ttf') format('truetype')",
           `url(${dataUrl('assets/IBMPlexSansArabic-Regular.ttf')}) format('truetype')`);

/* A form definition names its PDF and preview by path; offline there is nothing to
   fetch them from, so each path becomes the file itself. */
function inlineFormAssets(src, file){
  let n = 0;
  const out = src.replace(/(pdf|preview):(\s*)'(assets\/[^']+)'/g, (m, key, sp, p) => {
    n++; return `${key}:${sp}'${dataUrl(p)}'`;
  });
  return { out, n };
}

// the font is fetched by boot(); the PDFs now arrive already inlined in the defs
const app = text('app.js').replace(
  /fetch\('assets\/IBMPlexSansArabic-Regular\.ttf'\)/,
  `fetch('${dataUrl('assets/IBMPlexSansArabic-Regular.ttf')}')`
);
if(app.includes("fetch('assets/")) throw new Error('app.js still fetches a file from disk — did boot() change?');

/* `?v=` cache-busting suffixes may be on any of these, so match them loosely */
const inlineScript = (file, body) =>
  [new RegExp(`<script src="${file.replace('.','\\.')}(\\?v=\\d+)?"></script>`), () => `<script>${body}</script>`];

html = html
  .replace(...inlineScript('workspace.js', 'window.BANK_FORMS_STANDALONE=true;\n' + text('workspace.js')))
  .replace(/<link rel="stylesheet" href="styles\.css(\?v=\d+)?">/, () => `<style>\n${css}\n</style>`)
  .replace(/<img id="pageImg"([^>]*?)src="assets\/[^"]+">/,
           (m, attrs) => `<img id="pageImg"${attrs}src="${dataUrl('assets/preview.png')}">`)
  .replace(...inlineScript('vendor/pdf-lib.min.js',     text('vendor/pdf-lib.min.js')))
  .replace(...inlineScript('vendor/fontkit.umd.min.js', text('vendor/fontkit.umd.min.js')))
  .replace(...inlineScript('vendor/bidi.min.js',        text('vendor/bidi.min.js')))
  .replace(...inlineScript('banks-seed.js',             text('banks-seed.js')))
  .replace(...inlineScript('data-lists.js',             text('data-lists.js')))
  .replace(...inlineScript('vendor/xlsx.full.min.js', ''))
  .replace(...inlineScript('list-files.js', ''))
  .replace(...inlineScript('repo-workbooks.js', ''))
  .replace(...inlineScript('repo-store.js', "window.RepoStore={load:async kind=>window.BankFormsMemory['abk-'+kind]||[],save:async()=>{}};"))
  .replace(...inlineScript('gate.js',                   text('gate.js')));

let inlinedAssets = 0;
for(const file of FORM_FILES){
  const { out, n } = inlineFormAssets(text(file), file);
  inlinedAssets += n;
  html = html.replace(...inlineScript(file, out));
}

html = html
  .replace(...inlineScript('form-registry.js', text('form-registry.js')))
  .replace(...inlineScript('app.js',           app))
  // the offline file is one page: no hub to go back to and no list pages to visit
  .replace(/<a class="back"[\s\S]*?<\/a>\s*/, '')
  .replace(/<nav class="pagenav">[\s\S]*?<\/nav>\s*/, '')
  // and no transactions list, so nothing here opens a saved transfer
  .replace(/<div id="editing"[\s\S]*?<\/div>\s*/, '')
  /* Save only writes a transfer to the transactions list, which this copy has no
     way to show, so it goes. Print still makes the PDF, and a print dialog will
     save it to a file for anyone who wants one. */
  .replace(/<button id="btnSave"[\s\S]*?<\/button>\s*/, '');

/* nothing may still point at a file on disk, or the offline copy is not offline */
const dangling = html.match(/(?:src|href)="(?!data:|#|https?:)[^"]+"/g);
if(dangling) throw new Error('standalone build still references: ' + dangling.join(', '));

fs.writeFileSync(path.join(root, OUT), html);
console.log('built', OUT, inlinedAssets + ' form assets inlined,', (Buffer.byteLength(html)/1048576).toFixed(2) + ' MB');

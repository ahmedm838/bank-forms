/* ABK Transfer Request — form filler
   Stamps typed values into the original vector PDF (A4 595.276 x 842).
   Field boxes were taken from the PDF's own table grid, in PDF points,
   origin bottom-left.

   Arabic and English both work. Text is laid out as bidirectional runs
   (bidi-js), shaped by fontkit, and each glyph is positioned explicitly in
   the content stream — pdf-lib's own drawText ignores GPOS and mis-spaces
   Arabic, so it is deliberately not used for text. */

const A4W = 595.276, A4H = 842;
const PAD = 3.5;
const BASE_SIZE = 9;
const MIN_SIZE = 5.8;
const LINE_RATIO = 1.18;
const INK = [0.03, 0.09, 0.36];

const CURRENCY_CHOICES = ['EGP', 'USD', 'EUR'];

/* ---------- fields: box = [x0, y0, x1, y1] ---------- */
const FIELDS = [
  { id:'date',            label:'Date',                                box:[303,698.5,522,716.5], group:'head', hint:'dd/mm/yyyy', required:true, latin:true },

  { id:'currency',        label:'Currency (32A)',                      box:[61.3,618.4,114.2,635.8], group:'amount', type:'select', options:CURRENCY_CHOICES, align:'center', required:true, latin:true },
  { id:'amountFigures',   label:'Amount in figures',                   box:[114.2,618.4,234.9,635.8], group:'amount', hint:'e.g. 125,400.50', required:true, latin:true },
  { id:'amountWords',     label:'Amount in words',                     box:[234.9,618.4,553.6,635.8], group:'amount', multi:true, latin:true },

  { id:'benName',         label:"Beneficiary's name (59)",             box:[176.4,604.6,459.4,618.4], group:'ben', required:true },
  { id:'benAddress',      label:"Beneficiary's address (or ID no. if paid in cash)", box:[176.4,586.6,459.4,604.6], group:'ben', multi:true },
  { id:'benAccount',      label:"Beneficiary's account no. / IBAN",    box:[176.4,569.5,459.4,586.6], group:'ben', multi:true, required:true },
  { id:'intermediaryBank',label:'Intermediary bank name & SWIFT code (56)', box:[176.4,552.2,459.4,569.5], group:'ben', multi:true },
  { id:'benBank',         label:"Beneficiary's bank (57)",             box:[176.4,539.4,459.4,552.2], group:'ben', required:true },
  { id:'benBankAddress',  label:"Beneficiary's bank address",          box:[176.4,521,459.4,539.4], group:'ben', multi:true },
  { id:'benBankSwift',    label:"Beneficiary's bank SWIFT code",       box:[176.4,504.4,459.4,521], group:'ben', upper:true, hint:'8 or 11 characters' },
  { id:'info70',          label:'Information for beneficiary (70)',    box:[176.4,491.1,459.4,504.4], group:'ben' },

  { id:'debitAccount',    label:'Payment value debited to account no.', box:[176.4,413.6,459.4,431.1], group:'debit', required:true },
  { id:'debitCurrency',   label:'Currency',                            box:[176.4,395.1,459.4,413.6], group:'debit', type:'select', options:CURRENCY_CHOICES, required:true, latin:true },
  { id:'commAccount',     label:'Commission & charges debited to account no.', box:[176.4,369.4,459.4,395.1], group:'debit', required:true },
  { id:'commCurrency',    label:'Currency',                            box:[176.4,351.9,459.4,369.4], group:'debit', type:'select', options:CURRENCY_CHOICES, required:true, latin:true },

  { id:'ordName',         label:"Ordering customer's name (50)",       box:[176.4,316.9,459.4,334.4], group:'ord', remember:true },
  { id:'ordID',           label:"Ordering customer's ID (if paid in cash)", box:[176.4,299.4,459.4,316.9], group:'ord', remember:true },
  { id:'ordAddress',      label:"Ordering customer's address",         box:[176.4,282.5,459.4,299.4], group:'ord', multi:true, remember:true },
  { id:'ordPhone',        label:'Telephone no.',                       box:[176.4,265.2,459.4,282.5], group:'ord', remember:true, required:true },
  { id:'purpose',         label:'Purpose of transfer (goods type & delivery terms)', box:[176.4,237.3,459.4,265.2], group:'ord', multi:true, required:true },
];

const CHECKS = [
  { id:'issueType', label:'Please issue', group:'head', required:true, options:[
      { v:'draft',    t:'Bank Draft',        box:[156,672.3,166.7,683.3] },
      { v:'internal', t:'Internal Transfer', box:[292.9,672.3,303.5,683.3] },
      { v:'swift',    t:'Swift Transfer',    box:[436.5,672.3,447.3,683.3] } ] },
  { id:'charges', label:'Charges (71A)', group:'debit', required:true, options:[
      { v:'OUR', t:'OUR — all charges on my/our account',  box:[312.9,468.5,323.5,479.4] },
      { v:'SHA', t:"SHA — sender's bank charges on us, others on beneficiary", box:[312.9,451.4,323.5,462.3] },
      { v:'BEN', t:"BEN — all charges on beneficiary's account", box:[312.9,434.4,323.5,445.3] } ] },
];

const FLAGS = [
  { id:'paidInCash', label:'Paid in cash', group:'debit', box:[312.9,337.5,323.5,348.4] },
];

const GROUPS = [
  { id:'head',   title:'Application' },
  { id:'amount', title:'Amount (32A)' },
  { id:'ben',    title:'Beneficiary' },
  { id:'debit',  title:'Charges & debit instructions' },
  { id:'ord',    title:'Ordering customer (50)' },
];

/* ---------- amount in words (English) ---------- */
const CURRENCIES = {
  USD:{maj:'US Dollars', min:'Cents', d:2},
  EUR:{maj:'Euro',       min:'Cents', d:2},
  EGP:{maj:'Egyptian Pounds', min:'Piastres', d:2},
};
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function under1000(n){
  const s=[];
  if(n>=100){ s.push(ONES[Math.floor(n/100)],'hundred'); n%=100; if(n) s.push('and'); }
  if(n>=20) s.push(TENS[Math.floor(n/10)] + (n%10 ? '-'+ONES[n%10] : ''));
  else if(n>0) s.push(ONES[n]);
  return s.join(' ');
}
function toWords(n){
  if(n===0) return 'zero';
  const scales=[[1e9,'billion'],[1e6,'million'],[1e3,'thousand']];
  const out=[];
  for(const [v,name] of scales){ if(n>=v){ out.push(under1000(Math.floor(n/v)), name); n%=v; } }
  if(n>0){ if(out.length && n<100) out.push('and'); out.push(under1000(n)); }
  return out.join(' ');
}
const titleCase = s => s.replace(/(^|\s|-)([a-z])/g,(m,a,b)=>a+b.toUpperCase()).replace(/\bAnd\b/g,'and');
function amountInWords(amountStr, ccy){
  const clean = String(amountStr||'').replace(/[,\s]/g,'');
  if(!clean || !/^\d*\.?\d*$/.test(clean) || isNaN(parseFloat(clean))) return '';
  const info = CURRENCIES[(ccy||'').toUpperCase()];
  if(!info) return '';
  const num = parseFloat(clean), major = Math.floor(num);
  const frac = Math.round((num - major) * Math.pow(10, info.d));
  let s = titleCase(toWords(major)) + ' ' + info.maj;
  if(frac > 0) s += ' and ' + titleCase(toWords(frac)) + ' ' + info.min;
  return s + ' Only';
}

/* ---------- English-only fields ----------
   The date, the amount and every currency must read in Latin script, so these
   fields convert Arabic-Indic digits to Western ones and refuse Arabic letters. */
const RTL_LETTERS = /[֐-׿؀-ۿ܀-ݏݐ-ݿࢠ-ࣿיִ-﷿ﹰ-﻿]/;
const RTL_LETTERS_G = new RegExp(RTL_LETTERS.source, 'g');

function toWesternDigits(s){
  return s.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))   // Arabic-Indic
          .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))   // Extended Arabic-Indic
          .replace(/٫/g, '.').replace(/٬/g, ',')                       // Arabic decimal / thousands
          .replace(/،/g, ',');                                              // Arabic comma
}
function toLatinOnly(s){
  return toWesternDigits(s).replace(RTL_LETTERS_G, '');
}

/* ---------- bidirectional text engine ---------- */
const bidi = (window.bidi_js || window.bidiFactory)();

function baseDirOf(text){
  if(!text) return 'ltr';
  const { paragraphs } = bidi.getEmbeddingLevels(text, null);
  return (paragraphs[0] && paragraphs[0].level % 2) ? 'rtl' : 'ltr';
}

/* logical runs of equal embedding level, with RTL mirroring applied */
function splitRuns(text, baseDir){
  const { levels } = bidi.getEmbeddingLevels(text, baseDir);
  const mirrored = bidi.getMirroredCharactersMap(text, levels);
  // levels are indexed by UTF-16 code unit, so walk by code unit to stay aligned
  let out = '';
  for(let i=0;i<text.length;i++) out += mirrored.get(i) || text[i];

  const runs = [];
  let start = 0;
  for(let i=1;i<=out.length;i++){
    if(i===out.length || levels[i]!==levels[start]){
      runs.push({ text: out.slice(start,i), level: levels[start] });
      start = i;
    }
  }
  return runs;
}

/* UBA rule L2: reverse contiguous runs from the highest level down to the lowest odd one */
function visualOrder(runs){
  if(runs.length < 2) return runs;
  let max = 0, minOdd = Infinity;
  for(const r of runs){ if(r.level > max) max = r.level; if(r.level % 2 && r.level < minOdd) minOdd = r.level; }
  const out = runs.slice();
  for(let lvl = max; lvl >= minOdd; lvl--){
    let i = 0;
    while(i < out.length){
      if(out[i].level >= lvl){
        let j = i;
        while(j+1 < out.length && out[j+1].level >= lvl) j++;
        out.splice(i, j-i+1, ...out.slice(i, j+1).reverse());
        i = j+1;
      } else i++;
    }
  }
  return out;
}

/* ---------- font state ---------- */
let fontBytes = null;     // ArrayBuffer of the TTF
let fkFont = null;        // fontkit font, for shaping and measuring
let pdfBytes = null;      // the blank form

function shapeRun(run){
  const dir = run.level % 2 ? 'rtl' : 'ltr';
  return fkFont.layout(run.text, undefined, undefined, undefined, dir);
}
function runAdvance(glyphRun){
  let a = 0;
  for(const p of glyphRun.positions) a += p.xAdvance;
  return a;
}
function measureText(text, size, baseDir){
  if(!text) return 0;
  let units = 0;
  for(const r of splitRuns(text, baseDir)) units += runAdvance(shapeRun(r));
  return units * size / fkFont.unitsPerEm;
}

/* ---------- wrapping and fitting ---------- */
function wrapLines(text, maxWidth, measure){
  const lines = [];
  for(const para of String(text).split(/\n/)){
    const words = para.split(/\s+/).filter(Boolean);
    if(!words.length){ lines.push(''); continue; }
    let line = '';
    for(const w of words){
      const trial = line ? line + ' ' + w : w;
      if(measure(trial) <= maxWidth || !line){
        if(!line && measure(w) > maxWidth){
          let chunk = '';
          for(const ch of w){
            if(measure(chunk+ch) > maxWidth && chunk){ lines.push(chunk); chunk = ch; }
            else chunk += ch;
          }
          line = chunk;
        } else line = trial;
      } else { lines.push(line); line = w; }
    }
    lines.push(line);
  }
  return lines;
}

function fitText(text, boxW, boxH, measureAt){
  const maxW = boxW - PAD*2;
  for(let size = BASE_SIZE; size >= MIN_SIZE; size -= 0.25){
    const lines = wrapLines(text, maxW, s => measureAt(s, size));
    if(lines.length * size * LINE_RATIO <= boxH - 2) return { size, lines };
  }
  return { size: MIN_SIZE, lines: wrapLines(text, maxW, s => measureAt(s, MIN_SIZE)) };
}

/* ---------- state ---------- */
const state = { values:{}, checks:{}, flags:{} };
const LS_KEY = 'abk-transfer-tool';
const PAYEE_KEY = 'abk-transfer-payees';
const PAYEE_FIELDS = ['benName','benAddress','benAccount','intermediaryBank','benBank','benBankAddress','benBankSwift'];

function loadRemembered(){
  try{ Object.assign(state.values, (JSON.parse(localStorage.getItem(LS_KEY)||'{}').values)||{}); }catch(e){}
}
function saveRemembered(){
  try{
    const values = {};
    FIELDS.filter(f=>f.remember).forEach(f=>{ if(state.values[f.id]) values[f.id] = state.values[f.id]; });
    localStorage.setItem(LS_KEY, JSON.stringify({ values }));
  }catch(e){}
}
function getPayees(){ try{ return JSON.parse(localStorage.getItem(PAYEE_KEY)||'{}'); }catch(e){ return {}; } }
function setPayees(p){ try{ localStorage.setItem(PAYEE_KEY, JSON.stringify(p)); }catch(e){} }

/* ---------- form ---------- */
const formEl = document.getElementById('form');
const overlayEl = document.getElementById('overlay');
const previewWrap = document.getElementById('previewWrap');
const errorsEl = document.getElementById('errors');

function el(tag, cls, text){ const n=document.createElement(tag); if(cls)n.className=cls; if(text!=null)n.textContent=text; return n; }
function labelFor(f){
  const n = el('label','lbl');
  n.appendChild(document.createTextNode(f.label));
  if(f.required) n.appendChild(el('span','req','*'));
  if(f.latin && f.type !== 'select') n.appendChild(el('span','note',' (English only)'));
  return n;
}

function buildForm(){
  for(const g of GROUPS){
    const sec = el('section','grp');
    sec.appendChild(el('h2',null,g.title));
    if(g.id === 'ben') sec.appendChild(buildPayeeBar());

    for(const c of CHECKS.filter(c=>c.group===g.id)){
      const row = el('div','row');
      row.appendChild(labelFor(c));
      const opts = el('div','opts');
      opts.id = 'opts-'+c.id;
      for(const o of c.options){
        const w = el('label','opt');
        const inp = document.createElement('input');
        inp.type='radio'; inp.name=c.id; inp.value=o.v; inp.id=c.id+'-'+o.v;
        inp.addEventListener('change', ()=>{ state.checks[c.id]=o.v; opts.classList.remove('bad'); render(); });
        w.appendChild(inp); w.appendChild(el('span',null,o.t));
        opts.appendChild(w);
      }
      row.appendChild(opts);
      sec.appendChild(row);
    }

    for(const f of FIELDS.filter(f=>f.group===g.id)){
      const row = el('div','row');
      const lab = labelFor(f); lab.htmlFor = 'in-'+f.id;
      row.appendChild(lab);

      let inp;
      if(f.type === 'select'){
        inp = document.createElement('select');
        inp.appendChild(new Option('— select —',''));
        f.options.forEach(o=>inp.appendChild(new Option(o,o)));
      } else if(f.multi){
        inp = document.createElement('textarea'); inp.rows = 2;
      } else {
        inp = document.createElement('input'); inp.type = 'text';
      }
      inp.id = 'in-'+f.id;
      inp.dir = f.latin ? 'ltr' : 'auto';
      if(f.hint) inp.placeholder = f.hint;
      if(f.upper) inp.style.textTransform = 'uppercase';
      inp.value = state.values[f.id] || '';
      inp.addEventListener('input', onEdit(f, inp));
      inp.addEventListener('change', onEdit(f, inp));
      row.appendChild(inp);

      if(f.id === 'amountWords'){
        const b = el('button','mini','Generate from figures'); b.type='button';
        b.addEventListener('click', ()=>{
          const w = amountInWords(state.values.amountFigures, state.values.currency);
          if(!w){ flash('Choose a currency and enter a numeric amount first.'); return; }
          state.values.amountWords = w;
          const n = document.getElementById('in-amountWords');
          n.value = w; n.dataset.touched = '';
          render();
        });
        row.appendChild(b);
      }
      sec.appendChild(row);
    }

    for(const fl of FLAGS.filter(x=>x.group===g.id)){
      const row = el('div','row');
      const w = el('label','opt');
      const inp = document.createElement('input');
      inp.type='checkbox'; inp.id='in-'+fl.id;
      inp.addEventListener('change', ()=>{ state.flags[fl.id]=inp.checked; render(); });
      w.appendChild(inp); w.appendChild(el('span',null,fl.label));
      row.appendChild(el('span','lbl',''));
      row.appendChild(w);
      sec.appendChild(row);
    }
    formEl.appendChild(sec);
  }
}

function onEdit(f, inp){
  return () => {
    let v = inp.value;
    if(f.latin){
      const hadArabicLetters = RTL_LETTERS.test(v);
      const cleaned = toLatinOnly(v);
      if(cleaned !== v){
        const caret = inp.selectionStart;
        const removed = v.length - cleaned.length;
        v = cleaned;
        inp.value = cleaned;
        if(caret != null){ try{ inp.setSelectionRange(caret - removed, caret - removed); }catch(e){} }
        // digits are converted silently; only letters are worth a word
        if(hadArabicLetters) flash(f.label + ' must be written in English.');
      }
    }
    state.values[f.id] = f.upper ? v.toUpperCase() : v;
    if(f.upper) inp.value = state.values[f.id];
    if(f.id === 'currency' || f.id === 'amountFigures') maybeAutoWords();
    if(f.remember) saveRemembered();
    inp.classList.remove('bad');
    validate(f, inp);
    render();
  };
}

function buildPayeeBar(){
  const bar = el('div','payeebar');
  const sel = document.createElement('select');
  const refresh = () => {
    const p = getPayees();
    sel.innerHTML = '';
    sel.appendChild(new Option('— saved beneficiaries —',''));
    Object.keys(p).sort().forEach(k=>sel.appendChild(new Option(k,k)));
  };
  refresh();
  sel.addEventListener('change', ()=>{
    const p = getPayees()[sel.value];
    if(!p) return;
    PAYEE_FIELDS.forEach(id=>{
      state.values[id] = p[id] || '';
      const n = document.getElementById('in-'+id);
      if(n){ n.value = state.values[id]; n.classList.remove('bad'); }
    });
    render();
  });
  const save = el('button','mini','Save'); save.type='button';
  save.addEventListener('click', ()=>{
    const name = (state.values.benName||'').trim();
    if(!name){ flash("Fill the beneficiary's name before saving."); return; }
    const p = getPayees();
    p[name] = {}; PAYEE_FIELDS.forEach(id=>p[name][id] = state.values[id]||'');
    setPayees(p); refresh(); sel.value = name; flash('Saved "'+name+'".');
  });
  const del = el('button','mini','Delete'); del.type='button';
  del.addEventListener('click', ()=>{
    if(!sel.value) return;
    const p = getPayees(); delete p[sel.value]; setPayees(p); refresh(); flash('Deleted.');
  });
  bar.appendChild(sel); bar.appendChild(save); bar.appendChild(del);
  return bar;
}

function maybeAutoWords(){
  const node = document.getElementById('in-amountWords');
  if(!node || node.dataset.touched === '1') return;
  const w = amountInWords(state.values.amountFigures, state.values.currency);
  if(w){ state.values.amountWords = w; node.value = w; }
}

function validate(f, inp){
  const v = (state.values[f.id]||'').trim();
  let bad = false;
  if(f.id === 'benBankSwift' && v) bad = !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v);
  if(f.id === 'amountFigures' && v) bad = !/^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/.test(v);
  if(f.latin && v && RTL_LETTERS.test(v)) bad = true;
  inp.classList.toggle('bad', bad);
  return !bad;
}

/* ---------- live preview ---------- */
let previewScale = 1;
const meas = document.createElement('canvas').getContext('2d');
function measurePreview(text, size){ meas.font = size+'px ABKForm, Helvetica, Arial, sans-serif'; return meas.measureText(text).width; }

function layoutOverlay(){
  previewScale = previewWrap.clientWidth / A4W;
  overlayEl.style.width = (A4W*previewScale)+'px';
  overlayEl.style.height = (A4H*previewScale)+'px';
  render();
}

function render(){
  overlayEl.innerHTML = '';
  const S = previewScale;

  for(const f of FIELDS){
    const text = (state.values[f.id]||'').trim();
    if(!text) continue;
    const [x0,y0,x1,y1] = f.box;
    const boxW = x1-x0, boxH = y1-y0;
    const { size, lines } = fitText(text, boxW, boxH, measurePreview);
    const blockH = lines.length * size * LINE_RATIO;
    const topPdf = y0 + (boxH + blockH)/2;

    const d = el('div', 'ov' + (f.align==='center' ? ' center' : ''));
    d.dir = 'auto';
    d.style.left = (x0*S)+'px';
    d.style.top = ((A4H - topPdf)*S)+'px';
    d.style.width = (boxW*S)+'px';
    d.style.fontSize = (size*S)+'px';
    d.style.lineHeight = (size*LINE_RATIO*S)+'px';
    if(f.align !== 'center'){ d.style.paddingLeft = (PAD*S)+'px'; d.style.paddingRight = (PAD*S)+'px'; }
    d.textContent = lines.join('\n');
    overlayEl.appendChild(d);
  }

  for(const b of markedBoxes()){
    const [x0,y0,x1,y1] = b;
    const d = el('div','ovcheck','✓');
    d.style.left = (x0*S)+'px';
    d.style.top = ((A4H - y1)*S)+'px';
    d.style.width = ((x1-x0)*S)+'px';
    d.style.height = ((y1-y0)*S)+'px';
    d.style.fontSize = ((y1-y0)*0.95*S)+'px';
    overlayEl.appendChild(d);
  }
}

function markedBoxes(){
  const out = [];
  for(const c of CHECKS){ const o = c.options.find(o=>o.v===state.checks[c.id]); if(o) out.push(o.box); }
  for(const fl of FLAGS){ if(state.flags[fl.id]) out.push(fl.box); }
  return out;
}

/* ---------- PDF output ---------- */
const { PDFDocument, PDFOperator } = PDFLib;
const op = (n,a) => PDFOperator.of(n,a);
const num = n => String(Math.round(n*1000)/1000);
const hex4 = n => n.toString(16).padStart(4,'0').toUpperCase();

function drawLine(page, fontKey, text, x, y, size, baseDir){
  const runs = visualOrder(splitRuns(text, baseDir));
  const k = size / fkFont.unitsPerEm;
  let cx = x;
  for(const run of runs){
    const g = shapeRun(run);
    const ops = [op('BT'), op('rg', INK.map(num)), op('Tf',[fontKey, num(size)])];
    let cursor = 0;
    g.glyphs.forEach((gl,i)=>{
      const p = g.positions[i];
      ops.push(op('Tm', ['1','0','0','1', num(cx + (cursor + (p.xOffset||0))*k), num(y + (p.yOffset||0)*k)]));
      ops.push(op('Tj', ['<'+hex4(gl.id)+'>']));
      cursor += p.xAdvance;
    });
    ops.push(op('ET'));
    page.pushOperators(...ops);
    cx += cursor * k;
  }
}

function missingGlyphs(){
  const out = new Set();
  for(const f of FIELDS){
    for(const ch of (state.values[f.id]||'')){
      const cp = ch.codePointAt(0);
      if(ch !== '\n' && !fkFont.hasGlyphForCodePoint(cp)) out.add(ch);
    }
  }
  return [...out];
}

async function buildFilledPdf(){
  const doc = await PDFDocument.load(pdfBytes.slice(0));
  doc.registerFontkit(fontkit);
  const page = doc.getPages()[0];
  const pdfFont = await doc.embedFont(fontBytes.slice(0), { subset: false });
  const fontKey = page.node.newFontDictionary('ABK', pdfFont.ref);

  page.pushOperators(op('q'));
  for(const f of FIELDS){
    const text = (state.values[f.id]||'').trim();
    if(!text) continue;
    const [x0,y0,x1,y1] = f.box;
    const boxW = x1-x0, boxH = y1-y0;
    const dir = baseDirOf(text);
    const { size, lines } = fitText(text, boxW, boxH, (s,sz)=>measureText(s,sz,dir));
    const blockH = lines.length * size * LINE_RATIO;
    let cursor = y0 + (boxH + blockH)/2 - size;

    for(const line of lines){
      let x;
      if(f.align === 'center')  x = x0 + (boxW - measureText(line, size, dir))/2;
      else if(dir === 'rtl')    x = x1 - PAD - measureText(line, size, dir);
      else                      x = x0 + PAD;
      drawLine(page, fontKey, line, x, cursor + size*0.22, size, dir);
      cursor -= size * LINE_RATIO;
    }
  }

  for(const [x0,y0,x1,y1] of markedBoxes()){
    const w = x1-x0, h = y1-y0;
    const t = Math.max(1, Math.min(w,h)*0.14);
    const stroke = [op('RG', INK.map(num)), op('w',[num(t)]), op('J',['1']),
      op('m',[num(x0+w*0.20), num(y0+h*0.52)]), op('l',[num(x0+w*0.42), num(y0+h*0.26)]),
      op('l',[num(x0+w*0.82), num(y0+h*0.78)]), op('S')];
    page.pushOperators(...stroke);
  }
  page.pushOperators(op('Q'));

  const missing = missingGlyphs();
  if(missing.length) flash('These characters are not in the form font and were left blank: ' + missing.join(' '));

  return doc.save();
}

/* ---------- required fields ---------- */
function checkRequired(){
  const problems = [];
  document.querySelectorAll('.bad').forEach(n=>n.classList.remove('bad'));

  for(const f of FIELDS){
    const inp = document.getElementById('in-'+f.id);
    if(f.required && !(state.values[f.id]||'').trim()){
      problems.push(f.label); inp.classList.add('bad');
    } else if(inp && !validate(f, inp)){
      problems.push(f.label + ' — check the format');
    }
  }
  for(const c of CHECKS){
    if(c.required && !state.checks[c.id]){
      problems.push(c.label);
      document.getElementById('opts-'+c.id).classList.add('bad');
    }
  }

  if(problems.length){
    errorsEl.innerHTML = '';
    errorsEl.appendChild(el('b', null, problems.length + (problems.length===1?' field still needs attention:':' fields still need attention:')));
    const ul = el('ul');
    problems.forEach(p=>ul.appendChild(el('li',null,p)));
    errorsEl.appendChild(ul);
    errorsEl.hidden = false;
    const first = formEl.querySelector('.bad');
    if(first) first.scrollIntoView({ behavior:'smooth', block:'center' });
  } else {
    errorsEl.hidden = true;
  }
  return problems.length === 0;
}

/* ---------- output ---------- */
function fileName(){
  // keep Arabic and accented names; drop only what a filesystem refuses
  const who = (state.values.benName||'').replace(/[\\/:*?"<>|.]/g,'').trim().replace(/\s+/g,'-').slice(0,40) || 'transfer';
  const d = (state.values.date||'').replace(/[^\d]/g,'-') || new Date().toISOString().slice(0,10);
  return `ABK-Transfer-${who}-${d}.pdf`;
}

let lastUrl = null;
function blobUrl(bytes){
  if(lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(new Blob([bytes], { type:'application/pdf' }));
  return lastUrl;
}

async function doPrint(){
  if(!checkRequired()) return;
  busy(true);
  try{
    const url = blobUrl(await buildFilledPdf());
    const frame = document.getElementById('printFrame');
    let fired = false;
    frame.onload = () => {
      fired = true;
      try{ frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch(e){ window.open(url, '_blank'); }
    };
    frame.src = url;
    setTimeout(()=>{ if(!fired) window.open(url, '_blank'); }, 2500);
  } finally { busy(false); }
}

async function doSave(){
  if(!checkRequired()) return;
  const name = fileName();

  // the picker must be opened while the click is still "fresh", so ask first and build after
  let handle = null;
  if(window.showSaveFilePicker){
    try{
      handle = await window.showSaveFilePicker({
        suggestedName: name,
        id: 'abk-transfer',
        startIn: 'documents',
        types: [{ description:'PDF document', accept:{ 'application/pdf':['.pdf'] } }],
      });
    }catch(e){
      if(e && e.name === 'AbortError') return;   // user cancelled
      handle = null;                              // not permitted here — fall back
    }
  }

  busy(true);
  try{
    const bytes = await buildFilledPdf();
    if(handle){
      const w = await handle.createWritable();
      await w.write(bytes);
      await w.close();
      flash('Saved ' + handle.name);
    } else {
      const a = document.createElement('a');
      a.href = blobUrl(bytes); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      flash('Saved ' + name + ' to your downloads folder');
    }
  } catch(e){
    flash('Could not save: ' + e.message);
  } finally { busy(false); }
}

function clearAll(){
  if(!confirm('Clear the whole form?')) return;
  const keep = {};
  FIELDS.filter(f=>f.remember).forEach(f=>{ if(state.values[f.id]) keep[f.id] = state.values[f.id]; });
  state.values = keep; state.checks = {}; state.flags = {};
  FIELDS.forEach(f=>{
    const n = document.getElementById('in-'+f.id);
    if(n){ n.value = state.values[f.id]||''; n.classList.remove('bad'); n.dataset.touched=''; }
  });
  document.querySelectorAll('#form input[type=radio], #form input[type=checkbox]').forEach(n=>n.checked=false);
  document.querySelectorAll('.opts').forEach(n=>n.classList.remove('bad'));
  errorsEl.hidden = true;
  setToday();
  render();
}

function setToday(){
  const d = new Date();
  const s = String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  state.values.date = s;
  const n = document.getElementById('in-date'); if(n) n.value = s;
}

let flashTimer = null;
function flash(msg){
  const n = document.getElementById('toast');
  n.textContent = msg; n.classList.add('show');
  clearTimeout(flashTimer); flashTimer = setTimeout(()=>n.classList.remove('show'), 3200);
}
function busy(on){ document.body.classList.toggle('busy', on); }

/* ---------- password gate ----------
   This only keeps casual visitors out. The page is static, so everything it holds
   ships to the browser; on a public repository the check below is readable by
   anyone. Treat it as a doormat, not a lock — put nothing secret in this page. */
const PASS_SHA256 = '2e9c5b012b951567952ba1bb5b1820fbaf99316c44fcfeb4dcfcc252a517feb5';
const GATE_KEY = 'abk-transfer-gate';

async function sha256Hex(s){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function openGate(){
  document.getElementById('gate').classList.add('done');
  try{ sessionStorage.setItem(GATE_KEY, PASS_SHA256); }catch(e){}
}

async function setupGate(){
  const gate = document.getElementById('gate');
  let remembered = null;
  try{ remembered = sessionStorage.getItem(GATE_KEY); }catch(e){}
  if(remembered === PASS_SHA256){ gate.classList.add('done'); return; }

  const form = document.getElementById('gateForm');
  const pass = document.getElementById('gatePass');
  const msg  = document.getElementById('gateMsg');
  pass.focus();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    msg.textContent = '';
    if(await sha256Hex(pass.value) === PASS_SHA256) openGate();
    else { msg.textContent = 'That password is not right.'; pass.select(); }
  });
}

/* ---------- boot ---------- */
async function boot(){
  await setupGate();
  const [pdfRes, fontRes] = await Promise.all([
    fetch('assets/transfer-request.pdf'),
    fetch('assets/IBMPlexSansArabic-Regular.ttf'),
  ]);
  if(!pdfRes.ok || !fontRes.ok) throw new Error('could not load the form or the font');
  pdfBytes  = new Uint8Array(await pdfRes.arrayBuffer());
  fontBytes = new Uint8Array(await fontRes.arrayBuffer());
  fkFont = fontkit.create(fontBytes);

  loadRemembered();
  buildForm();
  FIELDS.forEach(f=>{ const n = document.getElementById('in-'+f.id); if(n && state.values[f.id]) n.value = state.values[f.id]; });
  document.getElementById('in-amountWords').addEventListener('input', e => { e.target.dataset.touched = '1'; });
  setToday();

  document.getElementById('btnPrint').addEventListener('click', doPrint);
  document.getElementById('btnSave').addEventListener('click', doSave);
  document.getElementById('btnClear').addEventListener('click', clearAll);
  window.addEventListener('resize', layoutOverlay);
  document.getElementById('pageImg').addEventListener('load', layoutOverlay);

  if(document.fonts && document.fonts.load){
    try{ await document.fonts.load('12px ABKForm'); }catch(e){}
  }
  layoutOverlay();
  document.getElementById('loading').classList.add('done');
}

boot().catch(err => {
  document.getElementById('loading').textContent = 'Could not start: ' + err.message;
});

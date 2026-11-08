/* Bank form filler — stamps typed values into a bank's own vector PDF.

   The form itself is data: each one lives in forms/<name>.js and gives its PDF,
   its preview image and the box of every field, in PDF points with the origin at
   the bottom-left. This file knows how to draw and nothing about any one form, so
   adding a form means adding a definition, not editing this.

   Arabic and English both work. Text is laid out as bidirectional runs (bidi-js),
   shaped by fontkit, and each glyph is positioned explicitly in the content
   stream — pdf-lib's own drawText ignores GPOS and mis-spaces Arabic, so it is
   deliberately not used for text. */

const PAD = 3.5;
let BASE_SIZE = 9;         // the size values are written at, before fitting
let FORM_SIZE = 9;         // the form's own default, which the reader may override
/* An absolute floor, not one scaled from the form's default: a form that prints
   at 20pt must still be able to shrink a long value right down to fit its gap. */
const MIN_SIZE = 5.5;
const SIZE_MIN = 7, SIZE_MAX = 30;
const SIZE_KEY = 'abk-transfer-size';
const LINE_RATIO = 1.18;
const INK = [0.03, 0.09, 0.36];

/* bound to the chosen form at boot */
let PAGE_W = 595.276, PAGE_H = 842;
/* the slice of the page the preview image covers; a cheque sits in a band along
   the top of the sheet, so showing the whole A4 would be mostly blank paper */
let VIEW_TOP = 842, VIEW_BOT = 0;
let FIELDS = [], CHECKS = [], FLAGS = [], GROUPS = [];
let CURRENT_FORM = {};   // the form definition in force


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

/* The other way round, for a form written wholly in Arabic: the value is typed
   in Western digits and printed in Arabic-Indic ones. A field asks for this
   with `arabicDigits: true`; only what is printed changes, not what is typed. */
function toArabicDigits(s){
  return String(s).replace(/[0-9]/g, d => String.fromCharCode(0x0660 + Number(d)));
}

/* Arabic-only fields, the mirror of the English-only ones: a cheque's payee and
   signatory are written in Arabic, so Latin letters are refused there. */
const LATIN_LETTERS = /[A-Za-z]/;
const LATIN_LETTERS_G = /[A-Za-z]/g;
function toArabicOnly(s){ return String(s).replace(LATIN_LETTERS_G, ''); }

/* what actually goes on the page for a field */
function displayValue(f, raw){
  let v = (raw || '').trim();
  if(!v) return '';
  if(f.arabicDigits) v = toArabicDigits(v);
  // a cheque writes #1,000# so the figure cannot be extended afterwards
  if(f.wrap) v = f.wrap + v + f.wrap;
  return v;
}

/* ---------- amount formatting ----------
   Groups the amount in thousands as it is typed: 1284560.75 -> 1,284,560.75 */
const MAX_DECIMALS = 2;

function formatThousands(raw){
  let s = String(raw).replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if(dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');

  let [int = '', dec] = s.split('.');
  int = int.replace(/^0+(?=\d)/, '');                       // 007 -> 7, but 0 stays 0
  if(dec !== undefined) dec = dec.slice(0, MAX_DECIMALS);

  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec === undefined ? grouped : grouped + '.' + dec;
}

/* Reformatting moves the caret, so count the digits before it and put it back
   after the same number of digits in the new string. */
function caretAfterDigits(formatted, digitsBefore){
  if(digitsBefore <= 0) return 0;
  let seen = 0;
  for(let i = 0; i < formatted.length; i++){
    if(/[\d.]/.test(formatted[i])) seen++;
    if(seen >= digitsBefore) return i + 1;
  }
  return formatted.length;
}

/* ---------- amount in words, Arabic ----------
   Written the way Egyptian bank forms word it: فقط … لا غير.
   Grammar notes: 1 and 2 take the noun itself (ألف / ألفان), 3–10 take the
   plural (ثلاثة آلاف), 11–99 the accusative singular (أحد عشر ألفاً), and 100+
   the plain singular (مائة ألف). Units are said before tens: خمسة وعشرون. */
const AR_ONES = ['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة',
  'أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
const AR_TENS = ['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
const AR_HUNDREDS = ['','مائة','مئتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];

/* `two` is the free form (ألفان), `twoC` the construct one used when a noun is
   annexed straight after it (ألفا دولار) */
const AR_SCALES = [
  { v:1e9, one:'مليار', two:'ملياران', twoC:'مليارا', plural:'مليارات', acc:'ملياراً', gen:'مليار' },
  { v:1e6, one:'مليون', two:'مليونان', twoC:'مليونا', plural:'ملايين',  acc:'مليوناً', gen:'مليون' },
  { v:1e3, one:'ألف',   two:'ألفان',   twoC:'ألفا',   plural:'آلاف',    acc:'ألفاً',   gen:'ألف'   },
];

/* `construct` is true when a noun follows directly, which turns مئتان into مئتا */
function arUnder1000(n, construct){
  const parts = [];
  const h = Math.floor(n/100), r = n % 100;
  if(h) parts.push(h === 2 && construct && !r ? 'مئتا' : AR_HUNDREDS[h]);
  if(r < 20){ if(r) parts.push(AR_ONES[r]); }
  else {
    const u = r % 10, t = Math.floor(r/10);
    if(u) parts.push(AR_ONES[u]);
    parts.push(AR_TENS[t]);
  }
  return parts.join(' و');
}

/* The counted noun agrees with the tail of the number, not the whole of it:
   284 ends in 84, so it is مئتان وأربعة وثمانون ألفاً, while 100 is مائة ألف. */
function arScaleWord(count, s){
  const tail = count % 100;
  if(tail === 0) return s.gen;
  if(tail >= 3 && tail <= 10) return s.plural;
  return s.acc;
}

function arInteger(n, construct){
  if(n === 0) return 'صفر';
  const parts = [];
  let rest = n;
  for(const s of AR_SCALES){
    const c = Math.floor(rest / s.v);
    if(!c) continue;
    rest %= s.v;
    const last = rest === 0;
    if(c === 1)      parts.push(s.one);
    else if(c === 2) parts.push(last && construct ? s.twoC : s.two);
    // a scale word always annexes what follows it, hence the construct flag here
    else             parts.push(arUnder1000(c, true) + ' ' + arScaleWord(c, s));
  }
  if(rest) parts.push(arUnder1000(rest, construct));
  return parts.join(' و');
}

const AR_CURRENCIES = {
  EGP: { major:'جنيه مصري',   dual:'جنيهان مصريان', minor:{ one:'قرش', two:'قرشان', plural:'قروش',  acc:'قرشاً' } },
  USD: { major:'دولار أمريكي', dual:'دولاران أمريكيان', minor:{ one:'سنت', two:'سنتان', plural:'سنتات', acc:'سنتاً' } },
  EUR: { major:'يورو',        dual:'يوروان',        minor:{ one:'سنت', two:'سنتان', plural:'سنتات', acc:'سنتاً' } },
};

function arMinor(frac, m){
  if(frac === 1) return m.one + ' واحد';
  if(frac === 2) return m.two;
  return arInteger(frac) + ' ' + (frac <= 10 ? m.plural : m.acc);
}

/* Some forms already print the wording around the blank — "فقط وقدره ___ جنيها
   مصريا فقط لا غير" — so only the number itself belongs in the gap. */
function amountInWordsArBare(amountStr){
  const clean = String(amountStr||'').replace(/[,\s]/g,'');
  if(!clean || !/^\d*\.?\d*$/.test(clean) || isNaN(parseFloat(clean))) return '';
  const num = parseFloat(clean), major = Math.floor(num);
  const frac = Math.round((num - major) * 100);
  let s = arInteger(major, true);
  if(frac > 0) s += ' و' + arMinor(frac, AR_CURRENCIES.EGP.minor);
  return s;
}

function amountInWordsAr(amountStr, ccy){
  const clean = String(amountStr||'').replace(/[,\s]/g,'');
  if(!clean || !/^\d*\.?\d*$/.test(clean) || isNaN(parseFloat(clean))) return '';
  const info = AR_CURRENCIES[(ccy||'').toUpperCase()];
  if(!info) return '';

  const num = parseFloat(clean), major = Math.floor(num);
  const frac = Math.round((num - major) * 100);

  // an amount under one unit is just the fraction: فقط خمسون قرشاً لا غير
  if(major === 0 && frac > 0) return 'فقط ' + arMinor(frac, info.minor) + ' لا غير';

  let head;
  if(major === 1)      head = info.major + ' واحد';
  else if(major === 2) head = info.dual;
  else                 head = arInteger(major, true) + ' ' + info.major;

  let s = 'فقط ' + head;
  if(frac > 0) s += ' و' + arMinor(frac, info.minor);
  return s + ' لا غير';
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

/* `maxLines` is for a blank inside running text, where a second line would print
   over the sentence below: such a field shrinks instead of wrapping, and if even
   the smallest size will not do it runs on past its gap rather than downwards. */
/* Where each line of a field sits, as a baseline in PDF points.

   Normally the block is centred in its box, which is what a ruled cell wants.
   A field in running text instead gives `baseline`: the baseline the printed
   sentence sits on, so the value lines up with the words either side of it at
   any size, rather than drifting lower as the type grows. */
function lineBaselines(f, size, lineCount, y0, boxH){
  if(f.baseline != null && lineCount === 1) return [f.baseline];
  const blockH = lineCount * size * LINE_RATIO;
  const out = [];
  let cursor = y0 + (boxH + blockH)/2 - size;
  for(let i = 0; i < lineCount; i++){
    out.push(cursor + size * 0.22);
    cursor -= size * LINE_RATIO;
  }
  return out;
}

/* the top of a line's em box, which is how the preview positions text */
const topOfLine = (baseline, size) => baseline + size * 0.78;

/* A field printed into a row of little boxes, like the DDMMYYYY on a cheque:
   one character to a box, each centred in its own. Returns the characters with
   the centre of the cell each belongs in. */
function cellPositions(f, text){
  const [x0, , x1] = f.box;
  const chars = String(text).replace(/\D/g, '').slice(0, f.cells).split('');
  const w = (x1 - x0) / f.cells;
  return chars.map((ch, i) => ({ ch, cx: x0 + w * (i + 0.5) }));
}

function fitText(text, boxW, boxH, measureAt, maxLines, pad){
  const maxW = boxW - (pad == null ? PAD : pad) * 2;
  for(let size = BASE_SIZE; size >= MIN_SIZE; size -= 0.25){
    const lines = wrapLines(text, maxW, s => measureAt(s, size));
    if(maxLines && lines.length > maxLines) continue;
    if(lines.length * size * LINE_RATIO <= boxH - 2) return { size, lines };
  }
  const lines = wrapLines(text, maxW, s => measureAt(s, MIN_SIZE));
  return {
    size: MIN_SIZE,
    lines: maxLines === 1 && lines.length > 1 ? [String(text).replace(/\s+/g, ' ').trim()] : lines,
  };
}

/* ---------- state ---------- */
const state = { values:{}, checks:{}, flags:{} };
/* Every form opens blank. Nothing typed into one is kept, so a value from last
   time can never end up printed on this time's form. These are the keys older
   versions wrote; they are cleared on load. */
const STALE_KEYS = ['abk-transfer-tool', 'abk-transfer-payees'];

function clearStaleStorage(){
  try{ STALE_KEYS.forEach(k => localStorage.removeItem(k)); }catch(e){}
}

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

/* Pick a supplier and the beneficiary half of the form fills itself from the
   Suppliers list: the IBAN where there is one, otherwise the account number.
   Everything it writes stays editable — the reason especially, since one
   supplier is paid for different things. */
function buildSupplierPicker(){
  const bar = el('div','payeebar');
  const sel = document.createElement('select');
  const suppliers = (window.LISTS ? LISTS.suppliers() : []);

  sel.appendChild(new Option(suppliers.length
    ? '— fill from a supplier —'
    : '— no suppliers yet —', ''));
  suppliers.forEach((s, i) => {
    const name = s.nameEn || s.nameAr || ('supplier ' + (i+1));
    sel.appendChild(new Option(name, String(i)));
  });
  sel.disabled = !suppliers.length;

  sel.addEventListener('change', () => {
    const s = suppliers[Number(sel.value)];
    if(!s) return;
    const bank = LISTS.banks().find(b => (b.en || b.ar) === s.bank);
    const put = (id, v) => {
      if(v == null || v === '') return;
      state.values[id] = v;
      const n = document.getElementById('in-'+id);
      if(n){ n.value = v; n.classList.remove('bad'); }
    };
    put('benName', s.nameEn || s.nameAr);
    put('benAccount', LISTS.payTo(s));
    put('benBank', s.bank);
    // a SWIFT that is not a real BIC would only trip the form's own check
    if(LISTS.isBic(s.swift)) put('benBankSwift', String(s.swift).toUpperCase());
    else if(bank && LISTS.isBic(bank.swift)) put('benBankSwift', bank.swift);
    put('purpose', s.reason);
    render();
    flash('Filled from ' + (s.nameEn || s.nameAr) + '. Change anything you need to.');
  });

  const link = document.createElement('a');
  link.href = 'suppliers.html'; link.className = 'mini aslink';
  link.textContent = suppliers.length ? 'Edit list' : 'Add suppliers';
  bar.appendChild(sel); bar.appendChild(link);
  return bar;
}

function buildForm(){
  for(const g of GROUPS){
    const sec = el('section','grp');
    sec.appendChild(el('h2',null,g.title));
    if(CURRENT_FORM.suppliersInto && g.id === CURRENT_FORM.suppliersInto)
      sec.appendChild(buildSupplierPicker());

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

      if(f.wordsOf){
        const bar = el('div','wordsBtns');
        const gen = (fn, label) => {
          const b = el('button','mini',label); b.type='button';
          b.addEventListener('click', ()=>{
            const w = f.wordsStyle === 'bare' && fn === amountInWordsAr
              ? amountInWordsArBare(state.values[f.wordsOf])
              : fn(state.values[f.wordsOf], (f.currencyFixed || state.values[f.currencyField]));
            if(!w){ flash('Choose a currency and enter a numeric amount first.'); return; }
            state.values[f.id] = w;
            const n = document.getElementById('in-'+f.id);
            n.value = w; n.dataset.touched = '';
            render();
          });
          return b;
        };
        bar.appendChild(gen(amountInWordsAr, 'بالعربية'));
        bar.appendChild(gen(amountInWords,   'In English'));
        row.appendChild(bar);
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
    if(f.arabic){
      const cleaned = toArabicOnly(v);
      if(cleaned !== v){
        const caret = inp.selectionStart, removed = v.length - cleaned.length;
        v = cleaned; inp.value = cleaned;
        if(caret != null){ try{ inp.setSelectionRange(caret - removed, caret - removed); }catch(e){} }
        flash(f.label + ' must be written in Arabic.');
      }
    }
    if(f.thousands){
      const caret = inp.selectionStart;
      const digitsBefore = (v.slice(0, caret == null ? v.length : caret).match(/[\d.]/g) || []).length;
      const formatted = formatThousands(v);
      if(formatted !== v){
        v = formatted;
        inp.value = formatted;
        try{ const c = caretAfterDigits(formatted, digitsBefore); inp.setSelectionRange(c, c); }catch(e){}
      }
    }
    state.values[f.id] = f.upper ? v.toUpperCase() : v;
    if(f.upper) inp.value = state.values[f.id];
    const wf = wordsField();
    if(wf && (f.id === wf.wordsOf || f.id === wf.currencyField)) maybeAutoWords();
    inp.classList.remove('bad');
    validate(f, inp);
    render();
  };
}

/* the field marked `wordsOf` spells out the amount it names, until typed over */
function wordsField(){ return FIELDS.find(f => f.wordsOf); }

function maybeAutoWords(){
  const f = wordsField();
  if(!f) return;
  const node = document.getElementById('in-'+f.id);
  if(!node || node.dataset.touched === '1') return;
  const w = f.wordsStyle === 'bare'
    ? amountInWordsArBare(state.values[f.wordsOf])
    : amountInWordsAr(state.values[f.wordsOf], (f.currencyFixed || state.values[f.currencyField]));
  if(w){ state.values[f.id] = w; node.value = w; }
}

function validate(f, inp){
  const v = (state.values[f.id]||'').trim();
  let bad = false;
  if(f.swift && v)     bad = !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v);
  if(f.thousands && v) bad = !/^\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(v) || parseFloat(v.replace(/,/g,'')) <= 0;
  if(f.latin && v && RTL_LETTERS.test(v)) bad = true;
  if(f.arabic && v && LATIN_LETTERS.test(v)) bad = true;
  if(f.cells && v) bad = v.replace(/\D/g, '').length !== f.cells;
  inp.classList.toggle('bad', bad);
  return !bad;
}

/* ---------- live preview ---------- */
let previewScale = 1;
const meas = document.createElement('canvas').getContext('2d');
function measurePreview(text, size){ meas.font = size+'px ABKForm, Helvetica, Arial, sans-serif'; return meas.measureText(text).width; }

function layoutOverlay(){
  previewScale = previewWrap.clientWidth / PAGE_W;
  overlayEl.style.width = (PAGE_W*previewScale)+'px';
  overlayEl.style.height = ((VIEW_TOP-VIEW_BOT)*previewScale)+'px';
  render();
}

function render(){
  overlayEl.innerHTML = '';
  const S = previewScale;

  for(const f of FIELDS){
    const text = displayValue(f, state.values[f.id]);
    if(!text) continue;
    const [x0,y0,x1,y1] = f.box;
    const boxW = x1-x0, boxH = y1-y0;

    if(f.cells){
      const size = f.cellSize || BASE_SIZE;
      const top = topOfLine(lineBaselines(f, size, 1, y0, boxH)[0], size);
      for(const { ch, cx } of cellPositions(f, text)){
        const d = el('div', 'ov center', ch);
        d.style.left = ((cx - boxW/f.cells/2)*S)+'px';
        d.style.top = ((VIEW_TOP - top)*S)+'px';
        d.style.width = (boxW/f.cells*S)+'px';
        d.style.fontSize = (size*S)+'px';
        d.style.lineHeight = (size*LINE_RATIO*S)+'px';
        overlayEl.appendChild(d);
      }
      continue;
    }

    const { size, lines } = fitText(text, boxW, boxH, measurePreview, f.maxLines, f.pad);
    const topPdf = topOfLine(lineBaselines(f, size, lines.length, y0, boxH)[0], size);

    const d = el('div', 'ov center');
    d.dir = 'auto';
    d.style.left = (x0*S)+'px';
    d.style.top = ((VIEW_TOP - topPdf)*S)+'px';
    d.style.width = (boxW*S)+'px';
    d.style.fontSize = (size*S)+'px';
    d.style.lineHeight = (size*LINE_RATIO*S)+'px';
    d.textContent = lines.join('\n');
    overlayEl.appendChild(d);
  }

  for(const b of markedBoxes()){
    const [x0,y0,x1,y1] = b;
    const d = el('div','ovcheck','✓');
    d.style.left = (x0*S)+'px';
    d.style.top = ((VIEW_TOP - y1)*S)+'px';
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
  /* A form printed onto stationery that already exists — a cheque — must carry
     the values and nothing else, or the printer would lay a picture of a cheque
     over the real one. Those forms get a blank page of the same size instead of
     the template. */
  const doc = CURRENT_FORM.overlayOnly
    ? await PDFDocument.create()
    : await PDFDocument.load(pdfBytes.slice(0));
  doc.registerFontkit(fontkit);
  const printPage = CURRENT_FORM.overlayOnly ? CURRENT_FORM.printPage : null;
  const page = CURRENT_FORM.overlayOnly
    ? doc.addPage(printPage ? [printPage.w, printPage.h] : [PAGE_W, PAGE_H])
    : doc.getPages()[0];
  const pdfFont = await doc.embedFont(fontBytes.slice(0), { subset: false });
  const fontKey = page.node.newFontDictionary('ABK', pdfFont.ref);

  page.pushOperators(op('q'));
  // Translate only the PDF output; preview geometry and field sizing stay intact.
  if(printPage){
    page.pushOperators(op('cm', [1, 0, 0, 1, printPage.x, printPage.y].map(num)));
  }
  for(const f of FIELDS){
    const text = displayValue(f, state.values[f.id]);
    if(!text) continue;
    const [x0,y0,x1,y1] = f.box;
    const boxW = x1-x0, boxH = y1-y0;
    const dir = baseDirOf(text);

    if(f.cells){
      const size = f.cellSize || BASE_SIZE;
      const baseline = lineBaselines(f, size, 1, y0, boxH)[0];
      for(const { ch, cx } of cellPositions(f, text)){
        drawLine(page, fontKey, ch, cx - measureText(ch, size, 'ltr')/2, baseline, size, 'ltr');
      }
      continue;
    }

    const { size, lines } = fitText(text, boxW, boxH, (s,sz)=>measureText(s,sz,dir), f.maxLines, f.pad);
    const baselines = lineBaselines(f, size, lines.length, y0, boxH);

    lines.forEach((line, i) => {
      // every value sits centred in its cell, Arabic and English alike
      const x = x0 + (boxW - measureText(line, size, dir))/2;
      drawLine(page, fontKey, line, x, baselines[i], size, dir);
    });
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
  const nameField = FIELDS.find(f => f.fileLabel);
  const dateField = FIELDS.find(f => f.today);
  const who = (((nameField && state.values[nameField.id])||'')).replace(/[\\/:*?"<>|.]/g,'').trim().replace(/\s+/g,'-').slice(0,40) || 'transfer';
  const d = (((dateField && state.values[dateField.id])||'')).replace(/[^\d]/g,'-') || new Date().toISOString().slice(0,10);
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
    recordTransaction(fileName());   // printing records it too
  } finally { busy(false); }
}

/* A form that declares `records` writes down every transfer saved from it, so
   there is a record of what was sent and to whom. Only what was actually on the
   form is kept; nothing is inferred. */
function recordTransaction(fileSaved){
  if(!CURRENT_FORM.records || !window.LISTS) return;
  if(recordTransaction.busy) return;         // Print saves then prints; record once
  recordTransaction.busy = true;
  setTimeout(() => { recordTransaction.busy = false; }, 0);
  const v = id => (state.values[id] || '').trim();
  const labelOf = (groupId, value) => {
    const g = CHECKS.find(c => c.id === groupId);
    const o = g && g.options.find(o => o.v === value);
    return o ? o.v.toUpperCase() : '';
  };
  const entry = {
    form: CURRENT_FORM.title,
    date: v('date'),
    issueType: labelOf('issueType', state.checks.issueType),
    currency: v('currency'),
    amount: v('amountFigures'),
    amountWords: v('amountWords'),
    benName: v('benName'),
    benAccount: v('benAccount'),
    benBank: v('benBank'),
    benSwift: v('benBankSwift'),
    purpose: v('purpose'),
    charges: labelOf('charges', state.checks.charges),
    debitAccount: v('debitAccount'),
    debitCurrency: v('debitCurrency'),
    commAccount: v('commAccount'),
    commCurrency: v('commCurrency'),
    ordName: v('ordName'),
    file: fileSaved,
    /* every field as it stood, so a transfer opened again comes back whole —
       including the ones the table does not show */
    values: FIELDS.reduce((o, f) => { o[f.id] = state.values[f.id] || ''; return o; }, {}),
    checks: Object.assign({}, state.checks),
    flags: Object.assign({}, state.flags),
  };
  const ok = EDITING_TX
    ? LISTS.updateTransaction(EDITING_TX, entry)
    : LISTS.addTransaction(entry);
  if(!ok) flash('The PDF was made, but the transfer could not be written to Transactions.');
  else if(EDITING_TX) flash('Transaction updated.');
}

/* Opening a saved transfer puts its figures back on the form; saving then
   overwrites that record rather than adding a second one. */
let EDITING_TX = null;

function loadTransaction(id){
  const tx = LISTS.getTransaction(id);
  if(!tx){ flash('That transaction is no longer on the list.'); return; }
  EDITING_TX = id;

  const put = (fieldId, value) => {
    if(value == null || value === '') return;
    state.values[fieldId] = value;
    const n = document.getElementById('in-'+fieldId);
    if(n) n.value = value;
  };

  if(tx.values){
    for(const [id, value] of Object.entries(tx.values)) put(id, value);
  } else {
    // a record written before whole-form saving; restore what it has
    put('date', tx.date);            put('currency', tx.currency);
    put('amountFigures', tx.amount); put('amountWords', tx.amountWords);
    put('benName', tx.benName);      put('benAccount', tx.benAccount);
    put('benBank', tx.benBank);      put('benBankSwift', tx.benSwift);
    put('purpose', tx.purpose);      put('ordName', tx.ordName);
    put('debitAccount', tx.debitAccount); put('debitCurrency', tx.debitCurrency);
    put('commAccount', tx.commAccount);   put('commCurrency', tx.commCurrency);
  }

  // a stored group is the option name, saved in capitals on older records
  const pick = (groupId, stored) => {
    if(!stored) return;
    const g = CHECKS.find(c => c.id === groupId);
    const o = g && g.options.find(o => o.v.toLowerCase() === String(stored).toLowerCase());
    if(!o) return;
    state.checks[groupId] = o.v;
    const n = document.getElementById(groupId+'-'+o.v);
    if(n) n.checked = true;
  };
  pick('issueType', (tx.checks && tx.checks.issueType) || tx.issueType);
  pick('charges',   (tx.checks && tx.checks.charges)   || tx.charges);

  for(const [id, on] of Object.entries(tx.flags || {})){
    state.flags[id] = on;
    const n = document.getElementById('in-'+id);
    if(n) n.checked = !!on;
  }

  const words = document.getElementById('in-amountWords');
  if(words) words.dataset.touched = '1';     // keep the wording that was saved

  document.body.classList.add('editing');
  const note = document.getElementById('editing');
  if(note){
    note.hidden = false;
    note.querySelector('span').textContent =
      'Editing the transfer to ' + (tx.benName || 'this beneficiary') + ' saved on ' +
      new Date(tx.recordedAt).toLocaleDateString('en-GB') + '. Saving overwrites it.';
  }
  render();
}

/* Save writes the transfer down and nothing more — no PDF is made. Print is
   what produces the document, and records it as well. */
function doSave(){
  if(!checkRequired()) return;
  if(!CURRENT_FORM.records){
    flash('This form keeps no record, so there is nothing to save. Use Print.');
    return;
  }
  const was = EDITING_TX;
  recordTransaction('');
  if(!was) flash('Transfer saved to Transactions.');
}

function clearAll(){
  if(!confirm('Clear the whole form?')) return;
  state.values = {}; state.checks = {}; state.flags = {};
  FIELDS.forEach(f=>{
    const n = document.getElementById('in-'+f.id);
    if(n){ n.value = state.values[f.id]||''; n.classList.remove('bad'); n.dataset.touched=''; }
  });
  document.querySelectorAll('#form input[type=radio], #form input[type=checkbox]').forEach(n=>n.checked=false);
  document.querySelectorAll('.opts').forEach(n=>n.classList.remove('bad'));
  errorsEl.hidden = true;
  setToday();
  applyPreset(currentPreset());   // a cheque keeps its draft type and currency
  render();
}

/* What a blank form opens with: today's date, and any field that names a `def`.
   These are fresh defaults, not values kept from last time — change one and the
   change goes no further than the form in front of you. */
function applyDefaults(){
  const d = new Date();
  const today = String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();

  for(const f of FIELDS){
    const v = f.today ? today : f.def;
    if(v == null) continue;
    state.values[f.id] = v;
    const n = document.getElementById('in-'+f.id);
    if(n){ n.value = v; n.classList.remove('bad'); }
  }
}
const setToday = applyDefaults;   // called from clearAll too

let flashTimer = null;
function flash(msg){
  const n = document.getElementById('toast');
  n.textContent = msg; n.classList.add('show');
  clearTimeout(flashTimer); flashTimer = setTimeout(()=>n.classList.remove('show'), 3200);
}
function busy(on){ document.body.classList.toggle('busy', on); }

/* ---------- preset for the form chosen on the hub ---------- */

/* A form whose blank PDF is not in assets/ must not open: whatever it rendered
   would be the wrong document, and someone could print and submit it. */
function refuseUnavailable(preset){
  const box = document.getElementById('loading');
  box.innerHTML = '';
  const wrap = el('div','unavailable');
  wrap.appendChild(el('p', null, preset.title + ' is not available yet.'));
  wrap.appendChild(el('p','small', 'Its blank PDF has not been added, so this form cannot be filled in here.'));
  const back = document.createElement('a');
  back.href = 'index.html'; back.textContent = '← All forms'; back.className = 'backLink';
  wrap.appendChild(back);
  box.appendChild(wrap);
  document.title = preset.title + ' — not available';
}

function applyPreset(preset){
  document.getElementById('formTitle').textContent = preset.title;
  document.getElementById('formSub').textContent = preset.bank + '  ·  fills the original form';
  document.title = preset.title + ' — Bank Forms';

  for(const [id, v] of Object.entries(preset.set || {})){
    state.values[id] = v;
    const n = document.getElementById('in-'+id);
    if(n) n.value = v;
  }
  for(const [id, v] of Object.entries(preset.check || {})){
    state.checks[id] = v;
    const n = document.getElementById(id+'-'+v);
    if(n) n.checked = true;
  }
  for(const id of preset.lock || []){
    const field = document.getElementById('in-'+id);
    if(field){
      field.disabled = true;
      field.closest('.row').classList.add('locked');
    }
    const group = document.getElementById('opts-'+id);
    if(group){
      group.querySelectorAll('input').forEach(n => { n.disabled = true; });
      group.closest('.row').classList.add('locked');
    }
  }
}

/* ---------- text size ----------
   Each form sets the size its own printing suits, but how a filled form reads
   depends on handwriting habits and the branch, so the reader can override it.
   The choice is kept per form. The shrink floor stays tied to the form's own
   default, so raising the size never stops a long value fitting its cell. */
function sizeKeyFor(preset){ return SIZE_KEY + ':' + (preset.id || 'form'); }

function loadSize(preset){
  try{
    const v = parseFloat(localStorage.getItem(sizeKeyFor(preset)));
    if(v >= SIZE_MIN && v <= SIZE_MAX) return v;
  }catch(e){}
  return FORM_SIZE;
}

function buildSizePicker(preset){
  const sel = document.getElementById('fontSize');
  if(!sel) return;
  for(let s = SIZE_MIN; s <= SIZE_MAX; s++){
    const o = new Option(s === FORM_SIZE ? s + ' pt (default)' : s + ' pt', String(s));
    if(s === Math.round(BASE_SIZE)) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => {
    BASE_SIZE = parseFloat(sel.value);
    try{ localStorage.setItem(sizeKeyFor(preset), String(BASE_SIZE)); }catch(e){}
    render();
  });
}

/* Jump between the forms that are ready, without going back to the hub. It also
   gives the offline single-file copy a way to reach them, since it has no hub. */
function buildFormSwitch(preset){
  const sel = document.getElementById('formSwitch');
  if(!sel) return;
  const ready = Object.entries(window.FORM_DEFS).filter(([, d]) => d.ready && !d.alias);
  if(ready.length < 2) return;

  for(const [id, def] of ready){
    const o = new Option(def.title, id);
    if(id === preset.id) o.selected = true;
    sel.appendChild(o);
  }
  sel.hidden = false;
  sel.addEventListener('change', () => { location.search = '?f=' + encodeURIComponent(sel.value); });
}

/* ---------- boot ---------- */
async function boot(){
  await setupGate();

  const preset = currentPreset();
  if(preset.ready === false){ refuseUnavailable(preset); return; }

  /* bind this form's definition before anything reads it */
  PAGE_W = preset.page.w; PAGE_H = preset.page.h;
  VIEW_BOT = preset.previewBand ? preset.previewBand[0] : 0;
  VIEW_TOP = preset.previewBand ? preset.previewBand[1] : PAGE_H;
  CURRENT_FORM = preset;
  FORM_SIZE = preset.fontSize || 9;
  BASE_SIZE = loadSize(preset);
  FIELDS = preset.fields; CHECKS = preset.checks || []; FLAGS = preset.flags || [];
  GROUPS = preset.groups;
  document.getElementById('pageImg').src = preset.preview;

  // an overlay-only form has no template to stamp, just a page size to print on
  const [pdfRes, fontRes] = await Promise.all([
    preset.overlayOnly ? Promise.resolve(null) : fetch(preset.pdf),
    fetch('assets/IBMPlexSansArabic-Regular.ttf'),
  ]);
  if((pdfRes && !pdfRes.ok) || !fontRes.ok) throw new Error('could not load the form or the font');
  pdfBytes  = pdfRes ? new Uint8Array(await pdfRes.arrayBuffer()) : null;
  fontBytes = new Uint8Array(await fontRes.arrayBuffer());
  fkFont = fontkit.create(fontBytes);

  clearStaleStorage();
  buildForm();
  FIELDS.forEach(f=>{ const n = document.getElementById('in-'+f.id); if(n && state.values[f.id]) n.value = state.values[f.id]; });
  const wordsField = FIELDS.find(f => f.wordsOf);
  if(wordsField){
    document.getElementById('in-'+wordsField.id)
      .addEventListener('input', e => { e.target.dataset.touched = '1'; });
  }
  setToday();
  applyPreset(preset);

  const txId = new URLSearchParams(location.search).get('tx');
  if(txId && CURRENT_FORM.records && window.LISTS) loadTransaction(txId);

  buildFormSwitch(preset);
  buildSizePicker(preset);
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

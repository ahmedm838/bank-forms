/* Payroll Transfer Sheet.

   Upload the monthly report; the page builds the payroll sheet and the bank
   transfer sheet and exports either as .xlsx.

   The monthly report carries only what changes each month. Everything standing —
   basic salary, insured wages, bank account, Arabic name — is read once from a
   past payroll sheet and kept in this browser. People are matched on employee
   code, and the S.I. number is checked against it; a disagreement is reported
   rather than quietly accepted.

   Nothing is uploaded anywhere. The workbooks are parsed in the page and the
   employee list stays in this browser's local storage. */

const { num, computeRow, DEFAULTS } = window.PAYROLL;
const MASTER_KEY = 'abk-payroll-master';

const state = { master: {}, month: null, rows: [], problems: [] };

const $ = id => document.getElementById(id);
const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
const money = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = n => Math.round(n).toLocaleString('en-US');

/* ---------- storage ---------- */
function loadMaster(){
  try { state.master = JSON.parse(localStorage.getItem(MASTER_KEY) || '{}'); }
  catch(e){ state.master = {}; }
}
function saveMaster(){
  try { localStorage.setItem(MASTER_KEY, JSON.stringify(state.master)); }
  catch(e){ flash('Could not save the employee list in this browser.'); }
}

/* ---------- reading workbooks ---------- */
const readBook = file => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onerror = () => reject(new Error('could not read ' + file.name));
  r.onload = () => {
    try { resolve(XLSX.read(new Uint8Array(r.result), { type: 'array' })); }
    catch(e){ reject(new Error(file.name + ' is not a workbook this can read')); }
  };
  r.readAsArrayBuffer(file);
});

const grid = ws => XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
const isCode = v => /^\d{4,}$/.test(String(v).trim());

/* A past payroll sheet gives every standing figure. Columns are taken by
   position, which is how the workbook is laid out: code, name, title, S.I. no.,
   bank account, basic salary, then the insured wages at S and T. */
function readPayrollSheet(wb){
  const name = wb.SheetNames.find(n => /payroll/i.test(n)) || wb.SheetNames[0];
  const rows = grid(wb.Sheets[name]);
  const found = {};
  let seq = 0;
  for (const r of rows){
    const code = String(r[0] || '').trim();
    if (!isCode(code)) continue;
    const basic = num(r[5]);
    if (!basic) continue;                        // totals and blank rows
    found[code] = {
      code,
      // the sheet's own row order, which is what both outputs follow: salary
      // alone cannot reproduce it, since people on equal salaries have a settled
      // order of their own
      seq: seq++,
      nameEn: String(r[1] || '').trim(),
      title:  String(r[2] || '').trim(),
      si:     String(r[3] || '').trim(),
      bank:   String(r[4] || '').trim(),
      basic,
      siBasic: num(r[18]),
      siGross: num(r[19]),
      nameAr: (state.master[code] || {}).nameAr || '',
    };
  }
  return { found, sheet: name };
}

/* A past transfer sheet gives the Arabic names. It has no employee code, so the
   bank account number is what ties a name to a person. */
function readTransferSheet(wb){
  const rows = grid(wb.Sheets[wb.SheetNames[0]]);
  const byBank = {};
  for (const r of rows){
    const nameAr = String(r[1] || '').trim();
    const bank = String(r[2] || '').trim();
    if (!nameAr || !/^\d{4,}$/.test(bank)) continue;
    byBank[bank] = nameAr;
  }
  return byBank;
}

/* The monthly report: this month's variable figures. */
function readMonthlyReport(wb){
  const name = wb.SheetNames.find(n => /month/i.test(n)) || wb.SheetNames[0];
  const rows = grid(wb.Sheets[name]);

  let period = '';
  for (let i = 0; i < Math.min(rows.length, 8); i++){
    const a = String(rows[i][0] || '').trim();
    if (/^\d{4}-\d{2}-\d{2}\s+to\s+/.test(a)) period = a;
  }

  const head = rows.findIndex(r => String(r[0]).trim().toLowerCase() === 'name');
  if (head === -1) throw new Error('no header row — is this the monthly report?');

  const out = [];
  for (let i = head + 1; i < rows.length; i++){
    const r = rows[i];
    const code = String(r[1] || '').trim();
    if (!isCode(code)) continue;
    out.push({
      code,
      nameEn: String(r[0] || '').trim(),
      si: String(r[2] || '').trim(),
      allowances:  num(r[7]),
      incentive:   num(r[8]),
      bonus:       num(r[9]),
      adjustments: num(r[10]),
      overtimeHrs: num(r[11]),
      deductedHrs: num(r[12]),
      advance:     num(r[13]),
      union: 0,
      medical: 0,
    });
  }
  if (!out.length) throw new Error('no employee rows found in the monthly report');
  return { people: out, period, sheet: name };
}

/* ---------- putting a month together ---------- */
function build(){
  state.rows = [];
  state.problems = [];
  if (!state.month) return;

  for (const mv of state.month.people){
    const emp = state.master[mv.code];
    if (!emp){
      state.problems.push(`${mv.nameEn} (code ${mv.code}) is not in the employee list — no basic salary to work from, so this person is left out.`);
      continue;
    }
    if (emp.si && mv.si && emp.si !== mv.si){
      state.problems.push(`${emp.nameEn || mv.nameEn} (code ${mv.code}): S.I. number is ${emp.si} on file but ${mv.si} in the report. Using the one on file — check which is right.`);
    }
    if (!emp.nameAr){
      state.problems.push(`${emp.nameEn} has no Arabic name on file, so the transfer sheet shows the English one. Load a past transfer sheet to fix this.`);
    }
    state.rows.push(Object.assign({ emp, mv }, computeRow(emp, mv)));
  }

  // keep the payroll sheet's own order; anyone it does not list goes last
  state.rows.sort((a, b) => {
    const sa = a.emp.seq == null ? 1e9 : a.emp.seq;
    const sb = b.emp.seq == null ? 1e9 : b.emp.seq;
    return sa - sb || b.emp.basic - a.emp.basic;
  });
}

/* ---------- tables ---------- */
const PAYROLL_COLS = [
  ['الكود', 'Code',                  r => r.emp.code,    'text'],
  ['الاسم بالكامل', 'Employee Name', r => r.emp.nameEn,  'text'],
  ['الوظيفة', 'Title',               r => r.emp.title,   'text'],
  ['الرقم التأميني', 'S.I. No.',     r => r.emp.si,      'text'],
  ['رقم الحساب البنكي', 'Bank Acc. No.', r => r.emp.bank, 'text'],
  ['الأجر الشامل الأساسي', 'Basic Gross Salary', r => r.emp.basic, 'num'],
  ['البدلات', 'Allowances',          r => r.mv.allowances, 'num'],
  ['الحافز', 'Incentive',            r => r.mv.incentive,  'num'],
  ['مكافاة', 'Bonus',                r => r.mv.bonus,      'num'],
  ['تسويات', 'Adjustments',          r => r.mv.adjustments,'num'],
  ['الوقت الإضافي ساعات العمل', 'Overtime Hours', r => r.mv.overtimeHrs, 'num'],
  ['خصم ساعات العمل', 'Deducted Hours', r => r.mv.deductedHrs, 'num'],
  ['السلف المقدمة', 'Advance Loans', r => r.mv.advance,    'num'],
  ['اشتراك النقابة', 'Union Membership', r => r.mv.union,  'num'],
  ['التأمين الطبي الخاص', 'Medical Insurance', r => r.mv.medical, 'num'],
  ['إجمالي الإضافات', 'Total Additions', r => r.additions, 'num'],
  ['الخصومات الكلية', 'Total Deductions', r => r.deductions, 'num'],
  ['الأجر الشامل', 'Gross Salary',   r => r.gross,    'num'],
  ['أجر الاشتراك التأميني', 'S.I. Basic Wage', r => r.emp.siBasic, 'num'],
  ['الأجر الشامل التأميني', 'S.I. Gross Wage', r => r.emp.siGross, 'num'],
  ['حصة الموظف في التأمينات', 'S.I. Emp. Share', r => r.empShare, 'num'],
  ['حصة الشركة في التأمينات', 'S.I. Com. Share', r => r.comShare, 'num'],
  ['إجمالي الراتب الخاضع للضريبة', 'Taxable Salary', r => r.taxable, 'num'],
  ['ض. كسب العمل', 'Salary Tax',     r => r.tax,      'num'],
  ['صندوق الشهداء', 'Martyrs Tax',   r => r.martyrs,  'num'],
  ['صافي الراتب', 'Net Salary',      r => r.net,      'num'],
  ['الراتب النقدي', 'Paid Salary',   r => r.paid,     'num'],
];

const SUMMED = new Set(PAYROLL_COLS.map((c, i) => i).filter(i => {
  const h = PAYROLL_COLS[i][1];
  return !['Code','Employee Name','Title','S.I. No.','Bank Acc. No.','Taxable Salary'].includes(h);
}));

function renderPayroll(){
  const t = $('tblPayroll');
  t.innerHTML = '';
  const thead = el('thead');
  const hr = el('tr');
  PAYROLL_COLS.forEach(c => {
    const th = el('th');
    th.appendChild(el('span', 'ar', c[0]));
    th.appendChild(el('span', 'en', c[1]));
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  t.appendChild(thead);

  const tb = el('tbody');
  for (const r of state.rows){
    const tr = el('tr');
    PAYROLL_COLS.forEach(([, , get, kind]) => {
      const v = get(r);
      const td = el('td', kind === 'num' ? 'n' : null, kind === 'num' ? (v ? money(v) : '–') : v);
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  }
  t.appendChild(tb);

  const tf = el('tfoot');
  const fr = el('tr');
  PAYROLL_COLS.forEach(([, head, get, kind], i) => {
    if (i === 0){ fr.appendChild(el('td', null, '')); return; }
    if (i === 1){ fr.appendChild(el('td', null, 'Number of Employees')); return; }
    if (i === 2){ fr.appendChild(el('td', 'n', String(state.rows.length))); return; }
    if (kind === 'num' && SUMMED.has(i)){
      const total = state.rows.reduce((s, r) => s + (get(r) || 0), 0);
      fr.appendChild(el('td', 'n', total ? money(total) : '–'));
    } else fr.appendChild(el('td', null, ''));
  });
  tf.appendChild(fr);
  t.appendChild(tf);

  $('payrollCount').textContent = state.rows.length + ' employees';
}

function transferRows(){
  return state.rows.map((r, i) => ({
    serial: String(i + 1).padStart(2, '0'),
    name: r.emp.nameAr || r.emp.nameEn,
    bank: r.emp.bank,
    salary: r.net,
  }));
}

function renderTransfer(){
  const t = $('tblTransfer');
  t.innerHTML = '';
  const thead = el('thead');
  const hr = el('tr');
  ['Serial','Full Name','Account Number','Salary'].forEach(h => hr.appendChild(el('th', null, h)));
  thead.appendChild(hr);
  t.appendChild(thead);

  const tb = el('tbody');
  const rows = transferRows();
  for (const r of rows){
    const tr = el('tr');
    tr.appendChild(el('td', null, r.serial));
    const nm = el('td', 'ar-cell', r.name); nm.dir = 'auto';
    tr.appendChild(nm);
    tr.appendChild(el('td', 'n', r.bank));
    tr.appendChild(el('td', 'n', whole(r.salary)));
    tb.appendChild(tr);
  }
  t.appendChild(tb);

  const tf = el('tfoot');
  const fr = el('tr');
  fr.appendChild(el('td', null, ''));
  fr.appendChild(el('td', 'n', String(rows.length)));
  fr.appendChild(el('td', null, 'Total'));
  fr.appendChild(el('td', 'n', whole(rows.reduce((s, r) => s + r.salary, 0))));
  tf.appendChild(fr);
  t.appendChild(tf);

  $('transferCount').textContent = rows.length + ' employees';
}

/* ---------- exports ---------- */
function monthLabel(){
  const p = (state.month && state.month.period) || '';
  const m = p.match(/to\s+(\d{4})-(\d{2})-\d{2}/);
  if (!m) return 'payroll';
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return names[Number(m[2]) - 1] + ' ' + m[1];
}

function exportPayroll(){
  const aoa = [
    PAYROLL_COLS.map(c => c[0]),
    PAYROLL_COLS.map(c => c[1]),
  ];
  for (const r of state.rows){
    aoa.push(PAYROLL_COLS.map(([, , get, kind]) => {
      const v = get(r);
      return kind === 'num' ? Number((v || 0).toFixed(2)) : v;
    }));
  }
  const foot = PAYROLL_COLS.map(([, , get, kind], i) => {
    if (i === 1) return 'Number of Employees';
    if (i === 2) return state.rows.length;
    if (kind === 'num' && SUMMED.has(i))
      return Number(state.rows.reduce((s, r) => s + (get(r) || 0), 0).toFixed(2));
    return '';
  });
  aoa.push(foot);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = PAYROLL_COLS.map((c, i) => ({ wch: i === 1 ? 28 : i === 2 ? 24 : 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
  XLSX.writeFile(wb, `Payroll Sheet - ${monthLabel()}.xlsx`);
  flash('Saved the payroll sheet.');
}

function exportTransfer(){
  const rows = transferRows();
  const aoa = [['Serial','Full Name','Account Number','Salary']];
  for (const r of rows) aoa.push([r.serial, r.name, r.bank, Math.round(r.salary)]);
  aoa.push(['', rows.length, 'Total', rows.reduce((s, r) => s + Math.round(r.salary), 0)]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 18 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transfer');
  XLSX.writeFile(wb, `Transfer Sheet - ${monthLabel()}.xlsx`);
  flash('Saved the transfer sheet.');
}

/* ---------- screen ---------- */
function refresh(){
  const people = Object.keys(state.master);
  const withAr = people.filter(c => state.master[c].nameAr).length;
  $('masterState').textContent = people.length
    ? `${people.length} employees on file, ${withAr} with an Arabic name.`
    : 'No employees yet. Load a past payroll sheet to start.';
  $('masterTools').hidden = !people.length;
  $('masterDetail').textContent = people.length ? 'Kept in this browser only.' : '';

  build();
  const ready = state.rows.length > 0;
  $('results').hidden = !ready;
  $('btnPayroll').disabled = !ready;
  $('btnTransfer').disabled = !ready;
  if (ready){ renderPayroll(); renderTransfer(); }

  const box = $('problems');
  if (state.problems.length){
    box.innerHTML = '';
    box.appendChild(el('b', null, state.problems.length === 1 ? 'One thing to check:' : state.problems.length + ' things to check:'));
    const ul = el('ul');
    state.problems.forEach(p => ul.appendChild(el('li', null, p)));
    box.appendChild(ul);
    box.hidden = false;
  } else box.hidden = true;
}

let flashTimer = null;
function flash(msg){
  const n = $('toast');
  n.textContent = msg; n.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => n.classList.remove('show'), 3200);
}

/* ---------- wiring ---------- */
function hookDrop(dropId, inputId, handler){
  const drop = $(dropId), input = $(inputId);
  const take = async file => {
    if (!file) return;
    drop.classList.add('busy');
    try { await handler(file); }
    catch(e){ flash(e.message); }
    finally { drop.classList.remove('busy'); input.value = ''; }
  };
  input.addEventListener('change', () => take(input.files[0]));
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => take(e.dataTransfer.files[0]));
}

async function boot(){
  await setupGate();
  loadMaster();

  hookDrop('dropMaster', 'fileMaster', async file => {
    const { found, sheet } = readPayrollSheet(await readBook(file));
    const n = Object.keys(found).length;
    if (!n) throw new Error(`no employees found in ${file.name} — is that a payroll sheet?`);
    Object.assign(state.master, found);
    saveMaster(); refresh();
    flash(`Read ${n} employees from "${sheet}".`);
  });

  hookDrop('dropNames', 'fileNames', async file => {
    const byBank = readTransferSheet(await readBook(file));
    let hit = 0, miss = 0;
    for (const code of Object.keys(state.master)){
      const ar = byBank[state.master[code].bank];
      if (ar){ state.master[code].nameAr = ar; hit++; }
      else miss++;
    }
    const spare = Object.keys(byBank).length - hit;
    saveMaster(); refresh();
    if (!hit) throw new Error('none of those account numbers match anyone on file — load the payroll sheet first.');
    flash(`Matched ${hit} Arabic names by account number.` +
          (miss ? ` ${miss} still without one.` : '') +
          (spare > 0 ? ` ${spare} in the file matched nobody.` : ''));
  });

  hookDrop('dropReport', 'fileReport', async file => {
    state.month = readMonthlyReport(await readBook(file));
    $('reportState').textContent =
      `${file.name} — ${state.month.people.length} employees` +
      (state.month.period ? `, ${state.month.period}` : '');
    refresh();
    flash(`Read ${state.month.people.length} employees from the monthly report.`);
  });

  $('btnPayroll').addEventListener('click', exportPayroll);
  $('btnTransfer').addEventListener('click', exportTransfer);
  $('btnForget').addEventListener('click', () => {
    if (!confirm('Forget every employee stored in this browser?')) return;
    state.master = {}; saveMaster(); refresh(); flash('Employee list cleared.');
  });

  refresh();
}

boot().catch(err => flash('Could not start: ' + err.message));

/* Payroll Transfer Sheet.

   Upload the monthly report; the page builds the payroll sheet and the bank
   transfer sheet and exports either as .xlsx.

   The monthly report carries only what changes each month. Everything standing —
   basic salary, insured wages, bank account — is read once from the employee
   list (its first eight columns) and held only in temporary memory. People are matched on employee
   code, and the S.I. number is checked against it; a disagreement is reported
   rather than quietly accepted.

   Nothing is uploaded anywhere. The workbooks are parsed in the page and the
   employee list is never saved in browser storage. */

const { num, computeRow, DEFAULTS } = window.PAYROLL;
const state = window.BankFormsMemory.payroll || (window.BankFormsMemory.payroll =
  { master: {}, month: null, rows: [], mismatches: [], uploads: {}, payrollDuplicates: [] });

const $ = id => document.getElementById(id);
const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
const money = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = n => Math.round(n).toLocaleString('en-US');

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

/* The employee list gives every standing figure. Only its first eight columns
   are read, by position, as the company workbook lays them out: code, employee
   name, title, S.I. no., bank account, basic gross salary, S.I. basic wage and
   S.I. gross wage. Any columns after these are ignored. */
function readEmployeeList(wb){
  const name = wb.SheetNames.find(n => /payroll|employee/i.test(n)) || wb.SheetNames[0];
  const rows = grid(wb.Sheets[name]);
  const found = {};
  let seq = 0;
  const duplicates = [];
  for (const r of rows){
    const code = String(r[0] || '').trim();
    if (!isCode(code)) continue;
    if (!String(r[1] || '').trim()) continue;    // totals and blank rows
    if(found[code]) duplicates.push(code);
    found[code] = {
      code,
      // the list's own row order, which is what both outputs follow: salary
      // alone cannot reproduce it, since people on equal salaries have a settled
      // order of their own
      seq: seq++,
      nameEn: String(r[1] || '').trim(),
      title:  String(r[2] || '').trim(),
      si:     String(r[3] || '').trim(),
      bank:   String(r[4] || '').trim(),
      basic:  num(r[5]),
      siBasic: num(r[6]),
      siGross: num(r[7]),
    };
  }
  return { found, sheet: name, count: seq, duplicates };
}

/* The monthly report: this month's variable figures. */
function readMonthlyReport(wb){
  const normalise = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g,'');
  const aliases = {
    code:['Code','Employee Code'], nameEn:['Name','Employee Name'], si:['S.I. No.','SI','SI Number','S.I. Number'],
    allowances:['Total Allowances (EGP)','Total Allowances','Allowances','Allowances (EGP)'],
    incentive:['Incentive (EGP)','Incentive'], bonus:['Bonus (EGP)','Bonus'],
    adjustments:['Adjustments (EGP)','Adjustments'],
    overtimeHrs:['Overtime (hrs)','Overtime Hours','Overtime Hrs'],
    deductedHrs:['Total Deductions (hrs)','Deducted Hours','Deduction Hours','Deductions (hrs)'],
    advance:['Salary Advance (EGP)','Salary Advance','Advance Loans','Advance','Advance (EGP)']
  };
  let found;
  for(const name of wb.SheetNames){
    const rows=grid(wb.Sheets[name]);
    const head=rows.findIndex(row=>{
      const labels=row.map(normalise);
      return aliases.code.some(v=>labels.includes(normalise(v))) && aliases.nameEn.some(v=>labels.includes(normalise(v)));
    });
    if(head!==-1){found={name,rows,head};break;}
  }
  if(!found) throw new Error('No employee header row found. Upload a monthly or period report with Code and Name columns.');
  const {name,rows,head}=found, labels=rows[head].map(normalise), columns={};
  for(const [key,names] of Object.entries(aliases)){
    columns[key]=labels.findIndex(label=>names.some(n=>normalise(n)===label));
    if(columns[key]===-1) throw new Error('Monthly report is missing column: '+names[0]);
  }
  let period='';
  for(const row of rows.slice(0,head)) for(const value of row){
    const match=String(value).match(/\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}/i);
    if(match) period=match[0];
  }
  const out=[];
  for(const row of rows.slice(head+1)){
    const code=String(row[columns.code] || '').trim();
    if(!isCode(code)) continue;
    const person={code,union:0,medical:0};
    for(const [key,column] of Object.entries(columns)){
      if(key==='code') continue;
      person[key]=['nameEn','si'].includes(key)?String(row[column] || '').trim():num(row[column]);
    }
    out.push(person);
  }
  if(!out.length) throw new Error('No employee rows found in the monthly report.');
  return {people:out,period,sheet:name};
}

/* ---------- putting a month together ---------- */
function build(){
  state.rows = []; state.mismatches = [];
  const mismatch = (source,emp,reason) => state.mismatches.push({source,code:emp.code||'',name:emp.nameEn||'',bank:emp.bank||'',reason});
  const bankCounts = {};
  Object.values(state.master).forEach(emp => {if(emp.bank)bankCounts[emp.bank]=(bankCounts[emp.bank]||0)+1;});
  if(!state.month) return;
  const counts = {}, seen = new Set();
  state.month.people.forEach(emp=>{counts[emp.code]=(counts[emp.code]||0)+1;});
  for(const mv of state.month.people){
    if(seen.has(mv.code))continue;
    seen.add(mv.code);
    const emp = state.master[mv.code];
    if(!emp){mismatch('Monthly report',mv,'Employee code is not in the uploaded employee list');continue;}
    const reasons=[];
    if(counts[mv.code]>1) reasons.push('Duplicate employee code in monthly report');
    if(state.payrollDuplicates.includes(mv.code))reasons.push('Duplicate employee code in employee list');
    if((emp.si || mv.si) && emp.si !== mv.si)reasons.push(`S.I. number differs: employee list ${emp.si || 'missing'}; report ${mv.si || 'missing'}`);
    const clean = value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
    if(emp.nameEn && mv.nameEn && clean(emp.nameEn)!==clean(mv.nameEn))reasons.push('Employee name differs between employee list and monthly report');
    if(!emp.bank)reasons.push('Missing bank account');
    if(bankCounts[emp.bank]>1)reasons.push('Bank account belongs to multiple employees in the list');
    if(reasons.length)mismatch('Employee list / monthly report',emp,reasons.join('; '));
    state.rows.push(Object.assign({emp,mv,transferEligible:reasons.length===0},computeRow(emp,mv)));
  }
  Object.values(state.master).forEach(emp=>{
    if(!seen.has(emp.code))mismatch('Employee list',emp,'Employee is not in the uploaded monthly report');
  });
  state.rows.sort((a,b)=>(a.emp.seq??1e9)-(b.emp.seq??1e9));
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

const WHOLE_COLUMNS = new Set(['Allowances','Incentive','Bonus','Adjustments','Advance Loans','S.I. Basic Wage','S.I. Gross Wage','Net Salary','Paid Salary']);
const payrollNumber = (value, heading) => WHOLE_COLUMNS.has(heading) ? whole(value) : money(value);

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
    PAYROLL_COLS.forEach(([, head, get, kind]) => {
      const v = get(r);
      const td = el('td', kind === 'num' ? 'n' : null, kind === 'num' ? (v ? payrollNumber(v, head) : '–') : v);
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
      fr.appendChild(el('td', 'n', total ? payrollNumber(total, head) : '–'));
    } else fr.appendChild(el('td', null, ''));
  });
  tf.appendChild(fr);
  t.appendChild(tf);

  $('payrollCount').textContent = state.rows.length + ' employees';
}

function transferRows(){
  return state.rows.filter(r=>r.transferEligible).map((r, i) => ({
    serial: String(i + 1).padStart(2, '0'),
    name: r.emp.nameEn,
    bank: r.emp.bank,
    salary: r.paid,
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

function styleExport(ws, rowCount, columnCount, headerRows, centered){
  for(let r=0;r<rowCount;r++) for(let c=0;c<columnCount;c++){
    const address=XLSX.utils.encode_cell({r,c});
    const cell=ws[address] || (ws[address]={t:'s',v:''});
    const header=r<headerRows, total=r===rowCount-1;
    cell.s={
      font:{name:'Arial',sz:11,bold:header || total,color:{rgb:header?'FFFFFF':'1A2233'}},
      alignment:{horizontal:header || centered.includes(c)?'center':cell.t==='n'?'right':'left',vertical:'center',wrapText:header},
      fill:{patternType:'solid',fgColor:{rgb:header?'1F5FA9':total?'DCE8F5':r%2?'F3F6FB':'FFFFFF'}},
      border:{bottom:{style:total?'double':'thin',color:{rgb:'D8DEE8'}}}
    };
  }
  ws['!rows']=Array.from({length:rowCount},(_,r)=>({hpt:18}));
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
  for(let row=2;row<aoa.length;row++) PAYROLL_COLS.forEach((col,index)=>{
    const cell=ws[XLSX.utils.encode_cell({r:row,c:index})];
    if(col[3]==='num' && cell && cell.t==='n')cell.z=WHOLE_COLUMNS.has(col[1])?'#,##0':'#,##0.00';
  });
  styleExport(ws, aoa.length, PAYROLL_COLS.length, 2, [0,1,3,4]);
  ws['!cols'] = PAYROLL_COLS.map((c, i) => ({ wch: i === 1 ? 28 : i === 2 ? 24 : 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
  XLSX.writeFile(wb, `Payroll Sheet - ${monthLabel()}.xlsx`);
  flash('Saved the payroll sheet.');
}

function exportTransfer(){
  const rows = transferRows();
  const aoa = [['Serial','Full Name','Account Number','Salary']];
  for (const r of rows) aoa.push([r.serial, r.name, r.bank, Number(r.salary.toFixed(2))]);
  aoa.push(['', rows.length, 'Total', Number(rows.reduce((s, r) => s + r.salary, 0).toFixed(2))]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  for(let row=1;row<aoa.length;row++){const cell=ws['D'+(row+1)];if(cell && cell.t==='n')cell.z='#,##0';}
  styleExport(ws, aoa.length, 4, 1, [0,1,2]);
  ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 18 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transfer');
  XLSX.writeFile(wb, `Transfer Sheet - ${monthLabel()}.xlsx`);
  flash('Saved the transfer sheet.');
}

/* ---------- screen ---------- */
function refresh(){
  const people=Object.keys(state.master);
  $('masterState').textContent=people.length ? `${people.length} employees loaded for this workspace.` : 'Upload the employee list to start.';
  $('masterTools').hidden=!Object.keys(state.uploads).length;
  $('masterDetail').textContent='Temporary only. All data clears when the workspace is refreshed or closed.';
  for(const [key,id] of [['payroll','masterFileState'],['report','reportState']]){
    const file=state.uploads[key];
    $(id).textContent=file ? `${file.name} — ${file.count} employees` : 'No file uploaded.';
  }
  build();
  const ready=state.rows.length>0;
  $('results').hidden=!ready; $('btnPayroll').disabled=!ready;
  $('btnTransfer').disabled=!transferRows().length;
  if(ready){renderPayroll();renderTransfer();}
  const table=$('tblMismatch');table.replaceChildren();
  const head=el('thead'),hr=el('tr');
  ['Source','Employee code','Employee name','Account','Mismatch — excluded from transfer'].forEach(label=>hr.appendChild(el('th',null,label)));
  head.appendChild(hr);table.appendChild(head);
  const body=el('tbody');
  state.mismatches.forEach(row=>{const tr=el('tr');['source','code','name','bank','reason'].forEach(key=>tr.appendChild(el('td',null,row[key])));body.appendChild(tr);});
  table.appendChild(body);$('mismatchSection').hidden=!state.mismatches.length;
  $('mismatchCount').textContent=state.mismatches.length+' mismatches';
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


  hookDrop('dropMaster','fileMaster',async file=>{
    const parsed=readEmployeeList(await readBook(file));
    if(!parsed.count)throw new Error(`No employees found in ${file.name}`);
    state.master=parsed.found;state.payrollDuplicates=parsed.duplicates;
    state.uploads.payroll={name:file.name,count:parsed.count};refresh();
  });
  hookDrop('dropReport','fileReport',async file=>{
    const parsed=readMonthlyReport(await readBook(file));state.month=parsed;
    state.uploads.report={name:file.name,count:parsed.people.length};refresh();
  });

  $('btnPayroll').addEventListener('click', exportPayroll);
  $('btnTransfer').addEventListener('click', exportTransfer);
  $('btnForget').addEventListener('click',()=>{
    state.master={};state.month=null;state.uploads={};state.payrollDuplicates=[];refresh();flash('Uploaded files cleared.');
  });

  refresh();
}

boot().catch(err => flash('Could not start: ' + err.message));

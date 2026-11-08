/* Landing page: pick a bank, then a form.

   A form entry points at form.html with a preset id. `ready: false` means the blank
   PDF for that form is not in assets/ yet, so it is shown but cannot be opened.

   To add a bank's form: drop its blank PDF and a page-1 preview in assets/, add a
   preset in form-presets.js with the field boxes, and set ready here. */

const BANKS = [
  {
    id:'abk', short:'ABK', name:'Al Ahli Bank of Kuwait – Egypt',
    forms:[
      { id:'transfer',         name:'Bank Transfer',            desc:'Swift or internal transfer' },
      { id:'cheque-egp',       name:'Cheque — EGP',             desc:'Egyptian pounds' },
      { id:'cheque-usd',       name:'Cheque — USD',             desc:'US dollars' },
      { id:'cheque-eur',       name:'Cheque — EUR',             desc:'Euro' },
      { id:'payroll-debit-order',   name:'Payroll Debit Order',      desc:'Staff salaries' },
      { id:'payroll-sheet',         name:'Payroll Transfer Sheet',   desc:'Built from the monthly report' },
      { id:'social-insurance',      name:'Social Insurance Payment', desc:'Insurance contributions' },
      { id:'salary-taxes',          name:'Salary Taxes Payment',     desc:'Payroll tax' },
      { id:'vat-payment',           name:'VAT Payment',              desc:'Value added tax' },
      { id:'withholding-payment',   name:'Withholding Payment',      desc:'Tax withheld at source' },
    ],
  },
  { id:'cib', short:'CIB', name:'Commercial International Bank', forms:[] },
  { id:'nbe', short:'NBE', name:'National Bank of Egypt',        forms:[] },
  { id:'qnb', short:'QNB', name:'QNB Alahli',                    forms:[] },
  { id:'nbk', short:'NBK', name:'National Bank of Kuwait',       forms:[] },
];

const banksEl = document.getElementById('banks');
const formsEl = document.getElementById('forms');
const formsSection = document.getElementById('formsSection');
const formsNote = document.getElementById('formsNote');

function el(tag, cls, text){ const n=document.createElement(tag); if(cls)n.className=cls; if(text!=null)n.textContent=text; return n; }

function showBanks(){
  for(const bank of BANKS){
    const card = el('button','card' + (bank.forms.length ? '' : ' empty'));
    card.type = 'button';
    card.dataset.bank = bank.id;
    card.appendChild(el('span','badge', bank.short));
    card.appendChild(el('span','cardName', bank.name));
    card.appendChild(el('span','cardDesc',
      bank.forms.length ? bank.forms.length + (bank.forms.length===1?' form':' forms') : 'No forms yet'));
    card.addEventListener('click', ()=>selectBank(bank));
    banksEl.appendChild(card);
  }
}

const SEE_README = ' — see the README.';

/* a form is ready when its definition in forms/ says so */
const isReady = f => !!(window.FORM_DEFS[f.id] && window.FORM_DEFS[f.id].ready);

function selectBank(bank){
  [...banksEl.children].forEach(c => c.classList.toggle('on', c.dataset.bank === bank.id));
  formsEl.innerHTML = '';
  formsSection.hidden = false;

  if(!bank.forms.length){
    formsNote.textContent = 'No ' + bank.short + ' forms yet. Each one needs its blank PDF' + SEE_README;
    formsNote.hidden = false;
  } else {
    const waiting = bank.forms.filter(f => !isReady(f));
    formsNote.textContent = !waiting.length ? ''
      : waiting.length === 1
        ? 'One form here needs its blank PDF before it can be added' + SEE_README
        : waiting.length + ' forms here need their blank PDFs before they can be added' + SEE_README;
    formsNote.hidden = !waiting.length;

    for(const f of bank.forms){
      const ready = isReady(f);
      const card = el(ready ? 'a' : 'div', 'card' + (ready ? '' : ' empty'));
      if(ready) card.href = (window.FORM_DEFS[f.id].page) || ('form.html?f=' + encodeURIComponent(f.id));
      else card.title = 'Not available yet';
      card.appendChild(el('span','cardName', f.name));
      card.appendChild(el('span','cardDesc', f.desc));
      // a short tag reads better than repeating the words on every card
      if(!ready) card.appendChild(el('span','pending','Awaiting PDF'));
      formsEl.appendChild(card);
    }
  }
  formsSection.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

setupGate().then(showBanks);

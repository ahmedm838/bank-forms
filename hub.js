/* Landing page: pick a bank, then a form.

   A form entry points at form.html with a preset id. `ready: false` means the blank
   PDF for that form is not in assets/ yet, so it is shown but cannot be opened.

   To add a bank's form: drop its blank PDF and a page-1 preview in assets/, add a
   preset in form-presets.js with the field boxes, and set ready here. */

const BANKS = [
  {
    id:'abk', short:'ABK', name:'Al Ahli Bank of Kuwait – Egypt',
    forms:[
      { id:'transfer',   name:'Bank Transfer', desc:'Swift or internal transfer', ready:true },
      { id:'cheque-egp', name:'Cheque — EGP',  desc:'Egyptian pounds', ready:false },
      { id:'cheque-usd', name:'Cheque — USD',  desc:'US dollars',      ready:false },
      { id:'cheque-eur', name:'Cheque — EUR',  desc:'Euro',            ready:false },
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

const NEEDS_PDF = 'needs the blank PDF before it can be added — see the README.';

function selectBank(bank){
  [...banksEl.children].forEach(c => c.classList.toggle('on', c.dataset.bank === bank.id));
  formsEl.innerHTML = '';
  formsSection.hidden = false;

  if(!bank.forms.length){
    formsNote.textContent = 'No ' + bank.short + ' forms yet. Each one ' + NEEDS_PDF;
    formsNote.hidden = false;
  } else {
    const waiting = bank.forms.filter(f => !f.ready);
    formsNote.textContent = waiting.length
      ? (waiting.length === 1 ? 'One form' : waiting.length + ' forms') + ' here ' + NEEDS_PDF
      : '';
    formsNote.hidden = !waiting.length;

    for(const f of bank.forms){
      const card = el(f.ready ? 'a' : 'div', 'card' + (f.ready ? '' : ' empty'));
      if(f.ready) card.href = 'form.html?f=' + encodeURIComponent(f.id);
      else card.title = 'Not available yet';
      card.appendChild(el('span','cardName', f.name));
      card.appendChild(el('span','cardDesc', f.ready ? f.desc : f.desc + ' — not available yet'));
      formsEl.appendChild(card);
    }
  }
  formsSection.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

setupGate().then(showBanks);

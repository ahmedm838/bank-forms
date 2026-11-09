/* Restore user-exported workbooks without retaining data in browser storage. */
window.ListFiles = (function(){
  const clean = value => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  async function read(file){
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
    const name=wb.SheetNames.find(n=>!['Record data'].includes(n)) || wb.SheetNames[0];
    const grid=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:true});
    return {wb,grid};
  }
  function headerIndex(grid, alternatives){
    return grid.findIndex(row=>row.some(value=>alternatives.includes(clean(value))));
  }
  function column(header, names){return header.findIndex(value=>names.map(clean).includes(clean(value)));}
  const text = value => value == null ? '' : String(value).trim();
  const recordKey = row => JSON.stringify(['date','benName','benAccount','benBank','currency','amount','purpose','issueType'].map(key=>{
    const value=text(row[key]).toLowerCase().replace(/\s+/g,' ');
    return key==='amount' && value && Number.isFinite(Number(value.replace(/,/g,''))) ? String(Number(value.replace(/,/g,''))) : value;
  }));
  async function suppliers(file){
    const {grid}=await read(file);
    const index=headerIndex(grid,['suppliernamearabic','suppliernameenglish','اسمالموردعربي','supplierenglish']);
    if(index<0)throw new Error('Choose an exported Suppliers workbook.');
    const header=grid[index];
    const map={nameAr:['Supplier Name (Arabic)','اسم المورد (عربي)'],nameEn:['Supplier Name (English)','Supplier (English)'],iban:['IBAN'],account:['Account No.','Account Number'],bank:['Bank'],swift:['SWIFT','SWIFT code'],reason:['Reason','سبب التحويل — Reason']};
    const positions=Object.fromEntries(Object.entries(map).map(([key,names])=>[key,column(header,names)]));
    const rows=grid.slice(index+1).map(row=>Object.fromEntries(Object.entries(positions).map(([key,i])=>[key,text(row[i])]))).filter(row=>row.nameAr || row.nameEn);
    return rows.map((row,i)=>({...row,order:i+1}));
  }
  function savedDate(value){
    const string=text(value),match=string.match(/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?$/);
    if(match)return new Date(+match[3],+match[2]-1,+match[1],+(match[4]||0),+(match[5]||0)).toISOString();
    if(!Number.isNaN(Date.parse(string)))return new Date(string).toISOString();
    return new Date().toISOString();
  }
  async function transactions(file){
    const {wb,grid}=await read(file);
    const index=headerIndex(grid,['beneficiary']);
    if(index<0 || column(grid[index],['Amount'])<0 || column(grid[index],['Value date'])<0)throw new Error('Choose an exported Transactions workbook.');
    const metadata=new Map();
    if(wb.Sheets['Record data']){
      for(const row of XLSX.utils.sheet_to_json(wb.Sheets['Record data'],{header:1,raw:true}).slice(1)){
        const record=JSON.parse(row[1]);if(record && typeof record==='object')metadata.set(recordKey(record),record);
      }
    }
    const map={date:'Value date',benName:'Beneficiary',benAccount:'Account / IBAN',benBank:'Bank',benSwift:'SWIFT',currency:'Currency',amount:'Amount',amountWords:'Amount in words',purpose:'Purpose',issueType:'Type',charges:'Charges',debitAccount:'Debit account',debitCurrency:'Debit ccy',commAccount:'Commission account',commCurrency:'Commission ccy',ordName:'Ordering customer',file:'File'};
    const header=grid[index];
    const positions=Object.fromEntries(Object.entries(map).map(([key,name])=>[key,column(header,[name])]));
    return grid.slice(index+1).map((row,i)=>{
      const visible=Object.fromEntries(Object.entries(positions).map(([key,index])=>[key,text(row[index])]));
      const extra=metadata.get(recordKey(visible)) || {};
      const entry={...extra,...visible};
      if(entry.amount && Number.isFinite(Number(entry.amount.replace(/,/g,'')))){
        entry.amount=Number(entry.amount.replace(/,/g,'')).toLocaleString('en-US',{maximumFractionDigits:2});
      }
      entry.id=extra.id || 'tx-import-'+Date.now().toString(36)+'-'+i;
      entry.recordedAt=extra.recordedAt || savedDate(row[column(header,['Saved'])]);
      entry.formId=entry.issueType==='CHQ-EGP'?'cheque-egp':(extra.formId || 'transfer');
      entry.form=entry.formId==='cheque-egp'?'Cheque — EGP':(extra.form || 'Bank Transfer');
      const values={...(extra.values || {})};
      const fields=entry.formId==='cheque-egp'?{date:'date',payTo:'benName',amount:'amount',sumWords:'amountWords'}:
        {date:'date',benName:'benName',benAccount:'benAccount',benBank:'benBank',benBankSwift:'benSwift',currency:'currency',amountFigures:'amount',amountWords:'amountWords',purpose:'purpose',ordName:'ordName',debitAccount:'debitAccount',debitCurrency:'debitCurrency',commAccount:'commAccount',commCurrency:'commCurrency'};
      Object.entries(fields).forEach(([field,key])=>{values[field]=entry[key];});
      entry.values=values;
      if(entry.formId==='transfer')entry.checks={...(extra.checks||{}),issueType:entry.issueType.toLowerCase(),charges:entry.charges};
      return entry;
    }).filter(row=>row.benName || row.amount);
  }
  function hook({button,input,load,apply,error}){
    button.addEventListener('click',()=>input.click());
    input.addEventListener('change',async()=>{
      const file=input.files[0];if(!file)return;
      button.disabled=true;
      try{const rows=await load(file);if(!rows.length)throw new Error('No rows found in that workbook.');apply(rows,file.name);}
      catch(e){error(e.message);}
      finally{button.disabled=false;input.value='';}
    });
  }
  return {suppliers,transactions,hook};
})();

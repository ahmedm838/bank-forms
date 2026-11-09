window.RepoWorkbooks={banks(rows){
 const ws=XLSX.utils.aoa_to_sheet([["#","Bank Name (English)","Acronym","Bank Name (Arabic)","SWIFT Code"],...rows.map(b=>[b.order,b.en,b.acronym||"",b.ar,b.swift])]);
 ws["!cols"]=[{wch:5},{wch:45},{wch:16},{wch:35},{wch:16}];
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Banks");return wb;
},suppliers(rows){
  const aoa = [['#','Supplier Name (Arabic)','Supplier Name (English)','IBAN','Account No.','Bank','SWIFT','Reason']];
  rows.forEach(s => aoa.push([s.order, s.nameAr, s.nameEn, s.iban, s.account, s.bank, s.swift, s.reason]));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:5},{wch:40},{wch:26},{wch:32},{wch:20},{wch:30},{wch:14},{wch:26}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
return wb;},transactions(rows){
  const head = ['Saved','Value date','Beneficiary','Account / IBAN','Bank','SWIFT','Currency','Amount',
                'Amount in words','Purpose','Type','Charges','Debit account','Debit ccy',
                'Commission account','Commission ccy','Ordering customer','File'];
  const aoa = [head];
  for (const r of rows){
    aoa.push([(r.recordedAt ? new Date(r.recordedAt).toLocaleString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',', '') : ''), r.date, r.benName, r.benAccount, r.benBank, r.benSwift,
              r.currency, r.amount, r.amountWords, r.purpose, r.issueType, r.charges,
              r.debitAccount, r.debitCurrency, r.commAccount, r.commCurrency, r.ordName, r.file]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  for(let i=1;i<aoa.length;i++){
    const cell=ws['H'+(i+1)];
    if(cell && String(cell.v).trim()){
      const value=Number(String(cell.v).replace(/,/g,''));
      if(Number.isFinite(value)){cell.t='n';cell.v=value;cell.z='#,##0.00';}
    }
  }
  ws['!cols'] = [{wch:17},{wch:12},{wch:34},{wch:32},{wch:26},{wch:13},{wch:8},{wch:14},
                 {wch:46},{wch:26},{wch:10},{wch:9},{wch:18},{wch:9},{wch:18},{wch:9},{wch:28},{wch:34}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  // Preserve complete forms for reopening, alongside the readable table.
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
    ['Row','Record'],...rows.map((row,i)=>[i+1,JSON.stringify(row)]),
  ]),'Record data');
  wb.Workbook={Sheets:[{Hidden:0},{Hidden:1}]};
return wb;}};

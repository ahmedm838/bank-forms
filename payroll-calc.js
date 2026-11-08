/* Payroll arithmetic for the ABK Payroll Transfer Sheet.

   These are the formulas the company's own Payroll Sheet uses, read out of the
   workbook rather than guessed. Recomputing October 2026 from its monthly report
   reproduced all ten calculated figures for all seventeen employees exactly, and
   the net total matched the issued transfer sheet (430,282).

   Constants come from the workbook's Input sheet and are editable in the page,
   because the insured-salary caps change each year. */
window.PAYROLL = (function(){

const DEFAULTS = {
  annualExemption: 20000,   // Input!B2  Annual personal tax exemption
  empInsRate: 0.11,         // Input!B8  Employee basic insurance rate
  comInsRate: 0.1875,       // Input!B9  Company basic insurance rate
  workingHours: 240,        // Input!B15 Working hours in a month
  martyrsRate: 0.0005,      // 0.05% of gross, صندوق الشهداء
};

const num = v => {
  if (v == null || v === '' || v === '-') return 0;
  const n = parseFloat(String(v).replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
};

/* Law 91/2005 art. 8 as amended by Law 7/2024.

   The band the annual income falls in decides which of the lower brackets apply
   at all — above 600,000 the 0% band is lost, above 700,000 the 10% band goes
   too, and so on — so this is not a plain progressive table with an extra top
   rate. Income is rounded down to the nearest ten pounds first, as the law says. */
function annualTax(taxableYear, k){
  const I = Math.floor(taxableYear / 10) * 10 - k.annualExemption;
  const band = (lo, hi, rate) => Math.max(Math.min(I, hi) - lo, 0) * rate;
  const top  = (lo, rate) => Math.max(I - lo, 0) * rate;

  if (I <= 600000)
    return band(40000,55000,.10) + band(55000,70000,.15) + band(70000,200000,.20)
         + band(200000,400000,.225) + top(400000,.25);
  if (I <= 700000)
    return Math.min(I,55000)*.10 + band(55000,70000,.15) + band(70000,200000,.20)
         + band(200000,400000,.225) + top(400000,.25);
  if (I <= 800000)
    return Math.min(I,70000)*.15 + band(70000,200000,.20)
         + band(200000,400000,.225) + top(400000,.25);
  if (I <= 900000)
    return Math.min(I,200000)*.20 + band(200000,400000,.225) + top(400000,.25);
  if (I <= 1200000)
    return Math.min(I,400000)*.225 + top(400000,.25);
  return Math.min(I,1200000)*.25 + top(1200000,.275);
}

/* `emp` is the standing record (basic salary, insured wages, bank account);
   `mv` is this month's variable figures from the monthly report. */
function computeRow(emp, mv, consts){
  const k = Object.assign({}, DEFAULTS, consts || {});
  const hourly = emp.basic / k.workingHours;

  const additions  = mv.allowances + mv.incentive + mv.bonus + mv.adjustments
                   + hourly * mv.overtimeHrs;
  const deductions = hourly * mv.deductedHrs + mv.union + mv.medical;
  const gross      = emp.basic + additions - deductions;

  const empShare = emp.siBasic * k.empInsRate;
  const comShare = emp.siBasic * k.comInsRate;
  const taxable  = gross - empShare;
  const tax      = annualTax(taxable * 12, k) / 12;
  const martyrs  = k.martyrsRate * gross;
  const net      = Math.ceil(gross - empShare - tax - martyrs);
  const paid     = net - mv.advance;

  return { additions, deductions, gross, empShare, comShare, taxable, tax, martyrs, net, paid };
}

return { DEFAULTS, num, annualTax, computeRow };
})();

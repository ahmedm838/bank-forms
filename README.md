# Bank Forms

## Current workspace behavior

Suppliers and transactions load automatically from data/Suppliers.xlsx and
 data/Transactions.xlsx in the main branch. Save commits the Excel workbook
through GitHub. On the first save per workspace, enter a fine-grained GitHub
access token restricted to this repository with Contents read/write permission.
The token is saved in this browser and reused app-wide, including after refresh. Use GitHub connection to save or forget it; never commit a token. Amount-in-words fields are read-only and follow the figures in the selected English or Arabic language.
The workbooks have the repository's visibility (this repository is public).
Concurrent changes are rejected rather than overwriting a newer workbook.
Export unsaved edits before reloading after a conflict. Transaction workbooks include hidden
form metadata so Edit restores the complete form.

The available 40 commits contain no supplier/transaction workbooks or saved
rows. The previous implementation saved rows only to browser localStorage.
Suppliers.xlsx was replaced with the supplied 25-row workbook. Its Arabic and
English columns map to the supplier fields without changing account identifiers.

Form defaults persist in data/FormDefaults.json and are shared across devices. Banks, payroll uploads and display preferences remain temporary.
No data or credentials are saved in browser storage.

Default values exclude amounts in figures, amounts in words, dropdowns, radio
choices and checkboxes. These always start blank/unselected on a new or cleared
form. Text defaults are saved to GitHub; dates can use Today.

Payroll uploads show filenames and employee counts. Employee mismatches are
listed separately and excluded from the transfer output. The transfer salary is
the payroll Paid Salary value, including salary advances and cents, rather than
Net Salary. Monetary cells in exported payroll, transfer and transaction sheets
remain numeric and use thousands separators. Both payroll export buttons use
the same style.

The Debit Order follows the supplied A4 Payroll Debit Order.docx, including its
updated amount wording and half-inch margins. Its date
reads day/month/year from right to left, with each numeric component kept in its
normal digit order.


Pick a bank, pick a form, fill it, and print the typed values straight into the
bank's own PDF. Arabic and English both work.

The output is the bank's own vector PDF with text drawn on top — not a scan or a
screenshot — so it stays crisp at any size and the branch receives the real form.

**Live:** https://ahmedm838.github.io/bank-forms/

## Using it

Open the live page, or double-click `ABK-Transfer-Request.html` for the offline
single-file version (same app, everything embedded, no internet needed).

The page asks for a password, remembered only while the temporary workspace remains open.

## Which forms exist

| Bank | Forms |
|---|---|
| **ABK** — Al Ahli Bank of Kuwait – Egypt | Bank Transfer · Cheque EGP · Payroll Debit Order · Payroll Transfer Sheet |
| ABK, awaiting their blank PDFs | Cheque USD · Cheque EUR · Social Insurance Payment · Salary Taxes Payment · VAT Payment · Withholding Payment |
| CIB, NBE, QNB, NBK | none yet — the blank PDFs are needed |

**Payroll Debit Order** follows the supplied `Payroll Debit Order.docx` letter
(خصم مرتبات). Its fields follow the document order: amount, amount in words,
account, branch, month, signatory and date. Values flow inside the Arabic
sentences in the same Arial font, with the document's Letter page size and
half-inch margins. Print opens the completed letter; choose Save as PDF in the
print dialog for a PDF with selectable text. Disable browser headers and footers
when printing. Figures and dates print in Arabic-Indic digits. The amount in
words goes in bare because the surrounding currency wording is in the letter.

Account number, branch and signatory are fields. Personal values can be set on
the Default values page, shared across devices.

A cheque is its own ABK form, not the transfer one. Any form whose blank PDF is not
in `assets/` is shown greyed out with an *awaiting PDF* tag, and opening it by URL
refuses rather than rendering the wrong document.

Text size: each form sets the size its printing suits — 20pt for the Payroll Debit
Order, 9pt for the Bank Transfer — and a picker in the header overrides it between
7 and 30pt, kept per form only until the workspace is refreshed or closed. A long value still shrinks to fit whatever is
chosen, down to 5.5pt, so what a field reaches depends on the gap the printed
text leaves it: the figure can only grow until it meets the ( ), and the
signatory until it meets the label. A field may set `pad` to claim more of a
tight gap than the usual 3.5pt margin. A field marked maxLines sits in a blank inside running
text, where a second line would print over the sentence below: it shrinks rather
than wrapping. Such a field also gives `baseline`, the baseline the printed
sentence sits on, so the value stays level with the words either side of it at
any size instead of drifting lower as the type grows. A field in a ruled cell
gives no baseline and is centred in the cell as before.

### Adding a form

1. Put the blank PDF in `assets/`, and a page-1 render in `assets/` for the preview.
2. Work out the field boxes from the PDF's table grid and add them to `FIELDS`.
3. Add a definition in `forms/` (copy the shape of `forms/abk-transfer.js`) and
   list it under its bank in `hub.js`. Nothing in `app.js` needs to change.

> **The password is a doormat, not a lock.** This is a static site: everything it
> holds is sent to the browser, and this repository is public, so the check is
> readable by anyone who looks. It keeps casual visitors out and nothing more. Put
> nothing confidential in the page. For real access control the repository has to be
> private with Pages on a paid GitHub plan, or people use the offline file instead.
> To change the password, replace `PASS_SHA256` in `app.js` with the SHA-256 of the
> new one: `node -e "console.log(require('crypto').createHash('sha256').update('NEW').digest('hex'))"`.

Fill the fields on the left; the preview on the right shows exactly where each value
will land. Then:

- **Print** — stamps the values into the PDF and opens the print dialog.
- **Save PDF…** — opens your file browser so you choose the folder, then writes the
  PDF there. Chrome and Edge remember the folder for next time. Firefox and Safari
  have no folder picker, so the file goes to your downloads folder instead.

## Arabic and English

Any field can be typed in Arabic, English, or a mix. Arabic is shaped and joined
properly, laid out right-to-left, and aligned to the right of its cell; mixed lines
follow the Unicode bidirectional rules, so an English company name inside an Arabic
sentence stays readable.

These fields are **English only**, and Arabic letters typed into them are refused:
date, amount in figures, and all three currency fields. Arabic-Indic digits (`١٢٣`)
are converted to `123` automatically, including the Arabic decimal mark. The amount
in words takes either script.

## Mandatory fields

Print and Save are blocked until these are filled, and anything missing is listed and
highlighted:

Please issue · Date · Currency (32A) · Amount in figures · Beneficiary's name ·
Beneficiary's account no. / IBAN · Beneficiary's bank · Charges (71A) ·
Payment value debited to account no. · Currency · Commission & charges debited to
account no. · Currency · Telephone no. · Purpose of transfer

## What it does for you

- **Amount in words** generated from the figures and the currency. Arabic is the
  default, worded the way Egyptian bank forms do it — فقط … لا غير — with the scale
  words and duals inflected (مئتا ألف, ألفا دولار, أحد عشر ألفاً). *In English* is
  there too. Being the operative wording on a payment instrument, read it before
  you sign.
- **Long text shrinks to fit** its cell instead of overflowing, down to ~6pt.
- Flags a malformed SWIFT/BIC or amount before printing.

No form, list or payroll data is saved in browser storage.

## Notes

- The signature line and the *For Bank's Use only* block are deliberately left blank.
- The currency dropdowns offer EGP, USD and EUR. To add more, extend
  `CURRENCY_CHOICES` and `CURRENCIES` at the top of `app.js`.
- The generated Arabic keeps the currency name uninflected (جنيه مصري), as bank
  forms usually write it. Overtype the field if your branch wants it differently.

## How it is put together

| | |
|---|---|
| `index.html`, `hub.js` | the landing page: bank, then form |
| `form.html`, `app.js`, `styles.css` | the filler, which knows how to draw and nothing about any one form |
| `forms/*.js` | one file per form: its PDF, preview and field boxes |
| `form-registry.js` | picks the form named by `?f=` |
| `gate.js` | the password gate, shared by both pages |
| `assets/transfer-request.pdf` | the blank form |
| `assets/preview.png` | page 1 rendered, for the live preview |
| `assets/IBMPlexSansArabic-Regular.ttf` | the stamping font (OFL, see `assets/IBMPlexSansArabic-OFL.txt`) |
| `vendor/` | pdf-lib, fontkit, bidi-js |
| `build-standalone.mjs` | bundles everything into the one-file offline build |
| `dev-server.mjs` | `node dev-server.mjs` → http://localhost:8755 |

Field boxes were extracted from the PDF's own table grid, so they line up with the
printed rules exactly. To move a field, edit its `box: [x0, y0, x1, y1]` in `app.js`
(PDF points, origin bottom-left) and reload.

Text is **not** drawn with pdf-lib's `drawText`: that ignores the font's GPOS table and
spaces Arabic letters apart so they never join. Instead each line is split into
bidirectional runs with bidi-js, shaped with fontkit, and every glyph is placed
explicitly in the PDF content stream.

### Rebuilding the offline file

```bash
node build-standalone.mjs
```

If the bank ever issues a revised form, replace `assets/transfer-request.pdf`,
re-render page 1 to `assets/preview.png` at scale 1.6, check the field boxes against
the new grid, and rebuild.

### Deploying a change

Push to `main`; GitHub Pages rebuilds in a minute or two. Bump the `?v=` number on
the local scripts in `index.html` and `form.html` whenever one of them changes, or
browsers will keep the old copy. The HTML itself is served with `max-age=600`, so a
visitor who was on the page in the last ten minutes may need a reload to see a
change.

## Payroll Transfer Sheet

Not a bank form to stamp but two spreadsheets to build, so it has a page of its
own (`payroll-sheet.html`). Drop in the month's attendance export and it produces
the payroll sheet and the bank transfer sheet, each exportable as `.xlsx`.

The monthly report carries only what changes each month — allowances, incentive,
bonus, adjustments, overtime, deducted hours, salary advances. Everything standing
(basic salary, insured wages, bank account, Arabic name) is read once from a past
payroll sheet and transfer sheet, uploaded again for each new workspace. People are matched on employee code, and the S.I. number is checked
against it; a disagreement is reported rather than quietly accepted.

### The arithmetic

`payroll-calc.js` holds the formulas, taken from the company workbook rather than
guessed, with the constants from its Input sheet: personal exemption 20,000,
employee insurance 11%, company 18.75%, 240 working hours, martyrs fund 0.05%.

Income tax follows Law 91/2005 art. 8 as amended by Law 7/2024. It is not a plain
progressive table: the band the annual income falls in decides which lower brackets
apply at all, so above 600,000 the 0% band is lost, above 700,000 the 10% band goes
too, and so on. Income is rounded down to the nearest ten pounds first.

Recomputing October 2026 from its monthly report reproduced all ten calculated
figures for all seventeen employees exactly, and the net total matched the issued
transfer sheet (430,282).

Two things worth knowing:

- Both outputs follow the **payroll sheet's own row order**, kept when the employee
  list is read. Salary alone cannot reproduce it, because people on equal salaries
  have a settled order. The issued October transfer sheet differs from its payroll
  sheet in a few places, which looks like hand-sorting.
- The workbook computes overtime as `basic / 240 × hours`, with no 1.5 multiplier,
  although its own notes say "Overtime = Hour Rate × overtime hours × 1.5". This
  follows the formula, not the note. No one had overtime in October, so the two
  have not yet differed in practice.

Nothing is uploaded anywhere: the workbooks are parsed in the page and the employee
list stays only in temporary memory and clears on refresh or close.

## Forms open blank

Amounts and selection fields always start blank or unselected. Text defaults and
dynamic dates can be set for the current workspace. Unsaved form data does not survive refresh or
close. Opening a saved transaction within the workspace restores that record.

## Cheque — EGP

This one prints onto a real cheque, so its output is a blank A4 page carrying the
values and nothing else — printing a picture of a cheque onto a cheque would ruin
it. The definition sets `overlayOnly` for that.

The scan is used on screen only, to show where a value lands, and the copy in
this repository has the cheque serial, the MICR line, the QR code and the account
number painted out. None of those belong in a public repository.

Positions were measured off the scan against a grid in PDF points, with the
cheque lying along the top of an A4 sheet exactly as it was scanned. The on-screen
preview keeps those coordinates; the PDF moves the cheque strip, at its original
size, to the bottom-right corner of an A4 landscape page. Print at actual size
(100%) on A4 landscape paper. The date defaults to today's local date whenever
a blank cheque is opened or cleared, and remains editable. **Print one
on plain paper and hold it against a real cheque before printing on stationery** —
if it sits off, the boxes in `forms/abk-cheque-egp.js` move it.

Field rules, as asked: the date is English digits laid out one to a box
(`cells: 8`), pay-to and the name are Arabic only, the figure is English digits
with thousands separators printed as `#125,400#`, and the sum in words is
generated in Arabic. The Bank Transfer form's figure is wrapped in `#` the same
way, so it cannot be extended after printing.

## Banks and Suppliers

Two list pages, reachable from the bar at the top of every page.

**Banks** holds the Egyptian banks and their SWIFT codes. It ships with a
standard list of 25 — public reference data — which you can edit, reorder and
add to, with *Restore the standard list* to go back.

**Suppliers** holds who gets paid, into which account, and what for. Save commits
Suppliers.xlsx to GitHub; the page automatically loads it when opened.

Edits on either page are held until **Save**: the page marks itself, the Save
button lights, and closing the tab asks first. Nothing reaches the list the
transfer form reads until you say so. **Export** writes the list to `.xlsx` —
a separate backup.

The bank on a supplier is chosen from the Banks list, so the SWIFT code comes
with it, but stays editable because a branch code can differ from the bank's own.

### What the import sorts out

A sheet written by hand names banks however the typist felt that day. The import
matches on the English or Arabic name, on an abbreviation in brackets, on a
containing name, or on the first eight characters of the SWIFT code; 24 of 25
landed on the attached sheet. What it cannot place is kept as written and marked.

It also moves a value out of the IBAN column when it is not an IBAN — several
were plain account numbers — into the account column where it belongs.

The page then reports what needs a person: an account missing altogether, a bank
not on the list, a SWIFT that is not 8 or 11 characters, and a SWIFT whose first
eight characters disagree with the bank chosen, which is how a mistyped letter in
an otherwise well-formed code gets caught.

### Filling the transfer form

Pick a supplier on the Bank Transfer form and it fills the beneficiary name, the
account, the bank, the SWIFT and the purpose. It pays into the IBAN where there
is one and the account number otherwise, and it leaves a SWIFT out rather than
write one the form would reject. Everything it writes stays editable — the
purpose especially, since one supplier is paid for different things.

Saved supplier accounts are included in Suppliers.xlsx in the GitHub repository.

## Defaults on a blank form

A field may name a `def`, the value a blank form opens with: the ordering
customer is *IEnergy Meters Manufacturing* and the telephone *01206037776*, both
mandatory and both yours to change. The date opens on today. These are fresh
defaults, not values kept from last time — changing one goes no further than the
form in front of you.

## Transactions

Every transfer made from the Bank Transfer form is written down. **Save** records
it and makes no PDF; **Print** records it and produces the document.
Alongside the columns on screen the record keeps the whole form, so a transfer
opened again comes back exactly as it was.

**Edit** on a row reopens that transfer on the form, **Delete** removes it; saving overwrites the record
it came from rather than leaving two, keeping when it was first written and
noting when it was changed.

Each heading carries a filter box; they narrow together, and the count and
currency total follow what is shown. Export writes what is shown, so a filter is
also a way to take out one month or one beneficiary — and it carries every field,
not only the columns on screen.

Newest sits on top. Column widths default to about 1280px so they land on an
ordinary laptop; drag the right edge of a heading to change one, double-click it
to put it back, and what you set is remembered.

Rows cannot be edited — a record of a payment should not change after the fact —
but one can be removed, and removals wait for Save like the other lists.

A form opts in with `records: true`; only Bank Transfer does.

## Default values

The Default values page follows Transactions in the navigation. Choose an
available fillable form and set its text defaults. Amounts and selections are excluded.
Save applies changes across forms; Reset this form restores its built-in defaults
when saved. A custom empty value clears a built-in default. Today stays dynamic
for date fields. Defaults apply when opening or clearing a form, remain editable
on that form, and do not overwrite values restored from a saved transaction.
Save writes defaults to data/FormDefaults.json in GitHub, and forms load them when opened on any device. The offline standalone file retains defaults only for its open session.

Payroll Debit Order uses a flowing letter preview and browser printing, rather
than stamping text onto a fixed PDF background. Its reference PDF and preview
were regenerated from the supplied Word document. Other forms retain their
existing PDF stamping and print placement.

## Repository lists

Suppliers and Transactions load their Excel files automatically from GitHub.
The Load file buttons have been removed. Use Add supplier and Save to add rows,
or edit the table and Save to update the repository workbook. Export remains
available for backups. Transaction workbooks retain full form metadata.

The EGP cheque Purpose field is transaction metadata only: it saves to the Purpose column and is excluded from preview and print. Selecting a supplier bank always fills its current SWIFT code, replacing the previous bank code.

EGP cheque PDFs use a 177 × 83 mm landscape page, with the cheque fields mapped into that print area. Select the same custom paper size in the printer and print at Actual size / 100%.
The cheque print overlay is offset 5 mm left from the right-edge alignment, without changing the page or text size.

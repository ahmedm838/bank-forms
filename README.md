# Bank Forms

Pick a bank, pick a form, fill it, and print the typed values straight into the
bank's own PDF. Arabic and English both work.

The output is the bank's own vector PDF with text drawn on top — not a scan or a
screenshot — so it stays crisp at any size and the branch receives the real form.

**Live:** https://ahmedm838.github.io/bank-forms/

## Using it

Open the live page, or double-click `ABK-Transfer-Request.html` for the offline
single-file version (same app, everything embedded, no internet needed).

The page asks for a password, remembered for the rest of the browser session.

## Which forms exist

| Bank | Forms |
|---|---|
| **ABK** — Al Ahli Bank of Kuwait – Egypt | Bank Transfer |
| ABK cheques (EGP, USD, EUR) | listed, not available — waiting on the blank PDF |
| CIB, NBE, QNB, NBK | none yet — the blank PDFs are needed |

A cheque is its own ABK form, not the transfer one. Until its blank PDF is added the
three cheque entries are shown greyed out, and opening one by URL refuses rather
than rendering the wrong document.

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
- **Saved beneficiaries** — *Save* stores the seven beneficiary/bank fields under the
  payee's name; pick them back from the dropdown next time.
- **Your own details** (ordering customer name, ID, address, phone) are remembered
  between sessions and survive *Clear*.
- **Long text shrinks to fit** its cell instead of overflowing, down to ~6pt.
- Flags a malformed SWIFT/BIC or amount before printing.

Saved payees and remembered details live in your browser's local storage, on your
machine only. Nothing is uploaded, and no transfer data leaves the page.

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

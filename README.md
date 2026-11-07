# ABK Transfer Request

Fills the Al Ahli Bank of Kuwait – Egypt *Transfer / Bank Draft Application* and
prints the typed values straight into the original PDF. Arabic and English both work.

The output is the bank's own vector PDF with text drawn on top — not a scan or a
screenshot — so it stays crisp at any size and the branch receives the real form.

## Using it

Open the hosted page, or double-click `ABK-Transfer-Request.html` for the offline
single-file version (same app, everything embedded, no internet needed).

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
date, amount in figures, amount in words, and all three currency fields. Arabic-Indic
digits (`١٢٣`) are converted to `123` automatically, including the Arabic decimal mark.

## Mandatory fields

Print and Save are blocked until these are filled, and anything missing is listed and
highlighted:

Please issue · Date · Currency (32A) · Amount in figures · Beneficiary's name ·
Beneficiary's account no. / IBAN · Beneficiary's bank · Charges (71A) ·
Payment value debited to account no. · Currency · Commission & charges debited to
account no. · Currency · Telephone no. · Purpose of transfer

## What it does for you

- **Amount in words** generated from the figures and currency, in English.
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
- Amount-in-words is generated in English only. Arabic wording can be typed by hand.

## How it is put together

| | |
|---|---|
| `index.html`, `styles.css`, `app.js` | the app |
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

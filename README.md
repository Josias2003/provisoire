# Provisoire Exam Simulator

A web-based practice/exam simulator for the Rwandan provisional driving licence
written test, built from the official question bank PDF (`Provisoire .pdf`).

- **404 questions** extracted directly from the source PDF (text, colors, and
  embedded images), with the correct answer determined from the PDF's own
  red/bold markings — never guessed or "corrected" against outside knowledge.
- 1 question is excluded from auto-selected exams because the source PDF
  itself marks more than one answer as correct (see `extraction/report.json`).
- Signs/photos that are part of a question are preserved as cropped images
  from the original PDF pages, not re-described in text.

## Running it

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL.

## How the question bank was built

`extraction/extract.py` parses `Provisoire .pdf` with `pdfplumber` (text +
per-character color) and `pypdfium2` (page rasterization for cropping sign
images), reconstructs each question/option, and writes:

- `data/questions.json` — the question bank consumed by the app
- `public/images/questions/*.png` — cropped question/option images
- `public/images/pages/*.png` — full-page fallback renders for anything
  flagged for manual review
- `extraction/report.json` — validation report (flagged questions,
  duplicates, image coverage)

Re-run it with `python extraction/extract.py` (requires `pdfplumber`,
`pypdfium2`, `pillow`) if the source PDF ever changes.

## Exam rules implemented

- 20 random questions per session, immediate right/wrong feedback per
  question, no waiting until the end.
- Pass mark: 12/20 (matches the real exam), with a pass/fail banner on the
  results screen.
- Local history (localStorage) tracks per-question accuracy and exam scores,
  powering a "Wrong Questions" practice mode and a transparent Exam Readiness
  score on the dashboard (see `src/lib/history.js` for the formula).

import pdfplumber
import pypdfium2 as pdfium
import re
import json
import collections
import os

PDF_PATH = r"C:\Users\HP\Downloads\Provisoire .pdf"
OUT_QUESTIONS_IMG_DIR = r"D:\Provisoire\public\images\questions"
OUT_PAGES_IMG_DIR = r"D:\Provisoire\public\images\pages"
OUT_JSON = r"D:\Provisoire\data\questions.json"
OUT_REPORT = r"D:\Provisoire\extraction\report.json"

SCALE = 3.0  # raster scale factor relative to PDF points

QUESTION_RE = re.compile(r'^(\d+)\s*\.\s*(.*)$')
# Fallback for the rare case where the source PDF dropped the period after
# the question number entirely (e.g. "225Wegereye..."): digits immediately
# followed by an uppercase letter then a lowercase letter (a real word start).
# This intentionally will NOT match things like "70km/h" (lowercase after digits).
QUESTION_NO_DOT_RE = re.compile(r'^(\d{2,3})([A-ZĂÊÎÔÛĨŨ][a-zăêîôûĩũ].*)$')
# (?<!\w) ensures the letter is not the tail of a normal word (fixes false
# positives like "...vuba." being misread as an "a." option marker).
OPTION_MARK_RE = re.compile(r'(?<!\w)\(?\s?([a-dA-D])\s?[\.\)]\s?')
FOOTER_NOISE = {'RESTRICTED'}


def is_red(color):
    """True for any shade of red used to mark the correct answer
    (the source PDF uses at least two red variants across sections)."""
    if not color or not isinstance(color, (tuple, list)) or len(color) < 3:
        return False
    r, g, b = color[0], color[1], color[2]
    return r > 0.4 and g < 0.35 and b < 0.35


LINE_CLUSTER_TOLERANCE = 4.0  # points; real line spacing in this doc is ~13-14pt


def group_lines(page):
    """Cluster chars into visual lines by top position with a tolerance,
    instead of naive integer rounding. The source PDF occasionally renders
    an option's marker "(a)" a point or two off from its own text's
    baseline, which naive rounding would split into two separate 'lines'
    and silently drop the correct-answer color from the option text."""
    chars = sorted(page.chars, key=lambda c: c['top'])
    clusters = []  # list of {'top': running_top, 'chars': [...]}
    for c in chars:
        if clusters and abs(c['top'] - clusters[-1]['top']) <= LINE_CLUSTER_TOLERANCE:
            clusters[-1]['chars'].append(c)
            # keep the cluster's reference top as the mean of members seen so far
            n = len(clusters[-1]['chars'])
            clusters[-1]['top'] = clusters[-1]['top'] + (c['top'] - clusters[-1]['top']) / n
        else:
            clusters.append({'top': c['top'], 'chars': [c]})
    out = []
    for cl in clusters:
        cs = sorted(cl['chars'], key=lambda c: c['x0'])
        text = ''.join(c['text'] for c in cs)
        out.append({'top': cl['top'], 'text': text, 'chars': cs})
    return out


def is_noise(text, top, page_height):
    t = text.strip()
    if not t:
        return True
    if t in FOOTER_NOISE:
        return True
    if t == 'IKINYARWANDA':
        return True
    # bare page number near top or bottom of page
    if re.fullmatch(r'\d{1,3}', t) and (top < 55 or top > page_height - 60):
        return True
    return False


def red_ratio(chars):
    total = sum(1 for c in chars if c['text'].strip())
    if total == 0:
        return 0.0
    red = sum(1 for c in chars if c['text'].strip() and is_red(c.get('non_stroking_color')))
    return red / total


def split_options_in_line(text, chars):
    """Find all option markers a)/b)/c)/d) (or with parens) within a line,
    returns list of (letter, seg_text, seg_chars, x0)"""
    matches = list(OPTION_MARK_RE.finditer(text))
    segments = []
    if not matches:
        return segments
    for i, m in enumerate(matches):
        letter = m.group(1).lower()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        seg_text = text[start:end]
        seg_chars = chars[start:end]
        # include the marker glyphs themselves ("(a)") in the color check: for
        # image-only options there is no text to carry the red color, only the marker.
        marker_chars = chars[m.start():m.end()]
        x0 = chars[m.start()]['x0'] if chars[m.start():m.start()+1] else 0
        segments.append({'letter': letter, 'text': seg_text, 'chars': marker_chars + seg_chars, 'x0': x0})
    return segments


def is_option_line(text):
    """A line counts as an option line only if it STARTS with a marker
    (after stripping leading space), to avoid false positives mid-sentence."""
    stripped = text.lstrip()
    m = OPTION_MARK_RE.match(stripped)
    return m is not None and m.start() == 0


def main():
    os.makedirs(OUT_QUESTIONS_IMG_DIR, exist_ok=True)
    os.makedirs(OUT_PAGES_IMG_DIR, exist_ok=True)

    questions = []
    cur = None  # current question dict being built
    cur_stage = None  # 'question' or 'options'

    pdf_images_by_page = {}  # page_idx -> list of image bboxes

    review_notes = []

    with pdfplumber.open(PDF_PATH) as pdf:
        num_pages = len(pdf.pages)
        for page_idx in range(num_pages):
            page = pdf.pages[page_idx]
            page_no = page_idx + 1
            lines = group_lines(page)
            pdf_images_by_page[page_no] = [
                {'x0': im['x0'], 'top': im['top'], 'x1': im['x1'], 'bottom': im['bottom']}
                for im in page.images
            ]

            for line in lines:
                text = line['text']
                top = line['top']
                chars = line['chars']

                if is_noise(text, top, page.height):
                    continue

                stripped = text.strip()

                qmatch = QUESTION_RE.match(stripped)
                if not qmatch and not is_option_line(text):
                    qmatch = QUESTION_NO_DOT_RE.match(stripped)
                # A line counts as a new question start only if it doesn't ALSO look
                # like an option marker line (guards against "d) Nta gisubizo..." false match,
                # which QUESTION_RE won't match anyway since it requires only digits before the dot)
                if qmatch:
                    number = qmatch.group(1)
                    rest = qmatch.group(2)
                    if cur is not None:
                        questions.append(cur)
                    cur = {
                        'sourceNumber': number,
                        'page': page_no,
                        'top': top,
                        'text': rest.strip(),
                        'options': [],
                        'questionImages': [],
                    }
                    cur_stage = 'question'
                    continue

                if cur is None:
                    # stray content before question 1 (title etc) - skip
                    continue

                if is_option_line(text):
                    segs = split_options_in_line(text, chars)
                    for seg in segs:
                        rr = red_ratio(seg['chars'])
                        # Low threshold: some options are only partially colored red in the
                        # source (e.g. just the marker + first few words), but red is used
                        # exclusively for correct-answer marking, so any meaningful presence
                        # of it is a reliable signal.
                        cur['options'].append({
                            'letter': seg['letter'],
                            'text': seg['text'].strip(),
                            'correct': rr > 0.15,
                            'top': top,
                            'x0': seg['x0'],
                            'page': page_no,
                        })
                    cur_stage = 'options'
                    continue

                # continuation line: append to question text or last option text
                if cur_stage == 'question' or not cur['options']:
                    cur['text'] = (cur['text'] + ' ' + stripped).strip()
                else:
                    cur['options'][-1]['text'] = (cur['options'][-1]['text'] + ' ' + stripped).strip()

        if cur is not None:
            questions.append(cur)

    # ---- merge orphan numbering-artifact fragments ----
    # The source PDF occasionally has leftover stub lines from a botched
    # renumbering (e.g. "156.", "157.", "158." with no real content sitting
    # right before/after the real question). Any run of consecutive
    # zero-option "questions" is folded into the next question that actually
    # has options; the fragment with the longest text is treated as the real
    # question (its own text/number win if it already reads as complete).
    merged = []
    buffer = []
    excluded_fragments = []
    for q in questions:
        if len(q['options']) == 0:
            buffer.append(q)
            continue
        if buffer:
            candidates = buffer + [q]
            anchor = max(candidates, key=lambda c: len(c['text'].strip()))
            if anchor is not q:
                q['sourceNumber'] = anchor['sourceNumber']
            if anchor['text'].strip().endswith('?') and len(anchor['text'].strip()) > 40:
                q['text'] = anchor['text'].strip()
            else:
                parts = [b['text'].strip() for b in buffer if len(b['text'].strip()) > 5]
                parts.append(q['text'].strip())
                q['text'] = ' '.join(p for p in parts if p)
            q['mergedFragments'] = [b['sourceNumber'] for b in buffer]
            excluded_fragments.extend(b['sourceNumber'] for b in buffer)
            buffer = []
        merged.append(q)
    for b in buffer:
        b['_junk_stub'] = True
        merged.append(b)
    questions = merged

    # assign sequential ids
    for i, q in enumerate(questions, start=1):
        q['id'] = i

    # ---- image assignment (cross-page aware) ----
    # Flatten all images with their page attached, in document order.
    all_images = []
    for page_no, imgs in pdf_images_by_page.items():
        for im in imgs:
            all_images.append({'page': page_no, **im})
    all_images.sort(key=lambda im: (im['page'], im['top'], im['x0']))

    def q_key(q):
        return (q['page'], q['top'])

    for idx, q in enumerate(questions):
        start = q_key(q)
        end = q_key(questions[idx + 1]) if idx + 1 < len(questions) else (10 ** 9, 10 ** 9)
        block_imgs = [im for im in all_images if start <= (im['page'], im['top']) < end]
        if not block_imgs:
            continue
        block_imgs.sort(key=lambda im: (im['page'], round(im['top'] / 10), im['x0']))

        empty_options = [o for o in q['options'] if not o['text'].strip()]

        if len(block_imgs) == len(empty_options) and len(empty_options) > 0:
            # match sorted empty options (by page/top/x0) to images in same order
            empty_sorted = sorted(empty_options, key=lambda o: (o['page'], round(o['top'] / 10), o['x0']))
            for opt, im in zip(empty_sorted, block_imgs):
                opt['_image_bbox'] = im
        elif len(block_imgs) == 1:
            im = block_imgs[0]
            # if the single image aligns closely (vertically, same page) with a single empty option, attach there
            target_opt = None
            for opt in empty_options:
                if opt['page'] == im['page'] and abs(opt['top'] - im['top']) < 15:
                    target_opt = opt
                    break
            if target_opt:
                target_opt['_image_bbox'] = im
            else:
                q['_question_image_bbox'] = im
        else:
            # ambiguous multi-image block that doesn't cleanly map to empty options
            if len(empty_options) == 0:
                # images likely belong to the question stem itself (e.g. diagram + text options)
                q['_question_image_bboxes'] = block_imgs
            else:
                q['_review'] = 'ambiguous_image_mapping'
                q['_question_image_bboxes'] = block_imgs
                review_notes.append({'id': q['id'], 'page': q['page'], 'reason': 'ambiguous_image_mapping',
                                      'n_images': len(block_imgs), 'n_empty_options': len(empty_options)})

    # ---- render pages needed & crop images ----
    pdfium_doc = pdfium.PdfDocument(PDF_PATH)
    rendered_pages_cache = {}

    def get_page_bitmap(page_no):
        if page_no not in rendered_pages_cache:
            page = pdfium_doc[page_no - 1]
            bitmap = page.render(scale=SCALE)
            rendered_pages_cache[page_no] = bitmap.to_pil()
        return rendered_pages_cache[page_no]

    def crop_bbox(bbox):
        pil = get_page_bitmap(bbox['page'])
        box = (int(bbox['x0'] * SCALE) - 4, int(bbox['top'] * SCALE) - 4,
               int(bbox['x1'] * SCALE) + 4, int(bbox['bottom'] * SCALE) + 4)
        box = (max(0, box[0]), max(0, box[1]), min(pil.width, box[2]), min(pil.height, box[3]))
        return pil.crop(box)

    for q in questions:
        if '_question_image_bbox' in q:
            bbox = q['_question_image_bbox']
            crop = crop_bbox(bbox)
            fname = f"q_{q['id']}_stem.png"
            crop.save(os.path.join(OUT_QUESTIONS_IMG_DIR, fname))
            q['image'] = f"/images/questions/{fname}"
            del q['_question_image_bbox']
        elif '_question_image_bboxes' in q:
            fnames = []
            for j, bbox in enumerate(q['_question_image_bboxes']):
                crop = crop_bbox(bbox)
                fname = f"q_{q['id']}_stem_{j}.png"
                crop.save(os.path.join(OUT_QUESTIONS_IMG_DIR, fname))
                fnames.append(f"/images/questions/{fname}")
            q['images'] = fnames
            del q['_question_image_bboxes']

        for opt in q['options']:
            if '_image_bbox' in opt:
                bbox = opt['_image_bbox']
                crop = crop_bbox(bbox)
                fname = f"q_{q['id']}_opt_{opt['letter']}.png"
                crop.save(os.path.join(OUT_QUESTIONS_IMG_DIR, fname))
                opt['image'] = f"/images/questions/{fname}"
                del opt['_image_bbox']

    # ---- drop unrecoverable junk stubs (0 options, no real content) ----
    kept = []
    excluded = []
    for q in questions:
        if q.get('_junk_stub') or (len(q['options']) == 0 and len(q['text'].strip()) < 60):
            excluded.append({'id': q['id'], 'sourceNumber': q['sourceNumber'], 'page': q['page'],
                              'text': q['text'], 'reason': 'no_options_unrecoverable_fragment'})
        else:
            q.pop('_junk_stub', None)
            kept.append(q)
    questions = kept
    for i, q in enumerate(questions, start=1):
        q['id'] = i

    # ---- validation ----
    report = {
        'total_pages': num_pages,
        'total_questions': len(questions),
        'excluded_fragments': excluded,
        'questions_with_image': sum(1 for q in questions if q.get('image') or q.get('images')),
        'questions_with_option_images': sum(1 for q in questions if any(o.get('image') for o in q['options'])),
        'flagged_for_review': [],
    }

    for q in questions:
        issues = []
        n_correct = sum(1 for o in q['options'] if o['correct'])
        if n_correct == 0:
            issues.append('no_correct_marked')
        elif n_correct > 1:
            issues.append('multiple_correct_marked')
        if len(q['options']) != 4:
            issues.append(f"option_count_{len(q['options'])}")
        if not q['text'].strip():
            issues.append('empty_question_text')
        if q.get('_review'):
            issues.append(q['_review'])
        if issues:
            report['flagged_for_review'].append({
                'id': q['id'], 'sourceNumber': q['sourceNumber'], 'page': q['page'], 'issues': issues,
                'text': q['text'][:80]
            })
            # Mark directly on the question so the app can exclude it from
            # random exam pools while still keeping it in the data file
            # (never silently dropped - it's just not auto-selectable).
            q['needsReview'] = True
            q['reviewIssues'] = issues

    # save full-page fallback render for any question flagged for review, or with any image
    flagged_pages = set()
    for q in questions:
        if q.get('needsReview') or q.get('image') or q.get('images') or any(o.get('image') for o in q['options']):
            flagged_pages.add(q['page'])
    for page_no in sorted(flagged_pages):
        pil = get_page_bitmap(page_no)
        fname = f"page_{page_no}.png"
        pil.save(os.path.join(OUT_PAGES_IMG_DIR, fname))

    for q in questions:
        if q.get('needsReview'):
            q['pageImage'] = f"/images/pages/page_{q['page']}.png"

    # duplicate detection (same normalized text + options)
    seen = {}
    dup_report = []
    for q in questions:
        key = re.sub(r'\s+', ' ', q['text'].strip().lower()) + '||' + '|'.join(
            re.sub(r'\s+', ' ', o['text'].strip().lower()) for o in q['options'])
        if key in seen:
            dup_report.append({'id': q['id'], 'duplicate_of': seen[key], 'sourceNumber': q['sourceNumber']})
        else:
            seen[key] = q['id']
    report['duplicates'] = dup_report

    # cleanup internal helper key
    for q in questions:
        q.pop('_review', None)
        q.pop('top', None)
        for o in q['options']:
            o.pop('top', None)
            o.pop('x0', None)
            o.pop('page', None)

    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    with open(OUT_REPORT, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"Extracted {len(questions)} questions from {num_pages} pages")
    print(f"Questions with stem image(s): {report['questions_with_image']}")
    print(f"Questions with option image(s): {report['questions_with_option_images']}")
    print(f"Flagged for review: {len(report['flagged_for_review'])}")
    print(f"Duplicates found: {len(dup_report)}")


if __name__ == '__main__':
    main()

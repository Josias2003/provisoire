import pdfplumber, collections

PDF = r"C:\Users\HP\Downloads\Provisoire .pdf"

def group_lines(page):
    chars = page.chars
    lines = collections.defaultdict(list)
    for c in chars:
        key = round(c['top'], 0)
        lines[key].append(c)
    out = []
    for top in sorted(lines.keys()):
        cs = sorted(lines[top], key=lambda c: c['x0'])
        text = ''.join(c['text'] for c in cs)
        red_chars = sum(1 for c in cs if c.get('non_stroking_color') == (1.0,0.0,0.0) and c['text'].strip())
        total_chars = sum(1 for c in cs if c['text'].strip())
        out.append({'top': top, 'text': text, 'red_ratio': red_chars/total_chars if total_chars else 0})
    return out

with pdfplumber.open(PDF) as pdf:
    p = pdf.pages[0]
    for l in group_lines(p):
        if l['text'].strip():
            print(round(l['top'],1), round(l['red_ratio'],2), repr(l['text']))

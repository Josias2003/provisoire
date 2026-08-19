import pdfplumber

PDF = r"C:\Users\HP\Downloads\Provisoire .pdf"

with pdfplumber.open(PDF) as pdf:
    print("total pages:", len(pdf.pages))
    p = pdf.pages[0]
    print("page0 size", p.width, p.height)
    colors = {}
    for c in p.chars:
        col = c.get('non_stroking_color')
        colors[str(col)] = colors.get(str(col), 0) + 1
    print("page0 colors:", colors)
    print("---sample chars---")
    for c in p.chars[:20]:
        print(c['text'], c.get('non_stroking_color'), c.get('fontname'))
    print("---images on page0---", len(p.images))
    # check a page with a sign image, e.g page index 38 (0-based) ~ page 39 in doc
    p2 = pdf.pages[38]
    print("page39 images:", len(p2.images))
    for im in p2.images[:5]:
        print(im['x0'], im['top'], im['x1'], im['bottom'], im.get('width'), im.get('height'))

import sys, markdown, fitz
src, out = sys.argv[1], sys.argv[2]
html = markdown.markdown(open(src, encoding="utf-8").read(), extensions=["tables", "fenced_code"])
css = """
@font-face {font-family: B; src: url(segoeui.ttf);}
@font-face {font-family: B; src: url(segoeuib.ttf); font-weight: bold;}
@font-face {font-family: M; src: url(consola.ttf);}
* {font-family: B; font-size: 9.5pt; line-height: 1.35;}
h1 {font-size: 20pt; color: #4b2aad;} h2 {font-size: 13pt; color: #4b2aad; margin-top: 12pt;}
table {border-collapse: collapse; width: 100%;} th, td {border: 0.5pt solid #bbb; padding: 3pt; font-size: 8.5pt; vertical-align: top;}
th {background-color: #eee;} pre, code {font-family: M; font-size: 8pt;} pre {background-color: #f4f4f4; padding: 5pt;}
hr {color: #ccc;}
"""
story = fitz.Story(html=html, user_css=css, archive=fitz.Archive("C:/Windows/Fonts"))
w = fitz.DocumentWriter(out)
rect = fitz.paper_rect("a4"); where = rect + (45, 45, -45, -45)
more = True
while more:
    dev = w.begin_page(rect); more, _ = story.place(where); story.draw(dev); w.end_page()
w.close()
print("pages:", len(fitz.open(out)))

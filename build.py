#!/usr/bin/env python3
"""Builds the site from src/.

src/site.css, src/site.js and src/mark.js are shared. src/pages/*.html are
body fragments. Every page gets the same chrome (bar, footer) and the CSS
and scripts inlined, so each output is a single self-contained file:
GitHub Pages serves them flat and the Claude artifact can take index.html
as-is. {{root}} in a fragment or the CSS becomes the path back to the site
root for that page ('' at root, '../../' two levels down).

Pages: home -> index.html (and wonder-robotics.html, the artifact source,
without the document wrapper); valley -> work/valley/index.html;
lrd -> work/little-red-dumplings/index.html.
"""
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "src"

PAGES = {
    "home": {"out": "index.html", "root": "", "title": "Wonder Robotics",
             "desc": "Where Australian business gets into robotics. We scope, design, brand, build and run robot kitchens and service robots, from one building in Fortitude Valley."},
    "valley": {"out": "work/valley/index.html", "root": "../../", "title": "365 St Pauls Terrace, Wonder Robotics",
               "desc": "Our own building in Fortitude Valley: a robot kitchen, a robot bar, a dessert kiosk and a service floor, all running."},
    "lrd": {"out": "work/little-red-dumplings/index.html", "root": "../../", "title": "Little Red Dumplings, Wonder Robotics",
            "desc": "A fully autonomous dumpling kitchen at the Gold Coast Health and Knowledge Precinct, under construction."},
}

FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap">\n'

BAR = '''<header class="bar">
  <div class="wrap grid">
    <a class="mark" href="{{root}}" aria-label="Wonder Robotics home"><canvas data-wonder-mark data-sub="ROBOTICS" data-ink="#131316" data-w="150" data-hr="0.30" width="300" height="45" role="img" aria-label="Wonder Robotics"></canvas></a>
    <div class="clock label"><span class="dot" id="floor-dot" aria-hidden="true"></span>BNE <b id="clock">--:--</b> &nbsp;<span id="floor-state">Floor hours 9 to 7</span></div>
    <nav class="label" aria-label="Sections">
      <a href="{{root}}#process">The process</a><a href="{{root}}#work">Work</a><a href="{{root}}#quote">Quote</a><a href="{{root}}#machines">Machines</a>
    </nav>
    <div class="cta"><a class="btn" href="{{root}}#visit"><span>Book a visit</span><i aria-hidden="true">+</i></a></div>
  </div>
</header>
'''

FOOTER = '''<footer>
  <div class="wrap">
    <canvas class="lock" data-wonder-mark data-sub="ROBOTICS" data-ink="#F3F1E4" data-fit="vw" data-vw="0.92" data-w="1320" data-hr="0.30" role="img" aria-label="Wonder Robotics"></canvas>
    <div class="made label"><span>Made</span><span>in</span><span>Fortitude</span><span>Valley,</span><span>with</span><span>machines</span><span>that</span><span>work.</span></div>
  </div>
</footer>
'''


def page(name, cfg):
    css = (SRC / "site.css").read_text()
    js = (SRC / "site.js").read_text()
    mark = (SRC / "mark.js").read_text()
    body = (SRC / "pages" / f"{name}.html").read_text()
    root = cfg["root"]
    inner = (
        f'<title>{cfg["title"]}</title>\n'
        f'<meta name="description" content="{cfg["desc"]}">\n'
        + FONTS
        + "<style>\n" + css + "</style>\n\n"
        + BAR + "\n" + body + "\n" + FOOTER
        + "\n<script>\n" + mark + "</script>\n<script>\n" + js + "</script>\n"
    ).replace("{{root}}", root)
    doc = (
        "<!doctype html>\n<html lang=\"en-AU\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n"
        "<meta name=\"robots\" content=\"noindex\">\n" + inner + "\n</head>\n</html>\n"
    )
    out = HERE / cfg["out"]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc)
    print(f"{cfg['out']}: {out.stat().st_size} bytes")
    if name == "home":
        (HERE / "wonder-robotics.html").write_text(inner)
        print("wonder-robotics.html (artifact source) refreshed")


for name, cfg in PAGES.items():
    page(name, cfg)

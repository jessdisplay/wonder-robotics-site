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
lrd -> work/little-red-dumplings/index.html. The catalogue (machines/ and
machines/<slug>/) is rendered from src/machines.py, one page per line.
"""
import hashlib
import sys
from html import escape
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "src"
sys.path.insert(0, str(SRC))
from machines import MACHINES, PARTNERS  # noqa: E402

PAGES = {
    "home": {"out": "index.html", "root": "", "title": "Wonder Robotics",
             "desc": "Where Australian business gets into robotics. We scope, design, brand, build and run robot kitchens and service robots, from one building in Fortitude Valley."},
    "valley": {"out": "work/valley/index.html", "root": "../../", "title": "365 St Pauls Terrace, Wonder Robotics",
               "desc": "Our own building in Fortitude Valley: a robot kitchen, a robot bar, a dessert kiosk and a service floor, all running."},
    "lrd": {"out": "work/little-red-dumplings/index.html", "root": "../../", "title": "Little Red Dumpling, Wonder Robotics",
            "desc": "A fully autonomous dumpling kitchen at the Gold Coast Health and Knowledge Precinct, under construction."},
    "container": {"out": "work/container-kitchen/index.html", "root": "../../", "title": "The container kitchen, Wonder Robotics",
                  "desc": "A twenty foot shipping container fitted as a robot kitchen for Eat Street Northshore in Hamilton, with a six-axis arm behind glass and a projector-glass skin that changes its brand by the night."},
    "fallsense": {"out": "work/fall-sense/index.html", "root": "../../", "title": "Fall Sense, Wonder Robotics",
                  "desc": "Florence Fall Sense: a ceiling-mounted edge AI unit for residential aged care that reports the event, never the footage. Brand, enclosure, electronics, firmware and software, all built in Fortitude Valley."},
    "quote": {"out": "quote/index.html", "root": "../", "title": "Get a quote, Wonder Robotics",
              "desc": "Supply, installation and maintenance for robot kitchen equipment, priced from the 2026 Moton Australia list, with Wonder's own rates for install and support."},
    "events": {"out": "events/index.html", "root": "../", "title": "The Robotics and Hardware Club, Wonder Robotics",
               "desc": "The Robotics and Hardware Club: one night a month at 365 St Pauls Terrace for the people building robots and hardware in Queensland. Two talks, the machines running, the bench open."},
}

ICONS = ('<link rel="icon" href="{{root}}favicon-32.png" sizes="32x32">\n'
         '<link rel="icon" href="{{root}}favicon-16.png" sizes="16x16">\n'
         '<link rel="apple-touch-icon" href="{{root}}apple-touch-icon.png">\n'
         '<meta name="theme-color" content="#20103A">\n')

FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap">\n'

BAR = '''<div class="loader" id="loader" aria-hidden="true"><canvas data-wonder-mark data-sub="ROBOTICS" data-ink="#1D1826" data-w="420" data-hr="0.30"></canvas></div>
<header class="bar">
  <div class="wrap grid">
    <a class="mark" href="{{root}}" aria-label="Wonder Robotics home"><canvas data-wonder-mark data-sub="ROBOTICS" data-ink="#131316" data-w="150" data-hr="0.30" width="300" height="45" role="img" aria-label="Wonder Robotics"></canvas></a>
    <div class="clock label"><span class="dot" id="floor-dot" aria-hidden="true"></span>BNE <b id="clock">--:--</b> &nbsp;<span id="floor-state">Floor hours 9 to 7</span></div>
    <nav class="label" aria-label="Sections">
      <a href="{{root}}#disciplines">What we do</a><a href="{{root}}work/valley/">The building</a><a href="{{root}}machines/">Machines</a><a href="{{root}}#work">Case studies</a><a href="{{root}}#quote">Pricing</a><a href="{{root}}events/">The club</a>
    </nav>
    <div class="cta"><a class="btn" href="{{root}}#visit"><span>Come and see it</span><i aria-hidden="true">+</i></a></div>
  </div>
</header>
'''

FOOTER = '''<footer>
  <div class="wrap">
    <nav class="cols" aria-label="Footer">
      <div>
        <span class="label">Machines</span>
        <a href="{{root}}machines/">Every machine we sell</a>
        <a href="{{root}}machines/kitchen-robot/">Robot kitchens</a>
        <a href="{{root}}machines/coffee-robot/">Coffee and bar robots</a>
        <a href="{{root}}machines/ubtech-cadebot/">Service robots</a>
        <a href="{{root}}machines/unitree-g1/">Humanoids and quadrupeds</a>
        <a href="{{root}}machines/custom-automation/">Custom automation</a>
      </div>
      <div>
        <span class="label">Work</span>
        <a href="{{root}}#work">Case studies</a>
        <a href="{{root}}work/valley/">365 St Pauls Terrace</a>
        <a href="{{root}}work/little-red-dumplings/">Little Red Dumpling</a>
        <a href="{{root}}#building">The building</a>
      </div>
      <div>
        <span class="label">Sell and support</span>
        <a href="{{root}}#quote">Build a quote</a>
        <a href="{{root}}quote/">Pricing and rates</a>
        <a href="{{root}}machines/ai-agents/">AI agents</a>
        <a href="{{root}}machines/software/">Software</a>
      </div>
      <div>
        <span class="label">Come in</span>
        <a href="{{root}}#visit">Book a visit</a>
        <a href="{{root}}events/">The Robotics and Hardware Club</a>
        <a href="tel:1800983404">1800 983 404</a>
        <a href="mailto:info@wonderbytech.com">info@wonderbytech.com</a>
        <span class="addr">365 St Pauls Terrace<br>Fortitude Valley QLD 4006</span>
      </div>
    </nav>
    <canvas class="lock" data-wonder-mark data-sub="ROBOTICS" data-ink="#F3F1E4" data-fit="vw" data-vw="0.92" data-w="2200" data-hr="0.30" role="img" aria-label="Wonder Robotics"></canvas>
    <div class="made label"><span>Made</span><span>in</span><span>Fortitude</span><span>Valley,</span><span>with</span><span>machines</span><span>that</span><span>work.</span></div>
  </div>
</footer>
'''

def render(body, cfg, name=None):
    css = (SRC / "site.css").read_text()
    js = (SRC / "site.js").read_text()
    mark = (SRC / "mark.js").read_text()
    root = cfg["root"]
    # hero.js is the one script that is not inlined, so browsers cache it.
    # Its URL carries a hash of its own contents: a change ships, an unchanged
    # file stays cached. Same for the model it loads.
    body = body.replace("{{herov}}", hashlib.sha1((HERE / "hero.js").read_bytes()).hexdigest()[:8])
    inner = (
        f'<title>{cfg["title"]}</title>\n'
        f'<meta name="description" content="{cfg["desc"]}">\n'
        + ICONS
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


# The home row is the breadth argument, so it spans the classes rather than
# stacking the food lines: humanoid, quadruped, service, warehouse, custom, kitchen.
HOME_MACHINES = ["unitree-g1", "unitree-go2", "ubtech-cadebot", "ubtech-cruzr-y1", "custom-automation", "kitchen-robot"]


def page(name, cfg):
    body = (SRC / "pages" / f"{name}.html").read_text()
    if "{{quote}}" in body:
        body = body.replace("{{quote}}", (SRC / "_quote-form.html").read_text())
    if "{{machines}}" in body:
        body = body.replace("{{machines}}", '<ul class="catalogue">' + "".join(
            card(BY_SLUG[slug]) for slug in HOME_MACHINES) + "</ul>")
    render(body, cfg, name)


BY_SLUG = {m["slug"]: m for m in MACHINES}


def fig(src, alt, caption, real, cls="", pos=None):
    who = "Photographed in our building" if real else "Maker's image"
    style = f' style="object-position:{pos}"' if pos else ""
    return (f'<figure class="{cls}"><img src="{{{{root}}}}img/{src}" alt="{escape(alt)}" loading="lazy"{style}>'
            f'<figcaption class="label"><span>{escape(caption)}</span><span>{who}</span></figcaption></figure>\n')


def cards(items, cls="offer"):
    return f'<ol class="{cls}">' + "".join(f'<li><b>{escape(t)}</b><p>{escape(d)}</p></li>' for t, d in items) + "</ol>\n"


def dl(pairs, cls):
    return f'<dl class="{cls}">' + "".join(f"<dt>{escape(k)}</dt><dd>{escape(v)}</dd>" for k, v in pairs) + "</dl>\n"


def card(m):
    return (f'<li><a href="{{{{root}}}}machines/{m["slug"]}/"><div class="ph">{thumb(m)}</div>'
            f'<h3>{escape(m["name"])}</h3><p>{escape(m["line"])}</p>'
            f'<div class="pills">{pillrow(m)}{price_pill(m)}</div></a></li>')


def pills_of(m, price=False):
    # status and price are both "Scoped first" on the service lines; one pill, not two
    out = []
    for x in [m["maker"], m["kind"], m["status"]] + ([m["price"]] if price else []):
        if x and x not in out: out.append(x)
    return out

def pillrow(m):
    return "".join(f'<span class="pill">{escape(x)}</span>' for x in pills_of(m))

def price_pill(m):
    return "" if m["price"] in pills_of(m) else f'<span class="pill price">{escape(m["price"])}</span>'


def thumb(m):
    # the light render gives every tile the same ground, as coffee-tech's cards; the maker's image is the fallback
    src = m.get("light") or m["hero"]
    if src:
        # The plates are portrait and the card is 5:4, so a centred crop takes the
        # head off six of them. thumb_pos is measured per machine, not guessed.
        pos = f' style="object-position:{m["thumb_pos"]}"' if m.get("thumb_pos") else ""
        return f'<img src="{{{{root}}}}img/{src}" alt="{escape(m["name"])}" loading="lazy"{pos}>'
    return f'<span class="glyph">{escape(m["name"])}</span>'


def machine_body(m):
    pills = "".join(f'<span class="pill">{escape(t)}</span>' for t in pills_of(m, price=True))
    if m.get("video"):
        # A moving stage: same markup as the home kitchen loop (poster, muted
        # loop, the still inside as the no-video fallback). Captioned the way
        # the container page captions its generated plates.
        stage = (f'<figure class="stage photo film"><video class="hero-video" autoplay muted loop playsinline preload="metadata" poster="{{{{root}}}}img/{m["video_poster"]}" aria-label="{escape(m["name"])}">'
                 f'<source src="{{{{root}}}}img/{m["video"]}" type="video/mp4"><img src="{{{{root}}}}img/{m["video_poster"]}" alt="{escape(m["name"])}"></video>'
                 f'<figcaption class="label"><span>{escape(m["video_caption"])}</span><span>Concept visualisation</span></figcaption></figure>')
    else:
        stage = f'<div class="stage"><img src="{{{{root}}}}img/{m["stage"]}" alt="{escape(m["name"])}" width="2048" height="2048"></div>' if m.get("stage") else ""
    shot = m.get("light") or m["hero"]
    shot_html = fig(shot, m["name"], m["name"], False, "shot") if shot else ""
    hl = "".join(f'<li><b>{escape(t)}</b><p>{escape(d)}</p></li>' for t, d in m["highlights"])
    dets = m.get("details") or []
    tiles = "".join(
        (f'<li style="background-image:url({{{{root}}}}img/{dets[i]})">' if i < len(dets) else "<li>")
        + f'<b>{escape(t)}</b><p>{escape(d)}</p></li>' for i, (t, d) in enumerate(m["features"]))
    fits = "".join(f'<li><b>{escape(t)}</b><p>{escape(d)}</p></li>' for t, d in m["fits"])
    rel = "".join(f'<a href="{{{{root}}}}machines/{r}/"><div class="ph">{thumb(BY_SLUG[r])}</div><h3>{escape(BY_SLUG[r]["name"])}</h3><div class="pills">{pillrow(BY_SLUG[r])}</div></a>' for r in m["related"])
    specs = "".join(f'<div><b>{escape(k)}</b><span>{escape(v)}</span></div>' for k, v in m["specs"])
    compare = ""
    if m["compare"]:
        title, rows = m["compare"]
        compare = f'<details open><summary>{escape(title)}</summary><div class="machines-wrap compare"><table class="machines"><tbody>' + "".join(
            "<tr>" + "".join(f"<td>{escape(c)}</td>" for c in r) + "</tr>" for r in rows) + "</tbody></table></div></details>"
    faq = "".join(f"<details><summary>{escape(q)}</summary><p>{escape(a)}</p></details>" for q, a in m["faq"])
    floor = ""
    if m["gallery"]:
        floor = f'''
  <section class="rail">
    <div class="wrap">
      <span class="label">[ Maker's images ]</span>
      <div>{"".join(fig(g, m["name"], m["name"], False) for g in m["gallery"])}</div>
    </div>
  </section>
'''
    return f'''<main id="top" class="product">
  <section class="phero">
    <div class="wrap">
      <div class="pills">{pills}</div>
      <h1>{escape(m["name"])}</h1>
      {stage}
    </div>
  </section>

  <section class="pdetail">
    <div class="wrap">
      <span class="label">[ Product details ]</span>
      <h2 class="line">{escape(m["line"])}</h2>
      <div class="pills">{pills}</div>
      <p class="sub">{escape(m["intro"])}</p>
      <div class="actions"><a class="btn cream" href="{{{{root}}}}#quote"><span>Get a price quote</span><i aria-hidden="true">+</i></a><a class="btn ghost cream" href="{{{{root}}}}#visit"><span>Come and see it</span><i aria-hidden="true">+</i></a></div>
    </div>
  </section>

  <section class="pfeatures">
    <div class="wrap">
      {shot_html}
      <ol class="hl">{hl}</ol>
    </div>
  </section>

  <div class="marquee" aria-hidden="true"><div><span>{escape(m["name"])}</span><span>{escape(m["name"])}</span></div></div>

  <section class="ptiles">
    <div class="wrap">
      <h2>What it does</h2>
      <ol class="tiles">{tiles}</ol>
    </div>
  </section>

  <section class="rail">
    <div class="wrap">
      <span class="label">[ Where it fits ]</span>
      <ol class="fits">{fits}</ol>
    </div>
  </section>
{floor}
  <section class="rail">
    <div class="wrap">
      <span class="label">[ Related ]</span>
      <div>
        <h2>Add these to complete the job</h2>
        <div class="related">{rel}</div>
      </div>
    </div>
  </section>

  <section class="rail">
    <div class="wrap">
      <span class="label">[ Specifications ]</span>
      <div class="acc">
        <details open><summary>Published specification</summary><div class="specs">{specs}</div></details>
        {compare}
      </div>
    </div>
  </section>

  <section class="rail">
    <div class="wrap">
      <span class="label">[ Questions ]</span>
      <div class="acc faq">{faq}</div>
    </div>
  </section>

  <section class="rail ask-rail" id="ask">
    <div class="wrap">
      <span class="label">[ Ask about this one ]</span>
      <div>
        <h2>Tell us the job. We come back with a price.</h2>
        <form class="ask" data-product="{escape(m["name"])}" action="mailto:info@wonderbytech.com" method="post" enctype="text/plain">
          <input type="hidden" name="machine" value="{escape(m["name"])}">
          <div class="row">
            <label><span class="label">Name</span><input type="text" name="name" autocomplete="name" required></label>
            <label><span class="label">Email</span><input type="email" name="email" autocomplete="email" required></label>
          </div>
          <div class="row">
            <label><span class="label">Company</span><input type="text" name="company" autocomplete="organization"></label>
            <label><span class="label">Where</span><input type="text" name="where" placeholder="Suburb or city"></label>
          </div>
          <label><span class="label">What should it do?</span><textarea name="job" rows="4" placeholder="The task, the room, the volume. Two lines is plenty."></textarea></label>
          <div class="actions">
            <button class="btn" type="submit"><span>Send it to Gino</span><i aria-hidden="true">+</i></button>
            <a class="btn ghost" href="{{{{root}}}}quote/"><span>Or build the quote yourself</span><i aria-hidden="true">+</i></a>
          </div>
          <p class="hint">Opens in your mail app with the machine and your answers filled in. Or call <a href="tel:1800983404">1800 983 404</a>.</p>
        </form>
      </div>
    </div>
  </section>

  <section class="rail last">
    <div class="wrap">
      <span class="label">[ Every machine ]</span>
      <p class="txt"><a class="link" href="{{{{root}}}}machines/">Back to the catalogue</a></p>
    </div>
  </section>
</main>
'''


def catalogue_body():
    items = "".join(card(m) for m in MACHINES)
    row = "".join(f'<img src="{{{{root}}}}img/partners/{k}" alt="{escape(v)}" loading="lazy">' for k, v in PARTNERS)
    # three copies: one row is narrower than a wide viewport, so two would gap
    logos = f'<div class="track"><div>{row}</div><div aria-hidden="true">{row}</div><div aria-hidden="true">{row}</div></div>'
    facts = [("Makers", "Unitree, UBTECH, Moton, JAKA, Dobot, and whoever makes the right machine for the job"),
             ("Prices", "List, ex GST, delivered within 100 km of an Australian port"),
             ("With every machine", "Installation, programming to your task, staff training, maintenance"),
             ("See them", "Most of the range is on our floor at 365 St Pauls Terrace")]
    return f'''<main id="top">
  <section class="case-head">
    <div class="wrap">
      <div class="grid meta label">
        <span><b>Machines</b> &middot; {len(MACHINES)} lines</span>
        <span>Supplied, installed and maintained from Brisbane</span>
        <span>Any maker</span>
      </div>
      <h1>Every machine we sell.</h1>
      <div class="grid">
        {dl(facts, "facts label")}
        <div class="intro">
          <p>Humanoids and quadrupeds for research, service robots for the floor, coffee, bar and kitchen lines for food, kits for the classroom, and the engineering and software to make any of them do your job.</p>
          <p>Every line comes with us attached: we scope it, program it, install it and keep it running. Pick the machine, then <a class="link" href="{{{{root}}}}#quote">price it</a>.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="story">
    <div class="wrap">
      <ul class="catalogue">{items}</ul>
      <h2>Who we have worked with</h2>
      <div class="partners" aria-label="Who we have worked with">{logos}</div>
    </div>
  </section>
</main>
'''


def catalogue():
    render(catalogue_body(), {"out": "machines/index.html", "root": "../", "title": "Machines, Wonder Robotics",
                              "desc": "Every machine Wonder Robotics sells: Unitree G1 and GO2, UBTECH Cruzr, CadeBot, Cruzr Y1, Yanshee, UGOT and uKit, coffee and kitchen robots, custom automation, AI agents and software. Supplied, installed and maintained from Brisbane."})
    for m in MACHINES:
        render(machine_body(m), {"out": f"machines/{m['slug']}/index.html", "root": "../../",
                                 "title": f"{m['name']}, Wonder Robotics", "desc": escape(m["line"])})


for name, cfg in PAGES.items():
    page(name, cfg)
catalogue()

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
    # The two landing pages are titled for the search, not the catalogue.
    "coffee-landing": {"out": "robot-coffee-machines/index.html", "root": "../", "title": "Robot coffee machines, Brisbane. Wonder Robotics",
                       "desc": "Robot coffee machines supplied, branded, installed and serviced from Brisbane: dual-arm barista bars from $67,000, vending kiosk $74,000, robot bartender $39,000. Seventy seconds a drink, about two square metres, your brand on the machine and the cup. Ours pours at 365 St Pauls Terrace."},
    "kitchen-landing": {"out": "robot-kitchen-fitouts/index.html", "root": "../", "title": "Robot kitchen fit-outs, Brisbane. Wonder Robotics",
                        "desc": "Robot kitchen fit-outs designed and built in Brisbane: concept, drawings, colours, fit-out, commissioning. Frying robot from $42,000, noodle robot from $52,000, a rail cobot serving the whole line. Our own robot kitchen is open six days at 365 St Pauls Terrace."},
    "cocktail-landing": {"out": "robot-cocktail-machines/index.html", "root": "../", "title": "Robot cocktail machines, Brisbane. Wonder Robotics",
                         "desc": "Robot cocktail machines supplied, branded, installed and serviced from Brisbane: the T Standard robot bartender, Dobot arm, ice maker, three syrups, $39,000 list. Ours pours at 365 St Pauls Terrace six days a week."},
    "icecream-landing": {"out": "robot-ice-cream-machines/index.html", "root": "../", "title": "Robot ice cream machines, Brisbane. Wonder Robotics",
                         "desc": "Robot ice cream machines supplied, branded, installed and serviced from Brisbane: the I Pro, a pasteurising soft-serve machine with three syrups, two toppings and a kiosk arm, $41,000 list. Ours is the dessert kiosk at 365 St Pauls Terrace."},
    "book": {"out": "book/index.html", "root": "../", "title": "Book the space, Wonder Robotics",
             "desc": "Book 365 St Pauls Terrace, Fortitude Valley: a demo of the machines for your team, a night in the room, or the floor for a day. 100 standing, 50 seated."},
}

ICONS = ('<link rel="icon" href="{{root}}favicon-32.png" sizes="32x32">\n'
         '<link rel="icon" href="{{root}}favicon-16.png" sizes="16x16">\n'
         '<link rel="apple-touch-icon" href="{{root}}apple-touch-icon.png">\n'
         '<meta name="theme-color" content="#20103A">\n')

FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap">\n'

BAR = '''<div class="loader" id="loader" aria-hidden="true"><canvas data-wonder-mark data-sub="ROBOTICS" data-ink="#1D1826" data-w="420" data-hr="0.30"></canvas></div>
<header class="bar" id="bar">
  <div class="wrap grid">
    <a class="mark" href="{{root}}" aria-label="Wonder Robotics home"><canvas data-wonder-mark data-sub="ROBOTICS" data-ink="#131316" data-w="150" data-hr="0.30" width="300" height="45" role="img" aria-label="Wonder Robotics"></canvas></a>
    <div class="clock label"><span class="dot" id="floor-dot" aria-hidden="true"></span>BNE <b id="clock">--:--</b> &nbsp;<span id="floor-state">Floor hours 9 to 7</span></div>
    <nav class="label" aria-label="Sections">
      <a href="{{root}}#disciplines">What we do</a><a href="{{root}}work/valley/">The building</a><a href="{{root}}machines/">Machines</a><a href="{{root}}#work">Case studies</a><a href="{{root}}#quote">Pricing</a><a href="{{root}}events/">The club</a>
    </nav>
    <div class="cta"><button type="button" class="btn want" id="want" aria-expanded="false" aria-controls="wantpanel"><span>Tell us what to build</span><i aria-hidden="true">+</i></button></div>
  </div>
</header>
  <div class="drop" id="wantpanel">
    <div class="drop-clip">
      <div class="wrap drop-in">
        <div class="drop-say">
          <span class="label">[ Design, build and fit out yours ]</span>
          <h2>What do you want built?</h2>
          <p>Pick as many as you like. Machines, the room they go in, the brand on the cup.</p>
        </div>
        <div class="drop-pick">
          <div class="choices" role="group" aria-label="What to build" id="want-picks">
            <input type="checkbox" id="w-coffee" value="bpro"><label for="w-coffee">Robot coffee machine</label>
            <input type="checkbox" id="w-cocktail" value="bar"><label for="w-cocktail">Robot cocktail machine</label>
            <input type="checkbox" id="w-icecream" value="ice"><label for="w-icecream">Robot ice cream machine</label>
            <input type="checkbox" id="w-kitchen" value="fry"><label for="w-kitchen">Robot kitchen fit-out</label>
            <input type="checkbox" id="w-fitout" value="eng"><label for="w-fitout">Venue design and fit-out</label>
            <input type="checkbox" id="w-brand" value="brand"><label for="w-brand">Branding</label>
            <input type="checkbox" id="w-soft" value="soft"><label for="w-soft">Software</label>
          </div>
          <div class="drop-go">
            <a class="btn" id="want-go" href="{{root}}quote/"><span>Build the quote</span><i aria-hidden="true">+</i></a>
            <a class="btn ghost" id="want-mail" href="{{root}}#eoi"><span>Have us call you</span><i aria-hidden="true">+</i></a>
          </div>
        </div>
      </div>
    </div>
  </div>

'''

EOI = '''<section class="eoi" id="eoi">
  <div class="wrap">
    <div class="eoi-head">
      <span class="label">[ Design, build and fit out yours ]</span>
      <h2>Tell us what you want built. We come back with a plan and a price.</h2>
      <p>Pick what you're interested in. A line about the venue is plenty. Or call <a href="tel:1800983404">1800 983 404</a>.</p>
    </div>
    <form class="ask eoi-form" action="mailto:info@wonderbytech.com" method="post" enctype="text/plain" data-eoi>
      <fieldset class="field">
        <legend class="label">I'm interested in</legend>
        <div class="choices" role="group" aria-label="Products">
          <input type="checkbox" name="coffee" id="eoi-coffee" value="Robot coffee machine"><label for="eoi-coffee">Robot coffee machine</label>
          <input type="checkbox" name="cocktail" id="eoi-cocktail" value="Robot cocktail machine"><label for="eoi-cocktail">Robot cocktail machine</label>
          <input type="checkbox" name="icecream" id="eoi-icecream" value="Robot ice cream machine"><label for="eoi-icecream">Robot ice cream machine</label>
          <input type="checkbox" name="kitchen" id="eoi-kitchen" value="Robot kitchen fit-out"><label for="eoi-kitchen">Robot kitchen fit-out</label>
          <input type="checkbox" name="fitout" id="eoi-fitout" value="Venue design, build and fit-out"><label for="eoi-fitout">Venue design and fit-out</label>
          <input type="checkbox" name="brand" id="eoi-brand" value="Branding"><label for="eoi-brand">Branding</label>
          <input type="checkbox" name="software" id="eoi-software" value="Software"><label for="eoi-software">Software</label>
        </div>
      </fieldset>
      <fieldset class="field">
        <legend class="label">The venue</legend>
        <div class="choices" role="radiogroup" aria-label="Venue">
          <input type="radio" name="venue" id="eoi-new" value="New venue" checked><label for="eoi-new">New venue</label>
          <input type="radio" name="venue" id="eoi-existing" value="Existing venue"><label for="eoi-existing">The venue I have</label>
        </div>
      </fieldset>
      <div class="row">
        <label><span class="label">Name</span><input type="text" name="name" autocomplete="name" required></label>
        <label><span class="label">Email</span><input type="email" name="email" autocomplete="email" required></label>
      </div>
      <div class="row">
        <label><span class="label">Business</span><input type="text" name="company" autocomplete="organization"></label>
        <label><span class="label">Where</span><input type="text" name="where" placeholder="Suburb or city"></label>
      </div>
      <label><span class="label">The job</span><textarea name="job" rows="3" placeholder="The room, the menu, the numbers a day. Two lines is plenty."></textarea></label>
      <div class="actions">
        <button class="btn" type="submit"><span>Send it to Gino</span><i aria-hidden="true">+</i></button>
        <a class="btn ghost" href="{{root}}quote/"><span>Or build the quote yourself</span><i aria-hidden="true">+</i></a>
        <a class="btn ghost" href="{{root}}price-guide.pdf"><span>Price guide, PDF</span><i aria-hidden="true">+</i></a>
      </div>
      <p class="hint">Opens in your mail app with your picks filled in. We reply within a working day.</p>
    </form>
  </div>
</section>
'''

FOOTER = '''<footer>
  <div class="wrap">
    <nav class="cols" aria-label="Footer">
      <div>
        <span class="label">Machines</span>
        <a href="{{root}}machines/">Every machine we sell</a>
        <a href="{{root}}robot-kitchen-fitouts/">Robot kitchen fit-outs</a>
        <a href="{{root}}robot-coffee-machines/">Robot coffee machines</a>
        <a href="{{root}}robot-cocktail-machines/">Robot cocktail machines</a>
        <a href="{{root}}robot-ice-cream-machines/">Robot ice cream machines</a>
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
        <a href="{{root}}book/">Book the space</a>
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
        + BAR + "\n" + body + "\n" + EOI + FOOTER
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
    # A line on the Moton list gets a Buy button that opens the quote with it
    # picked; a scoped line keeps the plain quote link.
    buy = f'<a class="btn cream" href="{{{{root}}}}quote/?pick={m["buy"]}"><span>Buy it, {escape(m["price"].replace("From ", "from "))}</span><i aria-hidden="true">+</i></a>' if m.get("buy") else ""
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
      <div class="actions">{buy}<a class="btn{' ghost' if m.get('buy') else ''} cream" href="{{{{root}}}}quote/{('?pick=' + m['buy']) if m.get('buy') else ''}"><span>Get a price quote</span><i aria-hidden="true">+</i></a><a class="btn ghost cream" href="{{{{root}}}}#visit"><span>Come and see it</span><i aria-hidden="true">+</i></a></div>
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

  <section class="builds" id="offer">
    <div class="wrap">
      <div class="grid head">
        <span class="label">Start here</span>
        <h2>Coffee, cocktails, ice cream, kitchens.</h2>
        <p>The four lines we design, brand, fit out and run. All priced on the page.</p>
      </div>
      <div class="cases">
        <a href="{{{{root}}}}robot-coffee-machines/">
          <div class="ph"><img src="{{{{root}}}}img/offer/coffee-bar-studio.jpg" alt="The dual-arm barista bar on a studio seamless: two silver arms, the Eversys machine, the Jolin milk unit, the dispenser tower, the purple crescent cups" loading="lazy" width="2048" height="1360"></div>
          <h3><span>Robot coffee machines</span><span class="label">From $67,000</span></h3>
          <p>A barista in two square metres, seventy seconds a drink, in your brand.</p>
        </a>
        <a href="{{{{root}}}}robot-cocktail-machines/">
          <div class="ph"><img src="{{{{root}}}}img/offer/robot-bar-studio.jpg" alt="The robot bar from 365 St Pauls Terrace on a studio seamless: the cream curved counter, the red-jointed cobot mid-pour, the rack of inverted bottles above" loading="lazy" width="2048" height="1360"></div>
          <h3><span>Robot cocktail machines</span><span class="label">From $39,000</span></h3>
          <p>The same measure every time, under a rack of your bottles.</p>
        </a>
        <a href="{{{{root}}}}robot-ice-cream-machines/">
          <div class="ph"><img src="{{{{root}}}}img/warm-kiosk.jpg" alt="The dessert kiosk at 365 St Pauls Terrace, the arm handing a soft serve to a boy" loading="lazy" width="1400" height="1737"></div>
          <h3><span>Robot ice cream machines</span><span class="label">From $41,000</span></h3>
          <p>Pasteurised soft serve, an arm that hands it over, a queue that watches.</p>
        </a>
        <a href="{{{{root}}}}robot-kitchen-fitouts/">
          <div class="ph"><img src="{{{{root}}}}img/offer/kitchen-line-studio.jpg" alt="The kitchen line from 365 St Pauls Terrace on a studio seamless: ingredient store, rail cobot, three fryers, two funnels, six noodle baths" loading="lazy" width="2048" height="1360"></div>
          <h3><span>Robot kitchen fit-outs</span><span class="label">Frying robot from $42,000</span></h3>
          <p>A line that fries, boils and plates the whole menu. Ours is open six days.</p>
        </a>
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

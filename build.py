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
import functools
import hashlib
import json
import re
import shutil
import subprocess
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
              "desc": "Price a robot café, bar or kitchen: the equipment installed, the design and build around it, and a 24 month service, as one monthly budget."},
    "events": {"out": "events/index.html", "root": "../", "title": "The Robotics and Hardware Club, Wonder Robotics",
               "desc": "The Robotics and Hardware Club: one night a month at 365 St Pauls Terrace for the people building robots and hardware in Queensland. Two talks, the machines running, the bench open."},
    # The two landing pages are titled for the search, not the catalogue.
    "coffee-landing": {"out": "robot-coffee-machines/index.html", "root": "../", "title": "Robot coffee machines, Brisbane. Wonder Robotics",
                       "desc": "Robot coffee machines supplied, branded, installed and serviced from Brisbane: dual-arm barista bars and a vending format from {{monthly:bstd}} a month over 24 months with install, training, maintenance and support. About two square metres, your brand on the machine and the cup. Ours pours at 365 St Pauls Terrace."},
    "kitchen-landing": {"out": "robot-kitchen-fitouts/index.html", "root": "../", "title": "Robot kitchen fit-outs, Brisbane. Wonder Robotics",
                        "desc": "Robot kitchen fit-outs designed and built in Brisbane: concept, drawings, colours, fit-out, commissioning. Frying and noodle robots from {{monthly:fry}} a month over 24 months with the service, a rail cobot serving the whole line. Our own robot kitchen is open six days at 365 St Pauls Terrace."},
    "cocktail-landing": {"out": "robot-cocktail-machines/index.html", "root": "../", "title": "Robot cocktail machines, Brisbane. Wonder Robotics",
                         "desc": "Robot cocktail machines supplied, branded, installed and serviced from Brisbane: the T Standard robot bartender, Dobot arm, ice maker, three syrups, {{monthly:bar}} a month over 24 months with the service. Ours pours at 365 St Pauls Terrace six days a week."},
    "icecream-landing": {"out": "robot-ice-cream-machines/index.html", "root": "../", "title": "Robot ice cream machines, Brisbane. Wonder Robotics",
                         "desc": "Robot ice cream machines supplied, branded, installed and serviced from Brisbane: the I Pro, a pasteurising soft-serve machine with three syrups, two toppings and a kiosk arm, {{monthly:ice}} a month over 24 months with the service. Ours is the dessert kiosk at 365 St Pauls Terrace."},
    "packages-landing": {"out": "robot-cafe-packages/index.html", "root": "../", "title": "Robot café packages, Brisbane. Wonder Robotics",
                         "desc": "A robot café bought whole: the room, the brand, the website, the robot coffee bar installed, the counter, and 24 months of install, training, maintenance and support, as one monthly budget. Robot coffee bar, robot café and robot container kitchen packages, from Brisbane."},
    "container-landing": {"out": "robot-container-kitchens/index.html", "root": "../", "title": "Robot container kitchens, Brisbane. Wonder Robotics",
                          "desc": "A twenty foot shipping container fitted as a robot kitchen in our Brisbane yard: an arm on a rail over fryers and noodle baths, a serving hatch, extraction, and projector glass on three faces that carries the brand. Sold whole, brand to opening day."},
    "proposal": {"out": "quote/proposal/index.html", "root": "../../", "title": "Proposal, Wonder Robotics",
                 "desc": "A Wonder Robotics proposal: the equipment installed, the design and build, and the 24 month service, as one monthly budget. Save it as a PDF or share the link."},
    "terms": {"out": "terms/index.html", "root": "../", "title": "Terms of sale, Wonder Robotics",
              "desc": "Wonder Robotics terms of sale for robot coffee bars, robot kitchens, service robots, design, fit-out, software, installation and maintenance."},
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
      <a href="{{root}}machines/" id="nav-machines" aria-expanded="false" aria-controls="mega">What we do</a><a href="{{root}}#work">Case studies</a><a href="{{root}}robot-cafe-packages/">Packages</a><a href="{{root}}#building">Experience hub</a>
    </nav>
    <div class="cta"><button type="button" class="btn want" id="want" aria-expanded="false" aria-controls="wantpanel"><span>Build a quote</span><i aria-hidden="true"><b>+</b></i></button></div>
  </div>
</header>
  <div class="mega" id="mega" role="region" aria-label="Machines">
    <div class="mega-clip">
      <div class="wrap mega-in">
        <div class="mega-col big">
          <span class="label">Machines</span>
          <ul>
            <li><a href="{{root}}robot-coffee-machines/">Robot coffee machines</a></li>
            <li><a href="{{root}}robot-cocktail-machines/">Robot cocktail machines</a></li>
            <li><a href="{{root}}robot-ice-cream-machines/">Robot ice cream machines</a></li>
            <li><a href="{{root}}robot-kitchen-fitouts/">Robot kitchens</a></li>
            <li><a href="{{root}}robot-container-kitchens/">Container kitchens</a></li>
            <li><a href="{{root}}robot-cafe-packages/">Robot café packages</a></li>
            <li><a href="{{root}}machines/">Every machine and robot</a></li>
          </ul>
        </div>
        <div class="mega-col">
          <span class="label">Built around them</span>
          <ul>
            <li><a href="{{root}}machines/custom-automation/">Custom automation</a></li>
            <li><a href="{{root}}machines/software/">Software</a></li>
            <li><a href="{{root}}machines/ai-agents/">AI agents</a></li>
            <li><a href="{{root}}machines/#service-robots">Service robots</a></li>
            <li><a href="{{root}}machines/#humanoids">Humanoids and quadrupeds</a></li>
          </ul>
        </div>
        <div class="mega-col">
          <span class="label">Ways in</span>
          <ul>
            <li><a href="{{root}}quote/" data-quote>Build a quote</a></li>
            <li><a href="{{root}}price-guide.pdf">Price guide, PDF</a></li>
            <li><a href="{{root}}#visit">Come and see it</a></li>
            <li><a href="https://wonder.fish/book/">Book the space</a></li>
            <li><a href="{{root}}terms/">Terms of sale</a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  <div class="mega-scrim" id="mega-scrim" aria-hidden="true"></div>
  <div class="qs" id="wantpanel" role="dialog" aria-modal="true" aria-labelledby="qs-title">
    <div class="qs-scrim" id="wantscrim"></div>
    <div class="qs-sheet">
      <div class="qs-top">
        <div class="qs-say">
          <span class="label">[ Build your quote ]</span>
          <h2 id="qs-title">Build your space.</h2>
        </div>
        <button type="button" class="qs-close" id="qs-close" aria-label="Close the quote"><span aria-hidden="true">+</span></button>
      </div>
      <div class="qs-body">
        <div class="qs-pick" id="qs-pick">
          <div class="wz" id="wz" aria-live="polite"></div>
          <div class="qs-browse" id="qs-browse" hidden>
            <div class="qs-browse-top"><button type="button" class="wz-browse" id="qs-guided">Answer a few questions instead</button></div>
          <section class="qs-sec" id="qsec-pkg">
            <h3 class="qs-sec-h"><button type="button" aria-expanded="false" aria-controls="qp-pkg"><span class="t">Or start from a package</span><span class="c" id="qc-n-pkg"></span><span class="chev" aria-hidden="true"></span></button></h3>
            <div class="qs-grid pkgs" id="qp-pkg" hidden></div>
          </section>
          <section class="qs-sec" id="qsec-food">
            <h3 class="qs-sec-h"><button type="button" aria-expanded="true" aria-controls="qp-food"><span class="t"><em>1</em>Choose your machines</span><span class="c" id="qc-n-food"></span><span class="chev" aria-hidden="true"></span></button></h3>
            <div class="qs-grid food" id="qp-food"></div>
          </section>
          <section class="qs-sec" id="qsec-work">
            <h3 class="qs-sec-h"><button type="button" aria-expanded="true" aria-controls="qp-work-wrap"><span class="t"><em>2</em>Design and build it</span><span class="c" id="qc-n-work"></span><span class="chev" aria-hidden="true"></span></button></h3>
            <div id="qp-work-wrap">
              <p class="qs-worknote" id="qs-work-lock">Add a machine first. It is priced from what you choose.</p>
              <div class="qs-grid addons" id="qp-work"></div>
            </div>
          </section>
          <section class="qs-sec" id="qsec-care">
            <h3 class="qs-sec-h"><button type="button" aria-expanded="true" aria-controls="qp-care-wrap"><span class="t"><em>3</em>The service</span><span class="c" id="qc-n-care"></span><span class="chev" aria-hidden="true"></span></button></h3>
            <div id="qp-care-wrap">
              <p class="qs-worknote" id="qs-care-lock">Add a machine first. The service is priced from what you choose.</p>
              <ul class="qs-included" id="qs-included"></ul>
              <p class="qs-sec-sub">Add to the service</p>
              <div class="qs-grid addons" id="qp-care"></div>
            </div>
          </section>
          <section class="qs-sec" id="qsec-robots">
            <h3 class="qs-sec-h"><button type="button" aria-expanded="true" aria-controls="qp-robots"><span class="t"><em>4</em>Add showroom robots</span><span class="c" id="qc-n-robots"></span><span class="chev" aria-hidden="true"></span></button></h3>
            <div class="qs-grid robots" id="qp-robots"></div>
          </section>
          </div>
        </div>
        <aside class="qs-tray" id="qs-tray" aria-label="Your quote">
          <button type="button" class="qs-peek" id="qs-peek" aria-expanded="false" aria-controls="qs-lines">
            <span class="qs-thumbs" id="qs-thumbs" aria-hidden="true"></span>
            <span class="qs-peek-t" id="qs-peek-t">Your quote</span>
          </button>
          <div class="qs-tray-h label">Your quote</div>
          <ul class="qs-lines" id="qs-lines"></ul>
          <div class="qs-sum" aria-live="polite">
            <div class="qs-num" id="dq-total">$0</div>
            <div class="label" id="dq-note">Pick a machine to start</div>
            <div class="qs-pay" id="dq-pay"></div>
          </div>
          <p class="qs-fine">Equipment installed, with a 24 month service. Design and build indicative until we have seen the site. Accessories and showroom robots priced to order. Ex GST.</p>
          <div class="qs-desk" id="qs-desk" hidden></div>
          <button type="button" class="qs-desk-in" id="desk-in">Sales sign in</button>
          <div class="qs-go">
            <a class="btn" id="want-go" href="{{root}}quote/"><span>Open the full quote</span><i aria-hidden="true">+</i></a>
            <a class="btn ghost" id="want-proposal" href="{{root}}quote/proposal/"><span>See it as a proposal</span><i aria-hidden="true">+</i></a>
            <a class="btn ghost" id="want-mail" href="#eoi"><span>Have us call you</span><i aria-hidden="true">+</i></a>
          </div>
        </aside>
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
        <a href="{{root}}robot-cafe-packages/">Robot café packages</a>
        <a href="{{root}}robot-container-kitchens/">Robot container kitchens</a>
        <a href="{{root}}machines/#service-robots">Service robots</a>
        <a href="{{root}}machines/#humanoids">Humanoids and quadrupeds</a>
        <a href="{{root}}machines/#education">Education</a>
        <a href="{{root}}machines/custom-automation/">Custom automation</a>
      </div>
      <div>
        <span class="label">Work</span>
        <a href="{{root}}#work">Case studies</a>
{{footer_projects}}        <a href="{{root}}#building">The building</a>
      </div>
      <div>
        <span class="label">Sell and support</span>
        <a href="{{root}}#quote">Build a quote</a>
        <a href="{{root}}quote/">Pricing and rates</a>
        <a href="{{root}}machines/ai-agents/">AI agents</a>
        <a href="{{root}}machines/software/">Software</a>
        <a href="{{root}}terms/">Terms of sale</a>
      </div>
      <div>
        <span class="label">Come in</span>
        <a href="{{root}}#visit">Book a visit</a>
        <a href="https://wonder.fish/book/">Book the space</a>
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

# The showroom robots in the quote builder come from the catalogue, not a copy
# of it: rename a robot or change its render in machines.py and the quote
# follows. No list prices exist for these, so they carry the catalogue's own
# price line and price as a line "on request".
QUOTE_ROBOTS = ["unitree-g1", "ubtech-cruzr-1s", "ubtech-cadebot", "unitree-go2",
                "ubtech-cruzr-y1", "ubtech-yanshee", "ubtech-ugot", "ubtech-ukit"]


def robots_json():
    by = {m["slug"]: m for m in MACHINES}
    rows = []
    for slug in QUOTE_ROBOTS:
        m = by[slug]
        if not (HERE / "img" / m["light"]).exists():
            sys.exit(f"quote robot {slug}: missing render img/{m['light']}")
        rows.append({"id": slug, "name": m["name"], "kind": m["kind"], "status": m["status"],
                     "note": m["price"], "img": "{{root}}img/" + m["light"],
                     "url": "{{root}}" + (m.get("page") or "machines/" + slug + "/")})
    return json.dumps(rows, ensure_ascii=False).replace("</", "<\\/")


# ---- Prices, written into the pages at build time.
# The price list and its maths live once, in the WonderQuote module in
# src/site.js, because the quote sheet needs them in the browser. The build
# runs that same module in node and writes the numbers into the HTML, so a
# product page carries its price before any script runs (search, ad review,
# link previews) and can never disagree with the quote.
@functools.lru_cache(maxsize=None)
def quote_data():
    if not shutil.which("node"):
        sys.exit("build needs node to price the packages (the price list is JavaScript)")
    src = (SRC / "site.js").read_text().replace("/*{{robots}}*/[]", robots_json())
    start = src.index("window.WonderQuote = (function(){")
    end = src.index("\n})();", start) + len("\n})();")
    script = ("globalThis.window={};" + src[start:end] +
              ";const Q=window.WonderQuote;process.stdout.write(JSON.stringify({"
              "packages:Q.PACKAGES.map(p=>{const c=Q.packageQuote(p);return Object.assign({},p,{quote:c,"
              "parts:Q.parts(c).parts.map(l=>Object.assign({},l,{detail:Q.detailFor(l,c),text:Q.valueText(l),note:Q.valueNote(l)})),"
              "pay:Q.payHtml(c,{ask:'#eoi'}),sums:Q.sumsHtml(c),summary:Q.summaryLine(c)})}),"
              "machines:Q.MACHINES,imgpos:Q.IMG_POS,term:Q.TERM,service:Q.SERVICE,"
              "options:Object.fromEntries(Q.OPTIONS.map(o=>[o.id,o.price])),"
              "after:Object.assign({},Q.AFTER,Object.fromEntries(Q.ROBOTS.filter(r=>r.price).map(r=>[r.id,r.after]))),"
              "monthly:Object.fromEntries(Q.MACHINES.map(m=>[m.id,Q.compute({qty:{[m.id]:1}}).monthly])),"
              "robots:Q.ROBOTS.filter(r=>r.price).map(r=>({id:r.id,price:r.price,alone:r.alone,monthly:Q.compute({qty:{[r.id]:1}}).monthly}))}))")
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit("pricing the packages failed:\n" + out.stderr)
    return json.loads(out.stdout)


def money(n):
    return ("−" if n < 0 else "") + f"${abs(n):,}"


def package(pid):
    for p in quote_data()["packages"]:
        if p["id"] == pid:
            return p
    sys.exit(f"no package {pid}")


def pk_from():
    whole = [p["quote"]["monthly"] for p in quote_data()["packages"] if not p.get("extra")]
    return "From " + money(min(whole)) + " a month"


def pk_price(pid):
    p = package(pid)
    return money(p["quote"]["monthly"]) + " a month" + (" plus the build" if p.get("extra") else "")


def pk_number(pid, line):
    """The monthly budget, set as large as the page allows, and the ask beside it."""
    p = package(pid); q = p["quote"]
    extra = ", plus the container build, priced on scope" if p.get("extra") else ""
    return (f'<section class="pnum"><div class="wrap">'
            f'<span class="label">[ Your monthly budget ]</span>'
            f'<div class="pn-fig">{money(q["monthly"])}</div><span class="pn-extra">a month over {q["term"]} months, ex GST{extra}</span>'
            f'<div class="pn-row"><p>{escape(line)}</p><dl class="pn-sum">{p["sums"]}</dl></div>'
            f'<div class="pn-pay"><span class="label">Ways to pay</span>{p["pay"]}</div>'
            f'<div class="actions"><a class="btn" href="{{{{root}}}}quote/?pkg={pid}" data-quote data-pkg="{pid}"><span>Build this package</span><i aria-hidden="true">+</i></a>'
            f'<a class="btn ghost" href="{{{{root}}}}quote/proposal/?pkg={pid}"><span>The proposal, PDF</span><i aria-hidden="true">+</i></a>'
            f'<a class="btn ghost" href="#eoi"><span>Talk it through</span><i aria-hidden="true">+</i></a></div>'
            f'</div></section>')


# The package product pages: one template, the words and pictures per
# package here, the prices from the price module. Each is a page an ad can
# land on: one product, one price, one ask.
def fig_html(src, alt, caption, credit):
    return (f'      <figure>\n        <img src="{{{{root}}}}{src}" alt="{escape(alt)}" loading="lazy">\n'
            f'        <figcaption class="label"><span>{escape(caption)}</span><span>{escape(credit)}</span></figcaption>\n      </figure>\n')


def pair_html(a, b):
    return '      <div class="pair">\n' + fig_html(*a).replace("      <figure>", "        <figure>") + fig_html(*b).replace("      <figure>", "        <figure>") + "      </div>\n"


PACKAGE_PAGES = {
    "bar": {
        "slug": "robot-coffee-bar-package", "next": ("robot-cafe-package/", "The robot café", "img/coffee/venue-01-bar-in-room.jpg", "A branded robot coffee bar in a venue"),
        "title": "Robot coffee bar package, Brisbane. Wonder Robotics",
        "pills": ["Robot coffee bar package", "Brand to opening day", "24 month service"],
        "h1": "The robot coffee bar.",
        "img": "img/offer/coffee-bar-studio.jpg", "alt": "The dual-arm B Pro robot coffee bar on its counter",
        "caption": "The B Pro bar on its counter", "credit": "Studio render from our photograph",
        "offer": "A barista bar in your brand, fitted into the venue you have, running from day one.",
        "sub": "The dual-arm B Pro installed, the room and the counter it sits in, your brand on the arms and the cup, a website, and 24 months of service: install, training, maintenance and support.",
        "number": "The B Pro installed, the room drawn around it, your brand, the website, the counter, and 24 months of service: install, training, maintenance and support.",
        "story": [("h2", "Your brand on it"), ("p", "The mark on the cup, the colours on the arms, the counter in your timber. Wonder Bean is ours: Sol by day, Luna by night, the same two marks on everything."),
                  ("pair", ("img/coffee/bar-02-front.jpg", "Two robot arms in brand colours on a slatted timber bar", "Branding on the machine", "Concept"),
                           ("img/coffee/wonder-bean-cups.jpg", "Coffee cups carrying the Wonder Bean marks", "The cups", "Brand, designed here")),
                  ("h2", "The website"), ("p", "Designed and built in the same brand, with the menu and ordering on it. This site is one of ours."),
                  ("fig", ("img/offer/website.jpg", "The Wonder Robotics website on a laptop screen and a phone", "A site we designed and built", "Our work"))],
    },
    "cafe": {
        "slug": "robot-cafe-package", "next": ("robot-container-kitchens/", "Robot container kitchens", "img/container/jungle.jpg", "A container kitchen at a night market"),
        "title": "Robot café package, Brisbane. Wonder Robotics",
        "pills": ["Robot café package", "Coffee and soft serve", "24 month service"],
        "h1": "The robot café.",
        "img": "img/coffee/venue-01-bar-in-room.jpg", "alt": "A robot coffee bar in its own brand, in a venue by the street door",
        "caption": "The Wonder Bean bar in the room, by the street door", "credit": "Concept, from the capture",
        "offer": "Coffee and soft serve, the counter, the room and one brand across all of it.",
        "sub": "The B Pro barista bar and the I Pro ice cream robot installed, the room, the brand, the website, the counter, and 24 months of service: install, training, maintenance and support.",
        "number": "Two machines installed, the room drawn around them, one brand across both, the website, the counter, and 24 months of service. The second machine adds half the service of the first.",
        "story": [("h2", "The room"), ("p", "The bar by the street door, the kiosk beside it, the brand on the wall, the bags and the stools. Drawn from the room it goes in."),
                  ("pair", ("img/coffee/venue-02-entry.jpg", "The café seen from the street door", "From the door", "Concept, from the capture"),
                           ("img/coffee/brand-01-family.jpg", "The Wonder Bean pack family in amber and night purple", "Sol and Luna, the pack family", "Brand, designed here")),
                  ("h2", "The soft serve"), ("p", "The I Pro on our own floor: a pasteurising machine and an arm that hands the cone over."),
                  ("fig", ("img/tile-kiosk.jpg", "The soft serve machine with a robot arm holding a cone", "The dessert kiosk, 365 St Pauls Terrace", "Photographed in our building"))],
    },
}

NUMBER_LINES = {"box": "The frying and noodle robots installed, your brand, the website, and 24 months of service. The container itself is built in our yard and priced on scope."}


def package_page(pid):
    d = PACKAGE_PAGES[pid]
    body = (SRC / "pages" / "_package.html").read_text()
    story = ""
    for kind, *v in d["story"]:
        if kind == "h2":
            story += f"      <h2>{escape(v[0])}</h2>\n"
        elif kind == "p":
            story += f'      <div class="txt"><p>{escape(v[0])}</p></div>\n'
        elif kind == "fig":
            story += fig_html(*v[0])
        elif kind == "pair":
            story += pair_html(v[0], v[1])
    story = story.replace("<h2>", '<h2 class="plain">', 1)
    fills = {
        "{{pk_pills}}": "".join(f'<span class="pill">{escape(x)}</span>' for x in d["pills"]),
        "{{pk_price}}": pk_price(pid), "{{pk_h1}}": escape(d["h1"]),
        "{{pk_img}}": "{{root}}" + d["img"], "{{pk_alt}}": escape(d["alt"]),
        "{{pk_caption}}": escape(d["caption"]), "{{pk_credit}}": escape(d["credit"]),
        "{{pk_offer}}": escape(d["offer"]), "{{pk_sub}}": escape(d["sub"]),
        "{{pknum}}": pk_number(pid, d["number"]), "{{pktable}}": pk_spreads(pid),
        "{{pk_story}}": story,
    }
    for k, v in fills.items():
        body = body.replace(k, v)
    return body


def pk_spreads(pid):
    """Each part of a package as its own spread: the name set large with its
    stage and price, a large picture, what it is, and what you get. The words
    come from the price module, the same ones the quote page and proposal use."""
    p = package(pid); q = p["quote"]; pos_of = quote_data()["imgpos"]
    out = []
    for i, line in enumerate(p["parts"], 1):
        d = line["detail"]
        img = line["img"].replace("{{root}}", "")
        pos = next((v for k, v in pos_of.items() if k in img), "50% 50%")
        name = (f'{line["n"]} × ' if line.get("n", 1) > 1 else "") + (f'{line["name"]}, {line["model"]}' if line["kind"] == "machine" else line["label"])
        gets = "".join(f"<li>{escape(g)}</li>" for g in d.get("gets", []))
        facts = "".join(f"<dt>{escape(a)}</dt><dd>{escape(b)}</dd>" for a, b in d.get("facts", []))
        cols = (f'<div class="inc-cols"><div><span class="label">What you get</span><ul class="inc-gets">{gets}</ul></div>'
                f'<dl class="inc-facts">{facts}</dl></div>') if gets or facts else ""
        ask = " ask" if line["value"] is None else ""
        out.append(
            f'<article class="inc{" flip" if i % 2 == 0 else ""}">'
            f'<div class="inc-h"><span class="inc-i">({i:02d})</span><span class="inc-stage">{escape(d["stage"])}</span>'
            f'<h3>{escape(name)}</h3><div class="inc-price{ask}">{escape(line["text"])}<small>{escape(line["note"])}</small></div></div>'
            f'<figure class="inc-ph"><img src="{{{{root}}}}{img}" alt="" loading="lazy" style="object-position:{pos}"></figure>'
            f'<div class="inc-b"><p class="inc-lead">{escape(d["lead"])}</p>{cols}</div>'
            f'</article>')
    count = len(out)
    words = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"]
    head = f"{words[count] if count < len(words) else count} parts. One monthly budget."
    return (f'<section class="incs"><div class="wrap">'
            f'<div class="incs-h"><span class="label">[ Everything in it ]</span><h2>{head}</h2></div>'
            + "".join(out) +
            f'<div class="inc-sum"><dl>{p["sums"]}</dl>'
            f'<div class="inc-total"><span class="label">Your monthly budget, ex GST{", plus the container build" if p.get("extra") else ""}</span><span class="inc-fig">{money(q["monthly"])}</span></div>'
            f'<div class="actions"><a class="btn" href="{{{{root}}}}quote/?pkg={pid}" data-quote data-pkg="{pid}"><span>Build this package</span><i aria-hidden="true">+</i></a>'
            f'<a class="btn ghost" href="#eoi"><span>Talk it through</span><i aria-hidden="true">+</i></a></div>'
            f'</div></div></section>')


def pk_tiles():
    """The packages index: each package as a large tile that leads to its page."""
    out = []
    for i, p in enumerate(quote_data()["packages"], 1):
        q = p["quote"]
        out.append(
            f'<a class="pkt" href="{p.get("url") or "#"}">'
            f'<figure class="pkt-ph"><img src="{p["img"]}" alt="{escape(p["alt"])}" loading="lazy"></figure>'
            f'<div class="pkt-b"><span class="inc-i">({i:02d})</span><h2>{escape(p["name"])}</h2><p>{escape(p["line"])}</p>'
            f'<div class="pkt-price"><span class="pkt-fig">{money(q["monthly"])}</span>'
            f'<span class="label">A month over {q["term"]} months{", plus the container build" if p.get("extra") else ""}. {len(p["parts"])} parts</span></div>'
            f'<span class="pkt-go">See the package</span></div></a>')
    return '<div class="pkts">' + "".join(out) + "</div>"


# Prices in page copy are tokens, so a price changed in the engine changes
# every sentence that quotes it:
#   {{installed:bpro}}  {{installedfrom:bpro,bstd,eff}}  {{monthly:bpro}}
#   {{monthly:fry+noo}} (the two together, one service)  {{opt:identity}}
#   {{service:first}}  {{service:extra}}  {{service:robot}}
#   {{after:first}}  {{after:extra}}  {{after:hourly}}  {{after:ubtech-cadebot}}
PRICE_TOKEN = re.compile(r"\{\{(installed|installedfrom|monthly|opt|service|after):([a-z0-9,+\-]+)\}\}")


def price_token(m):
    kind, arg = m.group(1), m.group(2)
    d = quote_data()
    price = {x["id"]: x["price"] for x in d["machines"]}
    price.update({r["id"]: r["price"] for r in d["robots"]})
    try:
        if kind == "installed":
            return money(price[arg])
        if kind == "installedfrom":
            return money(min(price[i] for i in arg.split(",")))
        if kind == "opt":
            return money(d["options"][arg])
        if kind == "service":
            return money(d["service"][arg])
        if kind == "after":
            return money(d["after"][arg])
        ids = arg.split("+")
        if len(ids) == 1:
            return money(d["monthly"].get(arg) or next(r["monthly"] for r in d["robots"] if r["id"] == arg))
        count = len(ids)
        return money(round(sum(price[i] for i in ids) / d["term"] + d["service"]["first"] + d["service"]["extra"] * (count - 1)))
    except (KeyError, StopIteration):
        sys.exit(f"unknown price token {m.group(0)}")


def fill_prices(body):
    body = PRICE_TOKEN.sub(price_token, body)
    body = body.replace("{{pkfrom}}", pk_from())
    body = body.replace("{{packages}}", pk_tiles())
    for pid in [p["id"] for p in quote_data()["packages"]]:
        if "{{pknum:" + pid + "}}" in body:
            body = body.replace("{{pknum:" + pid + "}}", pk_number(pid, NUMBER_LINES[pid]))
        body = body.replace("{{pkprice:" + pid + "}}", pk_price(pid))
        body = body.replace("{{pktable:" + pid + "}}", pk_spreads(pid))
    return body


# Where the site is served. Link previews, the canonical address and the
# product data need absolute URLs; change this one line when the site moves
# to its own domain.
SITE = "https://jessdisplay.github.io/wonder-robotics-site/"

# What each product page offers, for search and ads to read. Machine pages
# offer their machines at list; a package page offers the package. The
# container page has no complete price yet, so it offers nothing.
PRODUCT_OFFERS = {
    "coffee-landing": ("Robot coffee machines", ["bpro", "bstd", "eff"], "img/offer/coffee-bar-studio.jpg"),
    "cocktail-landing": ("Robot cocktail machine, T Standard", ["bar"], "img/offer/robot-bar-studio.jpg"),
    "icecream-landing": ("Robot ice cream machine, I Pro", ["ice"], "img/tile-kiosk.jpg"),
    "kitchen-landing": ("Robot kitchen line", ["fry", "noo"], "img/offer/kitchen-line-studio.jpg"),
}
OG_IMAGES = {"packages-landing": "img/coffee/venue-01-bar-in-room.jpg", "container-landing": "img/container/jungle.jpg",
             "home": "img/hero-bot-wide.jpg", "valley": "img/hero-kitchen.jpg", "lrd": "img/lrd/room.jpg",
             "container": "img/container/arm.jpg", "fallsense": "img/fallsense/unit.jpg"}


def attr(t):
    return escape(t, quote=True)


def product_ld(name, desc, url, image, prices):
    org = {"@type": "Organization", "name": "Wonder Robotics", "url": SITE, "telephone": "+61 1800 983 404",
           "address": {"@type": "PostalAddress", "streetAddress": "365 St Pauls Terrace", "addressLocality": "Fortitude Valley",
                       "addressRegion": "QLD", "postalCode": "4006", "addressCountry": "AU"}}
    tax = {"@type": "PriceSpecification", "priceCurrency": "AUD", "valueAddedTaxIncluded": False}
    if len(prices) == 1:
        offers = {"@type": "Offer", "price": prices[0], "priceCurrency": "AUD", "priceSpecification": dict(tax, price=prices[0]),
                  "availability": "https://schema.org/PreOrder", "url": url, "seller": org}
    else:
        offers = {"@type": "AggregateOffer", "lowPrice": min(prices), "highPrice": max(prices), "offerCount": len(prices),
                  "priceCurrency": "AUD", "availability": "https://schema.org/PreOrder", "url": url, "seller": org}
    ld = {"@context": "https://schema.org", "@type": "Product", "name": name, "description": desc, "image": [image],
          "brand": {"@type": "Brand", "name": "Wonder Robotics"}, "offers": offers}
    return '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace("</", "<\\/") + "</script>\n"


def head_tags(cfg, name):
    url = SITE + cfg["out"].removesuffix("index.html")
    img = cfg.get("og") or OG_IMAGES.get(name) or (PRODUCT_OFFERS[name][2] if name in PRODUCT_OFFERS else "img/hero-bot-wide.jpg")
    title = cfg["title"]; desc = cfg["desc"]
    tags = (f'<link rel="canonical" href="{url}">\n'
            f'<meta property="og:type" content="{"product" if cfg.get("ld") or name in PRODUCT_OFFERS else "website"}">\n'
            f'<meta property="og:site_name" content="Wonder Robotics">\n'
            f'<meta property="og:title" content="{attr(title)}">\n<meta property="og:description" content="{attr(desc)}">\n'
            f'<meta property="og:url" content="{url}">\n<meta property="og:image" content="{SITE + img}">\n'
            f'<meta property="og:locale" content="en_AU">\n<meta name="twitter:card" content="summary_large_image">\n')
    if name in PRODUCT_OFFERS:
        pname, ids, _ = PRODUCT_OFFERS[name]
        prices = [m["price"] for m in quote_data()["machines"] if m["id"] in ids]
        tags += product_ld(pname, desc, url, SITE + img, prices)
    if cfg.get("ld"):
        tags += cfg["ld"](url, SITE + img)
    return tags


def render(body, cfg, name=None):
    body = fill_prices(body)
    cfg = dict(cfg, desc=PRICE_TOKEN.sub(price_token, cfg["desc"]))
    css = (SRC / "site.css").read_text()
    js = (SRC / "site.js").read_text()
    mark = (SRC / "mark.js").read_text()
    root = cfg["root"]
    # hero.js is the one script that is not inlined, so browsers cache it.
    # Its URL carries a hash of its own contents: a change ships, an unchanged
    # file stays cached. Same for the model it loads.
    body = body.replace("{{herov}}", hashlib.sha1((HERE / "hero.js").read_bytes()).hexdigest()[:8])
    js = js.replace("/*{{robots}}*/[]", robots_json())
    inner = (
        f'<title>{cfg["title"]}</title>\n'
        f'<meta name="description" content="{attr(cfg["desc"])}">\n'
        + head_tags(cfg, name)
        + ICONS
        + FONTS
        + "<style>\n" + css + "</style>\n\n"
        + BAR + "\n" + body + "\n" + EOI + FOOTER
        + "\n<script>\n" + mark + "</script>\n<script>\n" + js + "</script>\n"
    ).replace("{{footer_projects}}", "".join(
        f'        <a href="{{{{root}}}}{href}">{escape(title.split(", ")[0])}</a>\n' for _, href, title, _, _ in PROJECTS)
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


# The projects, in the order the home page shows them. Each project page's
# "Next" goes to the one after it and the last goes back to the first, so the
# chain is a ring that reaches every project; the footer's Work column lists
# them from the same list. Before this, two pages pointed at each other and
# the container kitchen and Fall Sense could not be reached from either.
PROJECTS = [
    ("valley", "work/valley/", "365 St Pauls Terrace, Fortitude Valley", "img/hero-kitchen.jpg", "The kitchen line at 365 St Pauls Terrace"),
    ("lrd", "work/little-red-dumplings/", "Little Red Dumpling, Gold Coast", "img/lrd/room.jpg", "Visualisation of the finished Little Red Dumpling cafe"),
    ("container", "work/container-kitchen/", "The container kitchen, Eat Street Northshore", "img/container/arm.jpg", "The arm behind glass in the container kitchen"),
    ("fallsense", "work/fall-sense/", "Fall Sense, Florence", "img/fallsense/unit.jpg", "The Fall Sense unit in the ceiling"),
]


# Pages outside the project ring say where they lead on to.
NEXT = {
    "packages-landing": ("robot-container-kitchens/", "Robot container kitchens", "img/container/jungle.jpg", "A container kitchen at a night market, its glass skin live"),
    "container-landing": ("robot-cafe-packages/", "Robot café packages", "img/coffee/venue-01-bar-in-room.jpg", "A branded robot coffee bar in a venue"),
}


def next_block(name):
    keys = [p[0] for p in PROJECTS]
    if name in NEXT:
        href, title, img, alt = NEXT[name]
    else:
        _, href, title, img, alt = PROJECTS[(keys.index(name) + 1) % len(PROJECTS)]
    return (f'<section class="next">\n    <div class="wrap">\n      <a href="{{{{root}}}}{href}">\n'
            f'        <div><span class="label">Next</span><h2>{escape(title)}</h2></div>\n'
            f'        <div class="ph"><img src="{{{{root}}}}{img}" alt="{escape(alt)}" loading="lazy"></div>\n'
            f'      </a>\n    </div>\n  </section>')


# The home row is the breadth argument, so it spans the classes rather than
# stacking the food lines: humanoid, quadruped, service, warehouse, custom, kitchen.
HOME_MACHINES = ["ubtech-cadebot", "ubtech-cruzr-1s", "unitree-g1", "unitree-go2", "custom-automation"]
# The home catalogue is one grid of large tiles (Jesse, 18 Sep: "combined, large size, a
# subtle animation"): the four food lines and the container first, on their landing pages,
# then the robots from the catalogue. A tile with a clip plays it; the rest drift slowly.
HOME_LINES = [
    ("robot-coffee-machines/", "img/offer/coffee-bar-studio.jpg", "The dual-arm barista bar on a studio seamless", "Robot coffee machines",
     "A barista in two square metres, in your brand.", "From {{monthly:bstd}} a month", "img/machines/coffee-robot-stage.mp4", None),
    ("robot-cocktail-machines/", "img/offer/robot-bar-studio.jpg", "The robot bar from 365 St Pauls Terrace on a studio seamless", "Robot cocktail machines",
     "The same measure every time, under a rack of your bottles.", "{{monthly:bar}} a month", None, None),
    ("robot-ice-cream-machines/", "img/warm-kiosk.jpg", "The dessert kiosk at 365 St Pauls Terrace, the arm handing a soft serve to a boy", "Robot ice cream machines",
     "Pasteurised soft serve, an arm that hands it over, a queue that watches.", "{{monthly:ice}} a month", None, "50% 10%"),
    ("robot-kitchen-fitouts/", "img/offer/kitchen-line-studio.jpg", "The kitchen line from 365 St Pauls Terrace on a studio seamless", "Robot kitchen fit-outs",
     "A line that fries, boils and plates the whole menu. Ours is open six days.", "Frying robot, {{monthly:fry}} a month", None, None),
    ("robot-container-kitchens/", "img/container/day.jpg", "The container kitchen by day, its video panel skin running the brand", "Robot container kitchens",
     "A twenty foot container, an arm cooking behind glass, a skin that carries the brand.", "{{monthly:fry+noo}} a month, plus the build", "img/container/day.mp4", None),
]


def home_tile(href, img, alt, title, line, price, video=None, pos=None):
    # every plate fills the 16:10 frame edge to edge; robot cutouts stand whole
    # instead (the .../cut/ rule in site.css), so they never lose a head or a base
    style = f' style="object-position:{pos}"' if pos else ""
    pic = (f'<video autoplay muted loop playsinline preload="metadata" poster="{{{{root}}}}{img}" aria-label="{escape(alt)}">'
           f'<source src="{{{{root}}}}{video}" type="video/mp4"><img src="{{{{root}}}}{img}" alt="{escape(alt)}" loading="lazy"{style}></video>'
           if video else f'<img src="{{{{root}}}}{img}" alt="{escape(alt)}" loading="lazy" decoding="async"{style}>'
           if img else f'<span class="glyph">{escape(title)}</span>')  # no photo yet: the name holds the box
    # the builder's own card (.wz-opt.pic), so the home catalogue and the quote
    # are one component, not a lookalike
    return (f'<li><a class="wz-opt pic" href="{{{{root}}}}{href}"><span class="ph">{pic}</span>'
            f'<span class="wz-opt-t"><h3><b>{escape(title)}</b></h3><small>{escape(line)}</small>'
            f'<span class="label">{price}</span></span></a></li>')


def home_catalogue():
    tiles = [home_tile(*t) for t in HOME_LINES]
    for slug in HOME_MACHINES:
        m = BY_SLUG[slug]
        tiles.append(home_tile(href_of(m), "img/" + (m.get("light") or m["hero"]), m["name"], m["name"], m["line"], m["price"]))
    return '<ul class="cat">' + "".join(tiles) + "</ul>"


def page(name, cfg):
    body = (SRC / "pages" / f"{name}.html").read_text()
    if "{{next}}" in body:
        body = body.replace("{{next}}", next_block(name))
    if "{{catalogue}}" in body:
        body = body.replace("{{catalogue}}", home_catalogue())
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


def href_of(m):
    # a line with its own landing page lives there and nowhere else
    return m.get("page") or f'machines/{m["slug"]}/'


def card(m):
    return (f'<li><a href="{{{{root}}}}{href_of(m)}"><div class="ph">{thumb(m)}</div>'
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
        # robot plates are cutouts (img/machines/cut/), so the card shows the whole
        # machine and needs no crop anchor; see the .../cut/ rule in site.css
        return f'<img src="{{{{root}}}}img/{src}" alt="{escape(m["name"])}" loading="lazy">'
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
    def shot_of(x):
        src = x.get("light") or x["hero"]
        return "img/" + src if src else None
    rel = "".join(home_tile(href_of(BY_SLUG[r]), shot_of(BY_SLUG[r]), BY_SLUG[r]["name"],
                            BY_SLUG[r]["name"], BY_SLUG[r].get("line", ""), BY_SLUG[r]["price"])
                  for r in m["related"])
    rel_cls = "cat" if len(m["related"]) == 3 else "cat two"
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
      <h2>Add these to complete the job</h2>
      <ul class="{rel_cls}">{rel}</ul>
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
    groups = [("service", "service-robots", "Service robots", "On the floor: carrying, greeting, moving stock."),
              ("humanoid", "humanoids", "Humanoids and quadrupeds", "For research, inspection and the demo people remember."),
              ("education", "education", "Education", "A humanoid and two kits for the classroom."),
              ("order", "built-to-order", "Built to order", "Scoped first, then priced: the cell, the software and the agents around the machines.")]
    items = "".join(
        f'<div class="cat-group" id="{gid}"><h2 class="plain">{escape(title)}</h2><p>{escape(sub)}</p>'
        f'<ul class="catalogue">{"".join(card(m) for m in MACHINES if m.get("group") == g)}</ul></div>'
        for g, gid, title, sub in groups)
    row = "".join(f'<img src="{{{{root}}}}img/partners/{k}" alt="{escape(v)}" loading="lazy">' for k, v in PARTNERS)
    # three copies: one row is narrower than a wide viewport, so two would gap
    logos = f'<div class="track"><div>{row}</div><div aria-hidden="true">{row}</div><div aria-hidden="true">{row}</div></div>'
    facts = [("Makers", "Unitree, UBTECH, Moton, JAKA, Dobot, and whoever makes the right machine for the job"),
             ("Prices", "List, ex GST, delivered within 100 km of an Australian port"),
             ("With every machine", "Installation, programming to your task, staff training, maintenance"),
             ("See them", "Most of the range is on our floor at 365 St Pauls Terrace")]
    # the four lines are the home catalogue's own tiles, from the same list
    lines = "".join(home_tile(*t) for t in HOME_LINES[:4])
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

  <section class="builds full" id="offer">
    <div class="wrap">
      <div class="grid head">
        <span class="label">Start here</span>
        <h2>Coffee, cocktails, ice cream, kitchens.</h2>
        <p>The four lines we design, brand, fit out and run. All priced on the page.</p>
      </div>
      <ul class="cat two">{lines}</ul>
    </div>
  </section>

  <section class="story">
    <div class="wrap">
      {items}
      <h2 class="plain">Who we have worked with</h2>
      <div class="partners" aria-label="Who we have worked with">{logos}</div>
    </div>
  </section>
</main>
'''


def catalogue():
    render(catalogue_body(), {"out": "machines/index.html", "root": "../", "title": "Machines, Wonder Robotics",
                              "desc": "Every machine Wonder Robotics sells: Unitree G1 and GO2, UBTECH Cruzr, CadeBot, Cruzr Y1, Yanshee, UGOT and uKit, coffee and kitchen robots, custom automation, AI agents and software. Supplied, installed and maintained from Brisbane."})
    for m in MACHINES:
        if m.get("page"):
            to = "../../" + m["page"]
            out = HERE / "machines" / m["slug"] / "index.html"
            out.write_text('<!doctype html>\n<html lang="en-AU"><head><meta charset="utf-8"><meta name="robots" content="noindex">'
                           f'<title>{escape(m["name"])}, Wonder Robotics</title><link rel="canonical" href="{SITE + m["page"]}">'
                           f'<meta http-equiv="refresh" content="0; url={to}"></head>'
                           f'<body><p><a href="{to}">{escape(m["name"])} has moved here.</a></p></body></html>\n')
            print(f"machines/{m['slug']}/index.html: forwards to {m['page']}")
            continue
        render(machine_body(m), {"out": f"machines/{m['slug']}/index.html", "root": "../../",
                                 "title": f"{m['name']}, Wonder Robotics", "desc": escape(m["line"])})


for name, cfg in PAGES.items():
    page(name, cfg)
for pid, d in PACKAGE_PAGES.items():
    NEXT["pkg-" + pid] = d["next"]
    q = package(pid)["quote"]
    desc = f'{d["h1"].rstrip(".")} package: {d["sub"]} {money(q["monthly"])} a month over {q["term"]} months, {money(q["total"])} in all, ex GST. Designed, built and supported from Brisbane.'
    render(package_page(pid).replace("{{next}}", next_block("pkg-" + pid)),
           {"out": d["slug"] + "/index.html", "root": "../", "title": d["title"], "desc": desc, "og": d["img"],
            "ld": (lambda url, img, d=d, q=q, desc=desc: product_ld(d["h1"].rstrip(".") + " package", desc, url, img, [q["total"]]))},
           "pkg-" + pid)
catalogue()


# The price guide PDF, from src/price-guide.html with the same price tokens.
# It needs Chrome, so it only runs when asked: python3 build.py --price-guide
def price_guide():
    import base64
    import os
    import signal
    import tempfile
    import time
    chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if not Path(chrome).exists():
        sys.exit("the price guide needs Google Chrome to print")
    font = "data:font/woff2;base64," + base64.b64encode((HERE / "fonts" / "UnboundedW.woff2").read_bytes()).decode()
    html = fill_prices((SRC / "price-guide.html").read_text()).replace("{{font}}", font)
    if "{{" in html:
        sys.exit("price guide has an unfilled token")
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "price-guide.html"
        src.write_text(html)
        out = Path(tmp) / "price-guide.pdf"
        # Chrome writes the PDF and then, on some runs, never exits, so wait
        # for a finished file rather than for the process
        proc = subprocess.Popen([chrome, "--headless=new", "--no-pdf-header-footer", "--virtual-time-budget=6000",
                                 f"--user-data-dir={tmp}/profile", f"--print-to-pdf={out}", src.as_uri()],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        size, deadline = -1, time.time() + 60
        while time.time() < deadline:
            time.sleep(1)
            now = out.stat().st_size if out.exists() else -1
            if now > 0 and now == size and out.read_bytes().rstrip().endswith(b"%%EOF"):
                break
            size = now
        os.killpg(proc.pid, signal.SIGKILL); proc.wait()   # its helpers too
        if not (out.exists() and out.read_bytes().rstrip().endswith(b"%%EOF")):
            sys.exit("Chrome did not print the price guide")
        shutil.copyfile(out, HERE / "price-guide.pdf")
    print(f"price-guide.pdf: {(HERE / 'price-guide.pdf').stat().st_size} bytes")


if "--price-guide" in sys.argv:
    price_guide()


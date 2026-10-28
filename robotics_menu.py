#!/usr/bin/env python3
"""The client jobs menu at wonder.fish/robotics/ (Jesse, 29 Oct 2026: "on wonder fish could you add a menu screen where I
can get to every client job please").

    python3 robotics_menu.py <out-dir>      -> <out-dir>/index.html, for wonder.fish/robotics/index.html

It reads what is live (rise-stories origin/main, app/public/robotics/): every job's pages, each page's title, whether
it has a passcode, and the day it last changed; groups them by client (CLIENTS); and writes one page behind the decks'
shared passcode (src/deck-gate.html). A page no client lists goes under "Not yet filed", so a new job is never missing
from the menu. Publish it with the pictures script (DEST=app/public/robotics): it adds index.html at the robotics root
and nothing else.
"""
import html as H
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).parent
LIVE = Path.home() / "repos" / "rise-stories"
ROOT = "app/public/robotics/"
GATE = HERE / "src" / "deck-gate.html"
PASS_HASH = "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4"   # the decks' shared passcode, as decks_export.py has it

# client, who or what, and its pages in the order to show them: (path under robotics/, label). Labels are wayfinding.
CLIENTS = [
    ("Concept Eight", "Noodle Box and Wok in a Box", [
        ("concept-eight", "Concept Eight deck"), ("concept-eight-decks", "All their decks"),
        ("noodle-box", "Noodle Box, posters"), ("noodle-box-info", "Noodle Box, information deck"),
        ("noodle-box-lab37", "Noodle Box, Lab37 white"), ("noodle-box-lab37-dark", "Noodle Box, Lab37 dark"),
        ("noodle-box-separate", "Noodle Box, separate"), ("noodle-box-static", "Noodle Box, static")]),
    ("Fonzie Abbott", "Robot baristas", [
        ("fonzie-abbott/posters", "Posters"), ("fonzie-abbott/proposal", "Proposal"), ("fonzie-abbott", "Concept"),
        ("fonzie-abbott-motion", "Posters in motion"), ("fonzie-abbott/ssp", "SSP airport"),
        ("fonzie-abbott/ssp-fa", "SSP airport, FA deck"), ("fonzie-abbott/ssp-fa-light", "SSP airport, FA deck light"),
        ("fonzie-abbott/drive-thru", "Drive-thru"), ("fonzie-abbott/menu", "Menu"), ("fonzie-abbott/specs", "Specs"),
        ("fonzie-abbott/fit-out", "Fit-out"), ("fonzie-abbott-fit-out", "Robot barista fit-out specs"),
        ("fonzie-abbott/everything", "Everything"), ("fonzie-abbott/posters-only", "Posters only"),
        ("fonzie-abbott/wonders", "Wonders app"), ("fonzie-abbott/workspace", "Workspace, Dan and Rosalie")]),
    ("Wonder Whip", "Eve, New Farm", [("wonder-whip", "Proposal")]),
    ("Arise Coffee", "Sunshine Coast University Hospital", [("arise", "Robot booth")]),
    ("Kia", "Australian Open robot bar", [("kia/deck", "Deck"), ("kia/board", "Board"), ("kia/spec", "Spec")]),
    ("Last Laugh Apparel", "", [("last-laugh", "Store"), ("last-laugh/present", "Presentation")]),
    ("NappyNest", "Bobby and Ash", [("nappynest", "Proposal")]),
    ("B Pro", "Custom build", [("b-pro", "Proposal"), ("b-pro/zh", "Proposal, Chinese")]),
    ("UniSC", "University of the Sunshine Coast", [
        ("unisc", "Robot coffee bar"), ("unisc-coffee", "Coffee bar deck"), ("unisc-concepts", "Concepts")]),
    ("Qianji", "", [("qianji", "Platform introduction"), ("qianji/raas", "Robots as a service")]),
    ("Wonder Robotics", "Ours, for anyone", [
        ("information", "Information deck"), ("company", "Introduction"), ("profile", "Corporate profile"),
        ("opening", "Opening"), ("offer", "Robot coffee in your brand"), ("franchise", "Franchise proposal"),
        ("coffee", "Coffee bar, sold whole"), ("coffee-machine", "Robot coffee bars"), ("education", "Education"),
        ("coffee-partners", "Coffee partners MOU"), ("agreement", "Quote and agreement"), ("signatures", "Email signatures")]),
]


def git(*args):
    return subprocess.run(["git", "-C", str(LIVE), *args], capture_output=True, text=True, check=True).stdout


def live_pages():
    """Every page under robotics/ that is live: path -> (title, has a passcode, last changed)."""
    git("fetch", "-q", "origin")
    pages = {}
    for f in git("ls-tree", "-r", "--name-only", "origin/main", ROOT).split():
        if not f.endswith("/index.html") or f == ROOT + "index.html":
            continue
        path = f[len(ROOT):-len("/index.html")]
        page = git("show", f"origin/main:{f}")
        title = re.search(r"<title>(.*?)</title>", page, re.S)
        changed = git("log", "-1", "--format=%cs", "origin/main", "--", ROOT + path + "/").strip()
        pages[path] = (H.unescape(title.group(1).strip()) if title else path, "data-pass-hash" in page, changed)
    return pages


def row(path, label, page):
    title, locked, changed = page
    when = date.fromisoformat(changed).strftime("%-d %b") if changed else ""
    lock = '<span class="lock" title="Passcode">&#9679;</span>' if locked else ""
    return (f'<a class="page" href="{H.escape(path)}/"><span class="name">{H.escape(label)}{lock}</span>'
            f'<span class="title">{H.escape(title)}</span><span class="when">{when}</span></a>')


def build(pages):
    listed, clients, ours = set(), [], []
    for client, who, items in CLIENTS:
        rows = [row(p, label, pages[p]) for p, label in items if p in pages]
        listed |= {p for p, _ in items}
        if rows:
            group = (max(pages[p][2] for p, _ in items if p in pages), client, who, rows)
            (ours if client == "Wonder Robotics" else clients).append(group)
    groups = sorted(clients, key=lambda g: g[0], reverse=True) + ours   # the newest client job first; ours after them
    loose = sorted(p for p in pages if p not in listed)
    if loose:
        groups.append(("", "Not yet filed", "New pages no client lists yet", [row(p, p, pages[p]) for p in loose]))
    out = []
    for _, client, who, rows in groups:
        out.append(f'<section class="client"><div class="who"><h2>{H.escape(client)}</h2>'
                   f'<p>{H.escape(who)}</p></div><div class="pages">{"".join(rows)}</div></section>')
    return "\n".join(out), len(pages)


PAGE = """<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Client jobs, Wonder Robotics</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap">
<style>
  :root{--night:#20103A;--ink:#130A24;--paper:#F3F1E4;--paper-2:rgba(243,241,228,.66);--rule:rgba(243,241,228,.16);--amber:#E8A84C;
        --display:"Host Grotesk","Helvetica Neue",Helvetica,Arial,sans-serif;--mono:"Geist Mono",ui-monospace,Menlo,monospace;color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:var(--night);color:var(--paper);font-family:var(--display);-webkit-font-smoothing:antialiased}
  .wrap{max-width:1180px;margin:0 auto;padding-block:clamp(28px,6vh,72px) 80px;
        padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px))}
  header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;padding-bottom:28px;border-bottom:1px solid var(--rule)}
  header img{display:block;width:150px;height:auto;margin-bottom:26px}
  h1{margin:0;font-weight:400;font-size:clamp(40px,7vw,84px);line-height:.95;letter-spacing:-.045em}
  .count{margin:0;font:400 12px/1.5 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--paper-2);text-align:right}
  .client{display:grid;grid-template-columns:minmax(0,280px) minmax(0,1fr);gap:28px;padding:30px 0;border-bottom:1px solid var(--rule)}
  .who h2{margin:0;font-weight:400;font-size:28px;line-height:1.1;letter-spacing:-.025em}
  .who p{margin:8px 0 0;font:400 12px/1.5 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--paper-2)}
  .pages{display:grid;gap:2px;min-width:0}
  .page{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr) auto;gap:18px;align-items:baseline;padding:12px 14px;margin:0 -14px;
        border-radius:10px;color:inherit;text-decoration:none;transition:background .2s ease}
  .page:hover,.page:focus-visible{background:rgba(243,241,228,.07);outline:none}
  .page:focus-visible{box-shadow:0 0 0 2px var(--amber)}
  .name{font-size:19px;letter-spacing:-.01em}
  .lock{display:inline-block;margin-left:10px;font-size:9px;vertical-align:3px;color:var(--amber)}
  .title{font-size:14px;color:var(--paper-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .when{font:400 12px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--paper-2);white-space:nowrap}
  .key{margin:26px 0 0;font:400 12px/1.5 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--paper-2)}
  .key .lock{margin:0 8px 0 0}
  @media (max-width:760px){
    .client{grid-template-columns:minmax(0,1fr);gap:14px;padding:24px 0}
    .page{grid-template-columns:minmax(0,1fr) auto;gap:4px 14px}
    .title{grid-column:1/-1;grid-row:2;white-space:normal}
    .count{text-align:left}
  }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div><img src="img/deck/mark-cream.png" alt="Wonder Robotics"><h1>Client jobs</h1></div>
    <p class="count">{count} pages, newest client first<br>Read from wonder.fish, {today}</p>
  </header>
{groups}
  <p class="key"><span class="lock">&#9679;</span>Behind a passcode</p>
</div>
</body>
</html>
"""


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    pages = live_pages()
    groups, count = build(pages)
    page = PAGE.replace("{groups}", groups).replace("{count}", str(count)).replace("{today}", date.today().strftime("%-d %B %Y"))
    gate = GATE.read_text().replace("{{hash}}", PASS_HASH).replace("../img/", "img/")   # the robotics root, one level up from a deck
    head = '<meta charset="utf-8">\n'
    assert page.count(head) == 1
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(page.replace(head, head + gate))
    print(f"{out / 'index.html'}: {count} pages, {len(groups.split('<section')) - 1} clients")


main()

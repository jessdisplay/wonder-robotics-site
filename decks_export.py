#!/usr/bin/env python3
"""Export the decks as a folder another site can serve.

    python3 build.py && python3 decks_export.py <out-dir> [deck ...]

The decks are built with this site and normally served by it at deck/<name>/.
This writes the same pages to <out-dir>/<name>/index.html with only the
pictures, films and fonts they use under <out-dir>/img and <out-dir>/fonts,
a PDF of each beside its page, and a Download button on the page that hands
over that PDF. Links back into the site go to the live site. Name decks
after the folder to export only those, so the others on wonder.fish stay as
they were published.

Used to put the decks on wonder.fish/robotics/, where a pushed commit is live
in under a minute.
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
SITE = "https://www.wonderbytech.com/"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# name on disk -> (folder to publish as, the PDF's file name)
DECKS = {
    "unisc": ("unisc", "Wonder-Robotics-for-UniSC.pdf"),
    "unisc-coffee": ("unisc-coffee", "Wonder-Robotics-coffee-bar-for-UniSC.pdf"),
    "profile": ("profile", "Wonder-Robotics-corporate-profile.pdf"),
    "coffee": ("coffee", "Wonder-Robotics-coffee-bar.pdf"),
    "company": ("company", "Wonder-Robotics-introduction.pdf"),
    "information": ("information", "Wonder-Robotics-Information-Deck.pdf"),
    "coffee-machine": ("coffee-machine", "Wonder-Robotics-coffee-machine.pdf"),
    "noodle-box": ("noodle-box", "Wonder-Robotics-for-Noodle-Box.pdf"),
    # the USC information deck's pages for Noodle Box (Jesse, 28 Oct 2026: "a version just like the USC PDF")
    "noodle-box-info": ("noodle-box-info", "Wonder-Robotics-Noodle-Box-Information-Deck.pdf"),
    # the same story in Lab37's manner, white and dark (Jesse, 28 Oct 2026: "redo an entire deck in the Lab37 treatment")
    "noodle-box-lab37": ("noodle-box-lab37", "Wonder-Robotics-for-Noodle-Box.pdf"),
    "noodle-box-lab37-dark": ("noodle-box-lab37-dark", "Wonder-Robotics-for-Noodle-Box-dark.pdf"),
    "noodle-box-separate": ("noodle-box-separate", "Wonder-Robotics-for-Noodle-Box-separate.pdf"),
    # both brands, layered in their own red and yellow (Jesse, 28 Oct 2026)
    "concept-eight": ("concept-eight", "Wonder-Robotics-for-Concept-Eight.pdf"),
    # the Lab37 deck in two more colours, on Noodle Box red and white with maroon (Jesse, 29 Oct 2026)
    "noodle-box-lab37-red": ("noodle-box-lab37-red", "Wonder-Robotics-for-Noodle-Box-red.pdf"),
    "noodle-box-lab37-maroon": ("noodle-box-lab37-maroon", "Wonder-Robotics-for-Noodle-Box-maroon.pdf"),
    # the same two without Lab37 in the address or the PDF (Jesse, 29 Oct 2026); the white one is the plain name
    "noodle-box-proposal": ("noodle-box-proposal", "Wonder-Robotics-for-Noodle-Box.pdf"),
    "noodle-box-proposal-maroon": ("noodle-box-proposal-maroon", "Wonder-Robotics-for-Noodle-Box-maroon.pdf"),
}
# Decks behind a passcode: name -> SHA-256 of the passcode, never the code itself. The login is src/deck-gate.html,
# put in after the PDF is printed (a printed login would be the whole PDF). Jesse, 22 Oct 2026: the
# information deck gets a login like the other client pages.
# The coffee machine and Noodle Box decks share the information deck's passcode (26 Oct 2026).
GATED = {"information": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4",
         "coffee-machine": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4",
         "noodle-box": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4",
         "noodle-box-info": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4",
         "noodle-box-lab37": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4",
         "noodle-box-lab37-dark": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4",
         "noodle-box-separate": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4",
         "concept-eight": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4",
         "noodle-box-lab37-red": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4",
         "noodle-box-lab37-maroon": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4",
         "noodle-box-proposal": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4",
         "noodle-box-proposal-maroon": "0ae3305415102d365f21b19b0ba90eebfebd1c4f38b79ae87dce1655a31650a4"}
GATE = HERE / "src" / "deck-gate.html"
# A deck may dress its login: src/<name>-gate.html, or the dressings named here, in order. Every Concept Eight deck wears
# Concept Eight's own Noodle Box login with the little man's hat in its digit boxes (Jesse, 29 Oct 2026: "change the login
# screen to our noodle box one", "just the triangle hats for the login tabs is enough", "across all decks and logins").
CONCEPT_EIGHT = ("concept-eight", "noodle-box", "noodle-box-info", "noodle-box-separate", "noodle-box-lab37",
                 "noodle-box-lab37-dark", "noodle-box-lab37-red", "noodle-box-lab37-maroon", "noodle-box-proposal",
                 "noodle-box-proposal-maroon")
GATE_DRESS = {n: ("concept-eight", "noodle-box-tabs") for n in CONCEPT_EIGHT}


def dressing(name):
    return "".join(p.read_text() for p in (HERE / "src" / f"{stem}-gate.html" for stem in GATE_DRESS.get(name, (name,)))
                   if p.exists())
# Decks sent as a page only, with no PDF to download (Jesse, 29 Oct 2026, of the Concept Eight deck: "I don't want to
# send it as a PDF as it could be copied").
NO_PDF = {"concept-eight"}
# Concept decks carry the ice cream proposal's line under the passcode (Jesse, 29 Oct 2026: "add the disclaimer similar
# to the ice cream job and add that to every single concept we do"; its words, robotics/wonder-whip/).
CONFIDENTIAL = set(CONCEPT_EIGHT)
GATE_NOTE = ("<script>document.addEventListener('DOMContentLoaded', function () {\n"
             "  var e = document.querySelector('#gate .gate-error'); if (!e) return;\n"
             "  var n = document.createElement('p'); n.className = 'gate-own';\n"
             "  n.textContent = 'Concept and property of Wonder Robotics. Shared in confidence.';\n"
             "  e.parentNode.insertBefore(n, e.nextSibling);\n"
             "});</script>\n"
             "<style>#gate .gate-own{margin:18px 0 0;font:500 12px/1.4 'Geist Mono',ui-monospace,Menlo,monospace;"
             "letter-spacing:.06em;text-transform:uppercase;text-align:center;color:rgba(243,241,228,.74)}</style>\n")
# Bottom centre and large: at the corner in small type it went unseen.
# Who to call, on the exported decks only. The site's own number stays as the
# site has it; Jesse, 2 Oct 2026: "use Ryan's number for now on these decks".
CONTACT = [("tel:1800983404", "tel:+61498765142"), ("1800 983 404", "Ryan Edwards 0498\u00a0765\u00a0142")]
# A deck's own contact in place of CONTACT: Don Sanka Small on the Concept Eight deck (Jesse, 29 Oct 2026, first
# Peter White in place of Ryan, then Don in place of Peter, don@wonderbytech.com, 0477 240 022).
# The pages it takes from the information deck name Ryan in full, so his number is swapped as well.
CONTACT_FOR = {"concept-eight": [("tel:1800983404", "tel:+61477240022"), ("1800 983 404", "Don Sanka Small 0477\u00a0240\u00a0022"),
                                 ("tel:+61498765142", "tel:+61477240022"),
                                 ("Ryan Edwards 0498&nbsp;765&nbsp;142", "Don Sanka Small 0477&nbsp;240&nbsp;022"),
                                 ("info@wonderbytech.com", "don@wonderbytech.com")]}
# the Lab37 decks for the Concept Eight proposal close on Don too
CONTACT_FOR.update({n: CONTACT_FOR["concept-eight"]
                    for n in ("noodle-box-lab37", "noodle-box-lab37-dark", "noodle-box-lab37-red", "noodle-box-lab37-maroon",
                              "noodle-box-proposal", "noodle-box-proposal-maroon")})
DOWNLOAD = ('<a class="dl-pdf" href="{pdf}" download style="position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:60;'
            "font:500 15px/1 'Geist Mono',ui-monospace,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;"
            'text-decoration:none;color:#F3F1E4;background:#4A2FD9;border-radius:10px;padding:16px 26px;'
            'box-shadow:0 6px 24px rgba(20,10,36,.45)">&darr;&nbsp; Download PDF</a>\n'
            "<style>@media print{{.dl-pdf{{display:none !important}}}}</style>\n")


def pdf(page, out):
    """Chrome writes the PDF and on some runs never exits, so wait for the file."""
    import os, signal, tempfile, time
    with tempfile.TemporaryDirectory() as tmp:
        proc = subprocess.Popen([CHROME, "--headless=new", "--no-pdf-header-footer", "--virtual-time-budget=12000",
                                 f"--user-data-dir={tmp}/profile", f"--print-to-pdf={out}", page.as_uri()],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        size, deadline = -1, time.time() + 90
        while time.time() < deadline:
            time.sleep(1)
            now = out.stat().st_size if out.exists() else -1
            if now > 0 and now == size and out.read_bytes().rstrip().endswith(b"%%EOF"):
                break
            size = now
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError):   # Chrome closed itself first (macOS says EPERM for a group of zombies)
            pass
        proc.wait()
    if not (out.exists() and out.read_bytes().rstrip().endswith(b"%%EOF")):
        sys.exit(f"Chrome did not print {page}")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    out = Path(sys.argv[1]).resolve()
    names = sys.argv[2:] or list(DECKS)
    unknown = set(names) - set(DECKS)
    if unknown:
        sys.exit(f"no such deck: {sorted(unknown)}")
    decks = {name: DECKS[name] for name in names}
    if out.exists():
        shutil.rmtree(out)
    used = set()
    for name, (folder, pdf_name) in decks.items():
        src = HERE / "deck" / name / "index.html"
        if not src.exists():
            sys.exit(f"no built deck at {src}: run build.py first")
        html = src.read_text()
        html = re.sub(r'href="(?:\.\./)+([^"#]*)', lambda m: 'href="' + SITE + m.group(1), html)
        html = html.replace("../../", "../")
        for old, new in CONTACT_FOR.get(name, CONTACT):
            html = html.replace(old, new)
        if re.search(r"1800[ ]?983[ ]?404", html):
            sys.exit(f"{name}: the old number is still on the page")
        if name in CONTACT_FOR and re.search(r"498[ ]?765[ ]?142|0498", html):
            sys.exit(f"{name}: Ryan's number is still on a deck with its own contact")
        if re.search(r"407\D{0,6}474\D{0,6}025|peter@", html):   # Peter is an advisor, no longer a contact (29 Oct 2026)
            sys.exit(f"{name}: Peter's number or email is still on the page")
        seen = html + (GATE.read_text() + dressing(name) if name in GATED else "")   # the login is put in later; its pictures go now
        files = set(re.findall(r'(?:src|srcset|poster)="\.\./((?:img|fonts)/[^"?\s]+)', seen)) | set(re.findall(r'url\(["\']?\.\./((?:img|fonts)/[^)"\'?]+)', seen))
        # a film the scroll plays (src/scrub.js) names its frames once, with {n} for the frame number
        for path, count in re.findall(r'data-frames="\.\./((?:img)/[^"]+)" data-count="(\d+)"', seen):
            files |= {path.replace("{n}", f"{i:03d}") for i in range(int(count))}
        for f in files:
            if not (HERE / f).exists():
                sys.exit(f"{name}: no such file, {f}")
        used |= files
        if name in NO_PDF:
            pass
        elif html.count("</body>") == 1:
            html = html.replace("</body>", DOWNLOAD.format(pdf=pdf_name) + "</body>")
        else:   # the site's own pages close the head, not the body
            cut = html.rindex("</head>")
            html = html[:cut] + DOWNLOAD.format(pdf=pdf_name) + html[cut:]
        (out / folder).mkdir(parents=True)
        (out / folder / "index.html").write_text(html)
    for f in sorted(used):
        (out / f).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(HERE / f, out / f)
    # printed from the exported page, so the PDF says what the page says
    for name, (folder, pdf_name) in decks.items():
        if name in NO_PDF:
            print(f"{folder}/: page only, no PDF")
            continue
        pdf(out / folder / "index.html", out / folder / pdf_name)
        print(f"{folder}/: page, {pdf_name} {(out / folder / pdf_name).stat().st_size // 1024} KB")
    for name in set(decks) & set(GATED):
        page = out / decks[name][0] / "index.html"
        html, head = page.read_text(), '<meta charset="utf-8">\n'
        if html.count(head) != 1:
            sys.exit(f"{name}: no single charset line to put the login after")
        gate = GATE.read_text().replace("{{hash}}", GATED[name]) + dressing(name) + (GATE_NOTE if name in CONFIDENTIAL else "")
        page.write_text(html.replace(head, head + gate))
        print(f"{decks[name][0]}/: behind its passcode")
    print(f"{len(used)} pictures, films and fonts")


main()

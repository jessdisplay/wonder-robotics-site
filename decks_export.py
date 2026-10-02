#!/usr/bin/env python3
"""Export the decks as a folder another site can serve.

    python3 build.py && python3 decks_export.py <out-dir>

The decks are built with this site and normally served by it at deck/<name>/.
This writes the same pages to <out-dir>/<name>/index.html with only the
pictures, films and fonts they use under <out-dir>/img and <out-dir>/fonts,
a PDF of each beside its page, and a Download button on the page that hands
over that PDF. Links back into the site go to the live site.

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
}
# Bottom centre and large: at the corner in small type it went unseen.
# Who to call, on the exported decks only. The site's own number stays as the
# site has it; Jesse, 2 Oct 2026: "use Ryan's number for now on these decks".
CONTACT = [("tel:1800983404", "tel:+61498765142"), ("1800 983 404", "Ryan Edwards 0498\u00a0765\u00a0142")]
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
        os.killpg(proc.pid, signal.SIGKILL); proc.wait()
    if not (out.exists() and out.read_bytes().rstrip().endswith(b"%%EOF")):
        sys.exit(f"Chrome did not print {page}")


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out = Path(sys.argv[1]).resolve()
    if out.exists():
        shutil.rmtree(out)
    used = set()
    for name, (folder, pdf_name) in DECKS.items():
        src = HERE / "deck" / name / "index.html"
        if not src.exists():
            sys.exit(f"no built deck at {src}: run build.py first")
        html = src.read_text()
        html = re.sub(r'href="(?:\.\./)+([^"#]*)', lambda m: 'href="' + SITE + m.group(1), html)
        html = html.replace("../../", "../")
        for old, new in CONTACT:
            html = html.replace(old, new)
        if re.search(r"1800[ ]?983[ ]?404", html):
            sys.exit(f"{name}: the old number is still on the page")
        files = set(re.findall(r'(?:src|poster)="\.\./((?:img|fonts)/[^"?]+)', html)) | set(re.findall(r'url\(["\']?\.\./((?:img|fonts)/[^)"\'?]+)', html))
        for f in files:
            if not (HERE / f).exists():
                sys.exit(f"{name}: no such file, {f}")
        used |= files
        if html.count("</body>") == 1:
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
    for name, (folder, pdf_name) in DECKS.items():
        pdf(out / folder / "index.html", out / folder / pdf_name)
        print(f"{folder}/: page, {pdf_name} {(out / folder / pdf_name).stat().st_size // 1024} KB")
    print(f"{len(used)} pictures, films and fonts")


main()

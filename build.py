#!/usr/bin/env python3
"""index.html = the document wrapper around wonder-robotics.html.

wonder-robotics.html is the artifact source (no doctype, no <html>), so the
Claude artifact and GitHub Pages serve the same page from one file. Run this
after every edit to wonder-robotics.html.
"""
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "wonder-robotics.html"
OUT = HERE / "index.html"

HEAD = (
    "<!doctype html>\n"
    '<html lang="en-AU">\n'
    "<head>\n"
    '<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    '<meta name="robots" content="noindex">\n'
)
TAIL = "\n</head>\n</html>\n"

body = SRC.read_text()
OUT.write_text(HEAD + body + TAIL)
print(f"{OUT.name}: {OUT.stat().st_size} bytes from {SRC.name}")

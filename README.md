# Wonder Robotics

The public site for Wonder Robotics, served by GitHub Pages from `main` at
https://www.wonderbytech.com/ (the address is `SITE` in `build.py`; `CNAME`
is written from it).

- Edit `src/` (pages in `src/pages/`, shared `site.css`, `site.js`, `mark.js`,
  the catalogue in `machines.py`), then run `python3 build.py`. Every page is
  built from those; never edit a built `index.html` by hand.
- `python3 build.py --price-guide` reprints `price-guide.pdf` (needs Chrome).
- The build also writes `sitemap.xml`, `robots.txt`, `CNAME`, `404.html`, and
  a forwarding page at each address of the old wonderbytech.com site.
- `wonder-robotics.html` is the home page without its document wrapper, the
  Claude artifact source.
- Two decks are built with the site and sent as links. Both are unlisted:
  `noindex`, not in the sitemap, linked from no page.
  `deck/coffee/` is the coffee bar sales deck (`src/pages/coffee-deck.html`).
  `deck/company/` is the company introduction for partners
  (`src/company-deck.html`, a whole document; its prices and partner wall
  come from the build).

## Going live on www.wonderbytech.com

Do steps 1 and 2 together: between them the old site or a GitHub error shows.

1. **Merge.** Merge the `launch` branch into `main` and push. GitHub Pages
   picks up `CNAME` and starts answering for www.wonderbytech.com.
2. **DNS** (Namecheap, wonderbytech.com, Advanced DNS). Change only these:

   | Type  | Host | Value |
   |-------|------|-------|
   | A     | @    | 185.199.108.153 |
   | A     | @    | 185.199.109.153 |
   | A     | @    | 185.199.110.153 |
   | A     | @    | 185.199.111.153 |
   | CNAME | www  | jessdisplay.github.io. |

   Delete the old A records pointing at 149.28.161.133 (the old nginx server).
   **Leave every MX and TXT record alone:** info@wonderbytech.com runs on
   Microsoft 365 through them.
3. **HTTPS.** Repository Settings, Pages: the custom domain reads
   `www.wonderbytech.com`. Once the certificate is issued (minutes to an hour),
   tick **Enforce HTTPS**.
4. **The sales desk.** The sign-in on the quote calls wonder.fish. The new
   domain is allowed in `rise-stories/worker/desk.js` (commit e020a51); that
   worker has to be deployed for sign-in to work on the new address.
5. **Search.** Add www.wonderbytech.com to Google Search Console and submit
   `https://www.wonderbytech.com/sitemap.xml`.
6. **Check it live:** the home page, a machine page, `/quote/`, the price guide
   PDF, an old address such as `/robots/unitree/g1`, and a made-up address for
   the 404.

The domain registration runs out on **17 November 2026**. Renew it at Namecheap.

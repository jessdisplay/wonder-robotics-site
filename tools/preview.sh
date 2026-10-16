#!/bin/bash
# Publish this branch as a preview copy at https://wonder-robotics-edgier.pages.dev, never at www.wonderbytech.com.
# The copy is the built site minus sources, tools and the unlisted decks, with noindex on every page so the
# second address never competes with the real one in search.
# usage: bash tools/preview.sh [draft]   (run python3 build.py first; "draft" publishes to
#        https://draft.wonder-robotics-edgier.pages.dev to be checked before the main preview address moves)
set -euo pipefail
cd "$(dirname "$0")/.."
out="$(mktemp -d)/robotics-preview"
rsync -a --exclude '.git*' --exclude '.DS_Store' --exclude 'tools/' --exclude 'src/' --exclude 'deck/' \
      --exclude '*.py' --exclude 'README.md' --exclude 'CNAME' ./ "$out/"
printf '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n' > "$out/_headers"
npx -y wrangler@4.40.0 pages deploy "$out" --project-name wonder-robotics-edgier --branch "${1:-main}" --commit-dirty=true \
    --commit-message "$(git log -1 --format='%h %s')"

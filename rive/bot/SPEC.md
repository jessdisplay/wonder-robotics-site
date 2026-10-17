# The bot, as numbers

Every value here is lifted from `src/mark.js`, which is the canonical mark. The
Rive scene is a port of that drawing, not a redraw of it: if a number here and a
number there ever disagree, `mark.js` is right and this is a bug.

`mark.js` draws in a space where the moon has radius `R0 = 100`, then scales the
whole thing to fit the `o` of the wordmark (an ellipse, `RX = ow/2`,
`RY = xh/2`). The Rive artboard is that unscaled space: **200 x 200, moon centre
at (100, 100)**. The host does the ellipse fit, exactly as the canvas does.

## Geometry

| Part | mark.js | Artboard space |
|---|---|---|
| Moon | `arc(0, 0, R)` | circle d=200 at (100, 100) |
| Cut | `CRESCENT.cut 0.5`, `rx 0.7`, `rise -0.06` | circle d=140 at (150, 94) |
| Face panel | `w R*1.3`, `h R*1.42`, centre `R*dx, R*0.04`, radius `R*0.3` | 130 x 142, r=30, centre (144, 104) at rest |
| Eye | `s R*0.19`, radius `s*0.26`, `ey -R*0.1` | 19 x 19, r=4.94, centre y=90 |
| Eye centres | `ex 0.2` and `0.7`, plus `slide` | x=120 and x=170 at rest |

`CRESCENT.ry` (0.76) is in the source but unused: `crescentRound` passes only
`rx` to the arc, so the cut is a circle, not an ellipse. Ported as drawn.

Everything is clipped to the moon disc. The comment in `mark.js` says why: *the
face never escapes the moon*.

## The slide

One number moves the whole face: `dx`, in units of R.

| Name | Value | Artboard x offset |
|---|---|---|
| `HOME` | 0.44 | 0 (rest) |
| `OUT` | 1.62 | +118 |

The panel and both eyes move together (`mark.js` slides the eyes by
`dx - HOME`), so in Rive they are one node with one keyed `x`.

## The sneak

From `WonderSneak` in `src/site.js`. Peek, hesitate, then commit:

| t | dx |
|---|---|
| 0 | 1.62 (OUT) |
| 0.30 | 1.18 |
| 0.46 | 1.14 |
| 1 | 0.44 (HOME) |

Easing between keys is cubic in-out. Durations in use: 1050ms on the loader,
950ms on the header mark, with a 90ms pause after parking.

## Why the moon is clipped twice

The crescent is the moon minus the cut circle, and the face is a hole punched
through whatever remains. Those two subtractions overlap, so a single even-odd
path re-fills the overlap (three contours is odd, so it paints). Two clipping
shapes, each an even-odd "everything but this", intersect instead of counting,
which gives moon AND NOT cut AND NOT panel with no special case.

Clippers carry no `Fill` and no `Stroke`. Per the Rive docs, `hidden="true"` on
a clipper empties the mask and hides the artwork it was meant to reveal.

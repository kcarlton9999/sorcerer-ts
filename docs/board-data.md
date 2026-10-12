# Board data

[`src/data/hex_data.yml`](../src/data/hex_data.yml) is the canonical source for
the Sorcerer board. Vite bundles this file into the application, which parses
it at startup and renders its hexes directly; there is no separately maintained
map export.

## Hex records

Each YAML record describes one hex with:

- `id`: a four-character string. The first two characters are the column and
  the last two are the row; leading zeroes are significant.
- `color`: one of the six magic colors, `white`, or `grey`.
- `terrain`: the terrain marking on each of the six edges: `N`, `NE`, `SE`, `S`,
  `SW`, and `NW`. Values are `none`, `river`, or `mountain`.
- `name`: a place name or `null`.
- `isCity`: whether the hex is a city.

The map has 23 columns. Odd-numbered columns contain rows 01–23; even-numbered
columns contain rows 01–22, for a total of 518 hexes. Hexes are flat-top and
columns are staggered vertically: even-numbered columns are shifted down by
half a hex height. This keeps the centers of the 23-hex and 22-hex columns
aligned. IDs for off-board positions are intentionally absent.

## Terrain edges

River annotations render as meandering blue strokes along their hex edge.
Mountain annotations render as short ridge marks on both sides of the edge,
leaving a small gap at the center. When neighboring hex records specify
different terrain for the same edge, the board displays both markings and
lists the discrepancy in the expandable data warning above the map; it does
not silently choose one side's value. Each terrain mark is recorded on both
hexes sharing the edge.

The current source records all shared terrain symmetrically, with no
one-sided annotations, conflicting values, or markings beyond the board.

## Current implementation boundary

The browser prototype supports board rendering and hex inspection, including
color, ID, terrain edges, names, and city status. It does not yet implement
movement costs or game rules that use the terrain.

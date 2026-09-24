# Russia Political Map

A static WebGL atlas of Russia’s federal subjects with selectable 3D geometry, local SVG flags, and regional federal-election history. The page has a global `Presidential` / `State Duma` switch followed by the available years for that election type. It makes no runtime request to a political-data API.

## Data

- `data/election-history.json` contains the browser-facing archive: presidential elections from 1991–2024 and State Duma elections from 1993–2021.
- The 2000–2024 regional totals are aggregated from the [RED replication package](https://github.com/georgytarasenko/RED-replication-package), which publishes harmonised precinct-level presidential and parliamentary data. The retained JSON holds subject-level shares only.
- The 1991–1996 presidential and 1993–1995 Duma records are extracted from [Electoral Geography’s historical regional tables](https://www.electoralgeography.com/new/ru/category/countries/r/russia/).
- The 1999 State Duma cycle uses Electoral Geography’s regional table. Historical boundary changes remain visible as genuinely unavailable records instead of being filled with nationwide values.
- Where either archive omits a subject despite a published regional table, the generator adds that specific record from the [1995 Duma](https://ru.wikipedia.org/wiki/Выборы_в_Государственную_думу_(1995)), [2000 presidential](https://ru.wikipedia.org/wiki/Президентские_выборы_в_России_(2000)), or [2024 presidential](https://en.wikipedia.org/wiki/2024_Russian_presidential_election) regional table. These supplements never stand in for an unavailable historical result.
- Boundaries are simplified once from OSM-derived source geometry. Flags are local SVG assets from [russian-flags/regions](https://github.com/russian-flags/regions).

Historical tables reflect their contemporaneous administrative units. A modern subject with no comparable row for a selected election is intentionally shown without a result.

## Update the archive

The generator uses only Node’s built-in modules and writes the JSON only when its semantic content changes:

```sh
node scripts/build-election-history.mjs
```

To refresh a single cycle while working on a source correction:

```sh
node scripts/build-election-history.mjs presidential 2024
node scripts/build-election-history.mjs duma 2021
```

## Run locally

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080`.

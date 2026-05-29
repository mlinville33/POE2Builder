# POE2 Builder

Interactive Path of Exile 2 passive skill tree renderer and build planner for patch 0.5 "Runes of Aldur". Browse the full passive tree, pick a class + ascendancy, allocate nodes, choose skill gems with supports, and export a `.build` file you can import directly into POE2.

## Prerequisites

- **Node.js** 20.19+ or 22.12+ (the project uses Vite 6)
- **npm** (ships with Node)

## Run locally

```bash
npm install
npm run dev
```

The dev server prints a local URL — typically [http://localhost:5173](http://localhost:5173). Open it in your browser.

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run refresh-data` | Re-pull every game data file from its documented source ([data/sources.json](data/sources.json)) |

## Data sources

All game data (skill tree, gems, items, uniques) lives in [data/](data/) and is served as static assets by Vite. The manifest at [data/sources.json](data/sources.json) records the source URL, repo, and description for each file so you can verify or refresh.

Run `npm run refresh-data` whenever GGG publishes a new patch or RePoE-fork updates. The script:

1. Reads each file's source URL from the manifest
2. Downloads it
3. Validates the response is parseable JSON before writing
4. Updates the `_lastRefreshed` timestamp

Adding a new data source: append an entry to `data/sources.json` and re-run `npm run refresh-data`.

## Saving and loading builds

Click **+ New Build** in the top bar to start a named build. You'll be asked for:

- **Name** — used for the save file and displayed in the top bar
- **Class** — dropdown of all classes that have ascendancies
- **Ascendancy** — optional dropdown filtered by the chosen class

After creation, the build is saved to [builds/](builds/) as `{slug}.json`. While the dev server is running:

- **Autosave** runs every 60 seconds whenever a build has a name
- **Save** button writes immediately (also triggers right after creation)
- Status is shown next to the build name in the top bar (e.g. "Saved 12s ago")

Save files contain the full build state — name, class, ascendancy, allocated node IDs, skills with supports. This is *not* the same as the export `.build` file; saves are for resuming work later.

## Exporting builds

When a class is selected, click **Export .build** in the top bar. The downloaded file follows GGG's official 0.5 [build schema](https://www.pathofexile.com/developer/docs/game) (Version 1, Experimental).

Drop the file in `Documents/My Games/Path of Exile 2/BuildPlanner/` (Windows) to make it available in-game.

## Project layout

```
builds/                   Saved builds (one JSON per build, slug filename)
data/                     Game data JSON + sources manifest
scripts/
  refresh-data.mjs        Pulls data files from sources.json
src/
  canvas/                 Skill tree renderer (Canvas 2D)
  components/             React UI (ClassSelector, SkillsManager, StatsPanel, Tooltip, NewBuildModal)
  data/                   Loaders, exporters, gem index, build save/load
  App.tsx                 Top-level state + layout, autosave
  main.tsx                Entry point
  types.ts                Shared TypeScript types
vite.config.ts            Includes dev-server middleware that serves /api/builds (save/list/load)
```

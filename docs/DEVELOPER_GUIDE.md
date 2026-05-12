# Developer guide — architecture and extension

This document is for **maintainers** and **contributors**: how the app is structured, where state lives, how algorithms plug in, and how to extend safely.

---

## 1. Technology stack

| Layer | Choice |
|-------|--------|
| Runtime | Browser (ES2020+ modules) |
| UI | Static HTML + CSS (`index.html`, `css/style.css`) |
| Charts | Chart.js 4.4.7 (UMD from CDN in `index.html`) |
| Fonts | Google Fonts (Inter, JetBrains Mono) in CSS |
| Build | **None** — no bundler; paths must resolve as static files |

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  index.html — DOM, Chart.js script, module entry: main.js   │
└───────────────────────────┬───────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   main.js            ttpMaker.js (lazy)    visualization/*
        │                   │                   │
        ├── parser.js       └── uses loadInstance, log, getCurrentInstance
        ├── models.js
        ├── algorithms/*
        └── visualization/*
```

- **`main.js`** is the **single orchestrator**: loads instances, runs solvers, owns `solutions[]`, calls visualizations.
- **`ttpMaker.js`** is **dynamically imported** after `DOMContentLoaded` so a failure there does not break core loading/solving.
- **Algorithms** are pure functions over `TTPInstance`, optional `distMatrix`, and return **`Solution`** instances (see §4).

---

## 3. Application state (`main.js`)

| Variable | Type / role |
|----------|----------------|
| `currentInstance` | `TTPInstance \| null` — active problem |
| `distMatrix` | `number[][]` — precomputed with `buildDistanceMatrix` on load |
| `solutions` | `Solution[]` — one entry per strategy name after `upsertSolution` |
| `bruteForceResults` | Enumeration payload for table/scatter, or `null` |
| `currentDisplayedSolution` | Which solution drives map + timeline |

**Invariant:** Strategies that return a `Solution` must **not** be shallow-copied into plain objects. `Solution` exposes getters such as `objective`; spreading `{ ...solution }` breaks the UI.

---

## 4. Data model (`js/models.js`)

| Class | Responsibility |
|-------|----------------|
| `City` | `id`, `x`, `y`, `items[]` (items physically at this city) |
| `Item` | `id`, `profit`, `weight`, `cityId` |
| `TTPInstance` | Header fields + `cities[]`, `items[]`, helpers |
| `Solution` | `tour`, `pickedItems`, `strategyName`, `evaluation` (from evaluator) |

The **evaluator** attaches `evaluation` with fields such as `totalProfit`, `totalWeight`, `totalTime`, `objective`, per-leg arrays, etc.

---

## 5. Execution flow

### 5.1 Startup

1. `DOMContentLoaded` registers tab, upload, sample, algorithm, selector, resize handlers.
2. `import('./ttpMaker.js')` → `initTtpMaker({ loadInstance, log, getCurrentInstance })`.
3. Log “ready”.

### 5.2 Load instance

1. `parseTTPFile` → `TTPInstance`.
2. `loadInstance`: reset `solutions`, `bruteForceResults`, `currentDisplayedSolution`; `buildDistanceMatrix`; update info bar; enable/disable brute force; `clearVisualizations`.

### 5.3 Run single strategy

1. `runWithTimer` yields to the event loop (`setTimeout` ~10 ms) so the log updates.
2. Solver returns `Solution`; set `strategyName`; `upsertSolution`; `displaySolution`; individual buttons also call `refreshComparisonViews`.

### 5.4 Run All

1. Clear `solutions`, `bruteForceResults`.
2. Optionally `runBruteForce` (if `canBruteForce`).
3. Sequentially: greedy+DP, greedy+greedy, 2-opt+DP, divide & conquer.
4. `refreshComparisonViews` (comparison panel + scatter).
5. `displaySolution` on the **best objective** among `solutions`.

---

## 6. Module catalog

### 6.1 Core

| File | Exports / role |
|------|----------------|
| `js/parser.js` | `parseTTPFile(text): TTPInstance` |
| `js/models.js` | `City`, `Item`, `TTPInstance`, `Solution` |
| `js/main.js` | Side effects only (no exports) |

### 6.2 Algorithms (`js/algorithms/`)

| File | Key exports |
|------|-------------|
| `ttpEvaluator.js` | `computeDistance`, `buildDistanceMatrix`, `computeSpeed`, `evaluateSolution`, `remainingDistance` |
| `bruteForce.js` | `BRUTE_FORCE_MAX_CITIES`, `BRUTE_FORCE_MAX_ITEMS`, `canBruteForce`, `solveBruteForce` |
| `greedyNN.js` | `greedyNearestNeighbor` |
| `dpKnapsack.js` | `solveDPKnapsack`, `solveGreedyItems` |
| `twoOpt.js` | `solveTwoOpt` |
| `divideConquer.js` | `solveDivideConquer` |

### 6.3 Visualization (`js/visualization/`)

| File | Key exports |
|------|-------------|
| `tourMap.js` | `drawTourMap(canvas, instance, evaluation)` |
| `timeline.js` | `createTimelineChart(canvas, instance, evaluation)` |
| `scatterPlot.js` | `createScatterPlot(canvas, solutions, bruteForceResults?)` |
| `enumerationTable.js` | `renderEnumerationTable(container, results)` — may stash master list on container for sort refresh |
| `comparisonPanel.js` | `renderComparisonPanel(container, solutions)` |

### 6.4 TTP Maker (`js/ttpMaker.js`)

- **Loaded via** `import('./ttpMaker.js')` from `main.js`.
- **Exports** `initTtpMaker(api)` where `api` provides:
  - `loadInstance(instance)` — same as file load path
  - `log(message, type?)`
  - `getCurrentInstance()` — for “fill form from loaded”
- **Responsibilities:** `<dialog>` wiring, table editors, validation, `.ttp` text generation, download blob.

---

## 7. HTML / CSS contracts

- **Tab panels** use `.tab-btn` with `data-tab` and panels `id="panel-{name}"`.
- **Canvas elements** expect layout from CSS before drawing; `switchTab('map')` triggers a delayed `displaySolution` to fix sizing.
- **`<dialog>`** for TTP Maker: ensure closed dialogs do not block clicks (see `css/style.css` for `dialog:not([open])` rules if present).

---

## 8. Extension points

### 8.1 Add a new solver

1. Implement in `js/algorithms/yourSolver.js` returning a **`Solution`** with `evaluation` from `evaluateSolution`.
2. Import in `main.js`; add `async function runYourSolver()` mirroring existing runners (`upsertSolution`, `strategyName`).
3. Wire a button in `index.html` and `addEventListener` + `refreshComparisonViews`.
4. Optionally include in `runAll()` and document in [USER_GUIDE.md](./USER_GUIDE.md) / [ALGORITHMS_AND_FORMAT.md](./ALGORITHMS_AND_FORMAT.md).

### 8.2 Add a visualization

1. New module under `js/visualization/`.
2. Export a single entry function taking DOM nodes and `currentInstance` / `solutions` as needed.
3. Call from `displaySolution`, `refreshComparisonViews`, or tab switch as appropriate.

---

## 9. Performance and limits

- Brute force is **hard-capped** by city/item counts in `bruteForce.js`; UI mirrors this.
- 2-opt uses a **fixed max iterations** argument (see `runTwoOpt` call in `main.js`).
- Large instances: Run All may take noticeable wall time; `runWithTimer` logs duration.

---

## 10. Testing (manual checklist)

1. Serve project root; open app; confirm no console errors on load.
2. Load each of the five `data/*.ttp` files; verify info bar.
3. Run All on small instance; verify enumeration + optimal highlight + comparison.
4. Run All on large instance; verify no brute force, comparison still ranks.
5. TTP Maker: apply, download, re-upload generated file.
6. Solution selector switches map/timeline without errors.

---

## 11. Related documentation

- [USER_GUIDE.md](./USER_GUIDE.md) — end-user behavior  
- [ALGORITHMS_AND_FORMAT.md](./ALGORITHMS_AND_FORMAT.md) — math and `.ttp` grammar  
- [TECHNICAL_REFERENCE.md](./TECHNICAL_REFERENCE.md) — quick formulas and complexity  

---

*For course requirement traceability, see [REQUIREMENTS_COMPLIANCE.md](./REQUIREMENTS_COMPLIANCE.md).*

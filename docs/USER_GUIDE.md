# User guide — TTP Interactive Solver

This guide describes **every interactive element** of the web application and how to interpret the outputs. No programming knowledge is required for normal use.

---

## 1. Prerequisites

- A **modern desktop browser** (Chrome, Edge, Firefox, or Safari) with JavaScript enabled.
- The site must be served over **HTTP** or **HTTPS** (not opened as a raw `file://` URL), because the app uses **ES modules** and **`fetch()`** for files under `data/`.

See [../README.md](../README.md) for copy-paste server commands.

---

## 2. Screen layout (top to bottom)

1. **Top bar** — **TTP Maker** button (opens the instance editor modal).
2. **Header** — Title and short description of the problem.
3. **Load instance** — File drop zone and **five built-in benchmark** buttons.
4. **Instance info bar** — Appears after a successful load: name, city count, item count, capacity, speed range, rent rate.
5. **Algorithm controls** — Run All, individual strategies, and (when applicable) the **solution** dropdown.
6. **Tabs** — Map, timeline, scatter, enumeration, comparison.
7. **Algorithm log** — Timestamped messages (info, success, error).

---

## 3. Loading instances

### 3.1 Built-in benchmarks

| Button label | File | Approximate size | Brute force |
|--------------|------|-------------------|-------------|
| #1 Small | `sample_small.ttp` | 5 cities, 6 items | Enabled |
| #2 | `benchmark_04.ttp` | 10 cities, 12 items | Disabled |
| #3 | `benchmark_05.ttp` | 12 cities, 18 items | Disabled |
| #4 Medium | `sample_medium.ttp` | 15 cities, 20 items | Disabled |
| #5 Large | `sample_large.ttp` | 30 cities, 45 items | Disabled |

Brute force is **intentionally** limited to small instances for performance; the UI disables the button when the loaded instance exceeds **5 cities** or **6 items** (see `canBruteForce` in code).

### 3.2 Uploading a file

- Drag a **`.ttp`** or **`.txt`** file onto the dashed upload zone, or click the zone to browse.
- The parser expects the standard header + `NODE_COORD_SECTION` + `ITEMS SECTION` layout (see [ALGORITHMS_AND_FORMAT.md](./ALGORITHMS_AND_FORMAT.md) §5). Invalid files produce an error line in the **Algorithm log**.

---

## 4. Running algorithms

| Control | Action |
|---------|--------|
| **Run All & Compare** | Clears prior run state, runs every applicable strategy in sequence (brute force only if allowed), refreshes comparison and scatter, selects the **best objective** for the map/timeline. |
| **Brute Force** | Full enumeration on tiny instances; fills the **Enumeration** tab and may add points to the scatter “cloud”. |
| **Greedy NN + DP** | Nearest-neighbor tour, then DP knapsack on that tour. |
| **Greedy NN + Greedy Items** | Same tour; items chosen by profit/weight ratio (baseline). |
| **2-Opt + DP** | NN tour, then local search with DP re-evaluated after each improving swap. |
| **Divide & Conquer** | Quadrant split, regional NN, merged tour, global DP. |

Re-running a **named** strategy **replaces** the previous result for that strategy in the comparison list (no duplicate cards for the same name).

### 4.1 Solution dropdown

After at least one strategy has produced a solution, a **dropdown** lists strategies with their **objective** values. Changing the selection updates the **Tour Map** and **Item Timeline** for that solution without re-running algorithms.

---

## 5. Tabs explained

### 5.1 Tour Map

- Cities scaled to the canvas; **city 1** is the highlighted start.
- Directed edges show travel order; color reflects **speed** on that leg (green = faster, red = slower under load).
- Cities where items were collected show a marker; an overlay summarizes **objective**, profit, weight, and time.

### 5.2 Item Timeline (Chart.js)

- Horizontal axis: cities in **visit order**.
- Series: weight added at each stop, **cumulative** weight, and **speed** for each leg (see tooltips for item IDs).

### 5.3 Profit vs Weight

- Each **strategy** is one point: **total weight** (x) vs **total profit** (y).
- Tooltips include **objective** where available.
- After brute force, a **sampled cloud** of feasible solutions may appear for context.

### 5.4 Enumeration table

- Visible only after **Brute Force** on an eligible instance.
- Sortable columns; the **true optimal** row (best **objective** over the full enumeration) stays highlighted even if you sort by another column.
- **Show all** expands the row limit without losing the canonical enumeration for sorting.

### 5.5 Strategy comparison

- Cards sorted by **objective** (higher is better); best card is marked.
- Summary table includes **gap** from best; small numeric safeguards apply when the best objective is near zero.

---

## 6. TTP Maker (custom instances)

1. Click **TTP Maker** in the top bar.
2. Edit **problem name**, **capacity**, **min/max speed**, **renting ratio**.
3. Maintain the **Cities** table (ID, X, Y). **City ID 1** must exist (depot convention for this solver).
4. Maintain the **Items** table (ID, profit, weight, **city ID** where the item appears). Every city ID must exist in the city list.
5. **Apply to solver** — Validates, builds an instance, loads it like a file (modal closes).
6. **Download .ttp** — Writes a text file compatible with the same parser used for uploads.
7. **Reset to starter** — Small template (3 cities, 2 items).
8. **Fill from loaded instance** — Copies the currently loaded problem into the form for editing.

---

## 7. Algorithm log

- **Info** — general progress (e.g. “Running …”).
- **Success** — completed runs and load events.
- **Error** — parse failures, validation errors from TTP Maker, chart failures (non-fatal where caught).

---

## 8. Troubleshooting

| Symptom | Likely cause | What to do |
|---------|----------------|------------|
| Blank page or “nothing works” | `main.js` not loading (404, MIME, or syntax error) | Use a local server; open DevTools → **Console** for errors; hard refresh (Ctrl+F5). |
| Samples fail to load | Wrong server root | Serve the **project root** (folder containing `index.html` and `data/`). |
| Brute force disabled | Instance too large | Use **#1 Small** or a custom instance ≤5×6. |
| Charts empty or errors | Chart.js blocked or canvas size zero | Allow CDN scripts; switch to the relevant tab so the canvas has layout size. |
| `runtime.lastError` in console | Browser extension | Ignore or disable extensions; not from this app. |

---

## 9. Glossary

| Term | Meaning |
|------|---------|
| **TTP** | Traveling Thief Problem: TSP tour + knapsack with speed coupling to weight. |
| **Objective** | `totalProfit − rentingRate × totalTravelTime` (maximize). |
| **Tour** | Order of city IDs visited, starting from city 1, closing the loop. |
| **Picking plan** | Boolean per item: steal or skip, subject to capacity in the simulator. |
| **Renting rate** | Cost multiplier on total travel time in the objective. |

---

*For formulas and implementation details, see [ALGORITHMS_AND_FORMAT.md](./ALGORITHMS_AND_FORMAT.md).*

# Technical reference — TTP solver implementation

Concise reference for **formulas**, **exports**, and **complexity**. For narrative documentation, start at [**docs/README.md**](./README.md) (hub), then [**USER_GUIDE.md**](./USER_GUIDE.md), [**ALGORITHMS_AND_FORMAT.md**](./ALGORITHMS_AND_FORMAT.md), and [**DEVELOPER_GUIDE.md**](./DEVELOPER_GUIDE.md).

---

## 1. Symbols (instance file → code)

| Symbol | Code / file | Meaning |
|--------|----------------|--------|
| \(n\) | `cities.length` | Number of cities |
| \(m\) | `items.length` | Number of items |
| \(W_{\max}\) | `TTPInstance.capacity` | Knapsack capacity |
| \(v_{\max}, v_{\min}\) | `maxSpeed`, `minSpeed` | Speed empty / full |
| \(R\) | `rentingRate` | Renting ratio (cost per unit time) |
| City \(i\) | `City`: `id`, `x`, `y`, `items[]` | Coordinates; items available only at that city |
| Item | `Item`: `id`, `profit`, `weight`, `cityId` | 0/1 decision |

---

## 2. Core formulas (`js/algorithms/ttpEvaluator.js`)

**Distance (2D, CEIL_2D style)**

\[
d(a,b) = \left\lceil \sqrt{(x_a-x_b)^2 + (y_a-y_b)^2} \right\rceil
\]

**Speed at carried weight \(w\)**

\[
v(w) = v_{\max} - (v_{\max} - v_{\min}) \cdot \frac{w}{W_{\max}}
\]

**Leg time** after leaving a city with current weight \(w\):

\[
t_{\text{leg}} = \frac{d}{v(w)}
\]

**Objective (maximize)**

\[
Z = \sum_{j \in S} p_j - R \cdot \sum_{\text{legs}} t_{\text{leg}}
\]

where \(S\) is the set of picked items and profits \(p_j\) are summed once.

**Simulation order** (important for correctness): at each tour position, apply all pickups scheduled at that city (subject to capacity), update \(w\), then compute time for the edge to the next city.

---

## 3. Module index

| File | Exports / role |
|------|------------------|
| `js/models.js` | `City`, `Item`, `TTPInstance`, `Solution` |
| `js/parser.js` | `parseTTPFile(text) → TTPInstance` |
| `js/algorithms/ttpEvaluator.js` | `computeDistance`, `buildDistanceMatrix`, `computeSpeed`, `evaluateSolution`, `remainingDistance` |
| `js/algorithms/bruteForce.js` | `canBruteForce`, `solveBruteForce` |
| `js/algorithms/greedyNN.js` | `greedyNearestNeighbor` |
| `js/algorithms/dpKnapsack.js` | `solveDPKnapsack`, `solveGreedyItems` |
| `js/algorithms/twoOpt.js` | `solveTwoOpt` |
| `js/algorithms/divideConquer.js` | `solveDivideConquer` |
| `js/visualization/tourMap.js` | `drawTourMap` |
| `js/visualization/timeline.js` | `createTimelineChart` (Chart.js) |
| `js/visualization/scatterPlot.js` | `createScatterPlot` |
| `js/visualization/enumerationTable.js` | `renderEnumerationTable` |
| `js/visualization/comparisonPanel.js` | `renderComparisonPanel` |
| `js/main.js` | DOM wiring, `runAll`, loaders |
| `js/ttpMaker.js` | `initTtpMaker` (dynamic import from `main.js`) |

---

## 4. Asymptotic complexity (informal)

| Procedure | Time | Notes |
|-----------|------|--------|
| `buildDistanceMatrix` | \(O(n^2)\) | |
| `evaluateSolution` | \(O(n + m)\) per eval | Linear scan cities/items |
| `greedyNearestNeighbor` | \(O(n^2)\) | |
| `solveDPKnapsack` | \(O(m \cdot W_{\max})\) | 0/1 knapsack on adjusted weights |
| `solveTwoOpt` | Multiple passes × \(O(n^2)\) tours × DP cost | `maxIter` capped in `main.js` |
| `solveBruteForce` | \(O((n-1)! \cdot 2^m \cdot \text{eval})\) | Only for tiny \(n,m\) |
| `solveDivideConquer` | Dominated by NN + merges + one global DP | Quadrant count is constant (4) |

---

## 5. External dependencies

- **Chart.js** 4.4.7 (UMD) loaded from CDN in `index.html`.
- **Fonts:** Google Fonts (Inter, JetBrains Mono) from `css/style.css`.

---

## 6. Scatter plot semantics

- **X-axis:** total picked weight after simulation.
- **Y-axis:** total profit \(\sum p_j\) over picked items (matches course wording for profit–weight view).
- **Tooltips:** also show **objective** \(Z\) as `Obj=…` so readers can relate profit to time penalty.

---

*For requirement-by-requirement mapping, see [REQUIREMENTS_COMPLIANCE.md](./REQUIREMENTS_COMPLIANCE.md).*

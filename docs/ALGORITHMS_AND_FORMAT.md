# Algorithms, evaluator, and file format

This document specifies **what is computed** (mathematics and semantics), **how each solver behaves**, and the **`.ttp` text format** accepted by the parser.

---

## 1. Problem definition

### 1.1 Sets and indices

- Cities \(V = \{1,\ldots,n\}\), with city **1** the start depot (convention in this codebase).
- Items \(I = \{1,\ldots,m\}\); each item \(j\) has profit \(p_j\), weight \(w_j\), and availability city \(c_j \in V\).
- Knapsack capacity \(W_{\max}\).
- Speed bounds \(v_{\min}, v_{\max}\) (at weight \(W_{\max}\) and \(0\) respectively in code: see §2).
- Renting rate \(R \geq 0\).

### 1.2 Decisions

- A **tour** is a permutation of all cities starting at 1, interpreted as a cycle (return to 1 implied in evaluation).
- A **pick set** \(S \subseteq I\) is feasible if \(\sum_{j \in S} w_j \leq W_{\max}\) and items are only counted when **picked at** their city during the tour (0/1, at most once).

### 1.3 Dynamics (simulation order)

At each visit to city \(i\) (in tour order):

1. Pick any subset of still-unpicked items with \(c_j = i\) that fits remaining capacity.
2. Update carried weight.
3. Travel to the next city: leg time uses distance and **current speed** after pickups at \(i\).

This order matches `evaluateSolution` in `ttpEvaluator.js`.

---

## 2. Distance, speed, time, objective

### 2.1 Distance (CEIL_2D style)

For cities \(a,b\) with integer coordinates:

\[
d(a,b) = \left\lceil \sqrt{(x_a-x_b)^2 + (y_a-y_b)^2} \right\rceil
\]

### 2.2 Speed at carried weight \(w\)

Code uses linear interpolation from **max speed when empty** to **min speed when full**:

\[
v(w) = v_{\max} - (v_{\max} - v_{\min}) \cdot \frac{w}{W_{\max}}
\]

with \(w\) clamped to \([0, W_{\max}]\) in implementation.

### 2.3 Leg time

For a leg of distance \(d\) leaving with weight \(w\):

\[
t_{\text{leg}} = \frac{d}{v(w)}
\]

### 2.4 Objective (maximize)

\[
Z = \sum_{j \in S} p_j - R \cdot T_{\text{total}}
\]

where \(T_{\text{total}}\) is the sum of leg times under the simulation above.

**Source of truth:** `evaluateSolution(instance, tour, pickedItemIds, distMatrix)` in `ttpEvaluator.js`.

---

## 3. Helper: remaining distance

`remainingDistance(distMatrix, tour, cityIndex)` sums leg distances from a position along the fixed tour to the return to city 1. Used by **DP knapsack** for profit adjustment heuristics.

---

## 4. Algorithms (implementation-level)

### 4.1 Brute force (`bruteForce.js`)

- **Eligibility:** `canBruteForce` — default caps **5 cities** and **6 items** (exported constants).
- **Tours:** All permutations of cities \(\{2,\ldots,n\}\); **reverse duplicates** removed so undirected tour pairs are not double-counted (`uniqueTours`).
- **Items:** All subsets via bitmask (`2^m` plans) consistent with capacity check where applicable; full scoring uses `evaluateSolution` for each \((\text{tour}, S)\).
- **Output:** Optimal `Solution` plus `allResults` for enumeration UI.

### 4.2 Greedy nearest neighbor (`greedyNN.js`)

- Start at city 1; repeatedly visit the **closest** unvisited city by precomputed matrix.
- **Time:** \(O(n^2)\) typical double loop.

### 4.3 DP knapsack on fixed tour (`dpKnapsack.js`)

- **Input:** Fixed `tour`, `distMatrix`, `instance`.
- **Item order:** Cities visited in tour order; at each city, append that city’s items (by id order within city) to the DP sequence — **city-by-city staging**.
- **Adjusted profit:** Uses `remainingDistance` from the item’s pickup city; subtracts a surrogate time-penalty term from profit so the knapsack prefers items that “pay for” their weight over long remaining routes (see JSDoc in file).
- **Output:** A picked set is then scored with **`evaluateSolution`** (exact physics, not the linear surrogate alone).

### 4.4 Greedy items (`dpKnapsack.js`)

- Same tour as provided; sort stealable items by **profit/weight** ratio (subject to city visit feasibility in implementation); pack greedily; `evaluateSolution`.

### 4.5 2-opt + DP (`twoOpt.js`)

- Begin from NN tour; iteratively try **2-opt swaps** (segment reversal). For each improving tour, **re-run** `solveDPKnapsack`.
- Stops when no improving swap or iteration budget reached (parameter from `main.js`).

### 4.6 Divide and conquer (`divideConquer.js`)

- **Partition:** Median split of coordinates into **four quadrants** (NW, NE, SE, SW processing order — see code).
- **Per region:** NN on subset of cities; items restricted to cities in region.
- **Merge:** Connect subtours using closest inter-region endpoints; **deduplicate** repeated cities on bridges.
- **Packing:** One **global** `solveDPKnapsack` on the stitched full tour.

---

## 5. `.ttp` file format (parser contract)

The parser (`parseTTPFile`) scans lines after trimming. Section headers **must** appear exactly as below (case-sensitive prefixes as implemented).

### 5.1 Header

Key–value lines, typically `KEY : value`. Recognized keys include:

| Key (substring match in code) | Maps to |
|-------------------------------|---------|
| `PROBLEM NAME` | instance name |
| `DIMENSION` | number of cities |
| `NUMBER OF ITEMS` | item count |
| `CAPACITY OF KNAPSACK` | \(W_{\max}\) |
| `MIN SPEED` | \(v_{\min}\) |
| `MAX SPEED` | \(v_{\max}\) |
| `RENTING RATIO` | \(R\) |

### 5.2 `NODE_COORD_SECTION`

After the header line, each non-empty line: **`city_id x y`** (integers).

### 5.3 `ITEMS SECTION`

Each line: **`item_id profit weight city_id`**.

### 5.4 Consistency

- City IDs in items must correspond to parsed cities.
- Counts in header should match provided rows (parser behavior may still proceed; invalid geometry breaks solvers).

**Canonical examples:** files under `data/`.

---

## 6. Visualization semantics (algorithm outputs → charts)

| View | Mapping |
|------|---------|
| Tour map | `evaluation` path, speeds, pickups |
| Timeline | Per-city pickups, cumulative weight, leg speeds |
| Scatter | X = total picked **weight**, Y = total **profit**; tooltip includes **objective** |
| Enumeration | One row per enumerated solution; optimal row = max **objective** over full list |
| Comparison | Sort primarily by **objective** |

---

## 7. Complexity summary

| Component | Order (informal) |
|-----------|------------------|
| Distance matrix | \(O(n^2)\) |
| `evaluateSolution` | \(O(n + m)\) per call |
| NN | \(O(n^2)\) |
| 0/1 knapsack DP | \(O(m \cdot W_{\max})\) with \(m\) staged items |
| Brute force | factorial in \(n\) × exponential in \(m\) × eval — **tiny only** |
| 2-opt | iterations × swap search × DP |
| D&C | constant quadrants × regional NN + merge + one global DP |

See also [TECHNICAL_REFERENCE.md](./TECHNICAL_REFERENCE.md).

---

## 8. References

- Polyakovskiy et al. — TTP benchmarks and problem context.
- Course Project 26 brief — required strategies and reporting expectations.

---

*For UI behavior, see [USER_GUIDE.md](./USER_GUIDE.md). For code layout, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).*

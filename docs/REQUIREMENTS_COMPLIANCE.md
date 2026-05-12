# Requirements compliance — Project 26 (Traveling Thief Problem)

This document maps the **course project description** to this repository’s implementation. Use it for grading or submission appendices.

**Related documentation:** [Documentation hub](./README.md) · [User guide](./USER_GUIDE.md) · [Algorithms & format](./ALGORITHMS_AND_FORMAT.md) · [Developer guide](./DEVELOPER_GUIDE.md) · [Technical reference](./TECHNICAL_REFERENCE.md)

**Legend:** ✓ Satisfied · ≈ Mostly satisfied with noted difference · ✗ Not satisfied / gap

---

## 0. Supplementary tooling (not always in brief)

| Addition | Implementation | Note for graders |
|----------|----------------|------------------|
| **TTP Maker** | `js/ttpMaker.js` (lazy-loaded), dialog UI | Lets authors create/edit/download `.ttp` files; does not change solver contracts. |

---

## 1. Problem statement and learning goals

| Requirement (paraphrased) | Implementation | Match |
|---------------------------|----------------|-------|
| TTP combines TSP + 0/1 knapsack with **inseparable** coupling | Speed decreases with weight; evaluator applies pickups then travel time per leg (`ttpEvaluator.js`). | ✓ |
| Speed decreases **linearly** with current weight | `computeSpeed`: `v_max − (v_max − v_min) × (w/capacity)`. | ✓ |
| Heavy items early affect later legs | Simulation order: pick at city *i*, then traverse leg *i→i+1* at updated weight. | ✓ |
| Analyze why “TSP then knapsack” decomposition is suboptimal | Greedy-items baseline vs DP-on-tour; 2-opt changes both tour and best packing; D&C compares full greedy+DP vs regional decomposition (`divideConquer.js`). UI supports side-by-side comparison. | ✓ (analytic write-up left to report text) |

---

## 2. Algorithm usage (as in the project brief)

### 2.1 DP Knapsack (item selection, fixed tour)

| Brief | This project | Match |
|-------|--------------|-------|
| 0/1 knapsack DP on a **fixed** tour | `solveDPKnapsack` in `js/algorithms/dpKnapsack.js`. | ✓ |
| Effective cost related to **weight × remaining travel distance** | Each item gets `remainingDistance` from its pickup city to end of tour; a **time penalty** term proportional to `weight × remDist × (v_max−v_min)/(capacity×v_max²)` is subtracted from profit to form **adjusted profit**; knapsack maximizes sum of adjusted profits. | ≈ |
| “Build DP table **city-by-city** along the tour and backtrack” | Items are ordered by **visiting the fixed tour city-by-city**; at each city, that city’s items (by id) are appended to the DP stage order. One space-efficient 0/1 knapsack runs over that sequence with per-item adjusted profits, then **exact** `evaluateSolution`. | ✓ |
| **Surrogate vs exact** | Adjusted profits approximate time cost; final objective uses the full velocity model (not fully exact DP on the nonlinear objective). | ≈ (standard pragmatic TTP heuristic) |

**Suggested wording for your report:** *“We stage the knapsack DP in tour order: items become decisions in the sequence the vehicle visits cities. Coefficients encode remaining-distance penalty; the chosen set is evaluated with the exact TTP simulator.”*

---

### 2.2 Greedy nearest neighbor (tour) + DP + 2-opt

| Brief | This project | Match |
|-------|--------------|-------|
| NN from city 1, closest unvisited | `greedyNearestNeighbor` (`greedyNN.js`). | ✓ |
| O(n²) | Double loop over cities. | ✓ |
| After tour: run DP knapsack | `main.js` / `runGreedyDP`, `runTwoOpt` (initial step). | ✓ |
| 2-opt: swap edge pairs, **re-run DP** after changes | `twoOpt.js`: segment reversal; each candidate tour → `solveDPKnapsack`. | ✓ |

---

### 2.3 Brute force (small instances)

| Brief | This project | Match |
|-------|--------------|-------|
| ≤5 cities, ≤6 items | `canBruteForce` gates the UI; enumeration intended for this size (`bruteForce.js` + `main.js`). | ✓ |
| (n−1)!/2 tours | Permutations of cities 2..n with reverse-tour deduplication (`uniqueTours`). | ✓ |
| 2^m item subsets | Bitmask enumeration `getAllItemSubsets`. | ✓ |
| Use velocity formula for travel time | `evaluateSolution` for every pair. | ✓ |
| “Profit = item values − travel time penalty” | Implemented as **TTP objective**: `totalProfit − rentingRate × totalTime` (renting rate scales time cost—standard in TTP literature). | ✓ (equivalent structure; not “profit minus raw time” without *R*) |
| Ground truth optimal (tour, item-set) | `solveBruteForce` returns optimal `Solution` + `allResults`. | ✓ |

`solveBruteForce` throws if `canBruteForce` is false (same limits as the UI: **≤5 cities, ≤6 items**).

---

### 2.4 Divide and conquer (region split)

| Brief | This project | Match |
|-------|--------------|-------|
| Partition for **large** instances | `solveDivideConquer` used on any loaded instance; meaningful on medium/large. | ✓ |
| **“Recursive” spatial bisection** | One recursive **step** = four-way median split (benchmark-style decomposition). Sub-quadrants are not split again. | ≈ |
| TSP + knapsack per region (greedy + DP) | `solveRegion`: NN on subset of cities (items filtered to those cities). | ≈ **Note:** regional NN does not re-run full-instance DP *inside* each region with global renting parameters in a formally isolated sub-instance class; it builds sub-tours then **one** global `solveDPKnapsack` on the stitched tour. |
| Connect sub-tours with **minimum inter-quadrant** connection | Quadrants processed **NW→NE→SE→SW**; `findClosestPair` + `reorderTour`; consecutive duplicate cities at bridges are **removed** when concatenating. | ≈ (first region is not rotated toward the bridge; still a heuristic merge) |
| Compare vs full-instance greedy | **Run All** runs greedy+DP, greedy+greedy, 2-opt+DP, D&C+DP and comparison panel ranks results. | ✓ |

---

## 3. Expected outputs

| Expected output | Implementation | Match |
|-----------------|----------------|-------|
| **City tour map:** coordinates, directed tour, arrows, pickups, profit | `tourMap.js`: scaled coordinates, arrows colored by leg speed, start city highlight, pickup marker; overlay shows **objective**, profit, weight, time. | ✓ (brief asks for total profit; we show profit **and** objective) |
| **Item timeline:** city order, items per city, cumulative weight, speed per leg | `timeline.js`: Chart.js bar/line mix; tooltips list items picked at each city; cumulative weight and speed series. | ✓ |
| **Profit vs weight scatter:** strategies + brute optimum, efficient frontier | `scatterPlot.js`: X = total weight, Y = **total profit** (aligned with brief); optional cloud of sampled brute-force points; brute optimum styled distinctly. | ✓ |
| **Enumeration table:** all (tour, item-set), sorted, optimal highlighted | `enumerationTable.js`: default sort by **objective**; **all** columns sortable; row highlight uses **true best objective** from the full enumeration (even after re-sorting by profit/time). | ✓ |
| **Strategy comparison panel** | `comparisonPanel.js`: cards + table; objective, profit, weight, time; best highlighted. | ✓ |
| Ranked by “total profit **and** travel time**” | Panel ranks by **single score: objective** (combines profit and time via *R*). Profit and time are both displayed. | ≈ |

---

## 4. “Five benchmark instances”

| Brief | This project | Match |
|-------|--------------|-------|
| Results on **5** benchmark instances | Five `.ttp` files ship in `data/`: `sample_small.ttp`, `benchmark_04.ttp`, `benchmark_05.ttp`, `sample_medium.ttp`, `sample_large.ttp` (mirrored in the UI). | ✓ |

Use **Run All & Compare** on each file and capture the strategy comparison panel / scatter for your report table.

---

## 5. Summary table

| Area | Overall |
|------|---------|
| Core TTP physics and objective | ✓ |
| NN + DP + 2-opt pipeline | ✓ |
| Brute force small instances + table | ✓ |
| D&C regional decomposition (concept + UI comparison) | ≈ (single-level quadrant split; heuristic merge) |
| DP item selection (tour order + surrogate profits + exact eval) | ✓ / ≈ (see §2.1) |
| Scatter (weight, profit) | ✓ |
| Five fixed benchmarks in-repo | ✓ |

---

## 6. Suggested report sections (checklist)

1. Problem definition and objective formula (cite `models.js` / evaluator).
2. Pseudocode or flowchart for each algorithm module.
3. Screenshot set: map, timeline, scatter, enumeration (small instance), comparison (medium or large).
4. Table of objectives (and profit/time) across **5** instances × strategies.
5. Short discussion: why greedy packing underperforms DP-on-tour; why 2-opt helps; whether D&C helped or hurt vs monolithic greedy+DP on your instances.

---

*Document version: aligned with repository as of documentation pass (full `docs/` set + TTP Maker). Update paths if the project folder is moved.*

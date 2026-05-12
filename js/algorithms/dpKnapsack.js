/**
 * ============================================================
 * dpKnapsack.js — Position-Aware Dynamic Programming Knapsack
 * ============================================================
 * 
 * PURPOSE:
 * Given a FIXED tour order, decide which items to pick up to maximize
 * the TTP objective. This is NOT a standard 0/1 knapsack because
 * the "cost" of picking an item depends on WHERE in the tour it is.
 * 
 * WHY IT'S DIFFERENT FROM STANDARD KNAPSACK:
 * In standard 0/1 knapsack:
 *   - Each item has a fixed value and weight
 *   - You maximize total value subject to weight capacity
 * 
 * In TTP knapsack:
 *   - Each item's EFFECTIVE value depends on when you pick it up
 *   - Picking a heavy item EARLY means carrying it for longer → more slowdown
 *   - The "cost" of an item is: weight × remaining_distance × speed_penalty
 *   - So the same item might be worth picking at the end of the tour
 *     but NOT worth picking at the beginning
 * 
 * ALGORITHM (Position-Aware DP):
 * 
 * 1. Walk the tour from city 1 to city n
 * 2. At each city, gather the items available there
 * 3. For each item, compute its "adjusted value":
 *    adjustedValue = profit - rentingRate × weight × remainingDist / avgSpeed
 *    (This approximates how much picking this item will cost in travel time)
 * 4. Build a DP table: dp[w] = best total adjusted value using capacity w
 * 5. Process items city-by-city along the tour
 * 6. Backtrack to find which items were selected
 * 
 * IMPLEMENTATION NOTE:
 * We use a simplified 1D DP array (space-optimized knapsack).
 * dp[w] = maximum net benefit achievable with remaining capacity w.
 * 
 * COMPLEXITY:
 * - Time: O(m × W) where m = number of items, W = capacity
 * - Space: O(W) for the DP array
 * ============================================================
 */

import { buildDistanceMatrix, remainingDistance, evaluateSolution } from './ttpEvaluator.js';
import { Solution } from '../models.js';

/**
 * Solve the item selection problem for a fixed tour using position-aware DP.
 * 
 * @param {TTPInstance} instance   - The problem instance
 * @param {number[]}    tour       - Fixed tour (array of city IDs)
 * @param {number[][]}  [distMatrix] - Optional precomputed distance matrix
 * @returns {Solution} - The solution with the optimal picking plan for this tour
 * 
 * STEP-BY-STEP:
 * 
 * Step 1: For each city in the tour, compute the remaining distance
 *         (how far we still have to travel after leaving this city).
 *         Items picked earlier have their weight carried over more distance.
 * 
 * Step 2: For each item, compute an "adjusted profit" that accounts for
 *         the slowdown cost of carrying it:
 *         adjustedProfit = profit - rentingRate × weight × remainingDist × speedFactor
 * 
 * Step 3: Run 0/1 knapsack DP on these adjusted profits.
 * 
 * Step 4: Backtrack through the DP table to find which items to pick.
 * 
 * Step 5: Evaluate the solution using the EXACT velocity formula.
 */
export function solveDPKnapsack(instance, tour, distMatrix = null) {
  const { cities, items, capacity, rentingRate, maxSpeed, minSpeed } = instance;
  const m = items.length;

  if (!distMatrix) {
    distMatrix = buildDistanceMatrix(cities);
  }

  // ── Step 1: Compute remaining distance for each city in the tour ──
  // remainingDist[i] = total distance from tour position i to the end (back to start)
  const tourRemDist = [];
  for (let i = 0; i < tour.length; i++) {
    tourRemDist.push(remainingDistance(tour, i, cities, distMatrix));
  }

  // Map city ID → position in tour
  const cityTourPos = {};
  tour.forEach((cityId, idx) => { cityTourPos[cityId] = idx; });

  // ── Step 2: Compute adjusted profit for each item ──
  // The idea: picking item j at position p in the tour means carrying
  // weight_j for remainingDist[p] distance. This slows us down.
  // 
  // Approximate slowdown cost:
  //   The speed reduction per unit weight is (v_max - v_min) / W_max
  //   Extra time per unit distance ≈ weight / (v_max²) × (v_max - v_min) / W_max
  //   (using first-order approximation of 1/v(w))
  //
  // Simplified adjusted profit:
  //   adjustedProfit = profit - rentingRate × weight × remainingDist[p] × speedPenalty
  const speedRange = maxSpeed - minSpeed;
  const adjustedItems = items.map((item, idx) => {
    const pos = cityTourPos[item.cityId];
    if (pos === undefined) {
      return { idx, adjustedProfit: 0, weight: item.weight, item };
    }
    const remDist = tourRemDist[pos];

    // Approximate the time penalty of carrying this item's weight
    // over the remaining distance. Using linearized speed model:
    // Extra time ≈ weight × remDist × (speedRange) / (capacity × maxSpeed²)
    const timePenalty = item.weight * remDist * speedRange / (capacity * maxSpeed * maxSpeed);
    const adjustedProfit = item.profit - rentingRate * timePenalty;

    return { idx, adjustedProfit, weight: item.weight, item };
  });

  // ── Step 2b: Visit order along the fixed tour (city-by-city item staging) ──
  // DP stages follow the tour: all items at the first visited city, then the next, etc.
  // (Stable tie-break: item id within the same city.)
  const tourOrderIdx = [];
  const seenIdx = new Set();
  for (const cityId of tour) {
    const city = cities.find((c) => c.id === cityId);
    if (!city) continue;
    const local = [...city.items].sort((a, b) => a.id - b.id);
    for (const item of local) {
      const idx = items.indexOf(item);
      if (idx >= 0 && !seenIdx.has(idx)) {
        seenIdx.add(idx);
        tourOrderIdx.push(idx);
      }
    }
  }
  for (let idx = 0; idx < m; idx++) {
    if (!seenIdx.has(idx)) tourOrderIdx.push(idx);
  }

  // ── Step 3: 0/1 Knapsack DP on adjusted profits (tour visit order) ──
  const W = capacity;
  const L = tourOrderIdx.length;
  const dp = new Float64Array(W + 1).fill(0);
  const keep = Array.from({ length: L }, () => new Uint8Array(W + 1));

  for (let s = 0; s < L; s++) {
    const i = tourOrderIdx[s];
    const { adjustedProfit, weight } = adjustedItems[i];

    if (adjustedProfit <= 0 || weight > W) continue;

    for (let w = W; w >= weight; w--) {
      const withItem = dp[w - weight] + adjustedProfit;
      if (withItem > dp[w]) {
        dp[w] = withItem;
        keep[s][w] = 1;
      }
    }
  }

  // ── Step 4: Backtrack (reverse tour order) → original item indices ──
  const pickingPlan = new Array(m).fill(false);
  let w = W;
  for (let s = L - 1; s >= 0; s--) {
    if (keep[s][w]) {
      const i = tourOrderIdx[s];
      pickingPlan[i] = true;
      w -= adjustedItems[i].weight;
    }
  }

  // ── Step 5: Evaluate with the EXACT velocity formula ──
  // The DP used an approximation for speed. Now we evaluate the actual objective.
  const evaluation = evaluateSolution(instance, tour, pickingPlan, distMatrix);

  return new Solution('DP Knapsack', tour, pickingPlan, evaluation);
}

/**
 * Simple greedy item selection for comparison.
 * Picks items in order of profit/weight ratio, ignoring position effects.
 * This demonstrates WHY position-aware DP is better.
 * 
 * @param {TTPInstance} instance 
 * @param {number[]} tour 
 * @param {number[][]} [distMatrix]
 * @returns {Solution}
 */
export function solveGreedyItems(instance, tour, distMatrix = null) {
  const { items, capacity } = instance;
  const m = items.length;

  if (!distMatrix) {
    distMatrix = buildDistanceMatrix(instance.cities);
  }

  // Sort items by profit/weight ratio (descending)
  const sorted = items.map((item, idx) => ({
    idx,
    ratio: item.profit / item.weight,
    item,
  })).sort((a, b) => b.ratio - a.ratio);

  // Greedily pick items until capacity is reached
  const pickingPlan = new Array(m).fill(false);
  let currentWeight = 0;

  for (const { idx, item } of sorted) {
    if (currentWeight + item.weight <= capacity) {
      pickingPlan[idx] = true;
      currentWeight += item.weight;
    }
  }

  const evaluation = evaluateSolution(instance, tour, pickingPlan, distMatrix);

  return new Solution('Greedy Items', tour, pickingPlan, evaluation);
}

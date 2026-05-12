/**
 * ============================================================
 * bruteForce.js — Exhaustive Enumeration (Ground Truth)
 * ============================================================
 * 
 * PURPOSE:
 * For SMALL instances (≤5 cities, ≤6 items), enumerate ALL possible
 * combinations of tours and item selections, evaluate each one,
 * and find the globally optimal solution.
 * 
 * WHY:
 * This gives us "ground truth" — the provably best solution.
 * We use it to verify that our heuristics (greedy, DP) are working
 * correctly and to measure how close they get to optimal.
 * 
 * HOW MANY COMBINATIONS:
 * - Tours: We fix city 1 as the start. That leaves (n-1)! permutations
 *   of the remaining cities. Since tours are symmetric (A→B→C→A is the
 *   same as A→C→B→A reversed), we only need (n-1)!/2 unique tours.
 *   For n=5: (5-1)!/2 = 24/2 = 12 tours.
 * 
 * - Item subsets: For m items, there are 2^m subsets.
 *   For m=6: 2^6 = 64 subsets.
 * 
 * - Total: 12 × 64 = 768 combinations (very feasible!)
 *   But for n=10, m=20: 181440 × 1048576 ≈ 190 billion (NOT feasible!)
 * 
 * ALGORITHM:
 * 1. Generate all permutations of cities 2..n (fix city 1 at start)
 * 2. Remove "reverse" duplicates (optional optimization)
 * 3. For each tour permutation:
 *    a. Generate all 2^m subsets of items
 *    b. For each subset:
 *       - Check if total weight ≤ capacity (skip if not)
 *       - Evaluate the (tour, subset) using the velocity formula
 *       - Track if this is the best objective seen so far
 * 4. Return the globally optimal solution + full ranked list
 * 
 * COMPLEXITY: O((n-1)! × 2^m × n) — exponential, only for tiny instances
 * ============================================================
 */

import { evaluateSolution, buildDistanceMatrix } from './ttpEvaluator.js';
import { Solution } from '../models.js';

/** Course / UI limits — must stay in sync with `canBruteForce` and `solveBruteForce`. */
export const BRUTE_FORCE_MAX_CITIES = 5;
export const BRUTE_FORCE_MAX_ITEMS = 6;

/**
 * Check if the instance is small enough for brute force.
 * @param {TTPInstance} instance 
 * @returns {boolean}
 */
export function canBruteForce(instance) {
  return (
    instance.cities.length <= BRUTE_FORCE_MAX_CITIES &&
    instance.items.length <= BRUTE_FORCE_MAX_ITEMS
  );
}

/**
 * Generate all permutations of an array.
 * Uses Heap's algorithm (iterative version).
 * 
 * Example: [2, 3, 4] → [[2,3,4], [3,2,4], [4,2,3], [2,4,3], [3,4,2], [4,3,2]]
 * 
 * @param {any[]} arr - Array to permute
 * @returns {any[][]} - All permutations
 */
function getAllPermutations(arr) {
  const result = [];
  const a = [...arr];
  const n = a.length;
  const c = new Array(n).fill(0);

  result.push([...a]);

  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      if (i % 2 === 0) {
        [a[0], a[i]] = [a[i], a[0]];
      } else {
        [a[c[i]], a[i]] = [a[i], a[c[i]]];
      }
      result.push([...a]);
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }

  return result;
}

/**
 * Generate all subsets of items as boolean arrays.
 * For m items, generates 2^m arrays of length m.
 * 
 * Example for m=2: [[false,false], [true,false], [false,true], [true,true]]
 * 
 * @param {number} m - Number of items
 * @returns {boolean[][]} - All subsets as boolean picking plans
 */
function getAllItemSubsets(m) {
  const total = 1 << m; // 2^m
  const subsets = [];

  for (let mask = 0; mask < total; mask++) {
    const plan = [];
    for (let j = 0; j < m; j++) {
      plan.push(Boolean(mask & (1 << j)));
    }
    subsets.push(plan);
  }

  return subsets;
}

/**
 * ════════════════════════════════════════════════════════════
 * MAIN BRUTE FORCE SOLVER
 * ════════════════════════════════════════════════════════════
 * 
 * @param {TTPInstance} instance - The problem instance
 * @param {function}    [onProgress] - Optional callback for progress updates
 * @returns {{ optimal: Solution, allResults: object[] }}
 *   - optimal: the best (tour, item-set) pair
 *   - allResults: ALL evaluated pairs, sorted by objective (descending)
 */
export function solveBruteForce(instance, onProgress = null) {
  if (!canBruteForce(instance)) {
    const n = instance.cities.length;
    const m = instance.items.length;
    throw new Error(
      `Brute force is only supported for ≤${BRUTE_FORCE_MAX_CITIES} cities and ≤${BRUTE_FORCE_MAX_ITEMS} items (got ${n}×${m}).`
    );
  }

  const { cities, items, capacity } = instance;
  const n = cities.length;
  const m = items.length;

  // ── Step 1: Precompute distance matrix ──
  const distMatrix = buildDistanceMatrix(cities);

  // ── Step 2: Generate all tour permutations ──
  // Fix city 1 (index 0) at the start, permute the rest
  const otherCityIds = cities.slice(1).map(c => c.id); // [2, 3, 4, 5, ...]
  const allPerms = getAllPermutations(otherCityIds);

  // Remove reverse duplicates: tour [1,2,3,4,5] is same as [1,5,4,3,2]
  // We keep a perm only if it's lexicographically smaller than its reverse
  const uniqueTours = [];
  const seen = new Set();
  for (const perm of allPerms) {
    const tour = [cities[0].id, ...perm];
    const reversed = [cities[0].id, ...perm.slice().reverse()];
    const key = tour.join(',');
    const revKey = reversed.join(',');
    if (!seen.has(key) && !seen.has(revKey)) {
      seen.add(key);
      uniqueTours.push(tour);
    }
  }

  // ── Step 3: Generate all item subsets ──
  const allSubsets = getAllItemSubsets(m);

  // ── Step 4: Evaluate every (tour, subset) combination ──
  const allResults = [];
  let bestObjective = -Infinity;
  let bestResult = null;
  let count = 0;
  const total = uniqueTours.length * allSubsets.length;

  for (const tour of uniqueTours) {
    for (const pickingPlan of allSubsets) {
      // Check capacity constraint before evaluating
      let totalWeight = 0;
      let valid = true;
      for (let j = 0; j < m; j++) {
        if (pickingPlan[j]) {
          totalWeight += items[j].weight;
          if (totalWeight > capacity) {
            valid = false;
            break;
          }
        }
      }

      if (!valid) {
        count++;
        continue; // Skip infeasible subsets
      }

      // Evaluate this combination
      const evaluation = evaluateSolution(instance, tour, pickingPlan, distMatrix);

      const result = {
        tour: [...tour],
        pickingPlan: [...pickingPlan],
        itemIds: items.filter((_, i) => pickingPlan[i]).map(item => item.id),
        ...evaluation,
      };

      allResults.push(result);

      // Track the best
      if (evaluation.objective > bestObjective) {
        bestObjective = evaluation.objective;
        bestResult = result;
      }

      count++;

      // Progress callback (every 100 evaluations)
      if (onProgress && count % 100 === 0) {
        onProgress(count / total);
      }
    }
  }

  // ── Step 5: Sort all results by objective (best first) ──
  allResults.sort((a, b) => b.objective - a.objective);

  // Mark the rank of each result
  allResults.forEach((r, i) => { r.rank = i + 1; });

  // Build the optimal Solution object
  const optimal = new Solution(
    'Brute Force (Optimal)',
    bestResult.tour,
    bestResult.pickingPlan,
    bestResult
  );

  if (onProgress) onProgress(1);

  return { optimal, allResults };
}

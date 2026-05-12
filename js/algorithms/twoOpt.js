/**
 * ============================================================
 * twoOpt.js — 2-Opt Local Search for Tour Improvement
 * ============================================================
 * 
 * PURPOSE:
 * Improve an existing tour by repeatedly swapping pairs of edges
 * to reduce crossings and shorten the tour.
 * 
 * WHAT IS 2-OPT?
 * The "2-opt" move takes two edges in the tour and reconnects them
 * in the only other possible way. Visually:
 * 
 *   BEFORE:                    AFTER:
 *   ...→ A → B → ... → C → D → ...    ...→ A → C → ... → B → D → ...
 *   (edges A-B and C-D)         (edges A-C and B-D, segment B..C reversed)
 * 
 * This eliminates crossings. If the tour goes A→B then later C→D,
 * and the path from B to C crosses the path from D back, swapping
 * the edges "untangles" the tour and typically shortens it.
 * 
 * ALGORITHM:
 * 1. Start with an initial tour (e.g., from greedy nearest neighbor)
 * 2. For every pair of positions (i, j) where i < j:
 *    a. Create a new tour by reversing the segment from i+1 to j
 *    b. Re-evaluate the solution (run DP knapsack on the new tour)
 *    c. If the new objective is better → keep the swap
 * 3. Repeat until no improving swap is found (local optimum reached)
 * 
 * TTP-SPECIFIC CONSIDERATION:
 * In standard TSP 2-opt, you only check if the tour gets shorter.
 * In TTP 2-opt, we must RE-RUN the knapsack after each swap because
 * changing the tour order changes WHICH items are worth picking!
 * (Remember: item value depends on position in the tour.)
 * 
 * COMPLEXITY:
 * - Each iteration: O(n² × DP_cost) where DP_cost = O(m × W)
 * - Number of iterations: typically O(n) for random instances
 * - Total: O(n³ × m × W) in the worst case
 * ============================================================
 */

import { buildDistanceMatrix, evaluateSolution } from './ttpEvaluator.js';
import { solveDPKnapsack } from './dpKnapsack.js';
import { Solution } from '../models.js';

/**
 * Reverse a segment of the tour between indices i and j (inclusive).
 * Returns a new tour array (does not modify the original).
 * 
 * Example: tour = [1,2,3,4,5], i=1, j=3
 * Result: [1, 4,3,2, 5]  (segment [2,3,4] reversed to [4,3,2])
 * 
 * @param {number[]} tour - Current tour
 * @param {number}   i    - Start index of segment to reverse
 * @param {number}   j    - End index of segment to reverse
 * @returns {number[]} - New tour with reversed segment
 */
function reverseSegment(tour, i, j) {
  const newTour = [...tour];
  let left = i;
  let right = j;
  while (left < right) {
    [newTour[left], newTour[right]] = [newTour[right], newTour[left]];
    left++;
    right--;
  }
  return newTour;
}

/**
 * ════════════════════════════════════════════════════════════
 * MAIN 2-OPT LOCAL SEARCH
 * ════════════════════════════════════════════════════════════
 * 
 * @param {TTPInstance} instance    - The problem instance
 * @param {number[]}    initialTour - Starting tour to improve
 * @param {number[][]}  [distMatrix] - Optional precomputed distance matrix
 * @param {number}      [maxIter=50] - Maximum number of improvement iterations
 * @param {function}    [onProgress] - Optional progress callback
 * @returns {Solution} - The improved solution
 */
export function solveTwoOpt(instance, initialTour, distMatrix = null, maxIter = 50, onProgress = null) {
  const n = initialTour.length;

  if (!distMatrix) {
    distMatrix = buildDistanceMatrix(instance.cities);
  }

  // ── Start: solve DP knapsack on the initial tour ──
  let bestSolution = solveDPKnapsack(instance, initialTour, distMatrix);
  let bestObjective = bestSolution.objective;
  let bestTour = [...initialTour];

  let improved = true;
  let iteration = 0;

  // ── Main loop: keep improving until no swap helps ──
  while (improved && iteration < maxIter) {
    improved = false;
    iteration++;

    // Try all pairs of edges
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        // Create new tour by reversing segment [i, j]
        const newTour = reverseSegment(bestTour, i, j);

        // Re-run DP knapsack on the new tour
        // (because changing tour order changes optimal item selection!)
        const newSolution = solveDPKnapsack(instance, newTour, distMatrix);

        // Check if this swap improved the objective
        if (newSolution.objective > bestObjective) {
          bestTour = newTour;
          bestObjective = newSolution.objective;
          bestSolution = newSolution;
          improved = true;
          // Don't break — continue checking other swaps in this iteration
        }
      }
    }

    if (onProgress) {
      onProgress(iteration / maxIter);
    }
  }

  // Update strategy name
  return new Solution(
    'Greedy NN + 2-Opt + DP',
    bestTour,
    bestSolution.evaluation.pickingPlan,
    bestSolution.evaluation
  );
}

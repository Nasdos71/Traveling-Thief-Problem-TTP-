/**
 * ============================================================
 * greedyNN.js — Greedy Nearest Neighbor Tour Construction
 * ============================================================
 * 
 * PURPOSE:
 * Construct a tour (visiting order of cities) using the nearest-neighbor
 * heuristic. This is a simple, fast way to build a reasonable TSP tour.
 * 
 * ALGORITHM:
 * 1. Start at city 1 (the "depot")
 * 2. Mark city 1 as visited
 * 3. REPEAT until all cities are visited:
 *    a. Look at all unvisited cities
 *    b. Find the one closest to the current city (by Euclidean distance)
 *    c. Move to that city, mark it as visited
 * 4. Return to city 1 (implicit — the tour is a cycle)
 * 
 * EXAMPLE:
 *   Cities: 1(0,0), 2(3,0), 3(6,0), 4(1,4), 5(5,4)
 *   Start at 1.
 *   Nearest to 1 → 2 (dist=3). Visit 2.
 *   Nearest unvisited to 2 → 3 (dist=3). Visit 3.
 *   Nearest unvisited to 3 → 5 (dist=~4.1). Visit 5.
 *   Nearest unvisited to 5 → 4 (dist=4). Visit 4.
 *   Tour: [1, 2, 3, 5, 4]
 * 
 * PERFORMANCE:
 * - Time complexity: O(n²) — for each of n cities, scan n remaining
 * - Tour quality: typically 20-25% longer than optimal for random instances
 * - This is a HEURISTIC, not an exact algorithm
 * 
 * WHY USE IT:
 * It's fast and gives a decent starting tour that can be improved
 * with local search (2-opt). For TTP, the tour quality matters because
 * it affects travel time and thus the objective function.
 * ============================================================
 */

import { buildDistanceMatrix } from './ttpEvaluator.js';

/**
 * Construct a tour using the Nearest Neighbor heuristic.
 * 
 * @param {TTPInstance} instance - The problem instance
 * @param {number[][]}  [distMatrix] - Optional precomputed distance matrix
 * @returns {{ tour: number[], totalDistance: number }}
 *   - tour: array of city IDs in visit order
 *   - totalDistance: total tour length (sum of all edges)
 */
export function greedyNearestNeighbor(instance, distMatrix = null) {
  const { cities } = instance;
  const n = cities.length;

  // Precompute distances if not provided
  if (!distMatrix) {
    distMatrix = buildDistanceMatrix(cities);
  }

  // ── Initialize ──
  const visited = new Array(n).fill(false);
  const tour = [];          // Will hold city IDs in visit order
  let totalDistance = 0;

  // Start at city 1 (index 0)
  let currentIdx = 0;
  visited[0] = true;
  tour.push(cities[0].id);

  // ── Greedy loop: visit n-1 remaining cities ──
  for (let step = 1; step < n; step++) {
    let nearestIdx = -1;
    let nearestDist = Infinity;

    // Find the closest unvisited city
    for (let j = 0; j < n; j++) {
      if (!visited[j]) {
        const dist = distMatrix[currentIdx][j];
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = j;
        }
      }
    }

    // Move to the nearest city
    visited[nearestIdx] = true;
    tour.push(cities[nearestIdx].id);
    totalDistance += nearestDist;
    currentIdx = nearestIdx;
  }

  // Add the return leg distance (last city → first city)
  totalDistance += distMatrix[currentIdx][0];

  return { tour, totalDistance };
}

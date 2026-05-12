/**
 * ============================================================
 * divideConquer.js — Region-Split Divide & Conquer
 * ============================================================
 * 
 * PURPOSE:
 * For large instances, break the problem into smaller geographic
 * regions, solve each independently, then merge. This tests whether
 * spatial decomposition helps or hurts the TTP objective.
 * 
 * ALGORITHM:
 * 
 * 1. DIVIDE: Split cities into 4 geographic quadrants
 *    - Find the median X and median Y coordinates
 *    - Assign each city to one of 4 quadrants:
 *      NW (x ≤ medX, y > medY), NE (x > medX, y > medY)
 *      SW (x ≤ medX, y ≤ medY), SE (x > medX, y ≤ medY)
 * 
 * 2. CONQUER: Solve each quadrant independently
 *    - Build a greedy NN tour within the quadrant
 *    - Run DP knapsack on that sub-tour
 * 
 * 3. COMBINE: Connect quadrant sub-tours into a single tour
 *    - Order quadrants (e.g., NW → NE → SE → SW, clockwise)
 *    - For adjacent quadrants, find the pair of cities (one from each)
 *      that are closest to each other → connection point
 *    - Concatenate sub-tours through these connection points
 *    - Re-run DP knapsack on the combined tour
 * 
 * WHY THIS MIGHT NOT WORK WELL:
 * The TTP coupling between routing and packing means that splitting
 * into regions loses information. An item in the NW quadrant might
 * be worth picking only if the thief visits the SE quadrant first
 * (because the remaining distance from NW would be shorter).
 * Regional decomposition ignores these cross-region synergies.
 * 
 * This is exactly what the project wants you to analyze:
 * "Does regional decomposition help or hurt due to lost inter-region synergies?"
 * 
 * COMPLEXITY:
 * - Dividing: O(n log n) for finding medians
 * - Each quadrant: O((n/4)² + m/4 × W) for greedy NN + DP
 * - Connecting: O(n) for finding connection edges
 * - Total: O(n² + m × W) — same order as greedy but with smaller constants
 * ============================================================
 */

import { buildDistanceMatrix, evaluateSolution, computeDistance } from './ttpEvaluator.js';
import { greedyNearestNeighbor } from './greedyNN.js';
import { solveDPKnapsack } from './dpKnapsack.js';
import { Solution } from '../models.js';

/**
 * Assign cities to geographic quadrants based on median coordinates.
 * 
 * @param {City[]} cities - All cities
 * @returns {{ quadrants: City[][], medianX: number, medianY: number }}
 */
function partitionIntoQuadrants(cities) {
  // Find median X and Y
  const xs = cities.map(c => c.x).sort((a, b) => a - b);
  const ys = cities.map(c => c.y).sort((a, b) => a - b);
  const medianX = xs[Math.floor(xs.length / 2)];
  const medianY = ys[Math.floor(ys.length / 2)];

  // Assign cities to quadrants
  // quadrants[0] = NW, [1] = NE, [2] = SE, [3] = SW
  const quadrants = [[], [], [], []];

  for (const city of cities) {
    if (city.x <= medianX && city.y > medianY) {
      quadrants[0].push(city); // NW
    } else if (city.x > medianX && city.y > medianY) {
      quadrants[1].push(city); // NE
    } else if (city.x > medianX && city.y <= medianY) {
      quadrants[2].push(city); // SE
    } else {
      quadrants[3].push(city); // SW
    }
  }

  return { quadrants, medianX, medianY };
}

/**
 * Find the closest pair of cities between two groups.
 * Used to determine where to connect sub-tours.
 * 
 * @param {City[]} group1 
 * @param {City[]} group2 
 * @returns {{ city1: City, city2: City, distance: number }}
 */
function findClosestPair(group1, group2) {
  let bestDist = Infinity;
  let bestPair = { city1: null, city2: null };

  for (const c1 of group1) {
    for (const c2 of group2) {
      const d = computeDistance(c1, c2);
      if (d < bestDist) {
        bestDist = d;
        bestPair = { city1: c1, city2: c2 };
      }
    }
  }

  return { ...bestPair, distance: bestDist };
}

/**
 * Solve a sub-problem for a subset of cities.
 * Uses greedy NN to build a tour, then DP knapsack for items.
 * 
 * @param {TTPInstance} instance - Full instance (we need all parameters)
 * @param {City[]} regionCities - Cities in this region
 * @returns {{ tour: number[], solution: Solution }}
 */
function solveRegion(instance, regionCities) {
  if (regionCities.length === 0) return { tour: [], solution: null };
  if (regionCities.length === 1) {
    return { tour: [regionCities[0].id], solution: null };
  }

  // Create a sub-instance with only these cities
  const regionCityIds = new Set(regionCities.map(c => c.id));
  const regionItems = instance.items.filter(item => regionCityIds.has(item.cityId));

  const subInstance = {
    ...instance,
    cities: regionCities,
    items: regionItems,
  };

  const distMatrix = buildDistanceMatrix(regionCities);
  const { tour } = greedyNearestNeighbor(subInstance, distMatrix);

  return { tour };
}

/**
 * Reorder a sub-tour so it starts and ends at a specific city.
 * This is needed when connecting sub-tours through specific junction cities.
 * 
 * @param {number[]} tour - Sub-tour (circular)
 * @param {number} startCityId - City ID to start at
 * @returns {number[]} - Reordered tour starting at startCityId
 */
function reorderTour(tour, startCityId) {
  const idx = tour.indexOf(startCityId);
  if (idx === -1) return tour;
  return [...tour.slice(idx), ...tour.slice(0, idx)];
}

/**
 * ════════════════════════════════════════════════════════════
 * MAIN DIVIDE & CONQUER SOLVER
 * ════════════════════════════════════════════════════════════
 * 
 * @param {TTPInstance} instance - The problem instance
 * @param {number[][]}  [distMatrix] - Optional precomputed distance matrix
 * @param {function}    [onProgress] - Optional progress callback
 * @returns {Solution} - The combined solution
 */
export function solveDivideConquer(instance, distMatrix = null, onProgress = null) {
  const { cities } = instance;

  if (!distMatrix) {
    distMatrix = buildDistanceMatrix(cities);
  }

  // ── Step 1: DIVIDE — partition cities into quadrants ──
  const { quadrants, medianX, medianY } = partitionIntoQuadrants(cities);

  if (onProgress) onProgress(0.1);

  // Fixed visit order: NW → NE → SE → SW (only non-empty quadrants)
  const quadrantOrder = [0, 1, 2, 3];
  const nonEmptyQuadrants = quadrantOrder
    .map((qi) => quadrants[qi])
    .filter((q) => q.length > 0);

  if (nonEmptyQuadrants.length <= 1) {
    // All cities in one quadrant — just solve normally
    const { tour } = greedyNearestNeighbor(instance, distMatrix);
    const solution = solveDPKnapsack(instance, tour, distMatrix);
    return new Solution('Divide & Conquer + DP', tour, solution.pickingPlan, solution.evaluation);
  }

  // ── Step 2: CONQUER — solve each quadrant ──
  const regionTours = [];
  for (let i = 0; i < nonEmptyQuadrants.length; i++) {
    const { tour } = solveRegion(instance, nonEmptyQuadrants[i]);
    regionTours.push(tour);
    if (onProgress) onProgress(0.1 + 0.5 * (i + 1) / nonEmptyQuadrants.length);
  }

  // ── Step 3: COMBINE — connect sub-tours ──
  // Bridge adjacent quadrants with a minimum-distance city pair; drop duplicate
  // bridge vertices when concatenating.

  let combinedTour = [];

  const appendUnique = (seq) => {
    for (const id of seq) {
      if (combinedTour.length > 0 && id === combinedTour[combinedTour.length - 1]) continue;
      combinedTour.push(id);
    }
  };

  appendUnique(regionTours[0]);

  for (let i = 1; i < regionTours.length; i++) {
    const prevQuadrant = nonEmptyQuadrants[i - 1];
    const currQuadrant = nonEmptyQuadrants[i];
    const { city2 } = findClosestPair(prevQuadrant, currQuadrant);
    const reordered = reorderTour(regionTours[i], city2.id);
    appendUnique(reordered);
  }

  // Make sure city 1 is at the start (required by TTP convention)
  const city1Idx = combinedTour.indexOf(cities[0].id);
  if (city1Idx > 0) {
    combinedTour = [...combinedTour.slice(city1Idx), ...combinedTour.slice(0, city1Idx)];
  }

  // Ensure all cities are in the tour (sanity check)
  const tourSet = new Set(combinedTour);
  for (const city of cities) {
    if (!tourSet.has(city.id)) {
      combinedTour.push(city.id);
    }
  }

  if (onProgress) onProgress(0.8);

  // ── Step 4: Run DP knapsack on the combined tour ──
  const solution = solveDPKnapsack(instance, combinedTour, distMatrix);

  if (onProgress) onProgress(1);

  return new Solution(
    'Divide & Conquer + DP',
    combinedTour,
    solution.pickingPlan,
    solution.evaluation
  );
}

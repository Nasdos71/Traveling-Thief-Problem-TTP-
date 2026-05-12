/**
 * ============================================================
 * ttpEvaluator.js — Solution Evaluation Engine
 * ============================================================
 * 
 * This is the MOST IMPORTANT module in the entire project.
 * Every algorithm uses this to evaluate how good a solution is.
 * 
 * WHAT IT DOES:
 * Given a tour (city visit order) and a picking plan (which items to collect),
 * it "walks" through the tour and computes:
 *   1. At each city: pick up any selected items → weight increases
 *   2. For each leg (city→next city): compute speed based on current weight
 *   3. Travel time for that leg = distance / speed
 *   4. Sum up all travel times = total time
 *   5. Sum up all collected item profits = total profit
 *   6. Objective = total profit - renting rate × total time
 * 
 * THE VELOCITY FORMULA:
 *   v(w) = v_max - (v_max - v_min) × (w / W_max)
 * 
 *   - When w = 0 (empty): v = v_max (fastest)
 *   - When w = W_max (full): v = v_min (slowest)
 *   - Linear interpolation between these extremes
 * 
 * WHY THIS MATTERS:
 *   Picking a heavy item at city 3 (early in tour) means you carry that
 *   weight for ALL remaining legs, slowing you down and increasing total
 *   travel time (and thus cost). This coupling is what makes TTP hard.
 * ============================================================
 */

/**
 * Compute Euclidean distance between two cities (ceiling).
 * Using ceiling (Math.ceil) because that's the standard in TSPLIB/TTP benchmarks.
 * 
 * @param {City} a - First city
 * @param {City} b - Second city
 * @returns {number} - Ceiling of Euclidean distance
 */
export function computeDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.ceil(Math.sqrt(dx * dx + dy * dy));
}

/**
 * Precompute all pairwise distances between cities.
 * Stored as a 2D array: distMatrix[i][j] = distance from cities[i] to cities[j].
 * 
 * This avoids recomputing distances thousands of times during optimization.
 * 
 * Time complexity: O(n²) where n = number of cities
 * Space complexity: O(n²)
 * 
 * @param {City[]} cities - Array of cities
 * @returns {number[][]} - 2D distance matrix (0-indexed)
 */
export function buildDistanceMatrix(cities) {
  const n = cities.length;
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = computeDistance(cities[i], cities[j]);
      matrix[i][j] = d;
      matrix[j][i] = d; // Distance is symmetric
    }
  }

  return matrix;
}

/**
 * Compute the velocity (speed) for a given current weight.
 * 
 * Formula: v(w) = v_max - (v_max - v_min) × (w / W_max)
 * 
 * @param {number} currentWeight - Current total weight being carried
 * @param {TTPInstance} instance - The problem instance (has maxSpeed, minSpeed, capacity)
 * @returns {number} - Current speed
 */
export function computeSpeed(currentWeight, instance) {
  const { maxSpeed, minSpeed, capacity } = instance;
  // Linear interpolation: heavier = slower
  return maxSpeed - (maxSpeed - minSpeed) * (currentWeight / capacity);
}

/**
 * ════════════════════════════════════════════════════════════
 * MASTER EVALUATION FUNCTION
 * ════════════════════════════════════════════════════════════
 * 
 * Evaluates a complete TTP solution (tour + picking plan).
 * 
 * ALGORITHM (step by step):
 * 
 * 1. Start at the first city in the tour with weight = 0
 * 2. For each city in the tour:
 *    a. Check which items at this city are in the picking plan
 *    b. Add their weights to current weight, their profits to total profit
 *    c. Record what we picked and the new cumulative weight
 * 3. For each leg (from city_i to city_{i+1}):
 *    a. Look up the distance between these two cities
 *    b. Compute the current speed: v(w) = v_max - (v_max - v_min) × (w / W_max)
 *    c. Compute travel time for this leg: time = distance / speed
 *    d. Add to total time
 * 4. Don't forget the RETURN leg: last city → first city
 * 5. Compute objective: totalProfit - rentingRate × totalTime
 * 
 * @param {TTPInstance} instance   - The problem instance
 * @param {number[]}    tour       - Array of city IDs in visit order (must start with city 1)
 * @param {boolean[]}   pickingPlan - pickingPlan[itemIndex] = true to pick item (0-indexed)
 * @param {number[][]}  [distMatrix] - Optional precomputed distance matrix
 * @returns {object} Detailed evaluation results
 */
export function evaluateSolution(instance, tour, pickingPlan, distMatrix = null) {
  const { cities, items, capacity, rentingRate } = instance;

  // Build distance matrix if not provided
  if (!distMatrix) {
    distMatrix = buildDistanceMatrix(cities);
  }

  // Helper: convert city ID (1-indexed) to array index (0-indexed)
  const cityIndex = (id) => cities.findIndex(c => c.id === id);

  // ── Walk the tour ──
  let currentWeight = 0;
  let totalProfit = 0;
  let totalTime = 0;

  // Per-city details (for visualization)
  const perCity = [];    // { cityId, itemsPicked[], cumulativeWeight, speedAfter }
  const perLeg = [];     // { from, to, distance, speed, time }

  for (let i = 0; i < tour.length; i++) {
    const cityId = tour[i];
    const city = cities.find(c => c.id === cityId);

    // ── Pick up items at this city ──
    const pickedHere = [];
    for (const item of city.items) {
      const itemIdx = items.indexOf(item); // 0-indexed position in items array
      if (pickingPlan[itemIdx]) {
        // Check capacity constraint
        if (currentWeight + item.weight <= capacity) {
          currentWeight += item.weight;
          totalProfit += item.profit;
          pickedHere.push(item);
        }
      }
    }

    // Record per-city info
    perCity.push({
      cityId,
      itemsPicked: pickedHere,
      cumulativeWeight: currentWeight,
    });

    // ── Travel to next city ──
    // After the last city, we return to the first city (complete the loop)
    const nextCityId = tour[(i + 1) % tour.length];
    const fromIdx = cityIndex(cityId);
    const toIdx = cityIndex(nextCityId);
    const distance = distMatrix[fromIdx][toIdx];

    // Compute speed based on current weight
    const speed = computeSpeed(currentWeight, instance);
    const legTime = distance / speed;
    totalTime += legTime;

    perLeg.push({
      from: cityId,
      to: nextCityId,
      distance,
      speed,
      time: legTime,
    });

    // Update the per-city speed info
    perCity[perCity.length - 1].speedAfter = speed;
  }

  // ── Compute objective ──
  // Objective = totalProfit - rentingRate × totalTime
  // Higher is better. Travel time is penalized.
  const objective = totalProfit - rentingRate * totalTime;

  return {
    totalProfit,
    totalWeight: currentWeight,
    totalTime,
    objective,
    perCity,
    perLeg,
    tour: [...tour],
    pickingPlan: [...pickingPlan],
  };
}

/**
 * Compute the remaining distance in the tour from a given position.
 * This is crucial for the position-aware DP knapsack:
 *   remaining_dist(i) = sum of distances from city_i to city_{i+1} to ... to city_1 (return)
 * 
 * @param {number[]}  tour       - Tour as array of city IDs
 * @param {number}    fromIndex  - Current position in the tour (0-indexed)
 * @param {City[]}    cities     - Array of cities
 * @param {number[][]} distMatrix - Precomputed distance matrix
 * @returns {number} - Total remaining distance from this point
 */
export function remainingDistance(tour, fromIndex, cities, distMatrix) {
  const cityIndex = (id) => cities.findIndex(c => c.id === id);
  let dist = 0;

  for (let i = fromIndex; i < tour.length; i++) {
    const nextIdx = (i + 1) % tour.length;
    const fromCIdx = cityIndex(tour[i]);
    const toCIdx = cityIndex(tour[nextIdx]);
    dist += distMatrix[fromCIdx][toCIdx];
  }

  return dist;
}

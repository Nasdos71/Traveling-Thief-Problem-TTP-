/**
 * ============================================================
 * models.js — Core Data Structures for the Traveling Thief Problem
 * ============================================================
 * 
 * This module defines all the data structures used throughout the TTP solver.
 * 
 * KEY CONCEPTS:
 * - A "City" has coordinates and a list of items available for pickup.
 * - An "Item" has a profit (value), weight, and is assigned to a specific city.
 * - A "TTPInstance" bundles all problem data: cities, items, knapsack capacity,
 *   speed limits, and the renting rate.
 * - A "Solution" represents one complete answer: a tour order + which items to pick.
 * 
 * THE VELOCITY FORMULA (the heart of TTP):
 *   v(w) = v_max - (v_max - v_min) * (w / W_max)
 * 
 *   Where:
 *     v(w)  = current speed when carrying weight w
 *     v_max = maximum speed (empty knapsack)
 *     v_min = minimum speed (full knapsack)
 *     w     = current total weight of collected items
 *     W_max = knapsack capacity
 * 
 *   This means: the more items you carry, the slower you travel.
 *   A heavy item picked up EARLY slows you down for ALL remaining travel.
 * 
 * THE OBJECTIVE FUNCTION:
 *   Objective = TotalProfit - RentingRate × TotalTravelTime
 * 
 *   We want to MAXIMIZE this. More profit is good, but more travel time
 *   (caused by heavy items) costs us through the renting rate.
 * ============================================================
 */

// ── City ──
// Represents a single city/node in the problem.
export class City {
  /**
   * @param {number} id     - 1-indexed city identifier
   * @param {number} x      - X coordinate (geographic)
   * @param {number} y      - Y coordinate (geographic)
   */
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    /** @type {Item[]} Items available at this city */
    this.items = [];
  }
}

// ── Item ──
// Represents a single item that can be picked up.
export class Item {
  /**
   * @param {number} id       - 1-indexed item identifier
   * @param {number} profit   - How much this item is worth
   * @param {number} weight   - How heavy this item is
   * @param {number} cityId   - Which city this item is located at (1-indexed)
   */
  constructor(id, profit, weight, cityId) {
    this.id = id;
    this.profit = profit;
    this.weight = weight;
    this.cityId = cityId;
  }
}

// ── TTPInstance ──
// The complete problem definition — everything you need to solve a TTP instance.
export class TTPInstance {
  /**
   * @param {string}  name        - Instance name (e.g., "sample_small")
   * @param {City[]}  cities      - Array of all cities (0-indexed in array, city.id is 1-indexed)
   * @param {Item[]}  items       - Array of all items
   * @param {number}  capacity    - Maximum knapsack weight capacity (W_max)
   * @param {number}  minSpeed    - Minimum speed when knapsack is full (v_min)
   * @param {number}  maxSpeed    - Maximum speed when knapsack is empty (v_max)
   * @param {number}  rentingRate - Cost per unit of travel time (R)
   */
  constructor(name, cities, items, capacity, minSpeed, maxSpeed, rentingRate) {
    this.name = name;
    this.cities = cities;
    this.items = items;
    this.capacity = capacity;
    this.minSpeed = minSpeed;
    this.maxSpeed = maxSpeed;
    this.rentingRate = rentingRate;
  }
}

// ── Solution ──
// A complete solution to a TTP instance: a tour + a packing plan + evaluation results.
export class Solution {
  /**
   * @param {string}    strategyName  - Name of the strategy that produced this (e.g., "Greedy NN + DP")
   * @param {number[]}  tour          - Array of city IDs in visit order (starts and ends at city 1)
   * @param {boolean[]} pickingPlan   - pickingPlan[i] = true if item i+1 should be picked up
   * @param {object}    evaluation    - Detailed evaluation results from ttpEvaluator
   */
  constructor(strategyName, tour, pickingPlan, evaluation) {
    this.strategyName = strategyName;
    this.tour = tour;
    this.pickingPlan = pickingPlan;
    this.evaluation = evaluation;
  }

  /** Total profit from collected items (before subtracting travel cost) */
  get totalProfit() { return this.evaluation?.totalProfit ?? 0; }

  /** Total weight of collected items */
  get totalWeight() { return this.evaluation?.totalWeight ?? 0; }

  /** Total travel time across the entire tour */
  get totalTime() { return this.evaluation?.totalTime ?? 0; }

  /** 
   * The objective value = totalProfit - rentingRate × totalTime
   * This is the number we want to MAXIMIZE.
   */
  get objective() { return this.evaluation?.objective ?? 0; }
}

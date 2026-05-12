/**
 * ============================================================
 * parser.js — TTP Instance File Parser
 * ============================================================
 * 
 * Reads the standard .ttp file format used in academic benchmarks.
 * 
 * FILE FORMAT:
 * -----------
 * The file has two sections separated by keyword headers:
 * 
 * 1. HEADER — key : value pairs defining the instance parameters
 *    PROBLEM NAME : example_instance
 *    KNAPSACK DATA TYPE : uncorrelated
 *    DIMENSION : 5                    ← number of cities
 *    NUMBER OF ITEMS : 6              ← number of items
 *    CAPACITY OF KNAPSACK : 100       ← max weight (W_max)
 *    MIN SPEED : 0.1                  ← v_min
 *    MAX SPEED : 1.0                  ← v_max
 *    RENTING RATIO : 0.5             ← R (renting rate)
 *    EDGE_WEIGHT_TYPE : CEIL_2D
 * 
 * 2. NODE_COORD_SECTION — one line per city
 *    city_id  x_coord  y_coord
 *    1  10  20
 *    2  30  40
 *    ...
 * 
 * 3. ITEMS SECTION — one line per item
 *    item_id  profit  weight  assigned_city_id
 *    1  50  10  2
 *    2  30  5   3
 *    ...
 * ============================================================
 */

import { City, Item, TTPInstance } from './models.js';

/**
 * Parse a .ttp file content string into a TTPInstance object.
 * 
 * @param {string} text - The raw text content of a .ttp file
 * @returns {TTPInstance} - The parsed problem instance
 * @throws {Error} If the file format is invalid
 * 
 * HOW IT WORKS:
 * 1. Split the text into lines
 * 2. Parse the header key-value pairs to get instance parameters
 * 3. When we hit "NODE_COORD_SECTION", parse city coordinates
 * 4. When we hit "ITEMS SECTION", parse item data
 * 5. Link items to their assigned cities
 * 6. Build and return a TTPInstance
 */
export function parseTTPFile(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  // ── Step 1: Parse header values ──
  let name = 'unknown';
  let dimension = 0;       // number of cities
  let numItems = 0;        // number of items
  let capacity = 0;        // knapsack weight limit
  let minSpeed = 0.1;      // v_min
  let maxSpeed = 1.0;      // v_max
  let rentingRate = 1.0;   // R

  const cities = [];
  const items = [];

  // Track which section we're currently parsing
  let section = 'header'; // 'header' | 'nodes' | 'items'

  for (const line of lines) {
    // ── Check for section headers ──
    if (line.startsWith('NODE_COORD_SECTION')) {
      section = 'nodes';
      continue;
    }
    if (line.startsWith('ITEMS SECTION')) {
      section = 'items';
      continue;
    }

    // ── Parse based on current section ──
    if (section === 'header') {
      // Header lines are "KEY : VALUE" or "KEY\tVALUE"
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const key = line.substring(0, colonIdx).trim().toUpperCase();
      const value = line.substring(colonIdx + 1).trim();

      if (key.includes('PROBLEM NAME')) {
        name = value;
      } else if (key.includes('DIMENSION')) {
        dimension = parseInt(value);
      } else if (key.includes('NUMBER OF ITEMS')) {
        numItems = parseInt(value);
      } else if (key.includes('CAPACITY')) {
        capacity = parseInt(value);
      } else if (key.includes('MIN SPEED')) {
        minSpeed = parseFloat(value);
      } else if (key.includes('MAX SPEED')) {
        maxSpeed = parseFloat(value);
      } else if (key.includes('RENTING')) {
        rentingRate = parseFloat(value);
      }
      // We ignore other header fields like EDGE_WEIGHT_TYPE, KNAPSACK DATA TYPE
    }

    else if (section === 'nodes') {
      // Format: city_id  x  y
      const parts = line.split(/\s+/).map(Number);
      if (parts.length >= 3 && !isNaN(parts[0])) {
        cities.push(new City(parts[0], parts[1], parts[2]));
      }
    }

    else if (section === 'items') {
      // Format: item_id  profit  weight  assigned_city_id
      const parts = line.split(/\s+/).map(Number);
      if (parts.length >= 4 && !isNaN(parts[0])) {
        const item = new Item(parts[0], parts[1], parts[2], parts[3]);
        items.push(item);
      }
    }
  }

  // ── Step 2: Link items to their cities ──
  // Each item knows which city it belongs to (item.cityId).
  // We also want each city to know which items are available there.
  for (const item of items) {
    const city = cities.find(c => c.id === item.cityId);
    if (city) {
      city.items.push(item);
    }
  }

  // ── Step 3: Validate ──
  if (cities.length === 0) throw new Error('No cities found in the file.');
  if (items.length === 0) throw new Error('No items found in the file.');
  if (capacity <= 0) throw new Error('Invalid knapsack capacity.');
  if (dimension > 0 && cities.length !== dimension) {
    throw new Error(
      `Header DIMENSION (${dimension}) does not match ${cities.length} cities in NODE_COORD_SECTION.`
    );
  }
  if (numItems > 0 && items.length !== numItems) {
    throw new Error(
      `Header NUMBER OF ITEMS (${numItems}) does not match ${items.length} rows in ITEMS SECTION.`
    );
  }

  // ── Step 4: Build and return ──
  return new TTPInstance(name, cities, items, capacity, minSpeed, maxSpeed, rentingRate);
}

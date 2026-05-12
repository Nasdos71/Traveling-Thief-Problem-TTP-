/**
 * ============================================================
 * main.js — Application Orchestrator
 * ============================================================
 * 
 * Wires together the UI, algorithms, and visualizations.
 * Handles file loading, algorithm execution, and result display.
 * ============================================================
 */

import { parseTTPFile } from './parser.js';
import { buildDistanceMatrix } from './algorithms/ttpEvaluator.js';
import {
  solveBruteForce,
  canBruteForce,
  BRUTE_FORCE_MAX_CITIES,
  BRUTE_FORCE_MAX_ITEMS,
} from './algorithms/bruteForce.js';
import { greedyNearestNeighbor } from './algorithms/greedyNN.js';
import { solveDPKnapsack, solveGreedyItems } from './algorithms/dpKnapsack.js';
import { solveTwoOpt } from './algorithms/twoOpt.js';
import { solveDivideConquer } from './algorithms/divideConquer.js';
import { drawTourMap } from './visualization/tourMap.js';
import { createTimelineChart } from './visualization/timeline.js';
import { createScatterPlot } from './visualization/scatterPlot.js';
import { renderEnumerationTable } from './visualization/enumerationTable.js';
import { renderComparisonPanel } from './visualization/comparisonPanel.js';

// ── App State ──
let currentInstance = null;
let distMatrix = null;
let solutions = [];
let bruteForceResults = null;
let currentDisplayedSolution = null;

// ── DOM References ──
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/** Replace prior result for the same strategy (avoids duplicate cards on re-run). */
function upsertSolution(solution) {
  if (!solution) return;
  const name = solution.strategyName;
  const idx = solutions.findIndex((s) => s.strategyName === name);
  if (idx >= 0) solutions[idx] = solution;
  else solutions.push(solution);
}

// ── Logging ──
function log(msg, type = 'info') {
  const panel = $('#log-panel');
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-msg ${type}">${msg}</span>`;
  panel.appendChild(entry);
  panel.scrollTop = panel.scrollHeight;
}

// ── Instance Loading ──
function loadInstance(instance) {
  currentInstance = instance;
  solutions = [];
  bruteForceResults = null;
  currentDisplayedSolution = null;

  // Precompute distance matrix
  distMatrix = buildDistanceMatrix(instance.cities);

  // Update instance info bar
  $('#instance-info').classList.add('visible');
  $('#info-name').textContent = instance.name;
  $('#info-cities').textContent = instance.cities.length;
  $('#info-items').textContent = instance.items.length;
  $('#info-capacity').textContent = instance.capacity;
  $('#info-speed').textContent = `${instance.minSpeed} – ${instance.maxSpeed}`;
  $('#info-rent').textContent = instance.rentingRate;

  // Enable/disable buttons
  $$('.algo-btn').forEach(btn => btn.disabled = false);
  $('#btn-run-all').disabled = false;

  // Brute force only for small instances
  const bf = $('#btn-brute-force');
  if (!canBruteForce(instance)) {
    bf.disabled = true;
    bf.title = `Too large for brute force (max ${BRUTE_FORCE_MAX_CITIES} cities, ${BRUTE_FORCE_MAX_ITEMS} items)`;
  }

  // Clear visualizations
  clearVisualizations();
  log(`Loaded instance "${instance.name}" — ${instance.cities.length} cities, ${instance.items.length} items`, 'success');
}

function clearVisualizations() {
  const mapCanvas = $('#tour-map-canvas');
  if (mapCanvas) {
    const ctx = mapCanvas.getContext('2d');
    ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  }
  $('#enumeration-container').innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Run brute force to see enumeration.</p></div>`;
  delete $('#enumeration-container')._ttpEnumerationMaster;
  $('#comparison-container').innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>Run algorithms to compare.</p></div>`;
}

// ── Display a solution in the visualizations ──
function displaySolution(solution) {
  currentDisplayedSolution = solution;

  // Tour Map
  const mapCanvas = $('#tour-map-canvas');
  if (mapCanvas && solution.evaluation) {
    drawTourMap(mapCanvas, currentInstance, solution.evaluation);
  }

  // Timeline
  const timelineCanvas = $('#timeline-canvas');
  if (timelineCanvas && solution.evaluation) {
    createTimelineChart(timelineCanvas, currentInstance, solution.evaluation);
  }

  // Update solution selector
  updateSolutionSelector();
}

function updateSolutionSelector() {
  const sel = $('#solution-selector');
  if (!sel) return;
  sel.innerHTML = '';
  solutions.forEach((sol, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    const obj =
      typeof sol.objective === 'number'
        ? sol.objective
        : (sol.evaluation && typeof sol.evaluation.objective === 'number'
            ? sol.evaluation.objective
            : NaN);
    const objStr = Number.isFinite(obj) ? obj.toFixed(2) : '?';
    opt.textContent = `${sol.strategyName} (obj: ${objStr})`;
    if (sol === currentDisplayedSolution) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.style.display = solutions.length > 0 ? 'block' : 'none';
}

function refreshComparisonViews() {
  try {
    renderComparisonPanel($('#comparison-container'), solutions);
    createScatterPlot($('#scatter-canvas'), solutions, bruteForceResults);
  } catch (err) {
    log(`Comparison/charts: ${err.message}`, 'error');
    console.error(err);
  }
}

// ── Algorithm Runners ──
async function runWithTimer(name, fn) {
  log(`Running ${name}...`);
  const start = performance.now();

  // Use setTimeout to let the UI update
  await new Promise(r => setTimeout(r, 10));

  try {
    const result = await fn();
    const elapsed = ((performance.now() - start) / 1000).toFixed(3);
    log(`${name} completed in ${elapsed}s`, 'success');
    return result;
  } catch (err) {
    log(`${name} failed: ${err.message}`, 'error');
    console.error(err);
    return null;
  }
}

async function runBruteForce() {
  if (!currentInstance || !canBruteForce(currentInstance)) return;

  const result = await runWithTimer('Brute Force', () => {
    const { optimal, allResults } = solveBruteForce(currentInstance);
    bruteForceResults = allResults;
    return optimal;
  });

  if (result) {
    upsertSolution(result);
    displaySolution(result);
    renderEnumerationTable($('#enumeration-container'), bruteForceResults);
    log(`Brute Force optimal: objective = ${result.objective.toFixed(2)}`, 'success');
  }
}

async function runGreedyDP() {
  if (!currentInstance) return;

  const result = await runWithTimer('Greedy NN + DP Knapsack', () => {
    const { tour } = greedyNearestNeighbor(currentInstance, distMatrix);
    const solution = solveDPKnapsack(currentInstance, tour, distMatrix);
    // Keep Solution instance — `{ ...solution }` drops class getters (`objective`, etc.)
    solution.strategyName = 'Greedy NN + DP';
    return solution;
  });

  if (result) {
    upsertSolution(result);
    displaySolution(result);
  }
}

async function runGreedyGreedy() {
  if (!currentInstance) return;

  const result = await runWithTimer('Greedy NN + Greedy Items', () => {
    const { tour } = greedyNearestNeighbor(currentInstance, distMatrix);
    const solution = solveGreedyItems(currentInstance, tour, distMatrix);
    solution.strategyName = 'Greedy NN + Greedy Items';
    return solution;
  });

  if (result) {
    upsertSolution(result);
    displaySolution(result);
  }
}

async function runTwoOpt() {
  if (!currentInstance) return;

  const result = await runWithTimer('Greedy NN + 2-Opt + DP', () => {
    const { tour } = greedyNearestNeighbor(currentInstance, distMatrix);
    return solveTwoOpt(currentInstance, tour, distMatrix, 30);
  });

  if (result) {
    upsertSolution(result);
    displaySolution(result);
  }
}

async function runDivideConquer() {
  if (!currentInstance) return;

  const result = await runWithTimer('Divide & Conquer + DP', () => {
    return solveDivideConquer(currentInstance, distMatrix);
  });

  if (result) {
    upsertSolution(result);
    displaySolution(result);
  }
}

async function runAll() {
  if (!currentInstance) return;

  solutions = [];
  bruteForceResults = null;
  log('═══ Running all strategies ═══', 'info');

  // 1. Brute Force (if small enough)
  if (canBruteForce(currentInstance)) {
    await runBruteForce();
  }

  // 2. Greedy NN + DP Knapsack
  await runGreedyDP();

  // 3. Greedy NN + Greedy Items
  await runGreedyGreedy();

  // 4. Greedy NN + 2-Opt + DP
  await runTwoOpt();

  // 5. Divide & Conquer + DP
  await runDivideConquer();

  refreshComparisonViews();

  // Display the best solution on the map
  if (solutions.length > 0) {
    const best = solutions.reduce((a, b) =>
      (a.objective ?? a.evaluation?.objective ?? -Infinity) >
      (b.objective ?? b.evaluation?.objective ?? -Infinity)
        ? a
        : b
    );
    displaySolution(best);
    const bestObj = best.objective ?? best.evaluation?.objective ?? 0;
    log(`═══ Best strategy: ${best.strategyName} (obj: ${Number(bestObj).toFixed(2)}) ═══`, 'success');
  }
}

// ── File Upload Handler ──
function handleFileUpload(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const instance = parseTTPFile(e.target.result);
      loadInstance(instance);
    } catch (err) {
      log(`Failed to parse file: ${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
}

// ── Sample Data Loader ──
async function loadSample(name) {
  log(`Loading sample: ${name}...`);
  try {
    const resp = await fetch(`data/${name}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const instance = parseTTPFile(text);
    loadInstance(instance);
  } catch (err) {
    log(`Failed to load sample: ${err.message}`, 'error');
  }
}

// ── Tab Switching ──
function switchTab(tabName) {
  $$('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  $$('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  });

  // Resize canvas when switching to map tab
  if (tabName === 'map' && currentDisplayedSolution) {
    setTimeout(() => {
      displaySolution(currentDisplayedSolution);
    }, 50);
  }
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  // Tab buttons
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // File upload
  const uploadZone = $('#upload-zone');
  const fileInput = $('#file-input');

  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });

  // Sample buttons
  $$('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.sample-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSample(btn.dataset.file);
    });
  });

  // Algorithm buttons
  $('#btn-brute-force').addEventListener('click', async () => {
    await runBruteForce();
    refreshComparisonViews();
  });
  $('#btn-greedy-dp').addEventListener('click', async () => {
    await runGreedyDP();
    refreshComparisonViews();
  });
  $('#btn-greedy-greedy').addEventListener('click', async () => {
    await runGreedyGreedy();
    refreshComparisonViews();
  });
  $('#btn-two-opt').addEventListener('click', async () => {
    await runTwoOpt();
    refreshComparisonViews();
  });
  $('#btn-divide-conquer').addEventListener('click', async () => {
    await runDivideConquer();
    refreshComparisonViews();
  });
  $('#btn-run-all').addEventListener('click', () => {
    runAll().catch((err) => {
      log(`Run All failed: ${err.message}`, 'error');
      console.error(err);
    });
  });

  // Solution selector
  $('#solution-selector').addEventListener('change', (e) => {
    const idx = parseInt(e.target.value);
    if (solutions[idx]) {
      displaySolution(solutions[idx]);
    }
  });

  // Window resize → redraw map
  window.addEventListener('resize', () => {
    if (currentDisplayedSolution) {
      const mapCanvas = $('#tour-map-canvas');
      if (mapCanvas) drawTourMap(mapCanvas, currentInstance, currentDisplayedSolution.evaluation);
    }
  });

  // TTP Maker (optional — if this chunk fails to load, the rest of the app still works)
  import('./ttpMaker.js')
    .then(({ initTtpMaker }) => {
      initTtpMaker({
        loadInstance,
        log,
        getCurrentInstance: () => currentInstance,
      });
    })
    .catch((err) => {
      console.error('TTP Maker failed to load:', err);
    });

  log('TTP Solver ready. Load an instance to begin.', 'info');
});

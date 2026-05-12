/**
 * ============================================================
 * comparisonPanel.js — Strategy Comparison Dashboard
 * ============================================================
 * 
 * Side-by-side cards comparing all strategies, ranked by objective.
 * Shows tour, items, objective, time, weight for each strategy.
 * The best strategy gets a crown badge.
 * ============================================================
 */

function formatObjectiveGap(solObjective, bestObjective) {
  const delta = solObjective - bestObjective;
  if (Math.abs(bestObjective) < 1e-6) {
    return ` (Δ ${delta >= 0 ? '+' : ''}${delta.toFixed(2)})`;
  }
  const pct = (delta / Math.abs(bestObjective)) * 100;
  if (!Number.isFinite(pct)) return '';
  return ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`;
}

function formatTableGap(solObjective, bestObjective) {
  const delta = bestObjective - solObjective;
  if (Math.abs(bestObjective) < 1e-6) {
    return delta === 0 ? '—' : `Δobj ${delta.toFixed(2)}`;
  }
  const pct = (delta / Math.abs(bestObjective)) * 100;
  if (!Number.isFinite(pct)) return '—';
  return `${pct.toFixed(1)}%`;
}

/**
 * Render the strategy comparison panel.
 *
 * @param {HTMLElement} container - DOM element to render into
 * @param {Solution[]} solutions - Array of solutions from different strategies
 */
export function renderComparisonPanel(container, solutions) {
  if (!solutions || solutions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏆</div>
        <p>Run algorithms to compare strategies.</p>
      </div>`;
    return;
  }

  // Sort by objective (best first)
  const sorted = [...solutions].sort((a, b) => b.objective - a.objective);
  const bestObjective = sorted[0].objective;

  // Strategy icons
  const icons = {
    'Brute Force (Optimal)': '🔬',
    'Greedy NN + DP': '🧩',
    'Greedy NN + Greedy Items': '⚡',
    'Greedy NN + 2-Opt + DP': '🔧',
    'Divide & Conquer + DP': '🗂️',
    'DP Knapsack': '🧩',
    'Greedy Items': '⚡',
  };

  let html = `
    <div style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.85rem;">
      ${sorted.length} strategies compared — ranked by objective value
    </div>
    <div class="comparison-grid">`;

  sorted.forEach((sol, idx) => {
    const isBest = sol.objective === bestObjective;
    const icon = icons[sol.strategyName] || '📊';
    const gap = isBest ? '' : formatObjectiveGap(sol.objective, bestObjective);

    html += `
      <div class="strategy-card ${isBest ? 'best' : ''}">
        <div class="strategy-name">
          <span>${icon}</span>
          <span>${sol.strategyName}</span>
        </div>
        <div class="strategy-stats">
          <div class="stat-item">
            <div class="stat-label">Objective</div>
            <div class="stat-value ${sol.objective >= 0 ? 'positive' : 'negative'}">
              ${sol.objective.toFixed(2)}${gap}
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Total Profit</div>
            <div class="stat-value">${sol.totalProfit}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Total Weight</div>
            <div class="stat-value">${sol.totalWeight}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Travel Time</div>
            <div class="stat-value">${sol.totalTime.toFixed(2)}</div>
          </div>
        </div>
        <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-muted);">
          Tour: ${sol.tour.join(' → ')}
        </div>
        <div style="margin-top: 0.25rem; font-size: 0.75rem; color: var(--text-muted);">
          Items: ${sol.evaluation?.perCity
            ?.filter(pc => pc.itemsPicked.length > 0)
            .map(pc => `C${pc.cityId}[${pc.itemsPicked.map(i => i.id).join(',')}]`)
            .join(' ') || '—'}
        </div>
      </div>`;
  });

  html += `</div>`;

  // Add summary table
  html += `
    <div style="margin-top: 1.5rem;">
      <h3 style="font-size: 1rem; margin-bottom: 0.75rem; color: var(--text-secondary);">
        📊 Summary Table
      </h3>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Strategy</th>
              <th>Objective</th>
              <th>Profit</th>
              <th>Weight</th>
              <th>Time</th>
              <th>Gap from Best</th>
            </tr>
          </thead>
          <tbody>`;

  sorted.forEach((sol, idx) => {
    const gap = idx === 0 ? '—' : formatTableGap(sol.objective, bestObjective);

    html += `
            <tr${idx === 0 ? ' class="optimal"' : ''}>
              <td>#${idx + 1}</td>
              <td style="font-family: Inter, sans-serif; font-weight: 500;">${sol.strategyName}</td>
              <td style="font-weight: 600; color: ${sol.objective >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">
                ${sol.objective.toFixed(2)}
              </td>
              <td>${sol.totalProfit}</td>
              <td>${sol.totalWeight}</td>
              <td>${sol.totalTime.toFixed(2)}</td>
              <td>${gap}</td>
            </tr>`;
  });

  html += `</tbody></table></div></div>`;

  container.innerHTML = html;
}

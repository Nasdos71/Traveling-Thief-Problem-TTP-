/**
 * ============================================================
 * enumerationTable.js — Brute-Force Enumeration Results Table
 * ============================================================
 * 
 * Renders a sortable HTML table of all (tour, item-set) pairs
 * evaluated by brute force. The optimal row is highlighted in gold.
 * ============================================================
 */

/**
 * @param {HTMLElement} container
 * @param {object[]} allResults
 * @param {number} [maxRows=100]
 * @param {{ isSortRefresh?: boolean }} [options]
 */
export function renderEnumerationTable(container, allResults, maxRows = 100, options = {}) {
  const { isSortRefresh = false } = options;
  if (!allResults || allResults.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>Run brute force on a small instance (≤5 cities, ≤6 items) to see the full enumeration.</p>
      </div>`;
    return;
  }

  // Canonical list from brute force — keep across column sorts
  if (!isSortRefresh) {
    container._ttpEnumerationMaster = allResults;
  }

  const displayed = allResults.slice(0, maxRows);

  const masterForBest = container._ttpEnumerationMaster || allResults;
  const bestObjectiveValue = masterForBest.reduce(
    (mx, r) => Math.max(mx, r.objective),
    -Infinity
  );

  let html = `
    <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: var(--text-secondary); font-size: 0.85rem;">
        Showing ${displayed.length} of ${allResults.length} feasible solutions
      </span>
      <span style="color: var(--accent-warning); font-size: 0.85rem; font-weight: 600;">
        ⭐ Optimal solution highlighted
      </span>
    </div>
    <div class="data-table-wrapper">
      <table class="data-table" id="enumeration-table">
        <thead>
          <tr>
            <th data-sort="rank">Rank</th>
            <th data-sort="tour">Tour</th>
            <th data-sort="items">Items Picked</th>
            <th data-sort="profit">Profit</th>
            <th data-sort="weight">Weight</th>
            <th data-sort="time">Travel Time</th>
            <th data-sort="objective">Objective ↓</th>
          </tr>
        </thead>
        <tbody>`;

  for (const result of displayed) {
    const isOptimal = Math.abs(result.objective - bestObjectiveValue) < 1e-9;
    const tourStr = result.tour.join(' → ');
    const itemsStr = result.itemIds.length > 0 ? result.itemIds.join(', ') : '—';

    html += `
          <tr class="${isOptimal ? 'optimal' : ''}">
            <td>${result.rank}</td>
            <td style="font-size: 0.72rem;">${tourStr}</td>
            <td>${itemsStr}</td>
            <td>${result.totalProfit}</td>
            <td>${result.totalWeight}</td>
            <td>${result.totalTime.toFixed(2)}</td>
            <td style="font-weight: 600; color: ${result.objective >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">
              ${result.objective.toFixed(2)}
            </td>
          </tr>`;
  }

  html += `</tbody></table></div>`;

  if (allResults.length > maxRows) {
    html += `
      <div style="text-align: center; margin-top: 1rem;">
        <button class="btn btn-secondary" id="show-more-btn">
          Show All ${allResults.length} Results
        </button>
      </div>`;
  }

  container.innerHTML = html;

  // Add show more handler
  const showMoreBtn = container.querySelector('#show-more-btn');
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
      renderEnumerationTable(container, allResults, allResults.length, { isSortRefresh: true });
    });
  }

  const headers = container.querySelectorAll('th[data-sort]');
  headers.forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      const master = container._ttpEnumerationMaster;
      if (!master) return;

      const cmp = (a, b) => {
        switch (key) {
          case 'rank':
            return (b.rank ?? 0) - (a.rank ?? 0);
          case 'tour':
            return a.tour.join(',').localeCompare(b.tour.join(','));
          case 'items': {
            const ai = (a.itemIds || []).join(',');
            const bi = (b.itemIds || []).join(',');
            return ai.localeCompare(bi);
          }
          case 'profit':
            return b.totalProfit - a.totalProfit;
          case 'weight':
            return b.totalWeight - a.totalWeight;
          case 'time':
            return b.totalTime - a.totalTime;
          case 'objective':
            return b.objective - a.objective;
          default:
            return 0;
        }
      };

      const sorted = master.map((r) => ({ ...r })).sort(cmp);
      sorted.forEach((r, i) => {
        r.rank = i + 1;
      });
      renderEnumerationTable(container, sorted, maxRows, { isSortRefresh: true });
    });
  });
}

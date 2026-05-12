/**
 * ============================================================
 * scatterPlot.js — Profit vs Weight Trade-off Scatter Plot
 * ============================================================
 * 
 * Shows a scatter plot where each point is one strategy's result.
 * X = total weight collected, Y = total profit (course spec); tooltips also show objective.
 * Brute-force optimum is highlighted with a star.
 * ============================================================
 */

/**
 * Create the profit vs weight scatter plot.
 * 
 * @param {HTMLCanvasElement} canvas 
 * @param {Solution[]} solutions - Array of solutions from different strategies
 * @param {object[]} [bruteForceResults] - Optional full brute force results for frontier
 * @returns {Chart}
 */
export function createScatterPlot(canvas, solutions, bruteForceResults = null) {
  const colors = [
    { bg: 'rgba(99, 102, 241, 0.7)', border: '#6366f1' },   // Indigo
    { bg: 'rgba(6, 182, 212, 0.7)', border: '#06b6d4' },     // Cyan
    { bg: 'rgba(16, 185, 129, 0.7)', border: '#10b981' },    // Green
    { bg: 'rgba(168, 85, 247, 0.7)', border: '#a855f7' },    // Purple
    { bg: 'rgba(245, 158, 11, 0.9)', border: '#f59e0b' },    // Amber (brute force)
  ];

  const datasets = [];

  // Add each solution as a point
  solutions.forEach((sol, i) => {
    const colorIdx = Math.min(i, colors.length - 1);
    const isBruteForce = sol.strategyName.includes('Brute Force');

    datasets.push({
      label: sol.strategyName,
      data: [{ x: sol.totalWeight, y: sol.totalProfit, _obj: sol.objective }],
      backgroundColor: isBruteForce ? 'rgba(245, 158, 11, 0.9)' : colors[colorIdx].bg,
      borderColor: isBruteForce ? '#f59e0b' : colors[colorIdx].border,
      borderWidth: 2,
      pointRadius: isBruteForce ? 10 : 7,
      pointStyle: isBruteForce ? 'star' : 'circle',
      pointHoverRadius: 12,
    });
  });

  // If we have brute force results, add them as small dots for the frontier
  if (bruteForceResults && bruteForceResults.length > 0) {
    // Sample at most 200 points for performance
    const step = Math.max(1, Math.floor(bruteForceResults.length / 200));
    const sampled = bruteForceResults.filter((_, i) => i % step === 0);

    datasets.unshift({
      label: 'All Feasible Solutions',
      data: sampled.map(r => ({ x: r.totalWeight, y: r.totalProfit, _obj: r.objective })),
      backgroundColor: 'rgba(100, 116, 139, 0.15)',
      borderColor: 'rgba(100, 116, 139, 0.3)',
      borderWidth: 1,
      pointRadius: 2.5,
      pointHoverRadius: 5,
    });
  }

  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  return new Chart(canvas, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 25, 0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(99,102,241,0.3)',
          borderWidth: 1,
          callbacks: {
            label: function (ctx) {
              const raw = ctx.raw;
              const obj = raw && typeof raw._obj === 'number' ? raw._obj : null;
              const profit = ctx.parsed.y;
              const extra = obj != null ? `, Obj=${obj.toFixed(2)}` : '';
              return `${ctx.dataset.label}: W=${ctx.parsed.x}, Profit=${profit}${extra}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Total Weight', color: '#94a3b8', font: { family: 'Inter', size: 13 } },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          title: { display: true, text: 'Total Profit', color: '#94a3b8', font: { family: 'Inter', size: 13 } },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
    },
  });
}

/**
 * ============================================================
 * timeline.js — Item Collection Timeline (Chart.js)
 * ============================================================
 * 
 * Horizontal bar chart showing the tour city sequence (left to right),
 * items picked at each city, cumulative weight, and vehicle speed.
 * ============================================================
 */

/**
 * Create or update the item collection timeline chart.
 * 
 * @param {HTMLCanvasElement} canvas - Canvas element for Chart.js
 * @param {TTPInstance} instance - The problem instance
 * @param {object} evaluation - Evaluation result
 * @returns {Chart} - The Chart.js instance
 */
export function createTimelineChart(canvas, instance, evaluation) {
  const { perCity, perLeg } = evaluation;

  // Labels = city IDs in tour order
  const labels = perCity.map(pc => `City ${pc.cityId}`);

  // Items picked per city (count)
  const itemCounts = perCity.map(pc => pc.itemsPicked.length);

  // Item weight added per city
  const weightAdded = perCity.map((pc, i) => {
    const prevWeight = i > 0 ? perCity[i - 1].cumulativeWeight : 0;
    return pc.cumulativeWeight - prevWeight;
  });

  // Cumulative weight at each city
  const cumulativeWeights = perCity.map(pc => pc.cumulativeWeight);

  // Speed at each leg
  const speeds = perLeg.map(l => l.speed);

  // Destroy existing chart if any
  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Weight Added',
          data: weightAdded,
          backgroundColor: 'rgba(245, 158, 11, 0.6)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'yWeight',
          order: 2,
        },
        {
          label: 'Cumulative Weight',
          data: cumulativeWeights,
          type: 'line',
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#ef4444',
          fill: true,
          yAxisID: 'yWeight',
          order: 1,
        },
        {
          label: 'Speed',
          data: speeds,
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          borderDash: [5, 3],
          fill: false,
          yAxisID: 'ySpeed',
          order: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
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
          padding: 10,
          callbacks: {
            afterBody: function (context) {
              const idx = context[0].dataIndex;
              const pc = perCity[idx];
              if (pc.itemsPicked.length === 0) return 'No items picked';
              const itemNames = pc.itemsPicked
                .map(it => `  Item ${it.id}: profit=${it.profit}, weight=${it.weight}`)
                .join('\n');
              return `Items picked:\n${itemNames}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        yWeight: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Weight', color: '#94a3b8', font: { family: 'Inter' } },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        ySpeed: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Speed', color: '#94a3b8', font: { family: 'Inter' } },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 11 } },
          grid: { display: false },
        },
      },
    },
  });
}

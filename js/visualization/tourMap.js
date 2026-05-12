/**
 * ============================================================
 * tourMap.js — Canvas-Based Interactive Tour Map
 * ============================================================
 * 
 * Renders cities as dots on a canvas, draws the tour as directed
 * arrows with color-coded speed (green=fast, red=slow), and shows
 * item pickup icons at cities where items are collected.
 * ============================================================
 */

/**
 * Draw the tour map on a canvas element.
 * 
 * @param {HTMLCanvasElement} canvas - The canvas to draw on
 * @param {TTPInstance} instance - The problem instance
 * @param {object} evaluation - Evaluation result from ttpEvaluator
 */
export function drawTourMap(canvas, instance, evaluation) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const padding = 50;

  // Clear
  ctx.fillStyle = '#0c0c14';
  ctx.fillRect(0, 0, W, H);

  const { cities } = instance;
  const { tour, perCity, perLeg } = evaluation;

  if (!tour || tour.length === 0) return;

  // ── Compute coordinate mapping ──
  const xs = cities.map(c => c.x);
  const ys = cities.map(c => c.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const scaleX = (W - 2 * padding) / rangeX;
  const scaleY = (H - 2 * padding) / rangeY;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = padding + ((W - 2 * padding) - rangeX * scale) / 2;
  const offsetY = padding + ((H - 2 * padding) - rangeY * scale) / 2;

  function toCanvas(city) {
    return {
      x: offsetX + (city.x - minX) * scale,
      y: offsetY + (rangeY - (city.y - minY)) * scale, // flip Y
    };
  }

  // ── Draw grid lines (subtle) ──
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 40) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
  }
  for (let gy = 0; gy < H; gy += 40) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }

  // ── Speed range for color mapping ──
  const speeds = perLeg.map(l => l.speed);
  const minSpd = Math.min(...speeds);
  const maxSpd = Math.max(...speeds);

  function speedColor(speed) {
    const t = maxSpd === minSpd ? 1 : (speed - minSpd) / (maxSpd - minSpd);
    // Green (fast) to Red (slow)
    const r = Math.round(255 * (1 - t));
    const g = Math.round(200 * t);
    const b = 80;
    return `rgb(${r},${g},${b})`;
  }

  // ── Draw tour edges with arrows ──
  for (const leg of perLeg) {
    const fromCity = cities.find(c => c.id === leg.from);
    const toCity = cities.find(c => c.id === leg.to);
    const from = toCanvas(fromCity);
    const to = toCanvas(toCity);

    const color = speedColor(leg.speed);

    // Line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.8;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Arrowhead
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowLen = 10;
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(
      midX + arrowLen * Math.cos(angle),
      midY + arrowLen * Math.sin(angle)
    );
    ctx.lineTo(
      midX + arrowLen * 0.5 * Math.cos(angle - Math.PI * 0.7),
      midY + arrowLen * 0.5 * Math.sin(angle - Math.PI * 0.7)
    );
    ctx.lineTo(
      midX + arrowLen * 0.5 * Math.cos(angle + Math.PI * 0.7),
      midY + arrowLen * 0.5 * Math.sin(angle + Math.PI * 0.7)
    );
    ctx.closePath();
    ctx.fill();
  }

  // ── Draw cities ──
  const itemCities = new Set();
  if (perCity) {
    for (const pc of perCity) {
      if (pc.itemsPicked.length > 0) itemCities.add(pc.cityId);
    }
  }

  for (const city of cities) {
    const pos = toCanvas(city);
    const hasItems = itemCities.has(city.id);
    const isStart = city.id === tour[0];
    const radius = isStart ? 8 : hasItems ? 7 : 5;

    // Glow for start city
    if (isStart) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.fill();
    }

    // City dot
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    if (isStart) {
      ctx.fillStyle = '#6366f1';
    } else if (hasItems) {
      ctx.fillStyle = '#f59e0b';
    } else {
      ctx.fillStyle = '#64748b';
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // City label
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(city.id, pos.x, pos.y - radius - 5);

    // Item icon (📦) for cities with collected items
    if (hasItems) {
      const pc = perCity.find(p => p.cityId === city.id);
      ctx.font = '13px serif';
      ctx.fillText('📦', pos.x + radius + 6, pos.y + 4);
      // Show item count
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`×${pc.itemsPicked.length}`, pos.x + radius + 20, pos.y + 4);
    }
  }

  // ── Draw objective value overlay ──
  ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
  ctx.fillRect(8, 8, 220, 70);
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, 220, 70);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('OBJECTIVE', 18, 28);
  ctx.fillStyle = evaluation.objective >= 0 ? '#10b981' : '#ef4444';
  ctx.font = '700 20px JetBrains Mono, monospace';
  ctx.fillText(evaluation.objective.toFixed(2), 18, 52);

  ctx.fillStyle = '#64748b';
  ctx.font = '400 10px Inter, sans-serif';
  ctx.fillText(
    `Profit: ${evaluation.totalProfit} | Weight: ${evaluation.totalWeight} | Time: ${evaluation.totalTime.toFixed(1)}`,
    18, 70
  );
}

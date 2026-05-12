/**
 * ttpMaker.js — Build custom .ttp instances in the browser, apply or download.
 */

import { City, Item, TTPInstance } from './models.js';

/**
 * Serialize instance to benchmark-style .ttp text (compatible with parser.js).
 * @param {import('./models.js').TTPInstance} instance
 * @returns {string}
 */
export function serializeTTPInstance(instance) {
  const n = instance.cities.length;
  const m = instance.items.length;
  const lines = [
    `PROBLEM NAME : ${instance.name}`,
    'KNAPSACK DATA TYPE : uncorrelated',
    `DIMENSION : ${n}`,
    `NUMBER OF ITEMS : ${m}`,
    `CAPACITY OF KNAPSACK : ${instance.capacity}`,
    `MIN SPEED : ${instance.minSpeed}`,
    `MAX SPEED : ${instance.maxSpeed}`,
    `RENTING RATIO : ${instance.rentingRate}`,
    'EDGE_WEIGHT_TYPE : CEIL_2D',
    'NODE_COORD_SECTION',
  ];
  const citiesSorted = [...instance.cities].sort((a, b) => a.id - b.id);
  for (const c of citiesSorted) {
    lines.push(`${c.id} ${c.x} ${c.y}`);
  }
  lines.push('ITEMS SECTION');
  const itemsSorted = [...instance.items].sort((a, b) => a.id - b.id);
  for (const it of itemsSorted) {
    lines.push(`${it.id} ${it.profit} ${it.weight} ${it.cityId}`);
  }
  return lines.join('\n');
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.ttp') ? filename : `${filename}.ttp`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function rowCity(tr) {
  const id = parseInt(tr.querySelector('.mk-city-id')?.value, 10);
  const x = parseFloat(tr.querySelector('.mk-city-x')?.value);
  const y = parseFloat(tr.querySelector('.mk-city-y')?.value);
  return { id, x, y };
}

function rowItem(tr) {
  const id = parseInt(tr.querySelector('.mk-item-id')?.value, 10);
  const profit = parseInt(tr.querySelector('.mk-item-profit')?.value, 10);
  const weight = parseInt(tr.querySelector('.mk-item-weight')?.value, 10);
  const cityId = parseInt(tr.querySelector('.mk-item-city')?.value, 10);
  return { id, profit, weight, cityId };
}

function collectFromDom(dialog) {
  const name = dialog.querySelector('#maker-name')?.value?.trim() || 'custom_instance';
  const capacity = parseInt(dialog.querySelector('#maker-capacity')?.value, 10);
  const minSpeed = parseFloat(dialog.querySelector('#maker-min-speed')?.value);
  const maxSpeed = parseFloat(dialog.querySelector('#maker-max-speed')?.value);
  const rentingRate = parseFloat(dialog.querySelector('#maker-rent')?.value);

  const cityRows = [...dialog.querySelectorAll('#maker-cities-body tr')];
  const itemRows = [...dialog.querySelectorAll('#maker-items-body tr')];

  const citiesRaw = cityRows.map(rowCity).filter((c) => Number.isFinite(c.id) && Number.isFinite(c.x) && Number.isFinite(c.y));
  const itemsRaw = itemRows
    .map(rowItem)
    .filter(
      (it) =>
        Number.isFinite(it.id) &&
        Number.isFinite(it.profit) &&
        Number.isFinite(it.weight) &&
        Number.isFinite(it.cityId)
    );

  return {
    name,
    capacity,
    minSpeed,
    maxSpeed,
    rentingRate,
    citiesRaw,
    itemsRaw,
  };
}

function validateAndBuild(data) {
  const { name, capacity, minSpeed, maxSpeed, rentingRate, citiesRaw, itemsRaw } = data;

  if (!Number.isFinite(capacity) || capacity <= 0) throw new Error('Capacity must be a positive integer.');
  if (!Number.isFinite(minSpeed) || !Number.isFinite(maxSpeed) || minSpeed <= 0 || maxSpeed <= 0) {
    throw new Error('Min/max speed must be positive numbers.');
  }
  if (minSpeed > maxSpeed) throw new Error('Min speed cannot exceed max speed.');
  if (!Number.isFinite(rentingRate) || rentingRate < 0) throw new Error('Renting ratio must be a non-negative number.');

  if (citiesRaw.length === 0) throw new Error('Add at least one city.');
  if (itemsRaw.length === 0) throw new Error('Add at least one item.');

  const cityIds = new Set(citiesRaw.map((c) => c.id));
  if (cityIds.size !== citiesRaw.length) throw new Error('City IDs must be unique.');
  if (!cityIds.has(1)) throw new Error('Include city ID 1 (depot / start city) for compatibility with this solver.');

  const itemIds = new Set(itemsRaw.map((i) => i.id));
  if (itemIds.size !== itemsRaw.length) throw new Error('Item IDs must be unique.');

  for (const it of itemsRaw) {
    if (!cityIds.has(it.cityId)) {
      throw new Error(`Item ${it.id}: city ${it.cityId} is not in the city list.`);
    }
  }

  const cities = citiesRaw.map((c) => new City(c.id, Math.round(c.x), Math.round(c.y)));
  const items = itemsRaw.map((it) => new Item(it.id, it.profit, it.weight, it.cityId));

  for (const item of items) {
    const city = cities.find((c) => c.id === item.cityId);
    if (city) city.items.push(item);
  }

  return new TTPInstance(name, cities, items, capacity, minSpeed, maxSpeed, rentingRate);
}

function appendCityRow(tbody, tpl, values = {}) {
  const tr = tpl.content.firstElementChild.cloneNode(true);
  tr.querySelector('.mk-city-id').value = values.id ?? '';
  tr.querySelector('.mk-city-x').value = values.x ?? '';
  tr.querySelector('.mk-city-y').value = values.y ?? '';
  tr.querySelector('.mk-remove-row').addEventListener('click', () => tr.remove());
  tbody.appendChild(tr);
}

function appendItemRow(tbody, tpl, values = {}) {
  const tr = tpl.content.firstElementChild.cloneNode(true);
  tr.querySelector('.mk-item-id').value = values.id ?? '';
  tr.querySelector('.mk-item-profit').value = values.profit ?? '';
  tr.querySelector('.mk-item-weight').value = values.weight ?? '';
  tr.querySelector('.mk-item-city').value = values.cityId ?? '';
  tr.querySelector('.mk-remove-row').addEventListener('click', () => tr.remove());
  tbody.appendChild(tr);
}

const STARTER_CITIES = [
  { id: 1, x: 10, y: 20 },
  { id: 2, x: 40, y: 30 },
  { id: 3, x: 25, y: 55 },
];

const STARTER_ITEMS = [
  { id: 1, profit: 50, weight: 10, cityId: 2 },
  { id: 2, profit: 35, weight: 8, cityId: 3 },
];

/**
 * @param {{ loadInstance: (inst: import('./models.js').TTPInstance) => void, log: (m: string, t?: string) => void, getCurrentInstance: () => import('./models.js').TTPInstance | null }} ctx
 */
export function initTtpMaker(ctx) {
  const { loadInstance, log, getCurrentInstance } = ctx;
  const dialog = document.querySelector('#ttp-maker-dialog');
  if (!dialog) return;

  const tbodyCities = dialog.querySelector('#maker-cities-body');
  const tbodyItems = dialog.querySelector('#maker-items-body');
  const tplCity = document.querySelector('#tpl-maker-city');
  const tplItem = document.querySelector('#tpl-maker-item');

  if (!tbodyCities || !tbodyItems || !tplCity || !tplItem) {
    console.error('TTP Maker: missing DOM (tbody or templates).');
    return;
  }
  if (!tplCity.content?.firstElementChild || !tplItem.content?.firstElementChild) {
    console.error('TTP Maker: row templates are empty.');
    return;
  }

  function resetFormToStarter() {
    tbodyCities.innerHTML = '';
    tbodyItems.innerHTML = '';
    STARTER_CITIES.forEach((c) => appendCityRow(tbodyCities, tplCity, c));
    STARTER_ITEMS.forEach((it) => appendItemRow(tbodyItems, tplItem, it));
    dialog.querySelector('#maker-name').value = 'my_custom_ttp';
    dialog.querySelector('#maker-capacity').value = '100';
    dialog.querySelector('#maker-min-speed').value = '0.1';
    dialog.querySelector('#maker-max-speed').value = '1.0';
    dialog.querySelector('#maker-rent').value = '0.5';
  }

  document.querySelector('#btn-open-ttp-maker')?.addEventListener('click', () => {
    try {
      if (typeof dialog.showModal !== 'function') {
        log('TTP Maker needs a modern browser (HTML dialog / showModal).', 'error');
        return;
      }
      if (!tbodyCities.querySelector('tr')) resetFormToStarter();
      dialog.showModal();
    } catch (e) {
      console.error(e);
      log(`TTP Maker: ${e.message}`, 'error');
    }
  });

  dialog.querySelector('#maker-btn-close')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('#maker-add-city')?.addEventListener('click', () => appendCityRow(tbodyCities, tplCity, {}));
  dialog.querySelector('#maker-add-item')?.addEventListener('click', () => appendItemRow(tbodyItems, tplItem, {}));

  dialog.querySelector('#maker-btn-starter')?.addEventListener('click', () => {
    resetFormToStarter();
    log('TTP Maker: reset to starter template.', 'info');
  });

  dialog.querySelector('#maker-btn-from-loaded')?.addEventListener('click', () => {
    const inst = getCurrentInstance?.();
    if (!inst) {
      log('TTP Maker: load an instance first, or use the starter template.', 'warn');
      return;
    }
    tbodyCities.innerHTML = '';
    tbodyItems.innerHTML = '';
    [...inst.cities].sort((a, b) => a.id - b.id).forEach((c) => appendCityRow(tbodyCities, tplCity, { id: c.id, x: c.x, y: c.y }));
    [...inst.items].sort((a, b) => a.id - b.id).forEach((it) =>
      appendItemRow(tbodyItems, tplItem, {
        id: it.id,
        profit: it.profit,
        weight: it.weight,
        cityId: it.cityId,
      })
    );
    dialog.querySelector('#maker-name').value = inst.name;
    dialog.querySelector('#maker-capacity').value = String(inst.capacity);
    dialog.querySelector('#maker-min-speed').value = String(inst.minSpeed);
    dialog.querySelector('#maker-max-speed').value = String(inst.maxSpeed);
    dialog.querySelector('#maker-rent').value = String(inst.rentingRate);
    log('TTP Maker: form filled from current instance.', 'success');
  });

  dialog.querySelector('#maker-btn-apply')?.addEventListener('click', () => {
    try {
      const inst = validateAndBuild(collectFromDom(dialog));
      loadInstance(inst);
      log(`TTP Maker: loaded "${inst.name}" into the solver.`, 'success');
      dialog.close();
    } catch (e) {
      log(`TTP Maker: ${e.message}`, 'error');
    }
  });

  dialog.querySelector('#maker-btn-download')?.addEventListener('click', () => {
    try {
      const inst = validateAndBuild(collectFromDom(dialog));
      const text = serializeTTPInstance(inst);
      const safe = inst.name.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'instance';
      downloadText(`${safe}.ttp`, text);
      log(`TTP Maker: downloaded ${safe}.ttp`, 'success');
    } catch (e) {
      log(`TTP Maker: ${e.message}`, 'error');
    }
  });

  dialog.querySelector('#maker-btn-close-footer')?.addEventListener('click', () => dialog.close());

  // Do not populate the dialog until first open — avoids init-time errors blocking the app
}

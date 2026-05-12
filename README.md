# Project 26 — Traveling Thief Problem (TTP) Solver

Interactive web application for the **Traveling Thief Problem**: a thief follows a tour among cities (TSP), steals a subset of items subject to knapsack capacity (0/1), and travels **slower when carrying more weight**. Routing and packing are coupled; this project implements exact search for tiny instances, several heuristics, rich visualizations, and a **TTP Maker** for custom benchmarks.

**Course:** Algorithms (Term 6)  
**Deliverable:** Static HTML / CSS / JavaScript (ES modules), **no build step**.

---

## Documentation (read this first)

All documentation lives under **`docs/`**. Use the index to navigate.

| Document | Purpose |
|----------|---------|
| [**docs/README.md**](docs/README.md) | **Documentation hub** — table of every doc and suggested reading order |
| [**docs/USER_GUIDE.md**](docs/USER_GUIDE.md) | Full UI walkthrough, benchmarks, TTP Maker, troubleshooting |
| [**docs/DEVELOPER_GUIDE.md**](docs/DEVELOPER_GUIDE.md) | Architecture, state, module catalog, extension points |
| [**docs/ALGORITHMS_AND_FORMAT.md**](docs/ALGORITHMS_AND_FORMAT.md) | Mathematics, each solver, `.ttp` file format |
| [**docs/REQUIREMENTS_COMPLIANCE.md**](docs/REQUIREMENTS_COMPLIANCE.md) | Project 26 brief ↔ implementation matrix |
| [**docs/TECHNICAL_REFERENCE.md**](docs/TECHNICAL_REFERENCE.md) | Quick reference: symbols, formulas, exports, complexity |

---

## How to run

The app uses **ES modules** and **`fetch()`** for `data/*.ttp`. Serve the project root over HTTP (opening `index.html` as `file://` usually fails).

### Python

```bash
cd path/to/project
python -m http.server 8080
```

Open `http://localhost:8080`.

### Node (npx)

```bash
cd path/to/project
npx --yes serve .
```

Use the URL printed in the terminal.

---

## Features (summary)

| Area | What you get |
|------|----------------|
| **Instances** | Parser for standard `.ttp` text; five built-in benchmarks in `data/`; drag-and-drop upload; **TTP Maker** (edit, apply, download `.ttp`) |
| **Objective** | Maximize `totalProfit − rentingRate × totalTravelTime` with linear speed in carried weight and CEIL_2D-style distances |
| **Algorithms** | Brute force (tiny instances), Greedy NN + DP, NN + greedy items, 2-opt + DP, divide & conquer + DP |
| **Views** | Tour map, item timeline (Chart.js), profit–weight scatter, full enumeration table (after brute force), strategy comparison panel, algorithm log |

---

## Repository layout

```
project/
├── index.html
├── README.md
├── css/
│   └── style.css
├── data/
│   ├── sample_small.ttp
│   ├── benchmark_04.ttp
│   ├── benchmark_05.ttp
│   ├── sample_medium.ttp
│   └── sample_large.ttp
├── docs/
│   ├── README.md                      # Documentation index
│   ├── USER_GUIDE.md
│   ├── DEVELOPER_GUIDE.md
│   ├── ALGORITHMS_AND_FORMAT.md
│   ├── REQUIREMENTS_COMPLIANCE.md
│   └── TECHNICAL_REFERENCE.md
└── js/
    ├── main.js
    ├── models.js
    ├── parser.js
    ├── ttpMaker.js                    # Lazy-loaded from main.js
    ├── algorithms/
    │   ├── ttpEvaluator.js
    │   ├── bruteForce.js
    │   ├── greedyNN.js
    │   ├── dpKnapsack.js
    │   ├── twoOpt.js
    │   └── divideConquer.js
    └── visualization/
        ├── tourMap.js
        ├── timeline.js
        ├── scatterPlot.js
        ├── enumerationTable.js
        └── comparisonPanel.js
```

---

## Quick start (after server is running)

1. Load a built-in benchmark or a `.ttp` file.
2. Click **Run All & Compare** or run strategies individually.
3. Use tabs: **Tour Map**, **Item Timeline**, **Profit vs Weight**, **Enumeration** (small instance + brute force), **Strategy Comparison**.
4. Use the **solution** dropdown to switch which strategy is shown on the map and timeline.

Details: [**docs/USER_GUIDE.md**](docs/USER_GUIDE.md).

---

## Mathematical model (one paragraph)

Distances are Euclidean, rounded up. Speed decreases linearly from `maxSpeed` (empty) to `minSpeed` (full knapsack). Each leg’s travel time is distance divided by speed **after** pickups at the departure city. The score is profit of stolen items minus `rentingRate` times total time. Precise formulas and simulation order: [**docs/ALGORITHMS_AND_FORMAT.md**](docs/ALGORITHMS_AND_FORMAT.md) §2 and `js/algorithms/ttpEvaluator.js`.

---

## References

- Polyakovskiy, S., et al. — TTP benchmark set and problem context.
- Course brief: Project 26 — Traveling Thief Problem.

